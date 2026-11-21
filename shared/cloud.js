/* VERTEX Cloud client — the ecosystem's online store on Cloudflare (Worker + KV, see cloud/worker.js).
   No key in the browser: the Worker holds the storage. Every page and every device reads/writes the same data.
   URL: set CLOUD below after deploying the Worker (or localStorage.vxCloud for tests). */
(function () {
  var CLOUD = 'https://vertex-cloud.0tddq47ko7zqg6gdmwllyzi.workers.dev'; // VERTEX Cloud (Cloudflare Worker, cloud/)
  try { CLOUD = localStorage.getItem('vxCloud') || CLOUD } catch (e) { }
  CLOUD = String(CLOUD || '').replace(/\/+$/, '');
  var who = function () { try { var s = JSON.parse(localStorage.getItem('vxSess') || sessionStorage.getItem('vxSess') || 'null'); return (s && s.u) || '' } catch (e) { return '' } };
  var _f = window.fetch.bind(window);
  function req(path, o) { o = o || {}; o.headers = Object.assign({ 'X-By': who() }, o.headers || {}); o.cache = 'no-store'; return _f(CLOUD + path, o) }
  var C = {
    url: CLOUD, on: !!CLOUD,
    ready: null,
    async getDoc(name) { var r = await req('/doc/' + encodeURIComponent(name)); if (r.status === 404) return null; if (!r.ok) throw new Error('cloud ' + r.status); return r.json() },
    async putDoc(name, obj, ifT) { var h = { 'Content-Type': 'application/json' }; if (ifT != null && C.ver >= 1.2) h['X-If-T'] = String(ifT); var r = await req('/doc/' + encodeURIComponent(name), { method: 'PUT', headers: h, body: JSON.stringify(obj) }); if (r.status === 409) { var e = new Error('conflict'); e.conflict = true; throw e } if (!r.ok) throw new Error('cloud ' + r.status); return r.json() },
    async listFiles(site) { var r = await req('/files/' + site); if (!r.ok) throw new Error('cloud ' + r.status); return (await r.json()).files || [] },
    async putFile(site, file) { var r = await req('/files/' + site + '/' + encodeURIComponent(file.name), { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: file }); var j = {}; try { j = await r.json() } catch (e) { } if (!r.ok) throw new Error(j.error || ('cloud ' + r.status)); return j },
    // Upload with progress (XMLHttpRequest gives upload progress; fetch does not). onp(loaded,total)
    putFileP(site, file, onp) { return new Promise(function (res, rej) { var x = new XMLHttpRequest(); x.open('PUT', CLOUD + '/files/' + site + '/' + encodeURIComponent(file.name)); x.setRequestHeader('Content-Type', 'application/octet-stream'); x.setRequestHeader('X-By', who());
      x.upload.onprogress = function (e) { if (onp && e.lengthComputable) onp(e.loaded, e.total) }; x.onload = function () { var j = {}; try { j = JSON.parse(x.responseText) } catch (e) { } x.status >= 200 && x.status < 300 ? res(j) : rej(new Error(j.error || ('cloud ' + x.status))) }; x.onerror = function () { rej(new Error('network')) }; file.arrayBuffer().then(function (b) { x.send(b) }, rej) }) },
    fileUrl(site, name) { return CLOUD + '/files/' + site + '/' + encodeURIComponent(name) },
    async getFile(site, name) { var r = await req('/files/' + site + '/' + encodeURIComponent(name)); if (!r.ok) throw new Error('cloud ' + r.status); return r.blob() },
    async delFile(site, name) { var r = await req('/files/' + site + '/' + encodeURIComponent(name), { method: 'DELETE' }); if (!r.ok) throw new Error('cloud ' + r.status); return true }
  };
  C.ready = C.on ? _f(CLOUD + '/health', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null }).then(function (j) { C.up = !!(j && j.ok && j.kv); C.ver = parseFloat((j && j.version) || '0'); return C.up }).catch(function () { C.up = false; return false }) : Promise.resolve(false);
  window.VX_CLOUD = C;
})();
