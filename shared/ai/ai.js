// VERTEX local AI — floating icon + rail button + chat panel.
// The model runs in a Web Worker on the user's device. Nothing is sent to any server.
(function () {
  if (window.__vxAI) return; window.__vxAI = 1;
  const htok = () => { try { return localStorage.getItem('hub.token') || ''; } catch (e) { return ''; } };
  const VIAHUB = !/github\.io$/i.test(location.hostname) && location.protocol !== 'file:';
  const BASE = new URL('./', document.currentScript ? document.currentScript.src : location.href).href;
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z"/><path d="M5 15l.6 1.4L7 17l-1.4.6L5 19l-.6-1.4L3 17l1.4-.6z"/></svg>';

  const css = `
#vxaiFab{position:fixed;left:16px;bottom:16px;z-index:9998;width:44px;height:44px;border-radius:50%;border:0;cursor:pointer;color:#fff;
 background:linear-gradient(135deg,#1b6f52,#2f78c4);box-shadow:0 6px 18px rgba(20,40,40,.22);display:grid;place-items:center;transition:transform .2s}
#vxaiFab:hover{transform:scale(1.06)}#vxaiFab svg{width:21px;height:21px}
#vxaiFab.busy::after{content:'';position:absolute;inset:-3px;border-radius:50%;border:2px solid transparent;border-top-color:#f2b230;animation:vxspin 1s linear infinite}
@keyframes vxspin{to{transform:rotate(360deg)}}@keyframes vxpulse{50%{box-shadow:0 0 0 6px rgba(214,71,59,.18)}}
.rail .vxai svg{width:20px;height:20px}
#vxai{position:fixed;left:16px;bottom:70px;z-index:9999;width:min(340px,calc(100vw - 32px));height:min(480px,calc(100vh - 100px));display:none;flex-direction:column;
 background:var(--card,#fff);color:var(--ink,#14181a);border-radius:16px;box-shadow:0 12px 36px rgba(0,0,0,.16);overflow:hidden;font:inherit;font-size:12px;direction:rtl;border:1px solid rgba(127,127,127,.14)}
#vxai.open{display:flex}
#vxai header{display:flex;align-items:center;gap:7px;padding:9px 11px;border-bottom:1px solid rgba(127,127,127,.12)}
#vxai header>svg{color:#1b6f52;flex:none}
#vxai header b{font-size:12.5px;font-weight:700}#vxai header small{color:var(--muted,#7a8380);font-size:10px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:190px}
#vxai header .hb{margin-inline-start:auto;display:flex;gap:2px}
#vxai header button{background:none;border:0;color:var(--muted,#7a8380);border-radius:8px;width:26px;height:26px;padding:0;cursor:pointer;font:inherit;font-size:13px;display:grid;place-items:center}
#vxai header button:hover{background:rgba(127,127,127,.12);color:inherit}#vxai header button.on{color:#1b6f52}
#vxai header button[hidden]{display:none}
#vxai .log{flex:1;overflow:auto;padding:10px;display:flex;flex-direction:column;gap:6px;font-size:12px;line-height:1.7}
#vxai .m{max-width:86%;padding:6px 9px;border-radius:12px;white-space:pre-wrap;word-break:break-word}
#vxai .u{align-self:flex-start;background:#e9f3ee;color:#14181a;border-bottom-right-radius:4px}
#vxai .a{align-self:flex-end;background:rgba(127,127,127,.08);border-bottom-left-radius:4px}
#vxai .sys{align-self:center;font-size:10.5px;color:var(--muted,#7a8380);text-align:center;max-width:90%}
#vxai .bar{height:4px;border-radius:9px;background:rgba(127,127,127,.15);overflow:hidden;margin:5px 0}#vxai .bar i{display:block;height:100%;width:0;background:#1b6f52;transition:width .3s}
#vxai form{display:flex;gap:5px;align-items:flex-end;padding:8px;border-top:1px solid rgba(127,127,127,.12)}
#vxai textarea{flex:1;resize:none;height:32px;max-height:90px;border-radius:10px;border:1px solid rgba(127,127,127,.22);padding:6px 9px;font:inherit;font-size:12px;line-height:1.6;background:transparent;color:inherit}
#vxai form button{flex:none;border:0;border-radius:10px;width:32px;height:32px;padding:0;cursor:pointer;font:inherit;font-size:13px;display:grid;place-items:center}
#vxai form button[type=submit]{background:#1b6f52;color:#fff}
#vxai form .lng{background:none;color:var(--muted,#7a8380);width:26px!important;font-size:10.5px!important;font-weight:700}#vxai form .mic{background:rgba(127,127,127,.1);color:inherit}#vxai form .mic svg{width:15px;height:15px}
#vxai form .mic.busy{opacity:.5;cursor:wait}#vxai form .mic.rec{background:#d6473b;color:#fff;animation:vxpulse 1.2s infinite}#vxai form .mic[hidden]{display:none}
#vxai .set{display:none}
#vxai .rate{display:flex;gap:2px;align-self:flex-end;margin-top:-3px}#vxai .rate button{border:0;background:none;cursor:pointer;opacity:.4;font-size:11px;padding:0 2px}#vxai .rate button.on{opacity:1}
#vxai .chips{display:flex;flex-wrap:wrap;gap:4px;padding:0 10px 6px}#vxai .chips button{border:1px solid rgba(127,127,127,.2);background:transparent;color:var(--muted,#6b7572);border-radius:99px;padding:2px 9px;font:inherit;font-size:10.5px;cursor:pointer}
#vxai .chips button:hover{color:inherit;border-color:rgba(127,127,127,.4)}
`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const fab = document.createElement('button');
  fab.id = 'vxaiFab'; fab.type = 'button'; fab.title = 'دستیار هوش مصنوعی (محلی)'; fab.setAttribute('aria-label', 'دستیار هوش مصنوعی'); fab.innerHTML = ICON;
  document.body.appendChild(fab);

  const box = document.createElement('div'); box.id = 'vxai';
  box.innerHTML = `<header>${ICON.replace('<svg', '<svg style="width:17px;height:17px"')}<div><b>دستیار VERTEX</b><small id="vxaiSt"></small></div><div class="hb"><button type="button" data-x="set" title="تنظیمات" hidden>⚙</button><button type="button" data-x="tts" title="خواندن پاسخ با صدا" aria-label="خواندن پاسخ با صدا">🔈</button><button type="button" data-x="clear" title="پاک کردن گفتگو" aria-label="پاک کردن">↺</button><button type="button" data-x="close" title="بستن" aria-label="بستن">✕</button></div></header>
<div class="set" id="vxaiSet" hidden><label>موتور <select data-k="mode"><option value="coarena">آنلاین · Coarena (رایگان، قوی)</option><option value="local">محلی · Qwen 0.5B (بدون اینترنت)</option></select></label>
<div class="on1 kst" id="vxaiKst">کلید API: …</div>
<label class="on1 adm" hidden>کلید جدید (مدیر) <input data-k="key" type="password" placeholder="coa_…" autocomplete="off"><button type="button" data-x="savekey">ذخیره روی سرور</button></label>
<label class="on1">مدل <select data-k="model"><option value="gpt-6-luna">gpt-6-luna</option></select></label>
<small class="on1">کلید را فقط مدیر اکوسیستم (با کلید GitHub واردشده در «بارگذاری») وارد می‌کند و روی سرور، در مخزن، برای همه‌ی کاربران ذخیره می‌شود.</small></div>
<div class="log" id="vxaiLog"><div class="sys">بنویسید یا 🎙 را بزنید و بگویید.</div></div>
<div class="chips"><button type="button">خلاصه‌ی وضعیت پروژه‌ها</button><button type="button">کدام پروژه بیشترین تأخیر را دارد؟</button></div>
<form><textarea placeholder="پیام…" rows="1"></textarea><button type="button" class="lng" title="زبان گفتار" aria-label="زبان گفتار">فا</button><button type="button" class="mic" title="گفتن با صدا" aria-label="گفتن با صدا"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button><button type="submit" title="ارسال" aria-label="ارسال">↑</button></form>`;
  document.body.appendChild(box);

  function addRail() {
    const rail = document.querySelector('.rail'); if (!rail || rail.querySelector('.vxai')) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'vxai'; b.title = 'دستیار هوش مصنوعی'; b.setAttribute('aria-label', 'دستیار هوش مصنوعی'); b.innerHTML = ICON;
    b.addEventListener('click', toggle);
    const plus = rail.querySelector('.plus'); plus ? plus.after(b) : rail.prepend(b);
  }
  addRail(); setTimeout(addRail, 1500);

  const log = box.querySelector('#vxaiLog'), stEl = box.querySelector('#vxaiSt'), ta = box.querySelector('textarea');
  let worker, ready = false, cur = null, hist = [], gen = false;

  function msg(cls, t) { if (cls === 'u') { const ch = box.querySelector('.chips'); if (ch) ch.style.display = 'none'; } const d = document.createElement('div'); d.className = 'm ' + cls; d.textContent = t; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; }
  function sys(h) { const d = document.createElement('div'); d.className = 'sys'; d.innerHTML = h; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; }

  let progEl;
  function ensureWorker() {
    if (worker) return;
    worker = new Worker(BASE + 'worker.js', { type: 'module' });
    fab.classList.add('busy');
    progEl = sys('در حال بارگذاری مدل… <div class="bar"><i></i></div><span class="pp">0%</span>');
    worker.onmessage = (e) => {
      const m = e.data;
      if (m.t === 'prog' && progEl) { progEl.querySelector('i').style.width = m.p + '%'; progEl.querySelector('.pp').textContent = m.cached ? 'از حافظه‌ی مرورگر' : m.p + '%'; }
      if (m.t === 'status') {
        if (m.s === 'ready') { ready = true; fab.classList.remove('busy'); stEl.textContent = 'آماده · ' + (m.device === 'webgpu' ? 'WebGPU (سریع)' : 'WASM (کندتر)') + ' · بدون سرور'; if (progEl) { progEl.remove(); progEl = null; } }
        else stEl.textContent = 'در حال بارگذاری · ' + m.device;
      }
      if (m.t === 'tok' && cur) { cur.textContent += m.x; log.scrollTop = log.scrollHeight; }
      if (m.t === 'done') { if (cur) { hist.push({ role: 'assistant', content: cur.textContent }); if (window.__vxSay) window.__vxSay(cur.textContent); } cur = null; gen = false; fab.classList.remove('busy'); btn.textContent = '↑'; }
      if (m.t === 'err') { gen = false; fab.classList.remove('busy'); btn.textContent = '↑'; sys('خطا: ' + m.e.replace(/</g, '&lt;')); cur = null; }
    };
    worker.postMessage({ t: 'load' });
  }

  function context(q) {
    let c = '';
    try { if (typeof window.VX_CTX === 'function') c = window.VX_CTX(q || '') || ''; } catch (e) {}
    const pg = 'Current page: ' + (document.title || location.pathname) + ' (' + location.pathname + ').\n';
    if (!c) return 'You are the VERTEX ecosystem assistant (construction project management, mail, files, trading, executive desk). ' + pg + 'Answer briefly and clearly. Reply in Persian if the user writes Persian.' + (SRV.prompt ? '\n' + SRV.prompt : '');
    return 'You are VERTEX, a construction project assistant. Answer briefly and clearly. Reply in Persian if the user writes Persian. ' +
      'Facts only from this data (done=actual progress, plan=planned to date, late=delay days, end=planned→forecast end; schedule lines: WBS | activity | start→finish (Jalali) | % done | flags). Dates are Jalali (Persian calendar). If the data does not contain the answer, say so.\n' + (c || 'no data');
  }

  // Instant, exact answers from the dashboard data for common questions (the 0.5B model is weak at Persian facts).
  function facts(q) {
    let D = []; try { D = (window.VX_DATA && window.VX_DATA()) || []; } catch (e) {}
    if (!D.length) return '';
    const fa = (n) => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
    const t = q.toLowerCase();
    const one = D.find(x => (x.n && q.includes(x.n)) || (x.en && t.includes(x.en.toLowerCase())));
    const line = x => `• ${x.n}: پیشرفت ${fa(x.pr)}٪ (برنامه ${fa(x.pl)}٪) · تأخیر ${fa(x.dl)} روز · پایان ${fa(x.end)} ← با تأخیر ${fa(x.endD)}${x.est ? ' (تخمینی)' : ''}`;
    if (one && /وضع|پیشرفت|تأخیر|تاخیر|پایان|status|progress|delay/.test(t)) return line(one);
    if (/(بیشترین|بیشتر|most|longest).*(تأخیر|تاخیر|delay)|(تأخیر|تاخیر|delay).*(بیشترین|most)/.test(t)) {
      const S = D.slice().sort((a, b) => b.dl - a.dl).slice(0, 3);
      return 'بیشترین تأخیر:\n' + S.map(line).join('\n');
    }
    if (/(عقب|کمترین پیشرفت|behind)/.test(t)) {
      const S = D.slice().sort((a, b) => (a.pr - a.pl) - (b.pr - b.pl)).slice(0, 3);
      return 'بیشترین عقب‌ماندگی از برنامه:\n' + S.map(line).join('\n');
    }
    if (/خلاصه|وضعیت (همه|پروژه)|summary|overview/.test(t) && !/english|انگلیسی/.test(t)) return 'خلاصه‌ی وضعیت پروژه‌ها:\n' + D.map(line).join('\n');
    return '';
  }

  // Shared assistant config saved by the ecosystem admin in the repo: shared/ai/config.json
  // Key is stored lightly encoded (not secret: the repo is public).
  let SRV = { k: '', model: '' , t: 0 };
  const dec = (k) => { try { return k ? atob(k).split('').reverse().join('') : ''; } catch (e) { return ''; } };
  const enc = (k) => btoa(k.split('').reverse().join(''));
  function needCloud() { if (window.VX_CLOUD) return Promise.resolve(window.VX_CLOUD); return new Promise(function (res) { var sc = document.createElement('script'); sc.src = new URL('../cloud.js', BASE).href; sc.onload = function () { res(window.VX_CLOUD || null) }; sc.onerror = function () { res(null) }; document.head.appendChild(sc) }) }
  async function loadSrv() {
    // 1) VERTEX Cloud (Cloudflare) doc "ai-config" — set in control panel → هوش مصنوعی
    try { const CL = await needCloud(); if (CL && CL.on) { const j = await CL.getDoc('ai-config'); if (j && (j.k || j.model || j.mode)) { SRV = { k: dec(j.k), model: j.model || '', t: j.t || 0, mode: j.mode || 'coarena', enabled: j.enabled !== false, name: j.name || '', prompt: String(j.prompt || '').slice(0, 2000) }; return applySrv(); } } } catch (e) {}
    // Settings live in the control panel (هوش مصنوعی) → shared/ai/config.json. GitHub API first (fresh), Pages copy as fallback.
    const tries = ['https://api.github.com/repos/danialmor/VERTEX/contents/shared/ai/config.json?ref=main&t=' + Date.now(), BASE + 'config.json?t=' + Date.now()];
    for (const u of tries) {
      try { const r = await fetch(u, { cache: 'no-store', headers: u.includes('api.github') ? { Accept: 'application/vnd.github.raw+json' } : {} }); if (r.ok) { const j = await r.json(); if (j && (j.k || j.model || j.mode)) { SRV = { k: dec(j.k), model: j.model || '', t: j.t || 0, mode: j.mode || 'coarena', enabled: j.enabled !== false, name: j.name || '', prompt: String(j.prompt || '').slice(0, 2000) }; break; } } } catch (e) {}
    }
    applySrv();
  }
  function applySrv() {
    if (SRV.model) cfg.model = SRV.model;
    if (SRV.mode) { cfg.mode = SRV.mode; try { fld('mode').value = cfg.mode; } catch (e) {} setEl.classList.toggle('loc', cfg.mode === 'local'); }
    if (SRV.enabled === false) { fab.hidden = true; document.querySelectorAll('.rail .vxai').forEach(b => b.hidden = true); box.classList.remove('open'); }
    if (SRV.name) { const hb = box.querySelector('header b'); if (hb) hb.textContent = SRV.name; }
    kst(); label();
  }
  function kst() {
    const el = box.querySelector('#vxaiKst'); if (!el) return;
    el.innerHTML = SRV.k ? 'کلید API: <b>✓ تنظیم‌شده توسط مدیر · روی سرور</b>' : 'کلید API: <span style="color:#a3520f">هنوز توسط مدیر وارد نشده</span>';
    const adm = box.querySelector('.adm'); if (adm) adm.hidden = !(window.VX_ADMIN && window.VX_ADMIN.can());
  }
  const CFG_K = 'vxaiCfg';
  let cfg = { mode: 'coarena', model: 'gpt-6-luna' };
  try { const o = JSON.parse(localStorage.getItem(CFG_K) || '{}'); delete o.key; Object.assign(cfg, o); } catch (e) {}
  const setEl = box.querySelector('#vxaiSet');
  const fld = k => setEl.querySelector('[data-k=' + k + ']');
  function saveCfg() { try { localStorage.setItem(CFG_K, JSON.stringify(cfg)); } catch (e) {} setEl.classList.toggle('loc', cfg.mode === 'local'); label(); }
  function label() { if (VIAHUB && cfg.mode !== 'local') { stEl.textContent = 'آنلاین · Coarena از طریق سرور خودمان · ' + cfg.model; return; } if (cfg.mode === 'local') { if (!ready) stEl.textContent = 'محلی · Qwen 0.5B · بدون سرور'; } else stEl.textContent = 'آنلاین · Coarena · ' + cfg.model + (SRV.k ? '' : ' · کلید در کنترل پنل وارد نشده'); }
  fld('mode').value = cfg.mode;
  ['mode', 'model'].forEach(k => fld(k).addEventListener('change', () => { cfg[k] = fld(k).value.trim(); if (k === 'model') cfg.modelSet = 1; saveCfg(); if (k === 'mode' && cfg.mode === 'local') ensureWorker(); }));
  let modelsLoaded = false;
  function loadModels() {
    if (modelsLoaded) return; modelsLoaded = true;
    fetch(API + '/models').then(r => r.json()).then(j => {
      const ids = (j.data || []).map(m => m.id); if (!ids.length) return;
      if (!ids.includes(cfg.model)) ids.unshift(cfg.model);
      fld('model').innerHTML = ids.map(i => '<option>' + i.replace(/</g, '') + '</option>').join(''); fld('model').value = cfg.model;
    }).catch(() => { modelsLoaded = false; });
  }
  box.querySelector('[data-x=set]').addEventListener('click', () => { setEl.hidden = !setEl.hidden; loadModels(); kst(); });
  box.querySelector('[data-x=savekey]').addEventListener('click', async (e) => {
    const b = e.target, k = fld('key').value.trim();
    if (!/^coa_/.test(k)) { sys('کلید Coarena باید با coa_ شروع شود.'); return; }
    b.disabled = true; b.textContent = 'در حال ذخیره…';
    try {
      const t = Date.now();
      await window.VX_ADMIN.put('shared/ai/config.json', { k: enc(k), model: cfg.model, t, note: 'Coarena key set by the ecosystem admin from msp-bi' });
      SRV = { k, model: cfg.model, t }; fld('key').value = ''; kst(); label();
      sys('✓ کلید روی سرور (مخزن GitHub) ذخیره شد و برای همه‌ی کاربران فعال است.');
    } catch (err) { sys('ذخیره انجام نشد: ' + String(err.message || err).replace(/</g, '&lt;')); }
    b.disabled = false; b.textContent = 'ذخیره روی سرور';
  });
  saveCfg(); loadSrv();

  const API = 'https://coarena.ai/api/v1';
  // On our own server the hub holds the Coarena key (config ai_key) and proxies: /api/v1/ai/stream, /api/v1/ai/feedback.

  let ctl = null;
  async function online(msgs) {
    ctl = new AbortController();
    let r;
    if (VIAHUB) return viaHub(msgs);
    try {
      r = await fetch(API + '/chat/completions', { method: 'POST', signal: ctl.signal, headers: { 'Authorization': 'Bearer ' + SRV.k, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: cfg.model, messages: msgs, stream: true, max_tokens: 1500 }) });
      if (!r.ok) { let t = ''; try { const j = await r.json(); t = (j.error && j.error.message) || ''; } catch (e) {}
        // Free Coarena accounts only allow some models: switch to a free one and retry once.
        if ((r.status === 402 || /free tier/i.test(t)) && cfg.model !== 'gpt-6-luna' && !msgs.__retry) { cfg.model = 'gpt-6-luna'; label(); msgs.__retry = 1; ctl = null; return online(msgs); }
        throw new Error(r.status + ' ' + t); }
      const rd = r.body.getReader(), dec = new TextDecoder(); let buf = '', id = '';
      for (;;) {
        const { value, done } = await rd.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let i; while ((i = buf.indexOf('\n')) >= 0) {
          const ln = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
          if (!ln.startsWith('data:')) continue; const d = ln.slice(5).trim(); if (d === '[DONE]') continue;
          try { const j = JSON.parse(d); id = id || j.id || ''; const x = j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content; if (x && cur) { cur.textContent += x; log.scrollTop = log.scrollHeight; } } catch (e) {}
        }
      }
      const el = cur; finish(); if (id && el) rateBar(el, id);
    } catch (e) { const el = cur; finish(); if (e.name === 'AbortError') return; if (el && !el.textContent) el.remove(); sys('خطا: ' + String(e.message || e).replace(/</g, '&lt;')); }
  }
  async function viaHub(msgs) {
    try {
      const sysm = msgs[0] && msgs[0].role === 'system' ? msgs[0].content : '';
      const r = await fetch('/api/v1/ai/stream', { method: 'POST', signal: ctl.signal, headers: { 'Authorization': 'Bearer ' + htok(), 'Content-Type': 'application/json' }, body: JSON.stringify({ system: sysm, messages: msgs.filter(m => m.role !== 'system'), model: cfg.model }) });
      if (!r.ok) { let t = ''; try { t = (await r.json()).error || ''; } catch (e) {} throw new Error(r.status === 401 ? 'ابتدا وارد شوید' : r.status === 501 ? 'کلید هوش مصنوعی روی سرور تنظیم نشده' : r.status + ' ' + t); }
      const rd = r.body.getReader(), dec = new TextDecoder(); let buf = '', id = '';
      for (;;) {
        const { value, done } = await rd.read(); if (done) break;
        buf += dec.decode(value, { stream: true }); let i;
        while ((i = buf.indexOf('\n')) >= 0) { const ln = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!ln.startsWith('data:')) continue;
          try { const j = JSON.parse(ln.slice(5)); if (j.t && cur) { cur.textContent += j.t; log.scrollTop = log.scrollHeight; } if (j.id) id = j.id; } catch (e) {} }
      }
      const el = cur; finish(); if (id && el) rateBar(el, id);
    } catch (e) { const el = cur; finish(); if (e.name === 'AbortError') return; if (el && !el.textContent) el.remove(); sys('خطا: ' + String(e.message || e).replace(/</g, '&lt;')); }
  }
  function finish() { if (cur && cur.textContent) { hist.push({ role: 'assistant', content: cur.textContent }); if (window.__vxSay) window.__vxSay(cur.textContent); } cur = null; gen = false; ctl = null; fab.classList.remove('busy'); btn.textContent = '↑'; }
  function rateBar(el, id) {
    const d = document.createElement('div'); d.className = 'rate';
    d.innerHTML = '<button type="button" data-r="up" title="خوب">👍</button><button type="button" data-r="down" title="بد">👎</button>';
    d.addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]'); if (!b) return;
      const on = b.classList.contains('on'); d.querySelectorAll('button').forEach(x => x.classList.remove('on')); if (!on) b.classList.add('on');
      if (VIAHUB) { fetch('/api/v1/ai/feedback', { method: 'POST', headers: { 'Authorization': 'Bearer ' + htok(), 'Content-Type': 'application/json' }, body: JSON.stringify({ request_id: id, rating: on ? null : b.dataset.r }) }).catch(() => {}); return; }
      fetch(API + '/feedback', { method: 'POST', headers: { 'Authorization': 'Bearer ' + SRV.k, 'Content-Type': 'application/json' }, body: JSON.stringify({ request_id: id, rating: on ? null : b.dataset.r }) }).catch(() => {});
    });
    el.after(d);
  }

  const btn = box.querySelector('form button[type=submit]');
  function send(q) {
    q = (q || '').trim(); if (!q) return;
    if (gen) return;
    const isOn = cfg.mode !== 'local';
    if (isOn && !SRV.k && !VIAHUB) { setEl.hidden = false; loadModels(); kst(); sys('دستیار هنوز راه‌اندازی نشده: مدیر باید در کنترل پنل ← «هوش مصنوعی» کلید Coarena را وارد کند.'); return; }
    const quick = !isOn && facts(q); if (quick) { msg('u', q); msg('a', quick); if (window.__vxSay) window.__vxSay(quick); return; }
    if (!isOn) ensureWorker();
    msg('u', q); hist.push({ role: 'user', content: q }); hist = hist.slice(-4);
    cur = msg('a', ''); gen = true; fab.classList.add('busy'); btn.textContent = '■';
    const msgs = [{ role: 'system', content: context(q) }].concat(hist); window.VXAI.last = msgs;
    if (isOn) online(msgs); else worker.postMessage({ t: 'chat', messages: msgs });
  }
  box.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); if (gen) { if (ctl) ctl.abort(); else if (worker) worker.postMessage({ t: 'stop' }); return; } send(ta.value); ta.value = ''; });
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); box.querySelector('form').requestSubmit(); } });
  box.querySelectorAll('.chips button').forEach(b => b.addEventListener('click', () => send(b.textContent)));
  box.querySelector('[data-x=close]').addEventListener('click', toggle);
  box.querySelector('[data-x=clear]').addEventListener('click', () => { hist = []; log.querySelectorAll('.m,.rate').forEach(x => x.remove()); const ch = box.querySelector('.chips'); if (ch) ch.style.display = ''; });

  // ── voice: speak the question (Web Speech recognition) and optionally hear the answer (speech synthesis)
  const mic = box.querySelector('.mic'), ttsB = box.querySelector('[data-x=tts]');
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, recOn = false, tts = false;
  try { tts = localStorage.getItem('vxaiTts') === '1'; } catch (e) {}
  if (!('speechSynthesis' in window)) ttsB.hidden = true;
  const ttsPaint = () => { ttsB.classList.toggle('on', tts); ttsB.textContent = tts ? '🔊' : '🔈'; ttsB.title = tts ? 'خواندن پاسخ: روشن' : 'خواندن پاسخ: خاموش'; };
  ttsPaint();
  ttsB.addEventListener('click', () => { tts = !tts; try { localStorage.setItem('vxaiTts', tts ? '1' : '0'); } catch (e) {} if (!tts) try { speechSynthesis.cancel(); } catch (e) {} ttsPaint(); });
  const isFa = (t) => /[؀-ۿ]/.test(t);
  function say(t) {
    if (!tts || !t || !('speechSynthesis' in window)) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t.replace(/[*#`_>|]/g, ' ').slice(0, 1200)); u.lang = isFa(t) ? 'fa-IR' : 'en-US';
      const v = speechSynthesis.getVoices().find(x => x.lang && x.lang.toLowerCase().startsWith(u.lang.slice(0, 2))); if (v) u.voice = v; u.rate = 1.02; speechSynthesis.speak(u); } catch (e) {}
  }
  window.__vxSay = say;
  // Voice input = record with the microphone (MediaRecorder) + Whisper in the browser (shared/ai/stt.js). Works in Safari on iPad;
  // the browser asks for microphone permission on the first tap.
  let micLang = 'fa'; try { micLang = localStorage.getItem('vxaiMicLang') || 'fa'; } catch (e) {}
  const lngB = box.querySelector('.lng'); const lngPaint = () => { lngB.textContent = micLang === 'en' ? 'EN' : 'فا'; lngB.title = micLang === 'en' ? 'زبان گفتار: انگلیسی' : 'زبان گفتار: فارسی'; }; lngPaint();
  lngB.addEventListener('click', () => { micLang = micLang === 'en' ? 'fa' : 'en'; try { localStorage.setItem('vxaiMicLang', micLang); } catch (e) {} lngPaint(); });
  let sttW = null, sttReady = false, sttId = 0, mr = null, stream = null, recT = 0, recHint = null;
  function stt() {
    if (sttW) return sttW;
    sttW = new Worker(BASE + 'stt.js', { type: 'module' });
    sttW.onmessage = (e) => { const m = e.data;
      if (m.t === 'prog' && recHint && !sttReady) recHint.textContent = 'بار اول: دریافت مدل تبدیل صدا… ' + m.p + '٪';
      if (m.t === 'ready') sttReady = true;
      if (m.t === 'text') { if (recHint) { recHint.remove(); recHint = null; } mic.classList.remove('busy'); if (m.text) { ta.value = ''; send(m.text); } else sys('صدایی تشخیص داده نشد؛ دوباره امتحان کنید.'); }
      if (m.t === 'err') { if (recHint) { recHint.remove(); recHint = null; } mic.classList.remove('busy'); sys('تبدیل صدا انجام نشد: ' + String(m.e).replace(/</g, '&lt;')); }
    };
    return sttW;
  }
  async function toPcm16k(blob) {
    const AC = window.AudioContext || window.webkitAudioContext; const ac = new AC();
    const buf = await ac.decodeAudioData(await blob.arrayBuffer()); try { ac.close(); } catch (e) {}
    const len = Math.max(1, Math.ceil(buf.duration * 16000)); const oc = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, len, 16000);
    const src = oc.createBufferSource(); src.buffer = buf; src.connect(oc.destination); src.start(); const r = await oc.startRendering(); return r.getChannelData(0);
  }
  function stopRec() { if (mr && mr.state !== 'inactive') try { mr.stop(); } catch (e) {} clearTimeout(recT); }
  mic.addEventListener('click', async () => {
    if (mic.classList.contains('busy')) return;
    if (mr && mr.state === 'recording') { stopRec(); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) { sys('این مرورگر ضبط صدا را پشتیبانی نمی‌کند؛ از دکمه‌ی 🎤 صفحه‌کلید استفاده کنید.'); return; }
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } }); }
    catch (e) { sys(e && e.name === 'NotAllowedError' ? 'اجازه‌ی میکروفون داده نشد. در Safari: آیکن «aA» کنار نشانی ← Website Settings ← Microphone ← Allow.' : 'میکروفون در دسترس نیست: ' + String(e && e.message || e)); return; }
    stt(); if (!sttReady) sttW.postMessage({ t: 'load' });
    const chunks = []; mr = new MediaRecorder(stream);
    mr.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    mr.onstop = async () => {
      mic.classList.remove('rec'); try { stream.getTracks().forEach(t => t.stop()); } catch (e) {}
      const blob = new Blob(chunks, { type: mr.mimeType || 'audio/mp4' }); if (!blob.size) { if (recHint) { recHint.remove(); recHint = null; } return; }
      mic.classList.add('busy'); if (recHint) recHint.textContent = sttReady ? 'در حال تبدیل صدا به متن…' : 'بار اول: دریافت مدل تبدیل صدا (حدود ۷۷ مگابایت)…';
      try { const pcm = await toPcm16k(blob); stt().postMessage({ t: 'stt', id: ++sttId, audio: pcm, lang: micLang === 'en' ? 'english' : 'persian' }, [pcm.buffer]); }
      catch (e) { mic.classList.remove('busy'); if (recHint) { recHint.remove(); recHint = null; } sys('خواندن صدای ضبط‌شده ممکن نشد.'); }
    };
    mr.start(); mic.classList.add('rec'); if (recHint) recHint.remove(); recHint = sys('🎙 در حال شنیدن… حرفتان که تمام شد دوباره 🎙 را بزنید');
    recT = setTimeout(stopRec, 30000);
  });
  const ERR = { 'not-allowed': 'اجازه‌ی میکروفون داده نشده. در Safari: آیکن «aA» کنار نشانی ← Website Settings ← Microphone ← Allow.',
    'service-not-allowed': 'تبدیل صدا به متن در این دستگاه خاموش است. در iPad: Settings ← General ← Keyboard ← Enable Dictation را روشن کنید (و Siri).',
    'audio-capture': 'میکروفونی پیدا نشد یا برنامه‌ی دیگری از آن استفاده می‌کند.', 'network': 'برای تبدیل صدا به اینترنت نیاز است.',
    'no-speech': 'صدایی شنیده نشد؛ دوباره 🎙 را بزنید و صحبت کنید.', 'language-not-supported': 'زبان فارسی برای تبدیل صدا پشتیبانی نشد؛ به انگلیسی امتحان شد.' };
  let hint = null, dog = 0;
  function resetRec(m) { recOn = false; clearTimeout(dog); mic.classList.remove('rec'); if (hint) { hint.remove(); hint = null; } try { rec && rec.abort(); } catch (e) {} if (m) sys(m); }
  function startRec(lang, retried) {
    rec = new SR(); rec.lang = lang; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
    const base = ta.value ? ta.value + ' ' : ''; let finalT = '', any = false, err = '';
    let started = false;
    rec.onstart = () => { started = true; };
    rec.onaudiostart = () => { started = true; };
    rec.onresult = (e) => { any = true; started = true; clearTimeout(dog); dog = setTimeout(() => { try { rec.stop(); } catch (x) {} }, 2500); let it = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) finalT += r[0].transcript; else it += r[0].transcript; } ta.value = base + finalT + it; };
    rec.onerror = (e) => { err = e.error || 'error'; };
    rec.onend = () => {
      clearTimeout(dog); recOn = false; mic.classList.remove('rec'); if (hint) { hint.remove(); hint = null; }
      if (err === 'language-not-supported' && !retried) { sys(ERR[err]); return startRec('en-US', true); }
      if (err && err !== 'aborted') { sys(ERR[err] || ('تبدیل صدا انجام نشد (' + err + ')')); return; }
      const q = (base + finalT).trim() || (any ? ta.value.trim() : '');
      if (q) { ta.value = ''; send(q); } else if (!err) sys(ERR['no-speech']);
    };
    if (hint) hint.remove(); hint = sys('🎙 در حال شنیدن… صحبت کنید (برای توقف دوباره بزنید)');
    try { rec.start(); recOn = true; mic.classList.add('rec'); } catch (e) { resetRec('شروع ضبط صدا ممکن نشد: ' + String(e.message || e).replace(/</g, '&lt;')); return; }
    // Safari on iPad sometimes starts but never answers: stop after a while and explain.
    dog = setTimeout(() => { if (recOn && !any) resetRec(started ? 'صدایی دریافت نشد؛ دوباره 🎙 را بزنید و بلافاصله صحبت کنید.' : 'مرورگر به میکروفون پاسخ نداد. اگر در iPad هستید: Settings ← General ← Keyboard ← Enable Dictation را روشن کنید؛ یا داخل کادر پیام دکمه‌ی 🎤 صفحه‌کلید را بزنید.'); }, 8000);
  }
  ta.addEventListener('input', () => { ta.style.height = '32px'; ta.style.height = Math.min(90, ta.scrollHeight) + 'px'; });
  function toggle() { box.classList.toggle('open'); if (box.classList.contains('open')) { if (cfg.mode === 'local') ensureWorker(); else loadModels(); ta.focus(); } }
  fab.addEventListener('click', toggle);
  // Programmatic one-shot question (no chat UI): used by page widgets (e.g. the home spotlight). Resolves to the answer text.
  async function ask(q, sysTxt) {
    if (cfg.enabled === false) throw new Error('off');
    const msgs = [{ role: 'system', content: (sysTxt || '') + '\n\n' + context(q) }, { role: 'user', content: q }];
    if (VIAHUB) { const r = await fetch('/api/v1/ai', { method: 'POST', headers: { 'Authorization': 'Bearer ' + htok(), 'Content-Type': 'application/json' }, body: JSON.stringify({ system: msgs[0].content, prompt: q, model: cfg.model }) }); const j = await r.json(); if (!r.ok) throw new Error(j.error || r.status); return j.text || ''; }
    if (cfg.mode === 'local' || !SRV.k) throw new Error('no-online-ai');
    const call = async (model) => fetch(API + '/chat/completions', { method: 'POST', headers: { 'Authorization': 'Bearer ' + SRV.k, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages: msgs, max_tokens: 700 }) });
    let r = await call(cfg.model); if (r.status === 402 && cfg.model !== 'gpt-6-luna') r = await call('gpt-6-luna');
    const j = await r.json(); if (!r.ok) throw new Error((j.error && j.error.message) || r.status);
    return ((j.choices || [{}])[0].message || {}).content || '';
  }
  window.VXAI = { open: () => { if (!box.classList.contains('open')) toggle(); }, send, ask, ready: () => !!(cfg && (VIAHUB || (cfg.mode !== 'local' && SRV.k))) };
})();
