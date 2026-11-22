/* VERTEX · make the current platform installable (manifest, iOS meta, service worker). */
(function () {
  try {
    var root = (location.pathname.match(/^(.*?\/VERTEX\/)/i) || [, '/VERTEX/'])[1], d = document, hd = d.head;
    if (!d.querySelector('link[rel=manifest]')) { var l = d.createElement('link'); l.rel = 'manifest'; l.href = 'manifest.webmanifest'; hd.appendChild(l) }
    var meta = function (n, c) { if (d.querySelector('meta[name="' + n + '"]')) return; var m = d.createElement('meta'); m.name = n; m.content = c; hd.appendChild(m) };
    meta('apple-mobile-web-app-capable', 'yes'); meta('mobile-web-app-capable', 'yes'); meta('apple-mobile-web-app-status-bar-style', 'default'); meta('theme-color', '#e6e7e2');
    if (!d.querySelector('link[rel=apple-touch-icon]')) { var i = d.createElement('link'); i.rel = 'apple-touch-icon'; i.href = root + 'shared/pwa/icon-180.png'; hd.appendChild(i) }
    if ('serviceWorker' in navigator && !/\/(msp-bi|aide)\//.test(location.pathname)) navigator.serviceWorker.register(root + 'sw.js', { scope: root }).catch(function () { });
  } catch (e) { }
})();
