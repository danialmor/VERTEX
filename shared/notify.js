/* VERTEX · notifications bell on every platform. Messages come from Aide (meetings, reminders, notices set by the secretary).
   Uses the hub API (/api/v1/notify) through shared/demo.js; loads cloud.js + demo.js if the page has not. */
(function () {
  'use strict';
  if (window.VX_NOTIFY) return; window.VX_NOTIFY = 1;
  var ROOT = (location.pathname.match(/^(.*?\/VERTEX\/)/i) || [, '/VERTEX/'])[1];
  var tok = function () { try { return localStorage.getItem('hub.token') || '' } catch (e) { return '' } };
  if (!tok()) return;
  function need(src) { return new Promise(function (r) { var s = document.createElement('script'); s.src = ROOT + src; s.onload = r; s.onerror = r; document.head.appendChild(s) }) }
  var ready = (window.VX_HUB ? Promise.resolve() : (window.VX_CLOUD ? Promise.resolve() : need('shared/cloud.js?v=413')).then(function () { return window.BRAND ? null : need('shared/brand.js') }).then(function () { return need('shared/demo.js?v=420') }));
  var api = function (m, p, b) { return fetch(location.origin + ROOT + 'api/v1' + p, { method: m, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok() }, body: b ? JSON.stringify(b) : undefined }).then(function (r) { return r.json() }) };
  var css = document.createElement('style');
  css.textContent = '#vxBell{position:fixed;right:16px;bottom:16px;z-index:9997;width:48px;height:48px;border-radius:50%;border:0;background:#121212;color:#fff;display:grid;place-items:center;cursor:pointer;box-shadow:0 10px 24px -10px rgba(0,0,0,.5);touch-action:manipulation}' +
    '#vxBell svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}' +
    '#vxBell b{position:absolute;top:-3px;right:-3px;min-width:20px;height:20px;border-radius:10px;background:#d6453b;color:#fff;font:700 11px system-ui;display:grid;place-items:center;padding:0 5px}' +
    '#vxBellBox{position:fixed;right:16px;bottom:74px;z-index:9998;width:min(360px,calc(100vw - 32px));max-height:min(70vh,560px);overflow:auto;background:#f6f6f3;color:#121212;border-radius:22px;box-shadow:0 20px 50px -20px rgba(0,0,0,.45);font:14px/1.5 Outfit,Vazirmatn,system-ui,sans-serif;padding:10px;display:none;direction:auto}' +
    '#vxBellBox.on{display:block}#vxBellBox h4{margin:6px 8px 8px;font-size:16px;display:flex;justify-content:space-between;align-items:center}#vxBellBox h4 button{border:0;background:none;color:#555;font:inherit;font-size:12.5px;cursor:pointer;min-height:36px}' +
    '#vxBellBox .n{padding:10px 12px;border-radius:14px;background:#fff;margin:6px 0}#vxBellBox .n.u{box-shadow:inset 3px 0 0 #121212}#vxBellBox .n small{color:#777;display:block}#vxBellBox .e{color:#777;padding:18px 10px}';
  document.head.appendChild(css);
  var bell = document.createElement('button'); bell.id = 'vxBell'; bell.type = 'button'; bell.setAttribute('aria-label', 'Notifications');
  bell.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0"/></svg>';
  var box = document.createElement('div'); box.id = 'vxBellBox'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Notifications');
  var items = [];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) }
  function paint(unread) {
    var b = bell.querySelector('b'); if (unread) { if (!b) { b = document.createElement('b'); bell.appendChild(b) } b.textContent = unread > 99 ? '99+' : unread } else if (b) b.remove();
    box.innerHTML = '<h4>Notifications <button type="button" data-all>Mark all read</button></h4>' + (items.length ? items.map(function (x) {
      return '<div class="n' + (x.read ? '' : ' u') + '" dir="auto"><b>' + esc(x.title) + '</b>' + (x.body ? '<div>' + esc(x.body) + '</div>' : '') + '<small>' + esc(x.from_name) + ' · ' + esc(x.app) + (x.at ? ' · ' + esc(x.at) : '') + ' · ' + new Date(x.t * 1000).toLocaleString() + '</small></div>' }).join('') : '<div class="e">No notifications yet.</div>');
    var a = box.querySelector('[data-all]'); if (a) a.onclick = function () { api('POST', '/notify/read', { all: true }).then(load) };
  }
  function load() { return api('GET', '/notify').then(function (j) { items = j.items || []; paint(j.unread || 0) }).catch(function () { }) }
  bell.onclick = function () { box.classList.toggle('on') };
  function mount() { if (!document.body) return setTimeout(mount, 100); if (window.VXAI_PAGE) return; document.body.append(bell, box); ready.then(load); setInterval(function () { if (!document.hidden) load() }, 60000) }
  mount();
  window.VX_NOTIFY_SEND = function (to, title, body, extra) { return ready.then(function () { return api('POST', '/notify', Object.assign({ to: to, title: title, body: body }, extra || {})) }) };
})();
