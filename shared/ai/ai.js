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
#vxai .chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 8px}#vxai .chips button{border:1px solid rgba(127,127,127,.25);background:transparent;color:inherit;border-radius:99px;padding:3px 10px;font:inherit;font-size:11.5px;cursor:pointer}
`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const fab = document.createElement('button');
  fab.id = 'vxaiFab'; fab.type = 'button'; fab.title = 'دستیار هوش مصنوعی (محلی)'; fab.setAttribute('aria-label', 'دستیار هوش مصنوعی'); fab.innerHTML = ICON;
  document.body.appendChild(fab);

  const box = document.createElement('div'); box.id = 'vxai';
  box.innerHTML = `<header>${ICON.replace('<svg', '<svg style="width:22px;height:22px"')}<div><b>دستیار VERTEX</b><small id="vxaiSt">روی دستگاه شما اجرا می‌شود · بدون سرور</small></div><button type="button" data-x="clear">پاک کردن</button><button type="button" data-x="close">✕</button></header>
<div class="log" id="vxaiLog"><div class="sys">این دستیار (Qwen 0.5B) کاملاً داخل مرورگر شما اجرا می‌شود. بار اول حدود ۴۸۰ مگابایت از همین سایت دانلود و ذخیره می‌شود؛ دفعه‌های بعد فوری است.<br>اطلاعات پروژه‌ها به‌صورت خودکار به آن داده می‌شود.</div></div>
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
    return 'You are VERTEX, a construction project assistant. Answer briefly. Reply in Persian if the user writes Persian. ' +
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

  const btn = box.querySelector('form button');
  function send(q) {
    q = (q || '').trim(); if (!q) return;
    if (gen) return;
    const quick = facts(q); if (quick) { msg('u', q); msg('a', quick); return; }
    ensureWorker();
    msg('u', q); hist.push({ role: 'user', content: q }); hist = hist.slice(-4);
    cur = msg('a', ''); gen = true; fab.classList.add('busy'); btn.textContent = 'توقف';
    const msgs = [{ role: 'system', content: context() }].concat(hist); window.VXAI.last = msgs;
    worker.postMessage({ t: 'chat', messages: msgs });
  }
  box.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); if (gen) { worker.postMessage({ t: 'stop' }); return; } send(ta.value); ta.value = ''; });
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); box.querySelector('form').requestSubmit(); } });
  box.querySelectorAll('.chips button').forEach(b => b.addEventListener('click', () => send(b.textContent)));
  box.querySelector('[data-x=close]').addEventListener('click', toggle);
  box.querySelector('[data-x=clear]').addEventListener('click', () => { hist = []; log.querySelectorAll('.m').forEach(x => x.remove()); });

  function toggle() { box.classList.toggle('open'); if (box.classList.contains('open')) { ensureWorker(); ta.focus(); } }
  fab.addEventListener('click', toggle);
  window.VXAI = { open: () => { if (!box.classList.contains('open')) toggle(); }, send };
})();
