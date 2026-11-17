// VERTEX local AI — floating icon + rail button + chat panel.
// The model runs in a Web Worker on the user's device. Nothing is sent to any server.
(function () {
  if (window.__vxAI) return; window.__vxAI = 1;
  const BASE = new URL('./', document.currentScript ? document.currentScript.src : location.href).href;
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z"/><path d="M5 15l.6 1.4L7 17l-1.4.6L5 19l-.6-1.4L3 17l1.4-.6z"/></svg>';

  const css = `
#vxaiFab{position:fixed;left:18px;bottom:18px;z-index:9998;width:52px;height:52px;border-radius:50%;border:0;cursor:pointer;color:#fff;
 background:linear-gradient(135deg,#1b6f52,#2f78c4);box-shadow:0 8px 24px rgba(20,40,40,.28);display:grid;place-items:center;transition:transform .2s}
#vxaiFab:hover{transform:scale(1.07)}#vxaiFab svg{width:26px;height:26px}
#vxaiFab.busy::after{content:'';position:absolute;inset:-4px;border-radius:50%;border:2px solid transparent;border-top-color:#f2b230;animation:vxspin 1s linear infinite}
@keyframes vxspin{to{transform:rotate(360deg)}}
.rail .vxai svg{width:20px;height:20px}
#vxai{position:fixed;left:18px;bottom:82px;z-index:9999;width:min(400px,calc(100vw - 36px));height:min(560px,calc(100vh - 120px));display:none;flex-direction:column;
 background:var(--card,#fff);color:var(--ink,#14181a);border-radius:20px;box-shadow:0 18px 50px rgba(0,0,0,.25);overflow:hidden;font:inherit;direction:rtl;border:1px solid rgba(0,0,0,.06)}
#vxai.open{display:flex}
#vxai header{display:flex;align-items:center;gap:8px;padding:12px 14px;background:linear-gradient(135deg,#1b6f52,#2f78c4);color:#fff}
#vxai header b{font-size:14px}#vxai header small{opacity:.85;font-size:11px;display:block}
#vxai header button{margin-inline-start:auto;background:rgba(255,255,255,.18);border:0;color:#fff;border-radius:10px;padding:4px 9px;cursor:pointer;font:inherit;font-size:12px}
#vxai .log{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:8px;font-size:13px;line-height:1.75}
#vxai .m{max-width:88%;padding:8px 11px;border-radius:14px;white-space:pre-wrap;word-break:break-word}
#vxai .u{align-self:flex-start;background:#e7f2ec;color:#14181a}
#vxai .a{align-self:flex-end;background:rgba(127,127,127,.1)}
#vxai .sys{align-self:center;font-size:11.5px;color:var(--muted,#6b7572);text-align:center}
#vxai .bar{height:6px;border-radius:9px;background:rgba(127,127,127,.15);overflow:hidden;margin:6px 0}#vxai .bar i{display:block;height:100%;width:0;background:#1b6f52;transition:width .3s}
#vxai form{display:flex;gap:6px;padding:10px;border-top:1px solid rgba(127,127,127,.15)}
#vxai textarea{flex:1;resize:none;height:40px;border-radius:12px;border:1px solid rgba(127,127,127,.25);padding:8px 10px;font:inherit;font-size:13px;background:transparent;color:inherit}
#vxai form button{border:0;border-radius:12px;padding:0 14px;background:#1b6f52;color:#fff;cursor:pointer;font:inherit;font-size:13px}
#vxai .set{display:grid;gap:6px;padding:10px 12px;border-bottom:1px solid rgba(127,127,127,.15);font-size:12px}#vxai .set[hidden]{display:none}#vxai .set label{display:flex;gap:8px;align-items:center}#vxai .set input,#vxai .set select{flex:1;font:inherit;font-size:12px;padding:5px 8px;border-radius:9px;border:1px solid rgba(127,127,127,.3);background:transparent;color:inherit}#vxai .set .kst{font-size:12px}#vxai .set .kst b{color:#16704a}#vxai .set button[data-x=savekey]{border:0;border-radius:9px;background:#1b6f52;color:#fff;padding:5px 10px;font:inherit;font-size:12px;cursor:pointer}#vxai .set small{color:var(--muted,#6b7572)}#vxai .set.loc .on1{display:none}
#vxai .rate{display:flex;gap:4px;align-self:flex-end;margin-top:-4px}#vxai .rate button{border:0;background:none;cursor:pointer;opacity:.55;font-size:14px}#vxai .rate button.on{opacity:1}
#vxai .chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 8px}#vxai .chips button{border:1px solid rgba(127,127,127,.25);background:transparent;color:inherit;border-radius:99px;padding:3px 10px;font:inherit;font-size:11.5px;cursor:pointer}
`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const fab = document.createElement('button');
  fab.id = 'vxaiFab'; fab.type = 'button'; fab.title = 'دستیار هوش مصنوعی (محلی)'; fab.setAttribute('aria-label', 'دستیار هوش مصنوعی'); fab.innerHTML = ICON;
  document.body.appendChild(fab);

  const box = document.createElement('div'); box.id = 'vxai';
  box.innerHTML = `<header>${ICON.replace('<svg', '<svg style="width:22px;height:22px"')}<div><b>دستیار VERTEX</b><small id="vxaiSt">روی دستگاه شما اجرا می‌شود · بدون سرور</small></div><button type="button" data-x="set" title="تنظیمات">⚙</button><button type="button" data-x="clear">پاک کردن</button><button type="button" data-x="close">✕</button></header>
<div class="set" id="vxaiSet" hidden><label>موتور <select data-k="mode"><option value="coarena">آنلاین · Coarena (رایگان، قوی)</option><option value="local">محلی · Qwen 0.5B (بدون اینترنت)</option></select></label>
<div class="on1 kst" id="vxaiKst">کلید API: …</div>
<label class="on1 adm" hidden>کلید جدید (مدیر) <input data-k="key" type="password" placeholder="coa_…" autocomplete="off"><button type="button" data-x="savekey">ذخیره روی سرور</button></label>
<label class="on1">مدل <select data-k="model"><option value="claude-sonnet-5-5">claude-sonnet-5-5</option></select></label>
<small class="on1">کلید را فقط مدیر اکوسیستم (با کلید GitHub واردشده در «بارگذاری») وارد می‌کند و روی سرور، در مخزن، برای همه‌ی کاربران ذخیره می‌شود.</small></div>
<div class="log" id="vxaiLog"><div class="sys">دو موتور دارد (⚙): «آنلاین · Coarena» قوی و رایگان (کلید را مدیر روی سرور ثبت می‌کند)، و «محلی · Qwen 0.5B» که بدون اینترنت داخل مرورگر اجرا می‌شود (بار اول ۴۸۰ مگابایت).<br>اطلاعات پروژه‌ها به‌صورت خودکار به آن داده می‌شود.</div></div>
<div class="chips"><button type="button">خلاصه‌ی وضعیت پروژه‌ها</button><button type="button">کدام پروژه بیشترین تأخیر را دارد؟</button><button type="button">Summarize delays in English</button></div>
<form><textarea placeholder="سؤال خود را بنویسید…"></textarea><button type="submit">ارسال</button></form>`;
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

  function msg(cls, t) { const d = document.createElement('div'); d.className = 'm ' + cls; d.textContent = t; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; }
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
      if (m.t === 'done') { if (cur) hist.push({ role: 'assistant', content: cur.textContent }); cur = null; gen = false; fab.classList.remove('busy'); btn.textContent = 'ارسال'; }
      if (m.t === 'err') { gen = false; fab.classList.remove('busy'); btn.textContent = 'ارسال'; sys('خطا: ' + m.e.replace(/</g, '&lt;')); cur = null; }
    };
    worker.postMessage({ t: 'load' });
  }

  function context() {
    let c = '';
    try { if (typeof window.VX_CTX === 'function') c = window.VX_CTX() || ''; } catch (e) {}
    return 'You are VERTEX, a construction project assistant. Answer briefly and clearly. Reply in Persian if the user writes Persian. ' +
      'Facts only from this data (done=actual progress, plan=planned to date, late=delay days, end=planned→forecast end):\n' + (c || 'no data');
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
  async function loadSrv() {
    const tries = [BASE + 'config.json?t=' + Date.now(), 'https://api.github.com/repos/danialmor/VERTEX/contents/shared/ai/config.json?ref=main'];
    for (const u of tries) {
      try { const r = await fetch(u, { cache: 'no-store', headers: u.includes('api.github') ? { Accept: 'application/vnd.github.raw+json' } : {} }); if (r.ok) { const j = await r.json(); if (j && (j.k || j.model)) { SRV = { k: dec(j.k), model: j.model || '', t: j.t || 0 }; break; } } } catch (e) {}
    }
    if (SRV.model && !cfg.modelSet) cfg.model = SRV.model;
    kst(); label();
  }
  function kst() {
    const el = box.querySelector('#vxaiKst'); if (!el) return;
    el.innerHTML = SRV.k ? 'کلید API: <b>✓ تنظیم‌شده توسط مدیر · روی سرور</b>' : 'کلید API: <span style="color:#a3520f">هنوز توسط مدیر وارد نشده</span>';
    const adm = box.querySelector('.adm'); if (adm) adm.hidden = !(window.VX_ADMIN && window.VX_ADMIN.can());
  }
  const CFG_K = 'vxaiCfg';
  let cfg = { mode: 'coarena', model: 'claude-sonnet-5-5' };
  try { const o = JSON.parse(localStorage.getItem(CFG_K) || '{}'); delete o.key; Object.assign(cfg, o); } catch (e) {}
  const setEl = box.querySelector('#vxaiSet');
  const fld = k => setEl.querySelector('[data-k=' + k + ']');
  function saveCfg() { try { localStorage.setItem(CFG_K, JSON.stringify(cfg)); } catch (e) {} setEl.classList.toggle('loc', cfg.mode === 'local'); label(); }
  function label() { if (cfg.mode === 'local') { if (!ready) stEl.textContent = 'محلی · Qwen 0.5B · بدون سرور'; } else stEl.textContent = 'آنلاین · Coarena · ' + cfg.model + (SRV.k ? '' : ' · کلید توسط مدیر وارد نشده'); }
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
  let ctl = null;
  async function online(msgs) {
    ctl = new AbortController();
    let r;
    try {
      r = await fetch(API + '/chat/completions', { method: 'POST', signal: ctl.signal, headers: { 'Authorization': 'Bearer ' + SRV.k, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: cfg.model, messages: msgs, stream: true, max_tokens: 1500 }) });
      if (!r.ok) { let t = ''; try { const j = await r.json(); t = (j.error && j.error.message) || ''; } catch (e) {} throw new Error(r.status + ' ' + t); }
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
  function finish() { if (cur && cur.textContent) hist.push({ role: 'assistant', content: cur.textContent }); cur = null; gen = false; ctl = null; fab.classList.remove('busy'); btn.textContent = 'ارسال'; }
  function rateBar(el, id) {
    const d = document.createElement('div'); d.className = 'rate';
    d.innerHTML = '<button type="button" data-r="up" title="خوب">👍</button><button type="button" data-r="down" title="بد">👎</button>';
    d.addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]'); if (!b) return;
      const on = b.classList.contains('on'); d.querySelectorAll('button').forEach(x => x.classList.remove('on')); if (!on) b.classList.add('on');
      fetch(API + '/feedback', { method: 'POST', headers: { 'Authorization': 'Bearer ' + SRV.k, 'Content-Type': 'application/json' }, body: JSON.stringify({ request_id: id, rating: on ? null : b.dataset.r }) }).catch(() => {});
    });
    el.after(d);
  }

  const btn = box.querySelector('form button');
  function send(q) {
    q = (q || '').trim(); if (!q) return;
    if (gen) return;
    const isOn = cfg.mode !== 'local';
    if (isOn && !SRV.k) { setEl.hidden = false; loadModels(); kst(); sys('کلید Coarena هنوز توسط مدیر اکوسیستم روی سرور ثبت نشده. تا آن موقع می‌توانید موتور «محلی» را انتخاب کنید.'); return; }
    const quick = !isOn && facts(q); if (quick) { msg('u', q); msg('a', quick); return; }
    if (!isOn) ensureWorker();
    msg('u', q); hist.push({ role: 'user', content: q }); hist = hist.slice(-4);
    cur = msg('a', ''); gen = true; fab.classList.add('busy'); btn.textContent = 'توقف';
    const msgs = [{ role: 'system', content: context() }].concat(hist); window.VXAI.last = msgs;
    if (isOn) online(msgs); else worker.postMessage({ t: 'chat', messages: msgs });
  }
  box.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); if (gen) { if (ctl) ctl.abort(); else if (worker) worker.postMessage({ t: 'stop' }); return; } send(ta.value); ta.value = ''; });
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); box.querySelector('form').requestSubmit(); } });
  box.querySelectorAll('.chips button').forEach(b => b.addEventListener('click', () => send(b.textContent)));
  box.querySelector('[data-x=close]').addEventListener('click', toggle);
  box.querySelector('[data-x=clear]').addEventListener('click', () => { hist = []; log.querySelectorAll('.m').forEach(x => x.remove()); });

  function toggle() { box.classList.toggle('open'); if (box.classList.contains('open')) { if (cfg.mode === 'local') ensureWorker(); else loadModels(); ta.focus(); } }
  fab.addEventListener('click', toggle);
  window.VXAI = { open: () => { if (!box.classList.contains('open')) toggle(); }, send };
})();
