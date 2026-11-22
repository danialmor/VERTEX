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
     POST   /ai/v1/chat/completions          → OpenAI-compatible chat (stream or not) on Cloudflare Workers AI — binding "AI"; optional var AI_KEY (Bearer)
     GET    /ai/v1/models                    → the allowed Workers AI models
     GET|PUT|DELETE /ai/cred                 → Cloudflare API token for Workers AI, kept only inside the worker (never returned)
   Names: doc [a-z0-9._-]{1,60}; site [a-z0-9-]{1,40}; file name ≤120 chars, no slashes, known extensions. */
const VERSION = '1.4.0';
const DOC = /^[a-z0-9._-]{1,60}$/i, SITE = /^[a-z0-9-]{1,40}$/, FILE = /^[^/\\\x00-\x1f]{1,120}\.(xlsx|xls|csv|tsv|txt|xml|json|pdf|mpp|png|jpg|jpeg|webp|docx)$/i;
const MAX_FILE = 20 * 1024 * 1024, MAX_DOC = 20 * 1024 * 1024;

function cors(req, env) {
  const o = req.headers.get('Origin') || '';
  const allow = (env.ORIGINS || 'https://danialmor.github.io').split(',').map(s => s.trim()).filter(Boolean);
  const ok = !o || allow.includes(o) || allow.includes('*') || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
  return { ok, h: { 'Access-Control-Allow-Origin': ok && o ? o : allow[0], 'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,X-By,X-Pin,X-If-T,Authorization', 'Access-Control-Max-Age': '600', Vary: 'Origin' } };
}
const json = (o, s, h) => new Response(JSON.stringify(o), { status: s || 200, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, h) });
async function sha256(buf) { const d = await crypto.subtle.digest('SHA-256', buf); return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join(''); }

