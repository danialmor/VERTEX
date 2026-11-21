/* VERTEX Cloud — Cloudflare Worker + KV: one online store for the whole ecosystem (no GitHub key, no key in the browser).
   Binding: KV namespace "VX". Optional vars: ORIGINS (comma list of allowed site origins), ADMIN_PIN (extra lock for deletes).

   API (JSON unless noted):
     GET    /health                         → {ok,version}
     GET    /doc/<name>                     → stored JSON document (404 if none)            e.g. vertex (panel DB), ai-config
     PUT    /doc/<name>   body: JSON         → {ok,t}
     GET    /files/<site>                   → {files:[{name,size,ts,by,sha}]}
     PUT    /files/<site>/<name>  raw body   → {ok,name,size,sha}   (≤ 20 MB)  header X-By: user code
     GET    /files/<site>/<name>            → raw bytes
     DELETE /files/<site>/<name>            → {ok}
   Names: doc [a-z0-9._-]{1,60}; site [a-z0-9-]{1,40}; file name ≤120 chars, no slashes, known extensions. */
const VERSION = '1.2.0';
const DOC = /^[a-z0-9._-]{1,60}$/i, SITE = /^[a-z0-9-]{1,40}$/, FILE = /^[^/\\\x00-\x1f]{1,120}\.(xlsx|xls|csv|tsv|txt|xml|json|pdf|mpp|png|jpg|jpeg|webp|docx)$/i;
const MAX_FILE = 20 * 1024 * 1024, MAX_DOC = 20 * 1024 * 1024;

function cors(req, env) {
  const o = req.headers.get('Origin') || '';
  const allow = (env.ORIGINS || 'https://danialmor.github.io').split(',').map(s => s.trim()).filter(Boolean);
  const ok = !o || allow.includes(o) || allow.includes('*') || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
  return { ok, h: { 'Access-Control-Allow-Origin': ok && o ? o : allow[0], 'Access-Control-Allow-Methods': 'GET,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,X-By,X-Pin,X-If-T', 'Access-Control-Max-Age': '600', Vary: 'Origin' } };
}
const json = (o, s, h) => new Response(JSON.stringify(o), { status: s || 200, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, h) });
async function sha256(buf) { const d = await crypto.subtle.digest('SHA-256', buf); return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join(''); }

async function ixSet(env, site, name, meta) {
  let ix = await env.VX.get('fidx:' + site, 'json');
  if (!ix) { ix = []; let cur; do { const l = await env.VX.list({ prefix: 'file:' + site + ':', cursor: cur }); l.keys.forEach(x => ix.push(Object.assign({ name: x.name.slice(('file:' + site + ':').length) }, x.metadata || {}))); cur = l.list_complete ? null : l.cursor; } while (cur); }
  ix = ix.filter(x => x.name !== name); if (meta) ix.push(Object.assign({ name }, meta)); ix.sort((a, b) => a.name < b.name ? -1 : 1);
  await env.VX.put('fidx:' + site, JSON.stringify(ix));
}
export default {
  async fetch(req, env) {
    const c = cors(req, env), H = c.h;
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: H });
    if (!c.ok) return json({ error: 'origin-not-allowed' }, 403, H);
    const url = new URL(req.url), seg = url.pathname.split('/').filter(Boolean).map(decodeURIComponent), m = req.method;
    try {
      if (seg[0] === 'health') return json({ ok: true, version: VERSION, kv: !!env.VX }, 200, H);
      if (!env.VX) return json({ error: 'kv-not-bound' }, 500, H);
      if (seg[0] === 'doc' && seg.length === 2) {
        const k = seg[1]; if (!DOC.test(k)) return json({ error: 'bad-name' }, 400, H);
        if (m === 'GET') { const v = await env.VX.get('doc:' + k); return v === null ? json({ error: 'not-found' }, 404, H) : new Response(v, { headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, H) }); }
        if (m === 'PUT') {
          const t = await req.text(); if (t.length > MAX_DOC) return json({ error: 'too-large' }, 413, H);
          let nj; try { nj = JSON.parse(t) } catch (e) { return json({ error: 'bad-json' }, 400, H) }
          // optimistic concurrency: the client says which version it merged on top of (X-If-T); refuse if someone saved meanwhile
          const ift = req.headers.get('X-If-T');
          if (ift !== null) { const cur = await env.VX.get('doc:' + k, { cacheTtl: 30 }).catch(() => null); let ct = 0; try { ct = cur ? (JSON.parse(cur).t || 0) : 0 } catch (e) { } if (String(ct) !== String(+ift || 0)) return json({ error: 'conflict', t: ct }, 409, H); }
          await env.VX.put('doc:' + k, t, { metadata: { ts: Date.now(), by: (req.headers.get('X-By') || '').slice(0, 40) } }); return json({ ok: true, t: Date.now() }, 200, H);
        }
        if (m === 'DELETE') { if (env.ADMIN_PIN && req.headers.get('X-Pin') !== env.ADMIN_PIN) return json({ error: 'forbidden' }, 403, H); await env.VX.delete('doc:' + k); return json({ ok: true }, 200, H); }
      }
      if (seg[0] === 'files' && (seg.length === 2 || seg.length === 3)) {
        const site = seg[1]; if (!SITE.test(site)) return json({ error: 'bad-site' }, 400, H);
        if (seg.length === 2 && m === 'GET') {
          // index doc (strongly up to date after each upload); KV list() can lag up to 60 s
          const ix = await env.VX.get('fidx:' + site, 'json'); if (ix) return json({ files: ix }, 200, H);
          const out = []; let cur;
          do { const l = await env.VX.list({ prefix: 'file:' + site + ':', cursor: cur }); l.keys.forEach(x => out.push(Object.assign({ name: x.name.slice(('file:' + site + ':').length) }, x.metadata || {}))); cur = l.list_complete ? null : l.cursor; } while (cur);
          out.sort((a, b) => a.name < b.name ? -1 : 1); return json({ files: out }, 200, H);
        }
        const name = seg[2]; if (!name || !FILE.test(name) || name.startsWith('.')) return json({ error: 'bad-name' }, 400, H);
        const key = 'file:' + site + ':' + name;
        if (m === 'GET') { const v = await env.VX.get(key, 'arrayBuffer'); return v === null ? json({ error: 'not-found' }, 404, H) : new Response(v, { headers: Object.assign({ 'Content-Type': 'application/octet-stream', 'Cache-Control': 'no-store' }, H) }); }
        if (m === 'PUT') {
          const b = await req.arrayBuffer(); if (!b.byteLength) return json({ error: 'empty' }, 400, H); if (b.byteLength > MAX_FILE) return json({ error: 'too-large' }, 413, H);
          const sha = await sha256(b), meta = { size: b.byteLength, ts: Date.now(), by: (req.headers.get('X-By') || '').slice(0, 40), sha };
          await env.VX.put(key, b, { metadata: meta }); await ixSet(env, site, name, meta); return json(Object.assign({ ok: true, name }, meta), 200, H);
        }
        if (m === 'DELETE') { if (env.ADMIN_PIN && req.headers.get('X-Pin') !== env.ADMIN_PIN) return json({ error: 'forbidden' }, 403, H); await env.VX.delete(key); await ixSet(env, site, name, null); return json({ ok: true }, 200, H); }
      }
      return json({ error: 'not-found' }, 404, H);
    } catch (e) { return json({ error: 'server', detail: String(e && e.message || e).slice(0, 200) }, 500, H); }
  }
};
