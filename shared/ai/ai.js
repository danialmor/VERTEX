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
#vxai .side,#vxai .sideb{display:none}
#vxai.full{flex-direction:column;padding-inline-start:290px}
#vxai.full .side{display:flex;flex-direction:column;position:absolute;inset-inline-start:0;top:0;bottom:0;width:290px;background:color-mix(in srgb,var(--ink,#14181a) 4%,var(--card,#fff));border-inline-end:1px solid rgba(127,127,127,.16);padding:12px;box-sizing:border-box;gap:8px;z-index:3}
#vxai.full .sideb{display:none}
#vxai .side .nw{display:flex;gap:8px;align-items:center;justify-content:center;padding:10px;border-radius:12px;border:1px solid rgba(127,127,127,.25);background:var(--card,#fff);color:inherit;font:inherit;font-weight:700;cursor:pointer}
#vxai .side .nw:hover{background:rgba(127,127,127,.08)}
#vxai .side input{padding:8px 10px;border-radius:10px;border:1px solid rgba(127,127,127,.25);background:transparent;color:inherit;font:inherit;font-size:13px}
#vxai .side .cl{flex:1;overflow:auto;display:grid;align-content:start;gap:2px;margin-top:4px}
#vxai .side .gp{font-size:11px;color:var(--muted,#888);margin:10px 6px 4px}
#vxai .side .it{display:flex;align-items:center;gap:4px;border-radius:10px;padding:2px 4px 2px 2px}
#vxai .side .it>button.t{flex:1;min-width:0;text-align:start;border:0;background:none;color:inherit;font:inherit;font-size:13px;padding:8px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}
#vxai .side .it.on,#vxai .side .it:hover{background:rgba(127,127,127,.12)}
#vxai .side .it .ac{display:none;gap:2px}#vxai .side .it:hover .ac,#vxai .side .it.on .ac{display:flex}
#vxai .side .it .ac{flex-direction:row!important;flex:0 0 auto}#vxai .side .it .ac button{border:0;background:none;cursor:pointer;font-size:12px;padding:4px!important;border-radius:6px;color:inherit;opacity:.7;width:auto!important;height:auto!important;min-width:0!important}#vxai .side .it>button.t{flex:1 1 0!important;min-width:0!important;width:auto!important;height:auto!important}#vxai .side .it{overflow:hidden}
#vxai .side .ft{font-size:11px;color:var(--muted,#888);border-top:1px solid rgba(127,127,127,.15);padding-top:8px;display:flex;gap:8px;flex-wrap:wrap}
#vxai .side .ft button{border:0;background:none;color:inherit;cursor:pointer;font:inherit;text-decoration:underline}
#vxai.full .log{display:flex;flex-direction:column}#vxai.full .log .m{max-width:760px}#vxai.full .log .m.a{align-self:stretch;max-width:760px;width:100%;margin-inline:auto}
#vxai.full .log .m.a{background:transparent;border:0;padding-inline:0;font-size:14.5px;line-height:1.9}
#vxai .m.a pre{background:rgba(127,127,127,.1);padding:10px;border-radius:10px;overflow:auto;direction:ltr;text-align:left;white-space:pre}
#vxai .m.a code{background:rgba(127,127,127,.12);padding:1px 5px;border-radius:5px;font-size:.92em}
#vxai .m.a table{border-collapse:collapse;margin:6px 0}#vxai .m.a td,#vxai .m.a th{border:1px solid rgba(127,127,127,.3);padding:4px 8px}
#vxai .m.a ul,#vxai .m.a ol{margin:4px 0;padding-inline-start:20px}#vxai .m.a h3,#vxai .m.a h4{margin:8px 0 4px}
#vxai .tools{display:flex;gap:4px;margin:-2px 0 6px}#vxai .tools button{border:0;background:none;cursor:pointer;font-size:12px;opacity:.6;padding:3px 6px;border-radius:6px;color:inherit}#vxai .tools button:hover{opacity:1;background:rgba(127,127,127,.12)}
#vxai .welcome{display:none}
#vxai.full .welcome{display:grid;gap:14px;justify-items:center;margin:auto;padding:40px 10px;text-align:center}
#vxai.full .welcome h2{margin:0;font-size:26px;font-weight:600}
#vxai.full .welcome .cards{display:grid;grid-template-columns:repeat(2,minmax(0,260px));gap:10px}
#vxai.full .welcome .cards button{text-align:start;border:1px solid rgba(127,127,127,.25);background:var(--card,#fff);color:inherit;border-radius:14px;padding:12px;font:inherit;font-size:13px;cursor:pointer;line-height:1.7}
#vxai.full .welcome .cards button:hover{background:rgba(127,127,127,.07)}
#vxai.full.has .welcome{display:none}
#vxai.full .chips{display:none}
@media (max-width:820px){#vxai.full{padding-inline-start:0}#vxai.full .sideb{display:inline-block;border:0;background:none;font-size:18px;cursor:pointer;color:inherit}#vxai.full .side{transform:translateX(100%);transition:transform .2s;box-shadow:0 0 40px rgba(0,0,0,.25);width:min(290px,85vw)}#vxai.full.sopen .side{transform:none}#vxai.full .welcome .cards{grid-template-columns:1fr}}

#vxai.full{left:0!important;right:0!important;top:0!important;bottom:0!important;width:100vw!important;height:100vh!important;height:100dvh!important;border-radius:0!important;font-size:14px;z-index:10000}#vxai.full .log{padding:18px max(18px,calc((100vw - 860px)/2))}#vxai.full form{padding-inline:max(12px,calc((100vw - 860px)/2))}#vxai.full .chips{padding-inline:max(12px,calc((100vw - 860px)/2))}

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
  box.innerHTML = `<aside class="side" id="vxaiSide"></aside><header><button type="button" data-x="side" class="sideb" title="گفتگوها" aria-label="گفتگوها">☰</button>${ICON.replace('<svg', '<svg style="width:17px;height:17px"')}<div><b>دستیار VERTEX</b><small id="vxaiSt"></small></div><div class="hb"><button type="button" data-x="set" title="تنظیمات" hidden>⚙</button><button type="button" data-x="page" title="باز کردن در پلتفرم هوش مصنوعی" aria-label="پلتفرم هوش مصنوعی">↗</button><button type="button" data-x="full" title="صفحه‌ی کامل دستیار" aria-label="صفحه‌ی کامل">⤢</button><button type="button" data-x="tts" title="خواندن پاسخ با صدا" aria-label="خواندن پاسخ با صدا">🔈</button><button type="button" data-x="clear" title="پاک کردن گفتگو" aria-label="پاک کردن">↺</button><button type="button" data-x="close" title="بستن" aria-label="بستن">✕</button></div></header>
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
    b.addEventListener('click', () => { if (window.VXAI && VXAI.full) VXAI.full(true); else toggle(); });
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
      if (m.t === 'done') { if (cur) { postAnswer(cur); hist.push({ role: 'assistant', content: cur.textContent }); if (window.__vxSay) window.__vxSay(cur.textContent); } cur = null; gen = false; fab.classList.remove('busy'); btn.textContent = '↑'; }
      if (m.t === 'err') { gen = false; fab.classList.remove('busy'); btn.textContent = '↑'; sys('خطا: ' + m.e.replace(/</g, '&lt;')); cur = null; }
    };
    worker.postMessage({ t: 'load' });
  }

  // Knowledge from the admin (answers to questions the assistant could not answer) + flag for unanswered questions.
  let KB = []; let lastQ = '';
  async function loadKB() { try { const CL = await needCloud(); if (CL && CL.on) { const j = await CL.getDoc('ai-kb'); KB = (j && j.items) || []; } } catch (e) {} }
  const NA = '\n\nIf you cannot answer accurately from the given data or knowledge, start your reply with the exact token [?] and then say briefly what is missing.';
  function kbText(q) { if (!KB.length) return ''; const w = String(q || '').split(/\s+/).filter(x => x.length > 2); const sc = KB.map(k => ({ k, s: w.filter(x => (k.q + ' ' + k.a).indexOf(x) >= 0).length })).sort((a, b) => b.s - a.s).slice(0, 12).map(x => x.k);
    return '\n\nVerified answers from the administrator (use them when relevant):\n' + sc.map(k => 'Q: ' + k.q + '\nA: ' + k.a).join('\n'); }
  function context(q) { return context0(q) + kbText(q) + NA; }
  function context0(q) {
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
    try { const CL = await needCloud(); if (CL && CL.on) { const j = await CL.getDoc('ai-config'); if (j && (j.k || j.model || j.mode)) { SRV = { k: dec(j.k), model: j.model || '', t: j.t || 0, mode: j.mode || 'coarena', enabled: j.enabled !== false, name: j.name || '', prompt: String(j.prompt || '').slice(0, 2000), prov: (j.providers || []).filter(p => p && p.on !== false && p.base).map(p => ({ id: String(p.id || p.name), name: p.name || p.id, base: String(p.base).replace(/\/+$/, ''), k: dec(p.k), model: p.model || '', pri: +p.pri || 0 })).sort((a, b) => a.pri - b.pri) }; return applySrv(); } } } catch (e) {}
    // Settings live in the control panel (هوش مصنوعی) → shared/ai/config.json. GitHub API first (fresh), Pages copy as fallback.
    const tries = ['https://api.github.com/repos/danialmor/VERTEX/contents/shared/ai/config.json?ref=main&t=' + Date.now(), BASE + 'config.json?t=' + Date.now()];
    for (const u of tries) {
      try { const r = await fetch(u, { cache: 'no-store', headers: u.includes('api.github') ? { Accept: 'application/vnd.github.raw+json' } : {} }); if (r.ok) { const j = await r.json(); if (j && (j.k || j.model || j.mode)) { SRV = { k: dec(j.k), model: j.model || '', t: j.t || 0, mode: j.mode || 'coarena', enabled: j.enabled !== false, name: j.name || '', prompt: String(j.prompt || '').slice(0, 2000), prov: (j.providers || []).filter(p => p && p.on !== false && p.base).map(p => ({ id: String(p.id || p.name), name: p.name || p.id, base: String(p.base).replace(/\/+$/, ''), k: dec(p.k), model: p.model || '', pri: +p.pri || 0 })).sort((a, b) => a.pri - b.pri) }; break; } } } catch (e) {}
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

  // ── provider chain (control panel → هوش مصنوعی): Coarena first unless the admin reorders; any OpenAI-compatible API can be added; on failure the next one answers
  function chain(model) {
    const L = []; const P = (SRV.prov || []).filter(p => p.k);
    const hasCo = P.some(p => /coarena\.ai/.test(p.base));
    if (SRV.k && !hasCo) L.push({ id: 'coarena', name: 'Coarena', base: API, k: SRV.k, model: model || cfg.model, pri: -1 });
    P.forEach(p => L.push(Object.assign({}, p, { model: p.model || (/coarena\.ai/.test(p.base) ? (model || cfg.model) : '') })));
    return L.filter(p => p.model).sort((a, b) => a.pri - b.pri);
  }
  const PLAT = (() => { const m = location.pathname.match(/\/([\w-]+)\/(?:index\.html)?$/); return m ? m[1] : 'home' })();
  const USE_K = 'vxaiUse';
  function meter(pid, ok, ms) {
    try { const U = JSON.parse(localStorage.getItem(USE_K) || '{}'), d = new Date().toISOString().slice(0, 10); const a = ((U[d] = U[d] || {})[pid] = U[d][pid] || { ok: 0, err: 0, ms: 0, pg: {} }); ok ? a.ok++ : a.err++; a.ms += Math.round(ms || 0); a.pg[PLAT] = (a.pg[PLAT] || 0) + 1; localStorage.setItem(USE_K, JSON.stringify(U)); } catch (e) {}
    clearTimeout(meter.t); meter.t = setTimeout(flushUse, 20000);
  }
  async function flushUse() {
    let U; try { U = JSON.parse(localStorage.getItem(USE_K) || '{}') } catch (e) { return } if (!Object.keys(U).length) return;
    try { const CL = await needCloud(); if (!CL || !CL.on) return;
      for (let k = 0; k < 3; k++) { const j = (await CL.getDoc('ai-usage')) || { d: {} }; j.d = j.d || {};
        Object.keys(U).forEach(d => Object.keys(U[d]).forEach(pid => { const a = U[d][pid], b = ((j.d[d] = j.d[d] || {})[pid] = j.d[d][pid] || { ok: 0, err: 0, ms: 0, pg: {} }); b.ok += a.ok; b.err += a.err; b.ms += a.ms; Object.keys(a.pg || {}).forEach(g => { b.pg[g] = (b.pg[g] || 0) + a.pg[g] }) }));
        Object.keys(j.d).sort().slice(0, -60).forEach(d => delete j.d[d]);
        try { await CL.putDoc('ai-usage', { t: Date.now(), d: j.d }, j.t || 0); localStorage.removeItem(USE_K); return } catch (e) { if (!e.conflict) return } }
    } catch (e) {}
  }
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushUse() });

  let ctl = null;
  async function online(msgs) {
    if (!VIAHUB) { const C = chain(); if (C.length > 1 || (C[0] && C[0].id !== 'coarena')) return onlineChain(msgs, C); }
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
      const el = cur; finish(); meter('coarena', true, 0); if (id && el) rateBar(el, id);
    } catch (e) { const el = cur; finish(); if (e.name === 'AbortError') return; meter('coarena', false, 0); if (el && !el.textContent) el.remove(); sys('خطا: ' + String(e.message || e).replace(/</g, '&lt;')); }
  }
  async function onlineChain(msgs, C) {
    let lastErr = '';
    for (const p of C) {
      ctl = new AbortController(); const t0 = performance.now();
      try {
        const r = await fetch(p.base + '/chat/completions', { method: 'POST', signal: ctl.signal, headers: { 'Authorization': 'Bearer ' + p.k, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: p.model, messages: msgs, stream: true, max_tokens: 1500 }) });
        if (!r.ok) { let t = ''; try { const j = await r.json(); t = (j.error && (j.error.message || j.error)) || '' } catch (e) {} throw new Error(r.status + ' ' + t) }
        const rd = r.body.getReader(), td = new TextDecoder(); let buf = '', id = '', got = false;
        for (;;) { const { value, done } = await rd.read(); if (done) break; buf += td.decode(value, { stream: true }); let i;
          while ((i = buf.indexOf('\n')) >= 0) { const ln = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!ln.startsWith('data:')) continue; const d = ln.slice(5).trim(); if (d === '[DONE]') continue;
            try { const j = JSON.parse(d); id = id || j.id || ''; const x = j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content; if (x && cur) { got = true; cur.textContent += x; log.scrollTop = log.scrollHeight; } } catch (e) {} } }
        if (!got) throw new Error('پاسخ خالی');
        meter(p.id, true, performance.now() - t0); const el = cur; finish(); if (id && el && /coarena\.ai/.test(p.base)) rateBar(el, id); return;
      } catch (e) { if (e.name === 'AbortError') { const el = cur; finish(); return } meter(p.id, false, performance.now() - t0); lastErr = p.name + ': ' + (e.message || e); if (cur) cur.textContent = ''; }
    }
    const el = cur; finish(); if (el && !el.textContent) el.remove(); sys('خطا: هیچ‌کدام از سرویس‌های هوش مصنوعی پاسخ ندادند — ' + String(lastErr).replace(/</g, '&lt;'));
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
  async function logQA(q, a, na) {
    try { const CL = await needCloud(); if (!CL || !CL.on || !q) return; let u = ''; try { u = (JSON.parse(localStorage.getItem('vxSess') || 'null') || {}).u || '' } catch (e) {}
      const it = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t: Date.now(), u, page: (document.title || location.pathname).slice(0, 60), q: q.slice(0, 600), a: String(a || '').slice(0, 1500), na: na ? 1 : 0 };
      for (let k = 0; k < 3; k++) { const j = (await CL.getDoc('ai-log')) || { items: [] }; const L = (j.items || []).concat([it]).slice(-600); try { await CL.putDoc('ai-log', { t: Date.now(), items: L }, j.t || 0); break } catch (e) { if (!e.conflict) throw e } }
      return it.id; } catch (e) { }
  }
  async function markQA(id, o) { try { const CL = await needCloud(); const j = await CL.getDoc('ai-log'); if (!j) return; (j.items || []).forEach(x => { if (x.id === id) Object.assign(x, o) }); await CL.putDoc('ai-log', { t: Date.now(), items: j.items }, j.t || 0) } catch (e) { } }
  async function flagQA(id) { try { const CL = await needCloud(); const j = await CL.getDoc('ai-log'); if (!j) return; (j.items || []).forEach(x => { if (x.id === id) x.na = 2 }); await CL.putDoc('ai-log', { t: Date.now(), items: j.items }, j.t || 0) } catch (e) { } }
  function postAnswer(el) { if (!el || !el.textContent) return; let t = el.textContent, na = /^\s*\[\?\]/.test(t); if (na) t = t.replace(/^\s*\[\?\]\s*/, ''); if (window.__vxChat) { __vxChat.add('a', t); el.innerHTML = __vxChat.md(t); __vxChat.tools(el, t) } else el.textContent = t; if (na) { const n = document.createElement('div'); n.className = 'm sys'; n.textContent = 'این پرسش برای بررسی به مدیر سیستم فرستاده شد.'; el.after(n); }
    logQA(lastQ, t, na).then(id => { if (id) el.dataset.qa = id; try { window.dispatchEvent(new CustomEvent('vxai-answer', { detail: { q: lastQ, a: t, na } })) } catch (e) { } }); }
  function finish() { if (cur && cur.textContent) { postAnswer(cur); hist.push({ role: 'assistant', content: cur.textContent }); if (window.__vxSay) window.__vxSay(cur.textContent); } cur = null; gen = false; ctl = null; fab.classList.remove('busy'); btn.textContent = '↑'; }
  function rateBar(el, id) {
    const d = document.createElement('div'); d.className = 'rate';
    d.innerHTML = '<button type="button" data-r="up" title="خوب">👍</button><button type="button" data-r="down" title="بد">👎</button>';
    d.addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]'); if (!b) return;
      const on = b.classList.contains('on'); d.querySelectorAll('button').forEach(x => x.classList.remove('on')); if (!on) b.classList.add('on');
      if (!on && b.dataset.r === 'down' && el.dataset.qa) flagQA(el.dataset.qa);
      if (!on && b.dataset.r === 'up' && el.dataset.qa) markQA(el.dataset.qa, { g: 1 });
      if (VIAHUB) { fetch('/api/v1/ai/feedback', { method: 'POST', headers: { 'Authorization': 'Bearer ' + htok(), 'Content-Type': 'application/json' }, body: JSON.stringify({ request_id: id, rating: on ? null : b.dataset.r }) }).catch(() => {}); return; }
      fetch(API + '/feedback', { method: 'POST', headers: { 'Authorization': 'Bearer ' + SRV.k, 'Content-Type': 'application/json' }, body: JSON.stringify({ request_id: id, rating: on ? null : b.dataset.r }) }).catch(() => {});
    });
    el.after(d);
  }

  const btn = box.querySelector('form button[type=submit]');
  function send(q, regen) {
    q = (q || '').trim(); if (!q) return; lastQ = q;
    if (gen) return;
    const isOn = cfg.mode !== 'local';
    if (isOn && !SRV.k && !VIAHUB) { setEl.hidden = false; loadModels(); kst(); sys('دستیار هنوز راه‌اندازی نشده: مدیر باید در کنترل پنل ← «هوش مصنوعی» کلید Coarena را وارد کند.'); return; }
    const quick = !isOn && facts(q); if (quick) { msg('u', q); msg('a', quick); if (window.__vxSay) window.__vxSay(quick); return; }
    if (!isOn) ensureWorker();
    msg('u', q); hist.push({ role: 'user', content: q }); hist = hist.slice(-4); if (window.__vxChat && !regen) __vxChat.add('u', q);
    cur = msg('a', ''); gen = true; fab.classList.add('busy'); btn.textContent = '■';
    const msgs = [{ role: 'system', content: context(q) }].concat(hist); window.VXAI.last = msgs;
    if (isOn) online(msgs); else worker.postMessage({ t: 'chat', messages: msgs });
  }
  box.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); if (gen) { if (ctl) ctl.abort(); else if (worker) worker.postMessage({ t: 'stop' }); return; } send(ta.value); ta.value = ''; });
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); box.querySelector('form').requestSubmit(); } });
  box.querySelectorAll('.chips button').forEach(b => b.addEventListener('click', () => send(b.textContent)));
  box.querySelector('[data-x=close]').addEventListener('click', toggle);
  const fullB = box.querySelector('[data-x=full]');
  function setFull(on) { box.classList.toggle('full', on); fullB.textContent = on ? '⤡' : '⤢'; fullB.title = on ? 'کادر کوچک' : 'صفحه‌ی کامل دستیار'; try { localStorage.setItem('vxaiFull', on ? '1' : '0') } catch (e) {} }
  fullB.addEventListener('click', () => setFull(!box.classList.contains('full')));
  try { if (localStorage.getItem('vxaiFull') === '1') setFull(true) } catch (e) {}
  if (/^#ai$/.test(location.hash)) setTimeout(() => { setFull(true); if (!box.classList.contains('open')) toggle(); }, 800);
  loadKB();
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
    const C = chain();
    if (cfg.mode !== 'local' && C.length) { let le = '';
      for (const p of C) { const t0 = performance.now(); try { const r = await fetch(p.base + '/chat/completions', { method: 'POST', headers: { 'Authorization': 'Bearer ' + p.k, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: p.model, messages: msgs, max_tokens: 700 }) }); const j = await r.json(); if (!r.ok) throw new Error((j.error && (j.error.message || j.error)) || r.status); const a = String(((j.choices || [{}])[0].message || {}).content || ''); if (!a) throw new Error('empty'); meter(p.id, true, performance.now() - t0); return a.replace(/^\s*\[\?\]\s*/, '') } catch (e) { meter(p.id, false, performance.now() - t0); le = e.message || e } }
      throw new Error(String(le)); }
    if (cfg.mode === 'local' || !SRV.k) throw new Error('no-online-ai');
    const call = async (model) => fetch(API + '/chat/completions', { method: 'POST', headers: { 'Authorization': 'Bearer ' + SRV.k, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages: msgs, max_tokens: 700 }) });
    let r = await call(cfg.model); if (r.status === 402 && cfg.model !== 'gpt-6-luna') r = await call('gpt-6-luna');
    const j = await r.json(); if (!r.ok) throw new Error((j.error && j.error.message) || r.status);
    return String(((j.choices || [{}])[0].message || {}).content || '').replace(/^\s*\[\?\]\s*/, '');
  }
  // ── ChatGPT-like page: conversations archive (this device + online per user), new chat, search, rename, pin, delete, export, markdown, copy, regenerate
  const side = box.querySelector('#vxaiSide');
  const who = () => { try { return (JSON.parse(localStorage.getItem('vxSess') || 'null') || {}).u || 'guest' } catch (e) { return 'guest' } };
  const CK = () => 'vxaiChats.' + who(), DOCN = () => 'ai-chats-' + String(who()).toLowerCase().replace(/[^a-z0-9._-]/g, '_').slice(0, 40);
  let CH = { list: [], cur: '' }, chSaveT = 0, chQ = '';
  try { CH.list = JSON.parse(localStorage.getItem(CK()) || '[]') } catch (e) { }
  const nid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  function chCur() { return CH.list.find(c => c.id === CH.cur) }
  function chSave() { try { localStorage.setItem(CK(), JSON.stringify(CH.list.slice(0, 300))) } catch (e) { } clearTimeout(chSaveT); chSaveT = setTimeout(async () => { try { const CL = await needCloud(); if (CL && CL.on) await CL.putDoc(DOCN(), { t: Date.now(), list: CH.list.slice(0, 300) }) } catch (e) { } }, 2000) }
  async function chPull() { try { const CL = await needCloud(); if (!CL || !CL.on) return; const j = await CL.getDoc(DOCN()); if (!j || !j.list) return; const by = {}; CH.list.concat(j.list).forEach(c => { if (!by[c.id] || (c.t || 0) > (by[c.id].t || 0)) by[c.id] = c }); CH.list = Object.values(by).filter(c => !c.del).sort((a, b) => b.t - a.t); try { localStorage.setItem(CK(), JSON.stringify(CH.list.slice(0, 300))) } catch (e) { } chSide() } catch (e) { } }
  function chAdd(r, c) { let ch = chCur(); if (!ch) { ch = { id: nid(), title: '', t: Date.now(), m: [] }; CH.list.unshift(ch); CH.cur = ch.id } ch.m.push({ r, c, t: Date.now() }); ch.t = Date.now(); if (!ch.title && r === 'u') ch.title = c.replace(/\s+/g, ' ').slice(0, 48); CH.list.sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || b.t - a.t); box.classList.add('has'); chSave(); chSide() }
  function esc2(t) { return String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }
  function md(t) {
    const blocks = []; t = String(t).replace(/```[\w-]*\n?([\s\S]*?)```/g, (m, c) => { blocks.push('<pre><code>' + esc2(c) + '</code></pre>'); return '\u0000' + (blocks.length - 1) + '\u0000' });
    let h = esc2(t).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|\s)\*([^*\n]+)\*/g, '$1<i>$2</i>');
    const L = h.split('\n'), out = []; let ul = 0, ol = 0, tb = [];
    const flushT = () => { if (!tb.length) return; const rows = tb.filter(r => !/^\s*\|?\s*:?-{2,}/.test(r)); out.push('<table>' + rows.map((r, i) => '<tr>' + r.replace(/^\s*\||\|\s*$/g, '').split('|').map(c => (i ? '<td>' : '<th>') + c.trim() + (i ? '</td>' : '</th>')).join('') + '</tr>').join('') + '</table>'); tb = [] };
    const close = () => { if (ul) { out.push('</ul>'); ul = 0 } if (ol) { out.push('</ol>'); ol = 0 } };
    L.forEach(l => { if (/^\s*\|.*\|\s*$/.test(l)) { close(); tb.push(l); return } flushT();
      let m; if ((m = l.match(/^\s*[-*•]\s+(.*)/))) { if (!ul) { close(); out.push('<ul>'); ul = 1 } out.push('<li>' + m[1] + '</li>'); return }
      if ((m = l.match(/^\s*[\d۰-۹]+[.)]\s+(.*)/))) { if (!ol) { close(); out.push('<ol>'); ol = 1 } out.push('<li>' + m[1] + '</li>'); return }
      close(); if ((m = l.match(/^#{1,4}\s+(.*)/))) { out.push('<h4>' + m[1] + '</h4>'); return } out.push(l.trim() ? l + '<br>' : '<br>') });
    flushT(); close(); return out.join('').replace(/\u0000(\d+)\u0000/g, (m, i) => blocks[+i]).replace(/(<br>)+$/, '');
  }
  function tools(el, text) { if (el.nextElementSibling && el.nextElementSibling.classList.contains('tools')) return; const d = document.createElement('div'); d.className = 'tools';
    d.innerHTML = '<button type="button" data-t="copy" title="کپی">⧉ کپی</button><button type="button" data-t="regen" title="پاسخ دوباره">↻ دوباره</button>';
    d.addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (!b) return; if (b.dataset.t === 'copy') { try { navigator.clipboard.writeText(text); b.textContent = '✓ کپی شد'; setTimeout(() => b.textContent = '⧉ کپی', 1200) } catch (x) { } } else { const ch = chCur(); const lastU = ch && ch.m.slice().reverse().find(x => x.r === 'u'); if (lastU && !gen) { if (ch.m.length && ch.m[ch.m.length - 1].r === 'a') ch.m.pop(); hist = hist.filter((x, i, a) => !(i === a.length - 1 && x.role === 'assistant')); if (hist.length && hist[hist.length - 1].role === 'user') hist.pop(); el.remove(); d.remove(); const um = [...log.querySelectorAll('.m.u')].pop(); if (um) um.remove(); send(lastU.c, 1) } } });
    el.after(d) }
  function chShow(id) { CH.cur = id; const ch = chCur(); log.querySelectorAll('.m,.rate,.tools').forEach(x => x.remove()); hist = []; if (ch) { ch.m.forEach(x => { const d = msg(x.r === 'u' ? 'u' : 'a', x.c); if (x.r === 'a') { d.innerHTML = md(x.c); tools(d, x.c) } }); hist = ch.m.slice(-4).map(x => ({ role: x.r === 'u' ? 'user' : 'assistant', content: x.c })) } box.classList.toggle('has', !!(ch && ch.m.length)); box.classList.remove('sopen'); chSide(); log.scrollTop = log.scrollHeight }
  function chNew() { CH.cur = ''; chShow(''); ta.focus() }
  function grp(t) { const d0 = new Date(); d0.setHours(0, 0, 0, 0); const D = 864e5; return t >= +d0 ? 'امروز' : t >= +d0 - D ? 'دیروز' : t >= +d0 - 7 * D ? '۷ روز گذشته' : t >= +d0 - 30 * D ? '۳۰ روز گذشته' : 'قدیمی‌تر' }
  function chSide() { if (!side) return; const q = chQ.trim(); const L = CH.list.filter(c => !q || (c.title + ' ' + c.m.map(x => x.c).join(' ')).indexOf(q) >= 0); let g0 = '', h = '';
    L.forEach(c => { const g = c.pin ? '📌 سنجاق‌شده' : grp(c.t); if (g !== g0) { h += '<div class="gp">' + g + '</div>'; g0 = g } h += '<div class="it' + (c.id === CH.cur ? ' on' : '') + '" data-c="' + c.id + '"><button type="button" class="t" data-a="open" title="' + esc2(c.title || 'گفتگو') + '">' + esc2(c.title || 'گفتگوی بی‌نام') + '</button><span class="ac"><button type="button" data-a="pin" title="' + (c.pin ? 'برداشتن سنجاق' : 'سنجاق') + '">📌</button><button type="button" data-a="ren" title="تغییر نام">✎</button><button type="button" data-a="exp" title="دانلود">⤓</button><button type="button" data-a="del" title="حذف">🗑</button></span></div>' });
    side.innerHTML = '<button type="button" class="nw" data-a="new">＋ گفتگوی تازه</button><input type="search" placeholder="جست‌وجو در گفتگوها" value="' + esc2(chQ) + '" data-a="q"><div class="cl">' + (h || '<div class="gp">' + (q ? 'گفتگویی پیدا نشد' : 'هنوز گفتگویی نیست') + '</div>') + '</div><div class="ft"><span>' + CH.list.length + ' گفتگو · روی همه‌ی دستگاه‌های شما</span><button type="button" data-a="delall">پاک کردن همه</button></div>' }
  side.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b) return; const it = b.closest('[data-c]'), id = it && it.dataset.c, ch = CH.list.find(c => c.id === id), a = b.dataset.a;
    if (a === 'new') return chNew(); if (a === 'open') return chShow(id);
    if (a === 'pin') { ch.pin = !ch.pin; ch.t = Date.now(); CH.list.sort((x, y) => (y.pin ? 1 : 0) - (x.pin ? 1 : 0) || y.t - x.t); chSave(); return chSide() }
    if (a === 'ren') { const n = prompt('نام گفتگو:', ch.title || ''); if (n != null) { ch.title = n.trim().slice(0, 60); ch.t = Date.now(); chSave(); chSide() } return }
    if (a === 'exp') { const t = '# ' + (ch.title || 'گفتگو') + '\n\n' + ch.m.map(x => (x.r === 'u' ? '**شما:** ' : '**دستیار:** ') + x.c).join('\n\n'); const bl = new Blob([t], { type: 'text/markdown' }), u = URL.createObjectURL(bl), l = document.createElement('a'); l.href = u; l.download = (ch.title || 'chat').replace(/[\\/:*?"<>|]/g, '_') + '.md'; document.body.appendChild(l); l.click(); setTimeout(() => { URL.revokeObjectURL(u); l.remove() }, 1000); return }
    if (a === 'del') { if (!confirm('این گفتگو حذف شود؟')) return; CH.list = CH.list.filter(c => c.id !== id); if (CH.cur === id) chNew(); chSave(); return chSide() }
    if (a === 'delall') { if (!confirm('همه‌ی گفتگوها حذف شوند؟')) return; CH.list = []; chNew(); chSave(); chSide() } });
  side.addEventListener('input', e => { if (e.target.dataset.a === 'q') { chQ = e.target.value; clearTimeout(side.t); side.t = setTimeout(() => { chSide(); const i = side.querySelector('input'); i.focus(); i.setSelectionRange(i.value.length, i.value.length) }, 200) } });
  box.querySelector('[data-x=side]').addEventListener('click', () => box.classList.toggle('sopen'));
  const TCSS = document.createElement('style'); TCSS.textContent = `
#vxai.full{box-sizing:border-box!important}#vxai.full .log{overflow-x:hidden}
#vxai.full header{padding:10px 16px;gap:10px;min-height:64px;box-sizing:border-box}
#vxai.full header b{font-size:16px}#vxai.full header small{font-size:12px;max-width:40vw}
#vxai.full header button{width:48px;height:48px;border-radius:14px;font-size:19px}
#vxai.full header .hb{gap:4px}
#vxai.full form{gap:10px;padding-block:14px;align-items:flex-end}
#vxai.full textarea{min-height:56px;height:56px;max-height:200px;font-size:16px;border-radius:18px;padding:14px 16px}
#vxai.full form button{width:56px;height:56px;border-radius:18px;font-size:20px}
#vxai.full form .lng{width:48px!important;font-size:13px!important}
#vxai.full form .mic svg{width:22px;height:22px}
#vxai.full .tools button{font-size:15px;padding:10px 14px;min-height:44px;border-radius:12px;opacity:.75}
#vxai.full .side{padding:14px;gap:10px}
#vxai.full .side .nw{min-height:56px;font-size:15px;border-radius:16px;background:linear-gradient(135deg,#1b6f52,#2f78c4);color:#fff;border:0}
#vxai.full .side input{min-height:48px;font-size:15px;border-radius:14px}
#vxai.full .side .it>button.t{min-height:48px;font-size:14.5px}
#vxai.full .side .it .ac button{min-width:40px!important;min-height:40px!important;font-size:16px!important}
#vxai.full .side .it .ac{display:flex}
#vxai.full .side .ft button{min-height:44px;padding:0 6px}
#vxai.full .welcome{width:min(960px,100%);box-sizing:border-box;gap:18px;padding:28px 8px}
#vxai.full .welcome .hero{display:grid;justify-items:center;gap:6px}
#vxai.full .welcome .orb{width:72px;height:72px;border-radius:24px;display:grid;place-items:center;color:#fff;background:conic-gradient(from 200deg,#1b6f52,#2f78c4,#7a5cd6,#1b6f52);box-shadow:0 12px 30px rgba(47,120,196,.3);animation:vxorb 6s ease-in-out infinite}
#vxai.full .welcome .orb svg{width:36px;height:36px}
@keyframes vxorb{50%{transform:translateY(-4px) rotate(4deg)}}
#vxai.full .welcome h2{font-size:28px}
#vxai.full .welcome .sub{color:var(--muted,#7a8380);font-size:14px}
#vxai.full .welcome .svc{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
#vxai.full .welcome .svc span{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:99px;font-size:13px;background:rgba(127,127,127,.09)}
#vxai.full .welcome .svc i{width:8px;height:8px;border-radius:50%;background:#2fa36b;box-shadow:0 0 0 3px rgba(47,163,107,.2)}
#vxai.full .welcome .svc .off i{background:#c98a1a;box-shadow:0 0 0 3px rgba(201,138,26,.2)}
#vxai.full .welcome .cats{display:flex;gap:8px;overflow-x:auto;max-width:100%;padding:2px 4px 6px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
#vxai.full .welcome .cats button{flex:none;min-height:48px;padding:0 20px;border-radius:99px;border:1px solid rgba(127,127,127,.25);background:transparent;color:inherit;font:inherit;font-size:15px;font-weight:600;cursor:pointer}
#vxai.full .welcome .cats button.on{background:var(--ink,#14181a);color:var(--card,#fff);border-color:transparent}
#vxai.full .welcome .cards{grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px;width:100%}
#vxai.full .welcome .cards button{position:relative;display:grid;grid-template-rows:auto 1fr;gap:10px;min-height:128px;padding:18px;border-radius:22px;font-size:15px;line-height:1.7;border:1px solid rgba(127,127,127,.18);background:linear-gradient(160deg,color-mix(in srgb,var(--c) 14%,var(--card,#fff)),var(--card,#fff) 70%);box-shadow:0 2px 10px rgba(0,0,0,.04);transition:transform .15s,box-shadow .15s;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
#vxai.full .welcome .cards button:active{transform:scale(.97)}
@media (hover:hover){#vxai.full .welcome .cards button:hover{transform:translateY(-3px);box-shadow:0 10px 24px rgba(0,0,0,.09)}}
#vxai.full .welcome .cards .ic{width:48px;height:48px;border-radius:16px;display:grid;place-items:center;font-size:24px;background:color-mix(in srgb,var(--c) 22%,transparent)}
#vxai.full .welcome .cards b{display:block;font-size:15.5px}#vxai.full .welcome .cards small{display:block;color:var(--muted,#7a8380);font-size:13px;font-weight:400}
#vxai.full .welcome .cards .nw{position:absolute;top:12px;inset-inline-end:12px;font-size:11px;font-weight:700;padding:3px 8px;border-radius:99px;background:#7a5cd6;color:#fff}
#vxai.full .welcome .cards .ed{position:absolute;bottom:10px;inset-inline-end:10px;width:40px;height:40px;border-radius:12px;display:grid;place-items:center;font-size:16px;opacity:.55}
@media (max-width:820px){#vxai.full .welcome .cards{grid-template-columns:1fr 1fr}#vxai.full .welcome .cards button{min-height:118px;padding:14px}}
`; document.head.appendChild(TCSS);
  // suggestion tiles: q = prompt sent; e = true → put in the box to edit first (needs the user's text)
  const TILES = [
    ['پروژه', '#1b6f52', [
      ['📊', 'وضعیت کل پروژه‌ها', 'خلاصه، پیشرفت و ریسک‌ها', 'خلاصه‌ی وضعیت همه‌ی پروژه‌ها را بده: پیشرفت برنامه‌ای و واقعی، انحراف و مهم‌ترین ریسک‌ها'],
      ['⏱️', 'بیشترین تأخیر', 'کدام پروژه و چرا', 'کدام پروژه بیشترین تأخیر را دارد و دلایل اصلی آن چیست؟ پیشنهاد جبران هم بده'],
      ['🧱', 'بتن‌ریزی‌های پیش‌رو', '۷ روز آینده', 'بتن‌ریزی‌های ۷ روز آینده کدام‌اند؟ با تاریخ و پروژه'],
      ['🚨', 'مسیر بحرانی عقب‌افتاده', 'فعالیت‌های بحرانی', 'فعالیت‌های بحرانی عقب‌افتاده را فهرست کن و اثر آن روی تاریخ پایان را بگو'],
      ['🗓️', 'برنامه‌ی هفته', 'کارهای شروع/پایان این هفته', 'فعالیت‌هایی که این هفته باید شروع یا تمام شوند را به تفکیک پروژه فهرست کن'],
      ['🔮', 'پیش‌بینی پایان', 'با روند فعلی', 'با روند پیشرفت فعلی، تاریخ پایان هر پروژه را پیش‌بینی کن و با برنامه مقایسه کن', 1]]],
    ['نوشتن', '#2f78c4', [
      ['✉️', 'نامه‌ی اداری', 'به کارفرما/پیمانکار', 'یک نامه‌ی اداری رسمی بنویس به ', 0, 1],
      ['📝', 'گزارش هفتگی', 'از داده‌های پروژه', 'یک گزارش پیشرفت هفتگی رسمی برای کارفرما از وضعیت پروژه‌ها بنویس'],
      ['🤝', 'صورت‌جلسه', 'از یادداشت‌های شما', 'این یادداشت‌ها را به صورت‌جلسه‌ی رسمی با مصوبات و مسئول و مهلت تبدیل کن:\n', 0, 1],
      ['🌐', 'ترجمه‌ی فنی', 'فارسی ⇄ انگلیسی', 'این متن را با اصطلاحات فنی ساختمانی ترجمه کن:\n', 0, 1],
      ['✨', 'بازنویسی حرفه‌ای', 'رسمی‌تر و کوتاه‌تر', 'این متن را رسمی، دقیق و کوتاه‌تر بازنویسی کن:\n', 1, 1]]],
    ['مهندسی', '#c46a2f', [
      ['📐', 'برآورد متره', 'حجم بتن/آرماتور', 'برآورد تقریبی متره کن برای ', 0, 1],
      ['💰', 'برآورد هزینه', 'تقریبی و به ریال', 'هزینه‌ی تقریبی این آیتم را با فرض‌های روشن برآورد کن: ', 1, 1],
      ['🌡️', 'شرایط بتن‌ریزی', 'دما، باد، عمل‌آوری', 'برای بتن‌ریزی در هوای سرد/گرم چه نکات اجرایی و عمل‌آوری را باید رعایت کنم؟ چک‌لیست بده', 1],
      ['🦺', 'چک‌لیست ایمنی', 'برای یک فعالیت', 'چک‌لیست ایمنی اجرایی برای این فعالیت بده: ', 1, 1],
      ['📏', 'مبحث مقررات ملی', 'سؤال آیین‌نامه‌ای', 'طبق مقررات ملی ساختمان ایران: ', 0, 1]]],
    ['مدیریت', '#7a5cd6', [
      ['⚖️', 'تحلیل ریسک', 'احتمال × اثر', 'ریسک‌های اصلی پروژه‌ها را با احتمال، اثر و اقدام پیشگیرانه در یک جدول بده', 1],
      ['👷', 'برنامه‌ی نیروی کار', 'بر اساس فعالیت‌ها', 'برای فعالیت‌های دو هفته‌ی آینده، نیروی انسانی و ماشین‌آلات لازم را پیشنهاد کن', 1],
      ['📦', 'سفارش مصالح', 'چه چیزی و کی', 'بر اساس برنامه، چه مصالحی را باید تا دو هفته‌ی آینده سفارش بدهم؟'],
      ['📈', 'جبران تأخیر', 'فشرده‌سازی برنامه', 'برای جبران تأخیر پروژه‌ی عقب‌افتاده، گزینه‌های فشرده‌سازی (Crashing/Fast-tracking) را پیشنهاد کن', 1]]]];
  let tCat = 0;
  const wel = document.createElement('div'); wel.className = 'welcome';
  function welSvc() {
    const L = chain(); const n = L.length;
    return n ? L.slice(0, 4).map(p => '<span><i></i>' + esc(p.name || p.id) + '</span>').join('') + (n > 4 ? '<span>+' + (n - 4) + '</span>' : '')
      : '<span class="off"><i></i>حالت آفلاین — پاسخ از داده‌های داشبورد</span>';
  }
  function welDraw() {
    const nm = (window.VX_USER && VX_USER.name) || ((JSON.parse(localStorage.getItem('vxSess') || '{}') || {}).name) || '';
    wel.innerHTML = '<div class="hero"><div class="orb">' + ICON + '</div><h2>' + (nm ? esc(nm) + '، ' : '') + 'چطور می‌توانم کمک کنم؟</h2><div class="sub">یک کاشی را لمس کنید یا سؤالتان را بنویسید — ✎ یعنی متن شما لازم است</div></div>'
      + '<div class="svc">' + welSvc() + '</div>'
      + '<div class="cats">' + TILES.map((c, i) => '<button type="button" data-c="' + i + '" class="' + (i === tCat ? 'on' : '') + '">' + c[0] + '</button>').join('') + '</div>'
      + '<div class="cards">' + TILES[tCat][2].map((t, i) => '<button type="button" data-t="' + i + '" style="--c:' + TILES[tCat][1] + '"><span class="ic">' + t[0] + '</span><span><b>' + t[1] + '</b><small>' + t[2] + '</small></span>' + (t[4] ? '<span class="nw">جدید</span>' : '') + (t[5] ? '<span class="ed">✎</span>' : '') + '</button>').join('') + '</div>';
  }
  function esc(x) { return String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]) }
  welDraw(); setTimeout(welDraw, 2500);
  log.appendChild(wel); wel.addEventListener('click', e => {
    const c = e.target.closest('[data-c]'); if (c) { tCat = +c.dataset.c; return welDraw() }
    const b = e.target.closest('[data-t]'); if (!b) return; const t = TILES[tCat][2][+b.dataset.t];
    if (t[5]) { const ta = box.querySelector('textarea'); ta.value = t[3]; ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); ta.dispatchEvent(new Event('input')) } else send(t[3]);
  });
  box.querySelector('[data-x=clear]').addEventListener('click', chNew);
  chSide(); chPull();
  window.__vxChat = { add: chAdd, md, tools };
  // standalone AI platform (ai/) and the hand-off from the floating panel: every chat lives in the same archive
  const AIROOT = (() => { try { return new URL('../../', [...document.scripts].map(x => x.src).find(x => /shared\/ai\/ai\.js/.test(x))).href } catch (e) { return '/' } })();
  box.querySelector('[data-x=page]').addEventListener('click', () => { chSave(); location.href = AIROOT + 'ai/' + (CH.cur ? '?c=' + encodeURIComponent(CH.cur) : '') });
  if (window.VXAI_PAGE) {
    document.documentElement.classList.add('vxai-page'); setFull(true); if (!box.classList.contains('open')) toggle();
    ['close', 'full', 'page'].forEach(k => { const x = box.querySelector('[data-x=' + k + ']'); if (x) x.hidden = true }); fab.style.display = 'none';
    const c0 = new URLSearchParams(location.search).get('c'); const go = () => { if (c0 && CH.list.find(c => c.id === c0)) chShow(c0); chSide() }; go(); setTimeout(() => { chPull && chPull(); setTimeout(go, 800) }, 300);
  }
  window.VXAI = { open: () => { if (!box.classList.contains('open')) toggle(); }, full: (on) => { setFull(on !== false); if (!box.classList.contains('open')) toggle(); }, send, ask, ready: () => !!(cfg && (VIAHUB || (cfg.mode !== 'local' && SRV.k))) };
})();
