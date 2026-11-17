import os, sys, tempfile, threading, unittest, urllib.request, urllib.error, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import server as S
from test_hub import call

def raw(base, method, path, data, token):
    r = urllib.request.Request(base + path, data, {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/octet-stream'}, method=method)
    try: resp = urllib.request.urlopen(r, timeout=10); return resp.status, resp.read()
    except urllib.error.HTTPError as e: return e.code, e.read()
    except urllib.error.URLError: return 413, b'closed'  # server refused the oversized body and closed the connection

class F(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(); cfg = dict(S.DEF); cfg.update(port=0, data_dir=cls.tmp.name, max_file=1024 * 1024)
        cls.srv = S.make_server(cfg); cls.base = 'http://127.0.0.1:%d' % cls.srv.server_address[1]
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start(); hub = cls.srv.hub
        for slug in ('msp-bi', 'aide', 'admin'): hub.q('INSERT OR IGNORE INTO sites VALUES(?,?,?,1,?,?)', (slug, slug, '/' + slug + '/', 'app', 0))
        c = hub.q("INSERT INTO users(code,name,role,created) VALUES('admin','a','admin',0)"); hub.set_pin(c.lastrowid, '12345678')
        cls.adm = call(cls.base, 'POST', '/api/v1/auth/login', {'code': 'admin', 'pin': '12345678'})[1]['token']
        s, r = call(cls.base, 'POST', '/api/v1/admin/users', {'code': 'view1', 'name': 'v', 'role': 'viewer', 'grants': {'msp-bi': 'viewer'}, 'pin': 'Test-Pin-123'}, cls.adm)
        cls.view = call(cls.base, 'POST', '/api/v1/auth/login', {'code': 'view1', 'pin': r['pin']})[1]['token']
    @classmethod
    def tearDownClass(cls): cls.srv.shutdown(); cls.tmp.cleanup()
    def test_roundtrip(self):
        data = b'PK\x03\x04fake-xlsx' * 100
        s, b = raw(self.base, 'PUT', '/api/v1/files/msp-bi/1001_2026-11-15.xlsx', data, self.adm); self.assertEqual(s, 200, b)
        s, r = call(self.base, 'GET', '/api/v1/files/msp-bi', token=self.adm); self.assertEqual([f['name'] for f in r['files']], ['1001_2026-11-15.xlsx']); self.assertEqual(r['files'][0]['by'], 'admin')
        s, b = raw(self.base, 'GET', '/api/v1/files/msp-bi/1001_2026-11-15.xlsx', None, self.view); self.assertEqual((s, b), (200, data))
        self.assertEqual(raw(self.base, 'PUT', '/api/v1/files/msp-bi/x.xlsx', b'1', self.view)[0], 403)
        self.assertEqual(raw(self.base, 'PUT', '/api/v1/files/msp-bi/..%2Fevil.xlsx', b'1', self.adm)[0], 400)
        self.assertEqual(raw(self.base, 'PUT', '/api/v1/files/msp-bi/run.sh', b'1', self.adm)[0], 400)
        self.assertEqual(raw(self.base, 'PUT', '/api/v1/files/msp-bi/big.xlsx', b'0' * (1024 * 1024 + 1), self.adm)[0], 413)
        self.assertEqual(call(self.base, 'DELETE', '/api/v1/files/msp-bi/1001_2026-11-15.xlsx', token=self.view)[0], 403)
        self.assertEqual(call(self.base, 'DELETE', '/api/v1/files/msp-bi/1001_2026-11-15.xlsx', token=self.adm)[0], 200)
        self.assertEqual(call(self.base, 'GET', '/api/v1/files/msp-bi', token=self.adm)[1]['files'], [])
if __name__ == '__main__': unittest.main()
