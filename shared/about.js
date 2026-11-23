/* VERTEX · About on every platform (feature VX-007). A small "i" button (bottom-left, above the VERTEX pill area) opens a sheet with
   this platform's own version, the ecosystem version, recent changes and its coded features. Data: shared/releases.json.
   Loaded by shared/auth.js on every page; Aide loads it by absolute URL. Platform is detected from the path. */
(function () {
  'use strict';
  if (window.VX_ABOUT) return; window.VX_ABOUT = 1;
  var src = (document.currentScript && document.currentScript.src) || '', ROOT = src ? src.replace(/shared\/about\.js.*$/, '') : (location.pathname.match(/^(.*?\/VERTEX\/)/i) || [, '/VERTEX/'])[1];
  var path = location.pathname, MAP = [['/msp-bi', 'project-control'], ['/admin', 'users-panel'], ['/aide', 'executive-desk'], ['/mail', 'mail'], ['/files', 'file-manager'], ['/trading', 'trading'], ['/home', 'home'], ['/ai/', 'ai']];
  var slug = location.hostname.indexOf('github.io') >= 0 && /^\/aide\//.test(path) ? 'executive-desk' : ((MAP.filter(function (m) { return path.indexOf(m[0]) >= 0 })[0] || [, 'landing'])[1]);
  var fa = (document.documentElement.lang || 'fa').indexOf('en') !== 0;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) };
  var st = document.createElement('style');
  st.textContent = '#vxAb{position:fixed;left:23px;bottom:70px;z-index:9996;width:34px;height:34px;border-radius:50%;border:1px solid rgba(0,0,0,.08);background:rgba(255,255,255,.9);color:#344054;font:600 14px/1 Georgia,serif;font-style:italic;cursor:pointer;box-shadow:0 4px 14px -6px rgba(0,0,0,.3);backdrop-filter:blur(8px)}' +
    'body.vx-has-pill #vxAb{bottom:120px}#vxAbB{position:fixed;left:16px;bottom:112px;z-index:9998;width:min(360px,calc(100vw - 32px));max-height:min(70vh,560px);overflow:auto;background:#fff;color:#1d2939;border:1px solid #e4e7ec;border-radius:16px;padding:14px 16px;box-shadow:0 20px 40px -16px rgba(16,24,40,.25);font:13px/1.7 Vazirmatn,Outfit,system-ui,sans-serif;display:none;direction:rtl;text-align:right}' +
    'body.vx-has-pill #vxAbB{bottom:162px}#vxAbB.on{display:block}#vxAbB h4{margin:0 0 2px;font-size:15px}#vxAbB .v{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 10px}#vxAbB .v span{background:#f2f4f7;border-radius:999px;padding:2px 10px;font-size:12px}#vxAbB .v b{font-family:ui-monospace,Menlo,monospace;font-weight:600}' +
    '#vxAbB h5{margin:10px 0 4px;font-size:12px;color:#667085;font-weight:600}#vxAbB ul{margin:0;padding:0;list-style:none}#vxAbB li{padding:5px 0;border-top:1px solid #f2f4f7;font-size:12.5px}#vxAbB li:first-child{border-top:0}#vxAbB code{font:11.5px ui-monospace,Menlo,monospace;color:#465fff;margin-inline-end:6px}#vxAbB small{color:#667085}' +
    '@media (prefers-color-scheme:dark){#vxAb{background:rgba(30,30,30,.9);color:#eee;border-color:rgba(255,255,255,.1)}#vxAbB{background:#101828;color:#e4e7ec;border-color:#1d2939}#vxAbB .v span{background:#1d2939}#vxAbB li{border-color:#1d2939}}';
  document.head.appendChild(st);
  var b = document.createElement('button'); b.id = 'vxAb'; b.type = 'button'; b.textContent = 'i'; b.setAttribute('aria-label', fa ? 'درباره' : 'About'); b.title = b.getAttribute('aria-label');
  var box = document.createElement('div'); box.id = 'vxAbB'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', b.title);
  var R = null;
  function render() {
    var p = (R.platforms || {})[slug], part = (R.parts || {})[slug], br = window.BRAND && BRAND.platform && BRAND.platform(slug);
    var name = br ? br.n + ' — ' + br.fa : part ? part.name : 'VERTEX';
    var log = (p ? p.changelog : R.ecosystem.changelog) || [], feats = (R.features || []).filter(function (f) { return f.platform === slug });
    box.innerHTML = '<h4>' + esc(name) + '</h4><div class="v">' + (p ? '<span>نسخه‌ی پلتفرم <b>' + esc(p.version) + '</b></span>' : '') + '<span>اکوسیستم <b>' + esc(R.ecosystem.version) + '</b></span></div>' +
      '<h5>تغییرات اخیر</h5><ul>' + log.slice(0, 5).map(function (c) { return '<li><code>' + esc(c.v) + '</code>' + esc(c.title) + (c.items && c.items[0] ? '<br><small>' + esc(c.items.join(' · ')) + '</small>' : '') + '</li>' }).join('') + '</ul>' +
      (feats.length ? '<h5>قابلیت‌ها</h5><ul>' + feats.map(function (f) { return '<li><code>' + esc(f.code) + '</code>' + esc(f.name) + ' <small>· ' + ({ live: 'فعال', partial: 'نیمه‌کاره', planned: 'برنامه‌ریزی' }[f.status] || '') + '</small></li>' }).join('') + '</ul>' : '');
  }
  function toggle(force) {
    if (box.classList.toggle('on', force) && !R) { box.textContent = '…'; fetch(ROOT + 'shared/releases.json?c=' + Math.floor(Date.now() / 6e4), { cache: 'no-store' }).then(function (r) { return r.json() }).then(function (j) { R = j; render() }, function () { box.textContent = 'خوانده نشد.' }) }
  }
  b.onclick = function (e) { e.stopPropagation(); toggle() };
  window.vxAbout = function (e) { if (e) e.stopPropagation(); if (!box.isConnected) document.body.appendChild(box); toggle(true) };
  var noBtn = /\/aide\//.test(path) || (document.currentScript && document.currentScript.dataset.button === '0');
  document.addEventListener('click', function (e) { if (!box.contains(e.target)) box.classList.remove('on') });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') box.classList.remove('on') });
  /* platform notice set by the ecosystem admin (control panel → platform tab → advanced settings) */
  function notice() {
    fetch(ROOT + 'api/v1/modules', { cache: 'no-store', headers: (function () { try { var t = localStorage.getItem('hub.token'); return t ? { Authorization: 'Bearer ' + t } : {} } catch (e) { return {} } })() }).then(function (r) { return r.ok ? r.json() : null }).then(function (j) {
      var m = j && (j.modules || []).filter(function (x) { return x.slug === slug })[0], n = m && m.notice; if (!n || !n.text) return;
      try { if (sessionStorage.getItem('vxNoticeX') === n.text) return } catch (e) { }
      var d = document.createElement('div'); d.id = 'vxNotice'; d.setAttribute('role', 'status'); d.dir = 'auto';
      d.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:9995;max-width:min(720px,calc(100vw - 24px));padding:8px 38px 8px 14px;border-radius:8px;font:13px/1.6 Vazirmatn,Inter,system-ui,sans-serif;box-shadow:0 8px 24px -10px rgba(0,0,0,.35);' + (n.kind === 'warn' ? 'background:#fffaeb;color:#93370d;border:1px solid #fedf89' : 'background:#eff4ff;color:#1d2939;border:1px solid #c7d7fe');
      d.textContent = n.text; var x = document.createElement('button'); x.type = 'button'; x.textContent = '✕'; x.setAttribute('aria-label', 'Close'); x.style.cssText = 'position:absolute;right:8px;top:6px;border:0;background:none;cursor:pointer;font-size:13px;color:inherit;opacity:.6';
      x.onclick = function () { d.remove(); try { sessionStorage.setItem('vxNoticeX', n.text) } catch (e) { } }; d.appendChild(x); document.body.appendChild(d);
    }).catch(function () { });
  }
  function mount() { setTimeout(notice, 1200); if (!noBtn) document.body.appendChild(b); document.body.appendChild(box); if (document.querySelector('.vx-pill,#vxPill,[data-vx-pill]')) document.body.classList.add('vx-has-pill') }
  document.body ? mount() : addEventListener('DOMContentLoaded', mount);
})();
