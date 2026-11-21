"""VERTEX mpp robot: converts Microsoft Project .mpp files in the cloud (VERTEX Cloud, site msp-bi)
to MS Project XML (MSPDI) next to them, so the dashboard can read them. Runs in GitHub Actions (.github/workflows/mpp.yml).
Uses MPXJ (https://www.mpxj.org). Usage: python tools/mpp2xml.py            -> convert new .mpp files in the cloud
                                       python tools/mpp2xml.py in.mpp out.xml -> convert one local file"""
import json, os, sys, tempfile, urllib.request, urllib.parse
CLOUD = os.environ.get('VX_CLOUD', 'https://vertex-cloud.0tddq47ko7zqg6gdmwllyzi.workers.dev').rstrip('/')
SITE = 'msp-bi'

def convert(src, dst):
    import jpype, mpxj  # noqa: F401  (mpxj puts its jars on the class path)
    import jpype.imports  # noqa: F401
    if not jpype.isJVMStarted():
        jpype.startJVM()
    try:
        from org.mpxj.reader import UniversalProjectReader
        from org.mpxj.mspdi import MSPDIWriter
    except ImportError:
        from net.sf.mpxj.reader import UniversalProjectReader
        from net.sf.mpxj.mspdi import MSPDIWriter
    proj = UniversalProjectReader().read(src)
    if proj is None:
        raise RuntimeError('not a project file')
    MSPDIWriter().write(proj, dst)
    return proj.getTasks().size()

def req(path, data=None, method='GET'):
    r = urllib.request.Request(CLOUD + path, data=data, method=method, headers={'X-By': 'mpp-robot', 'Content-Type': 'application/octet-stream'})
    with urllib.request.urlopen(r, timeout=120) as f:
        return f.read()

def main():
    files = json.loads(req('/files/' + SITE))['files']
    have = {f['name']: f for f in files}
    n = 0
    for f in files:
        name = f['name']
        if not name.lower().endswith('.mpp'):
            continue
        xname = name[:-4] + '.xml'
        x = have.get(xname)
        if x and (x.get('ts') or 0) >= (f.get('ts') or 0):
            continue
        with tempfile.TemporaryDirectory() as d:
            src, dst = os.path.join(d, 'in.mpp'), os.path.join(d, 'out.xml')
            open(src, 'wb').write(req('/files/' + SITE + '/' + urllib.parse.quote(name)))
            try:
                k = convert(src, dst)
            except Exception as e:  # keep going with the other files
                print('FAIL', name, e)
                continue
            req('/files/' + SITE + '/' + urllib.parse.quote(xname), open(dst, 'rb').read(), 'PUT')
            print('OK', name, '->', xname, k, 'tasks')
            n += 1
    print('converted', n)

if __name__ == '__main__':
    if len(sys.argv) == 3:
        print(convert(sys.argv[1], sys.argv[2]), 'tasks')
    else:
        main()