async function ixSet(env, site, name, meta) {
  let ix = await env.VX.get('fidx:' + site, 'json');
  if (!ix) { ix = []; let cur; do { const l = await env.VX.list({ prefix: 'file:' + site + ':', cursor: cur }); l.keys.forEach(x => ix.push(Object.assign({ name: x.name.slice(('file:' + site + ':').length) }, x.metadata || {}))); cur = l.list_complete ? null : l.cursor; } while (cur); }
  ix = ix.filter(x => x.name !== name); if (meta) ix.push(Object.assign({ name }, meta)); ix.sort((a, b) => a.name < b.name ? -1 : 1);
  await env.VX.put('fidx:' + site, JSON.stringify(ix));
}
// ── Workers AI behind an OpenAI-compatible endpoint, so the VERTEX assistant can use Cloudflare's models without any API token in the browser
const AI_MODELS = ['@cf/deepseek-ai/deepseek-r1-distill-qwen-32b', '@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/qwen/qwen2.5-coder-32b-instruct', '@cf/meta/llama-3.1-8b-instruct-fast', '@cf/mistralai/mistral-small-3.1-24b-instruct', '@cf/google/gemma-3-12b-it'];
async function cfCred(env) { try { return env.VX ? await env.VX.get('sec:cfai', 'json') : null } catch (e) { return null } }
async function aiCred(req, env, H, m) {
  if (m === 'GET') { const c = await cfCred(env); return json({ set: !!c, account: c ? c.name || '' : '', t: c ? c.t : 0, binding: !!env.AI }, 200, H) }
  if (m !== 'GET' && env.ADMIN_PIN && req.headers.get('X-Pin') !== env.ADMIN_PIN) return json({ error: 'forbidden' }, 403, H);
  if (m === 'DELETE') { await env.VX.delete('sec:cfai'); return json({ ok: true }, 200, H) }
  if (m !== 'PUT') return json({ error: 'method' }, 405, H);
  let b; try { b = await req.json() } catch (e) { return json({ error: 'bad-json' }, 400, H) }
  const tok = String(b.token || '').trim(); if (!/^[\w-]{20,}$/.test(tok)) return json({ error: 'bad-token' }, 400, H);
  const cf = (p) => fetch('https://api.cloudflare.com/client/v4' + p, { headers: { Authorization: 'Bearer ' + tok } }).then(r => r.json()).catch(() => ({}));
  const v = await cf('/user/tokens/verify'); if (!v.success) return json({ error: 'token-invalid', detail: ((v.errors || [])[0] || {}).message || '' }, 400, H);
  let acc = String(b.account || '').trim(), name = '';
  if (!acc) { const a = await cf('/accounts'); const L = a.result || []; if (!L.length) return json({ error: 'no-account', detail: 'Account ID را وارد کنید یا به توکن دسترسی Account Read بدهید' }, 400, H); acc = L[0].id; name = L[0].name || '' }
  if (!/^[a-f0-9]{32}$/.test(acc)) return json({ error: 'bad-account' }, 400, H);
  const probe = await fetch('https://api.cloudflare.com/client/v4/accounts/' + acc + '/ai/v1/chat/completions', { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: AI_MODELS[3], messages: [{ role: 'user', content: 'ok' }], max_tokens: 5 }) }).catch(() => null);
  if (!probe || !probe.ok) { let d = ''; try { d = JSON.stringify((await probe.json()).errors || '').slice(0, 200) } catch (e) { } return json({ error: 'no-ai-permission', detail: 'توکن باید دسترسی «Workers AI: Read/Edit» داشته باشد ' + d }, 400, H) }
  await env.VX.put('sec:cfai', JSON.stringify({ token: tok, account: acc, name: name || acc.slice(0, 6) + '…', t: Date.now() }));
  return json({ ok: true, account: name || acc.slice(0, 6) + '…' }, 200, H);
}
async function aiChat(req, env, H) {
  const cred = env.AI ? null : await cfCred(env);
  if (!env.AI && !cred) return json({ error: { message: 'Cloudflare AI is not connected: add the "AI" binding or save an API token in the control panel' } }, 501, H);
  if (env.AI_KEY && (req.headers.get('Authorization') || '') !== 'Bearer ' + env.AI_KEY) return json({ error: { message: 'bad key' } }, 401, H);
  let b; try { b = await req.json() } catch (e) { return json({ error: { message: 'bad-json' } }, 400, H) }
  const model = AI_MODELS.includes(b.model) ? b.model : AI_MODELS[0];
  const messages = (b.messages || []).slice(-40).map(x => ({ role: x.role === 'assistant' || x.role === 'system' ? x.role : 'user', content: String(x.content || '').slice(0, 60000) }));
  const opt = { messages, max_tokens: Math.min(+b.max_tokens || 1500, 4000) };
  const id = 'cf-' + Date.now().toString(36), strip = t => String(t || '').replace(/<think>[\s\S]*?<\/think>\s*/g, '');
  if (cred) { // REST: Cloudflare's own OpenAI-compatible endpoint, streamed straight through
    const r = await fetch('https://api.cloudflare.com/client/v4/accounts/' + cred.account + '/ai/v1/chat/completions', { method: 'POST', headers: { Authorization: 'Bearer ' + cred.token, 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ model, stream: !!b.stream }, opt)) });
    return new Response(r.body, { status: r.status, headers: Object.assign({ 'Content-Type': r.headers.get('Content-Type') || 'application/json', 'Cache-Control': 'no-store' }, H) });
  }
  if (!b.stream) { const r = await env.AI.run(model, opt); return json({ id, object: 'chat.completion', model, choices: [{ index: 0, message: { role: 'assistant', content: strip(r && r.response) }, finish_reason: 'stop' }] }, 200, H); }
  const src = await env.AI.run(model, Object.assign({ stream: true }, opt)), te = new TextEncoder(), td = new TextDecoder();
  let buf = '', inThink = false;
  const out = src.pipeThrough(new TransformStream({
    transform(ch, ctl) { buf += td.decode(ch, { stream: true }); let i;
      while ((i = buf.indexOf('\n')) >= 0) { const ln = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!ln.startsWith('data:')) continue; const d = ln.slice(5).trim(); if (d === '[DONE]') continue;
        try { let t = JSON.parse(d).response || ''; if (t.includes('<think>')) inThink = true; if (inThink) { const k = t.indexOf('</think>'); if (k < 0) continue; inThink = false; t = t.slice(k + 8) } if (t) ctl.enqueue(te.encode('data: ' + JSON.stringify({ id, object: 'chat.completion.chunk', model, choices: [{ index: 0, delta: { content: t } }] }) + '\n\n')) } catch (e) { } } },
    flush(ctl) { ctl.enqueue(te.encode('data: [DONE]\n\n')) }
  }));
  return new Response(out, { headers: Object.assign({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' }, H) });
}
export default {
  async fetch(req, env) {
    const c = cors(req, env), H = c.h;
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: H });
    if (!c.ok) return json({ error: 'origin-not-allowed' }, 403, H);
    const url = new URL(req.url), seg = url.pathname.split('/').filter(Boolean).map(decodeURIComponent), m = req.method;
    try {
      if (seg[0] === 'health') return json({ ok: true, version: VERSION, kv: !!env.VX }, 200, H);
      if (seg[0] === 'ai' && seg[1] === 'v1') { if (seg[2] === 'models') return json({ object: 'list', data: AI_MODELS.map(id => ({ id, object: 'model' })) }, 200, H); if (seg[2] === 'chat' && seg[3] === 'completions' && m === 'POST') return aiChat(req, env, H); }
      if (seg[0] === 'ai' && seg[1] === 'cred') { if (!env.VX) return json({ error: 'kv-not-bound' }, 500, H); return aiCred(req, env, H, m); }
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
