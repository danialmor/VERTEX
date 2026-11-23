/* VERTEX · Messenger button on every platform (feature MS-002). Shown only to users who may use platform III — Messenger
   (VX_AUTH.allowed('messenger')); opens /VERTEX/messenger/. Loaded by shared/auth.js (not inside the messenger itself or in frames). */
(function () {
  'use strict';
  if (window.VX_MSGBTN) return; window.VX_MSGBTN = 1;
  var AU = window.VX_AUTH, s = AU && AU.session ? AU.session() : null;
  if (!s || !AU.allowed('messenger', s)) return;
  var src = (document.currentScript && document.currentScript.src) || '', ROOT = src ? src.replace(/shared\/msgbtn\.js.*$/, '') : AU.ROOT;
  var st = document.createElement('style');
  st.textContent = '#vxMsg{position:fixed;right:16px;bottom:72px;z-index:9997;width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:#f7941d;color:#fff;box-shadow:0 8px 20px -8px rgba(0,0,0,.45);text-decoration:none;transition:transform .15s}' +
    '#vxMsg:hover{transform:scale(1.06)}#vxMsg:focus-visible{outline:3px solid #fff;box-shadow:0 0 0 6px #f7941d}#vxMsg svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}' +
    'html[dir=ltr] #vxMsg{bottom:122px}';
  document.head.appendChild(st);
  function mount() {
    var a = document.createElement('a'); a.id = 'vxMsg'; a.href = ROOT + 'messenger/'; a.title = 'Messenger · مسنجر'; a.setAttribute('aria-label', 'Messenger');
    a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.8 7L4 20l1.1-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 11h7M8.5 14h4.5"/></svg>';
    document.body.appendChild(a);
  }
  document.body ? mount() : addEventListener('DOMContentLoaded', mount);
})();
