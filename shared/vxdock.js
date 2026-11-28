/* VERTEX · corner dock on every platform (feature VX-019).
   One VERTEX button in the bottom-left corner. Tapping it fans out tabs from under it, like a hand of cards:
   AI (opens the local AI panel), Chat (Messenger, if the user may use it), About (versions and changes) and Home (switch platform).
   It replaces the separate floating AI, "i", Messenger and home buttons, which are hidden while the dock is present.
   Loaded by shared/auth.js for signed-in users. Esc, a tap outside or a second tap on the button closes the fan. */
(function () {
  'use strict';
  if (window.VX_DOCK || self !== top) return; window.VX_DOCK = 1;
  var AU = window.VX_AUTH, s = AU && AU.session ? AU.session() : null;
  var src = (document.currentScript && document.currentScript.src) || '', ROOT = src ? src.replace(/shared\/vxdock\.js.*$/, '') : (AU && AU.ROOT) || '/VERTEX/';
  var path = location.pathname, EN = (document.documentElement.lang || '').indexOf('en') === 0 || document.documentElement.dir === 'ltr';
  var L = function (fa, en) { return EN ? en : fa };
  var onHome = /\/(home|app)\/?$/.test(path.replace(/index\.html$/, ''));
  var IC = {
    ai: '<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.8 7L4 20l1.1-4.6A8 8 0 1 1 21 12z"/>',
    about: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>'
  };
  var tabs = [
    { k: 'ai', t: 'AI', c: '#e5484d', go: function () { openAI() } },
    { k: 'chat', t: L('چت', 'Chat'), c: '#3e7bfa', show: !!(s && AU.allowed && AU.allowed('messenger', s)) && !/\/messenger\//.test(path), go: function () { location.href = ROOT + 'messenger/' } },
    { k: 'bell', t: L('اعلان‌ها', 'Alerts'), c: '#8b5cf6', go: function () { var b = document.getElementById('vxBell'); if (b) b.click() } },
    { k: 'about', t: L('درباره', 'About'), c: '#e0a12a', go: function (e) { if (window.vxAbout) window.vxAbout(e) } },
    { k: 'home', t: L('خانه', 'Home'), c: '#2f9e6e', show: !onHome && !!s, go: function () { location.href = ROOT + (s && s.role === 'admin' ? 'home/' : 'app/') } }
  ].filter(function (t) { return t.show !== false });
  var css = 'body.vx-dock #vxaiFab,body.vx-dock #vxAb,body.vx-dock #vxMsg,body.vx-dock #vxHomeBtn,body.vx-dock #vxBell{display:none!important}body.vx-dock #vxBellBox{left:16px!important;right:auto!important;bottom:80px!important}#vxDockB i{position:absolute;top:2px;right:2px;min-width:16px;height:16px;border-radius:8px;background:#e5484d;color:#fff;font:700 10px/16px Inter,system-ui,sans-serif;font-style:normal;text-align:center;padding:0 3px;box-sizing:border-box}.vxT i{font-style:normal;background:#e5484d;color:#fff;border-radius:8px;font-size:10px;padding:1px 5px;margin-inline-start:2px}' +
    '#vxDock{position:fixed;left:0;bottom:0;z-index:2147483000;width:0;height:0}' +
    '#vxDockB{position:absolute;left:12px;bottom:12px;width:52px;height:52px;border-radius:50%;border:1px solid rgba(127,182,255,.45);background:#111827;display:grid;place-items:center;cursor:pointer;box-shadow:0 8px 22px -6px rgba(0,0,0,.55);transition:transform .25s;z-index:2}' +
    '#vxDockB:focus-visible{outline:3px solid #7fb6ff;outline-offset:3px}#vxDock.on #vxDockB{transform:rotate(-12deg) scale(.94)}' +
    '#vxDockQ{position:absolute;left:0;bottom:0;width:86px;height:86px;border-top-right-radius:86px;background:rgba(17,24,39,.08);opacity:0;transition:opacity .2s;pointer-events:none}#vxDock.on #vxDockQ{opacity:1}' +
    '.vxT{position:absolute;left:38px;bottom:38px;transform-origin:0 50%;height:40px;width:auto;margin-bottom:-20px;padding:0 16px 0 14px;direction:ltr;border:1px solid rgba(127,182,255,.35);border-radius:0 22px 22px 0;display:flex;align-items:center;gap:8px;color:#e6eefc;background:rgba(17,24,39,.88)!important;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);font:600 14px/1 Vazirmatn,Inter,system-ui,sans-serif;cursor:pointer;' +
    'box-shadow:0 8px 20px -10px rgba(0,0,0,.6);transform:rotate(var(--a)) translateX(14px) scaleX(.2);opacity:0;pointer-events:none;transition:transform .28s cubic-bezier(.2,.9,.3,1.25),opacity .18s;transition-delay:var(--d)}' +
    '#vxDock.on .vxT{transform:rotate(var(--a)) translateX(46px) scaleX(1);opacity:1;pointer-events:auto}.vxT svg{width:18px;height:18px;flex:none;fill:none;stroke:#7fb6ff;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}' +
    '.vxT[data-k=ai] svg{stroke:#f0a53a}.vxT:hover,.vxT:focus-visible{background:rgba(30,41,64,.95)!important;border-color:#7fb6ff;outline:none}.vxT span{white-space:nowrap}' +
    '@media (prefers-reduced-motion:reduce){.vxT,#vxDockB{transition:none}}';
  function openAI() {
    if (window.VXAI && window.VXAI.open) return window.VXAI.open();
    var sc = document.createElement('script'); sc.src = ROOT + 'shared/ai/ai.js?v=421'; sc.onload = function () { setTimeout(function () { window.VXAI && window.VXAI.open() }, 50) }; document.head.appendChild(sc);
  }
  function mount() {
    if (document.getElementById('vxDock')) return;
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var d = document.createElement('div'); d.id = 'vxDock';
    var n = tabs.length, span = 88, step = n > 1 ? span / (n - 1) : 0;
    d.innerHTML = '<div id="vxDockQ"></div>' + tabs.map(function (t, i) {
      var a = -(90 - (n > 1 ? i * step : 45) - 3);   // first tab almost vertical, last almost flat
      return '<button type="button" class="vxT" data-k="' + t.k + '" tabindex="-1" style="--a:' + a + 'deg;--d:' + (i * 35) + 'ms;background:' + t.c + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + IC[t.k] + '</svg><span>' + t.t + '</span></button>'
    }).join('') +
      '<button type="button" id="vxDockB" aria-expanded="false" aria-label="VERTEX — ' + L('دسترسی سریع', 'quick access') + '" title="VERTEX"><svg width="24" height="24" viewBox="0 0 64 64" aria-hidden="true"><path d="M14 18 L32 48 L50 18" fill="none" stroke="#7fb6ff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="32" cy="48" r="5" fill="#f0a53a"/></svg></button>';
    document.body.appendChild(d); document.body.classList.add('vx-dock');
    var B = d.querySelector('#vxDockB');
    var set = function (on) { d.classList.toggle('on', on); B.setAttribute('aria-expanded', on); d.querySelectorAll('.vxT').forEach(function (t) { t.tabIndex = on ? 0 : -1 }) };
    B.onclick = function (e) { e.stopPropagation(); set(!d.classList.contains('on')) };
    d.querySelectorAll('.vxT').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); set(false); var t = tabs.filter(function (x) { return x.k === b.dataset.k })[0]; t && t.go(e) } });
    document.addEventListener('click', function (e) { if (!d.contains(e.target)) set(false) });
    // unread notifications: a red count on the VERTEX button and on the Alerts tab (mirrors the hidden bell)
    var sync = function () { var bl = document.getElementById('vxBell'), n = bl && bl.querySelector('b') ? bl.querySelector('b').textContent : '', bt = d.querySelector('.vxT[data-k=bell]');
      var x = B.querySelector('i'); if (n) { if (!x) { x = document.createElement('i'); B.appendChild(x) } x.textContent = n } else if (x) x.remove();
      if (bt) { var y = bt.querySelector('i'); if (n) { if (!y) { y = document.createElement('i'); bt.appendChild(y) } y.textContent = n } else if (y) y.remove() } };
    var mo = new MutationObserver(sync); var hook = function () { var bl = document.getElementById('vxBell'); if (bl) { mo.observe(bl, { childList: true, subtree: true, characterData: true }); sync() } else setTimeout(hook, 800) }; hook();
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && d.classList.contains('on')) { set(false); B.focus() } });
  }
  document.body ? mount() : addEventListener('DOMContentLoaded', mount);
})();
