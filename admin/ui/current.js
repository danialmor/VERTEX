/* VERTEX · control panel design version (UI). DEFAULT = the official version for everyone; a viewer can preview another
   version in this browser from «مرکز کنترل → نسخه‌ی طراحی» (localStorage vxUI). Versions are listed in shared/releases.json → ui. */
(function () {
  var DEFAULT = '2027', FILES = { '2026': '', '2027': 'ui/2027-adminkit.css' };
  var v = DEFAULT; try { v = localStorage.getItem('vxUI') || DEFAULT } catch (e) { }
  if (!(v in FILES)) v = DEFAULT;
  window.VX_UI = { current: v, official: DEFAULT, files: FILES };
  document.documentElement.dataset.ui = v;
  var lg = 'en'; try { lg = localStorage.getItem('vxLang') || 'en' } catch (e) { }
  if (lg !== 'fa') { document.documentElement.lang = 'en'; document.documentElement.dir = 'ltr' }
  if (FILES[v]) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = FILES[v] + '?v=3'; l.id = 'vxUIcss'; document.head.appendChild(l) }
})();
