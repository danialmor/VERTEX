/* VERTEX · VII — File Manager
   داده: یک سند در هاب  /api/v1/data/file-manager/state/main  (پوشه‌ها، فایل‌ها، فضاهای کاری، نشانک‌ها)
   خودِ فایل‌ها (بایت‌ها): فعلاً در حافظه‌ی همین مرورگر (IndexedDB)؛ متن‌های کوچک داخل سند ذخیره می‌شوند تا جست‌وجو و هم‌گام‌سازی شوند. */
(function () {
'use strict';
var $ = function (s, r) { return (r || document).querySelector(s) }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)) };
var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }) };
var API = '/api/v1', SITE = 'file-manager', T = '', ME = null, REV = 0;
var B = window.BRAND || { platforms: [], apply: function () { } };
function api(m, p, b) { return fetch(API + p, { method: m, headers: Object.assign({ 'Content-Type': 'application/json' }, T ? { Authorization: 'Bearer ' + T } : {}), body: b === undefined ? undefined : JSON.stringify(b), cache: 'no-store' }).then(function (r) { return r.json().catch(function () { return {} }).then(function (j) { if (!r.ok) { var e = new Error(j.error || ('http-' + r.status)); e.status = r.status; throw e } return j }) }) }

/* ───── آیکون‌ها ───── */
var IC = { folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', star: 'm12 3 2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.9 6.6 19.8l1.1-6.1L3.2 9.4l6.1-.8z', back: 'm9 6 6 6-6 6', fwd: 'm15 6-6 6 6 6', up: 'M12 16V4m0 0-4 4m4-4 4 4M4 20h16', plus: 'M12 5v14M5 12h14', list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01', grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', info: 'M4 5h16v14H4zM14 5v14', chart: 'M5 20V10m5 10V4m5 16v-8m5 8V8', split: 'M4 5h16v14H4zM12 5v14', search: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm9 16-3.5-3.5', dots: 'M5 12h.01M12 12h.01M19 12h.01', menu: 'M4 6h16M4 12h16M4 18h16', x: 'M6 6l12 12M18 6 6 18', trash: 'M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13', link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1', bm: 'M6 4h12v16l-6-4-6 4z', box: 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8', broom: 'M14 4 9 13m-3 0h10l2 7H4z', sun: 'M12 4V2m0 20v-2M4 12H2m20 0h-2m-2.3-5.7 1.4-1.4M4.9 19.1l1.4-1.4m0-11.4L4.9 4.9m14.2 14.2-1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', exit: 'M10 5H5v14h5M14 8l4 4-4 4M18 12H9', film: 'M4 5h16v14H4zM8 5v14M16 5v14M4 9h4M4 15h4M16 9h4M16 15h4', img: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9h.01', doc: 'M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5', pdf: 'M7 3h7l4 4v14H7zM14 3v4h4M10 13h4M10 17h3', note: 'M9 18V6l10-2v12M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3zm10-2a3 3 0 1 1-3-3 3 3 0 0 1 3 3z', zip: 'M7 3h10v18H7zM12 3v10M10 15h4v3h-4z', cad: 'M3 20h18M5 20 12 4l7 16M8 14h8', plan: 'M4 6h10M4 12h14M8 18h12', sheet: 'M4 5h16v14H4zM4 10h16M4 15h16M10 5v14', home: 'M4 11 12 4l8 7v9H4zM10 20v-6h4v6', ws: 'M4 6h7v5H4zM13 6h7v5h-7zM4 13h16v5H4z', clock: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', cam: 'M4 8h3l2-3h6l2 3h3v11H4zM12 11a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', dl: 'M12 4v12m0 0-4-4m4 4 4-4M4 20h16', pen: 'M4 20h4L19 9l-4-4L4 16z', copy: 'M8 8h11v12H8zM5 16V4h11', move: 'M5 12h14m0 0-5-5m5 5-5 5', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', undo: 'M9 7 4 12l5 5M4 12h10a6 6 0 0 1 0 12', tag: 'M4 4h8l8 8-8 8-8-8zM8 8h.01' };
var ic = function (n) { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + (IC[n] || IC.dots) + '"/></svg>' };

/* ───── نوع فایل ───── */
var KIND = {
  cad: ['نقشه‌ها (CAD/BIM)', '#7a5cd6', 'cad', 'dwg dxf rvt rfa ifc skp 3dm pln dgn nwd'], plan: ['برنامه‌ها (MSP)', '#1f9d6b', 'plan', 'mpp xer xml mpx'],
  pdf: ['PDFها', '#c9423f', 'pdf', 'pdf'], image: ['تصویرها', '#d98a2b', 'img', 'jpg jpeg png gif webp heic svg bmp tif tiff'], video: ['ویدیوها', '#3f8fa8', 'film', 'mp4 mov mkv avi webm m4v'],
  doc: ['سندها', '#3d6fd9', 'doc', 'doc docx txt md rtf pages odt'], sheet: ['جدول‌ها', '#2e9e57', 'sheet', 'xls xlsx csv numbers ods'], slide: ['ارائه‌ها', '#d9682b', 'doc', 'ppt pptx key'],
  audio: ['صداها', '#c23a78', 'note', 'mp3 wav m4a ogg aac'], zip: ['فشرده‌ها', '#7d8590', 'zip', 'zip rar 7z tar gz'], app: ['نصب‌کننده‌ها', '#5f6672', 'box', 'exe msi dmg pkg apk'], other: ['سایر', '#9aa0a8', 'dots', '']
}, EXT = {};
Object.keys(KIND).forEach(function (k) { KIND[k][3].split(' ').forEach(function (e) { if (e) EXT[e] = k }) });
var extOf = function (n) { var m = /\.([a-z0-9]+)$/i.exec(n || ''); return m ? m[1].toLowerCase() : '' }, kindOf = function (n) { return EXT[extOf(n)] || 'other' };
var isText = function (n) { return /^(txt|md|csv|json|xml|log)$/.test(extOf(n)) };
var fsz = function (b) { b = +b || 0; var u = ['B', 'KB', 'MB', 'GB', 'TB'], i = 0; while (b >= 1024 && i < 4) { b /= 1024; i++ } return (i ? (b >= 100 ? Math.round(b) : b.toFixed(1)) : b) + ' ' + u[i] };
var fa = function (n) { return String(n).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d] }) };
var DAY = 864e5, now = function () { return Date.now() };
var ago = function (t) { var d = Math.floor((now() - t) / DAY); if (d < 1) { var h = Math.floor((now() - t) / 36e5); return h < 1 ? 'همین حالا' : fa(h) + ' ساعت پیش' } if (d === 1) return 'دیروز'; if (d < 30) return fa(d) + ' روز پیش'; if (d < 365) return fa(Math.floor(d / 30)) + ' ماه پیش'; return fa(Math.floor(d / 365)) + ' سال پیش' };
var uid = function () { return 'n' + now().toString(36) + Math.random().toString(36).slice(2, 7) };

/* ───── حافظه‌ی بایت‌ها روی دستگاه ───── */
var IDB = (function () {
  var dbp = null; function db() { return dbp = dbp || new Promise(function (res, rej) { var r = indexedDB.open('vx-files', 1); r.onupgradeneeded = function () { r.result.createObjectStore('b') }; r.onsuccess = function () { res(r.result) }; r.onerror = function () { rej(r.error) } }) }
  function tx(mode, fn) { return db().then(function (d) { return new Promise(function (res, rej) { var t = d.transaction('b', mode), q = fn(t.objectStore('b')); t.oncomplete = function () { res(q && q.result) }; t.onerror = function () { rej(t.error) } }) }).catch(function () { return null }) }
  return { put: function (k, v) { return tx('readwrite', function (s) { return s.put(v, k) }) }, get: function (k) { return tx('readonly', function (s) { return s.get(k) }) }, del: function (k) { return tx('readwrite', function (s) { return s.delete(k) }) } };
})();

/* ───── وضعیت ───── */
var D = { nodes: {}, ws: [], bm: [], quota: 5 * 1073741824 };
var V = { page: 'files', cur: 'root', kind: '', group: 'kind', view: 'grid', sel: {}, q: '', inf: 'an', dual: false, cur2: 'root', back: [], fwd: [], bmf: 'all' };
var UNDO = null, saveT = 0, URLS = {};
try { var pv = JSON.parse(localStorage.getItem('vx.fm.view') || '{}');['group', 'view', 'inf'].forEach(function (k) { if (pv[k]) V[k] = pv[k] }) } catch (e) { }
function keepView() { try { localStorage.setItem('vx.fm.view', JSON.stringify({ group: V.group, view: V.view, inf: V.inf })) } catch (e) { } }
function N(id) { return D.nodes[id] }
function kids(id, all) { return Object.keys(D.nodes).map(N).filter(function (n) { return n.parent === id && (all || !n.trash) }) }
function sizeOf(n) { if (n.type === 'file') return n.size || 0; return kids(n.id).reduce(function (s, c) { return s + sizeOf(c) }, 0) }
function countOf(n) { return kids(n.id).length }
function pathOf(id) { var p = []; while (id && N(id)) { p.unshift(N(id)); id = N(id).parent } return p }
function files(all) { return Object.keys(D.nodes).map(N).filter(function (n) { return n.type === 'file' && (all || !n.trash) }) }
function inTrash(n) { while (n) { if (n.trash) return true; n = N(n.parent) } return false }
function live() { return Object.keys(D.nodes).map(N).filter(function (n) { return n.id !== 'root' && !inTrash(n) }) }
function sorted(a) { return a.sort(function (x, y) { return (x.type === y.type ? 0 : x.type === 'dir' ? -1 : 1) || x.name.localeCompare(y.name, 'fa') }) }
function save() { clearTimeout(saveT); saveT = setTimeout(function () { api('PUT', '/data/' + SITE + '/state/main', { data: D, base_rev: REV, op_id: 'fm' + now() }).then(function (r) { REV = r.rev || REV + 1 }, function (e) { if (e.status === 409) { toast('کس دیگری هم‌زمان تغییر داده بود؛ نسخه‌ی تازه بارگیری شد.'); load().then(render) } else toast('ذخیره نشد؛ اتصال را بررسی کنید.') }) }, 350) }
function snap() { return JSON.stringify(D) }
function act(label, fn) { var before = snap(); fn(); UNDO = before; save(); render(); toast(label, true) }
function undo() { if (!UNDO) return; D = JSON.parse(UNDO); UNDO = null; save(); render(); toast('برگردانده شد.') }

/* ───── داده‌ی نمونه (بار اول) ───── */
function seed() {
  var o = { root: { id: 'root', type: 'dir', name: 'همه‌ی فایل‌ها', parent: '' } }, k = 0;
  var dir = function (name, parent, x) { var id = 'd' + (++k); o[id] = Object.assign({ id: id, type: 'dir', name: name, parent: parent || 'root', ts: now() - 200 * DAY, fav: false }, x || {}); return id };
  var f = function (name, parent, kb, days, x) { var id = 'f' + (++k); o[id] = Object.assign({ id: id, type: 'file', name: name, parent: parent, size: Math.round(kb * 1024), ts: now() - days * DAY, mt: now() - days * DAY, sample: true }, x || {}); return id };
  var pr = dir('پروژه‌ها', 'root', { fav: true, links: [{ p: 'project-control', ref: 'همه‌ی پروژه‌ها' }] });
  var hz = dir('حمزه — ۱۲ واحد مسکونی', pr, { links: [{ p: 'project-control', ref: 'P01 · حمزه' }] }), nq = dir('نقشه‌ها', hz), qr = dir('قراردادها', hz), sj = dir('صورت‌جلسه‌ها', hz), ax = dir('عکس‌های کارگاه', hz), bm = dir('برنامه‌ی زمان‌بندی', hz);
  f('پلان طبقه‌ی همکف-rev3.dwg', nq, 4200, 6, { tags: ['معماری'] }); f('پلان طبقه‌ی همکف-rev2.dwg', nq, 4100, 40); f('سازه-فونداسیون.dwg', nq, 6800, 21, { tags: ['سازه'] }); f('تأسیسات-لوله‌کشی.pdf', nq, 2300, 12); f('مدل-BIM.rvt', nq, 184000, 30);
  f('قرارداد پیمانکار نما.pdf', qr, 890, 55, { links: [{ p: 'mail', ref: 'نامه‌ی ۱۴۰۵/۱۲۳' }] }); f('قرارداد تأمین میلگرد.docx', qr, 120, 80); f('الحاقیه‌ی ۱.pdf', qr, 240, 14);
  f('صورت‌جلسه-هماهنگی-هفته ۳۲.md', sj, 3, 2, { text: '# صورت‌جلسه‌ی هماهنگی — هفته‌ی ۳۲\n\nحاضران: مهندس مرتضوی، سارا احمدی، رضا کریمی\n\n## تصمیم‌ها\n- [x] تأیید نقشه‌ی اجرایی پیلوت\n- [ ] ارسال درخواست تأمین میلگرد فاز ۲\n- [ ] بازبینی برنامه‌ی بتن‌ریزی سقف طبقه‌ی ۳\n\n> تحویل نمای شمالی تا پایان آبان.\n\n## پیگیری\nمسئول: **رضا کریمی** — مهلت: شنبه', sample: false, size: 620 });
  f('صورت‌جلسه-کارفرما.pdf', sj, 310, 9); f('IMG_2041.jpg', ax, 3400, 1); f('IMG_2042.jpg', ax, 3100, 1); f('IMG_2043.jpg', ax, 2900, 1); f('پهپاد-نمای کلی.mp4', ax, 512000, 4);
  f('برنامه-حمزه-rev14.mpp', bm, 2600, 3, { links: [{ p: 'project-control', ref: 'نسخه‌ی ۱۴ برنامه' }] }); f('برنامه-حمزه-rev13.mpp', bm, 2550, 10);
  var bl = dir('بلوار مهر', pr, { links: [{ p: 'project-control', ref: 'P02 · بلوار مهر' }] }); f('پلان‌ها.zip', bl, 96000, 60); f('گزارش پیشرفت مهر.xlsx', bl, 410, 18);
  var co = dir('اسناد شرکت', 'root', { fav: true }); f('اساس‌نامه.pdf', co, 1500, 400); f('گواهی صلاحیت.pdf', co, 800, 210); f('لوگو.svg', co, 22, 300); f('کاتالوگ ۱۴۰۵.pptx', co, 18500, 35);
  var tp = dir('قالب‌ها', 'root'); f('قالب صورت‌وضعیت.xlsx', tp, 96, 150); f('قالب گزارش روزانه.docx', tp, 48, 150); f('راهنمای نام‌گذاری فایل‌ها.md', tp, 2, 20, { text: '# راهنمای نام‌گذاری\n\n`کدپروژه-موضوع-revشماره.پسوند`\n\n- کد پروژه: P01، P02…\n- بدون فاصله‌ی اضافه\n- تاریخ: ۱۴۰۵-۰۸-۲۴', sample: false, size: 210 });
  var dn = dir('دریافتی‌ها', 'root', { fav: true });
  [['فاکتور-۰۹۲۳.pdf', 214, 0], ['فاکتور-۰۹۲۳ (1).pdf', 214, 0], ['فاکتور (3).pdf', 190, 1], ['عکس نما از پیمانکار.jpg', 2400, 0], ['IMG_0412.heic', 3100, 3], ['IMG_0412 copy.heic', 3100, 3], ['Screenshot 1405-08-20.png', 820, 4], ['Screenshot 1405-08-12.png', 760, 12], ['بازدید کارگاه.mov', 312000, 2], ['ضبط جلسه.mp4', 84000, 95], ['بودجه-Q4.xlsx', 48, 1], ['export.csv', 12, 30], ['متره-اولیه.xlsx', 230, 120], ['پیشنهاد قیمت نما.docx', 84, 5], ['notes-final-FINAL.txt', 4, 200], ['AutoCAD-2026-setup.exe', 1250000, 100], ['Revit-viewer.msi', 186000, 140], ['نقشه‌ها-ارسالی.zip', 44000, 7], ['فونت‌ها.zip', 9000, 180], ['جزئیات-اجرایی-پله.dwg', 1900, 2], ['مقطع A-A.dxf', 640, 2], ['صدای جلسه.m4a', 11100, 26], ['کاتالوگ کاشی.pdf', 9400, 16], ['برنامه-پیشنهادی.mpp', 1800, 8], ['بدون‌نام.crdownload', 115, 0]].forEach(function (x) { f(x[0], dn, x[1], x[2]) });
  D.nodes = o;
  D.ws = [{ id: 'w1', name: 'تحویل فاز ۱ حمزه', color: '#4a6fe0', items: [nq, qr, 'f' + 9, 'f' + 15], note: 'هرچه برای تحویل فاز ۱ لازم است' }, { id: 'w2', name: 'مناقصه‌ی نما', color: '#2e9e57', items: [], note: '' }];
  D.bm = [{ id: 'b1', url: 'https://www.mrud.ir', title: 'وزارت راه و شهرسازی', coll: 'مقررات', tags: ['مقررات ملی'], fav: true, ts: now() - 9 * DAY }, { id: 'b2', url: 'https://www.archdaily.com', title: 'ArchDaily — ایده‌های طراحی', coll: 'طراحی', tags: ['معماری'], ts: now() - 3 * DAY }, { id: 'b3', url: 'https://www.autodesk.com/support', title: 'پشتیبانی Autodesk', coll: 'نرم‌افزار', tags: ['revit', 'autocad'], ts: now() - 30 * DAY }];
}
function load() { return api('GET', '/data/' + SITE + '/state/main').then(function (r) { D = r.data; REV = r.rev || 0; D.ws = D.ws || []; D.bm = D.bm || []; D.quota = D.quota || 5 * 1073741824 }, function (e) { if (e.status === 404) { seed(); REV = 0; return api('PUT', '/data/' + SITE + '/state/main', { data: D, base_rev: 0, op_id: 'fm-seed' }).then(function (r) { REV = r.rev || 1 }) } throw e }) }

/* ───── پوسته ───── */
function toast(t, canUndo) { var o = $('#toast'); if (o) o.remove(); var d = document.createElement('div'); d.id = 'toast'; d.setAttribute('role', 'status'); d.innerHTML = '<span>' + esc(t) + '</span>' + (canUndo ? '<button type="button" data-a="undo">واگرد</button>' : ''); document.body.appendChild(d); clearTimeout(toast.t); toast.t = setTimeout(function () { d.remove() }, canUndo ? 7000 : 3200) }
function dlg(title, body, foot, wide) { closeDlg(); var s = document.createElement('div'); s.className = 'scr'; s.id = 'scr'; s.innerHTML = '<div class="dlg' + (wide ? ' wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><header><h3>' + esc(title) + '</h3><button class="ib" data-a="close" aria-label="بستن">' + ic('x') + '</button></header><div class="dc">' + body + '</div>' + (foot ? '<footer>' + foot + '</footer>' : '') + '</div>'; s.addEventListener('mousedown', function (e) { if (e.target === s) closeDlg() }); $('#ov').appendChild(s); var f = s.querySelector('input,textarea,select'); if (f) setTimeout(function () { f.focus() }, 60); return s }
function closeDlg() { var s = $('#scr'); if (s) s.remove(); closeCtx() }
function closeCtx() { var c = $('.ctx'); if (c) c.remove() }
function go(page, cur, keep) { if (!keep && V.page === 'files') { V.back.push(V.cur + '|' + V.kind); V.fwd = [] } V.page = page; if (cur !== undefined) V.cur = cur; V.kind = ''; V.sel = {}; V.q = ''; $('#side').classList.remove('open'); render() }
function selIds() { return Object.keys(V.sel).filter(function (i) { return N(i) }) }

function render() { B.apply && B.apply(); sidebar(); toolbar(); pathbar(); content(); info(); pane2(); status() }
function sidebar() {
  var it = function (pg, icn, label, n, extra) { var on = (V.page + (V.page === 'files' ? ':' + V.cur : '')) === pg; return '<button class="si' + (on ? ' on' : '') + '" data-go="' + pg + '">' + icn + '<span>' + esc(label) + '</span>' + (n ? '<em>' + fa(n) + '</em>' : '') + (extra || '') + '</button>' };
  var h = '<div class="sh">فضاهای کاری<button data-a="ws-new" aria-label="فضای کاری تازه" title="فضای کاری تازه">+</button></div>' + D.ws.map(function (w) { return it('ws:' + w.id, '<i class="dot" style="background:' + w.color + '"></i>', w.name, w.items.filter(N).length) }).join('');
  h += '<div class="sh">نشانک‌ها</div>' + it('bm', ic('bm'), 'همه‌ی نشانک‌ها', D.bm.length);
  h += '<div class="sh">دسترسی سریع</div>' + it('files:root', ic('home'), 'همه‌ی فایل‌ها') + live().filter(function (n) { return n.type === 'dir' && n.fav }).map(function (n) { return it('files:' + n.id, ic('folder'), n.name) }).join('') + it('recent', ic('clock'), 'تازه‌ها') + it('fav', ic('star'), 'ستاره‌دارها');
  h += '<div class="sh">ابزار</div>' + it('clean', ic('broom'), 'آزادسازی فضا') + it('conn', ic('link'), 'اتصال‌ها', live().filter(function (n) { return (n.links || []).length }).length) + it('trash', ic('trash'), 'سطل بازیافت', Object.keys(D.nodes).map(N).filter(function (n) { return n.trash }).length);
  $('#snav').innerHTML = h;
  var used = files().reduce(function (s, f) { return s + (f.size || 0) }, 0), pc = Math.min(100, used / D.quota * 100);
  $('#stor').innerHTML = '<b>فضای ذخیره</b><div class="bar"><i style="width:' + pc.toFixed(1) + '%"></i></div><span class="ltr">' + fsz(used) + '</span> از <span class="ltr">' + fsz(D.quota) + '</span>';
  $('#who').textContent = ME ? ME.name : ''; $('#thm').innerHTML = ic('sun'); $('#out').innerHTML = ic('exit');
}
function title() { if (V.page === 'files') return V.kind ? KIND[V.kind][0] : (N(V.cur) || N('root')).name; if (V.page.indexOf('ws:') === 0) { var w = WS(); return w ? w.name : 'فضای کاری' } return { bm: 'نشانک‌ها', clean: 'آزادسازی فضا', conn: 'اتصال‌ها', trash: 'سطل بازیافت', recent: 'تازه‌ها', fav: 'ستاره‌دارها' }[V.page] }
function WS() { var id = V.page.slice(3); return D.ws.filter(function (w) { return w.id === id })[0] }
function toolbar() {
  var fl = V.page === 'files', h = '<button class="ib mob" data-a="menu" aria-label="فهرست">' + ic('menu') + '</button>';
  h += '<button class="ib" data-a="back" aria-label="قبلی"' + (V.back.length && fl ? '' : ' disabled') + '>' + ic('back') + '</button><button class="ib hid-m" data-a="fwd" aria-label="بعدی"' + (V.fwd.length && fl ? '' : ' disabled') + '>' + ic('fwd') + '</button><h1>' + esc(title()) + '</h1><span class="sp"></span>';
  if (fl) {
    h += '<button class="ib" data-a="upload" title="بارگذاری فایل">' + ic('up') + '<span class="hid-m">بارگذاری</span></button><button class="ib" data-a="photos" title="از عکس‌های دستگاه" aria-label="افزودن از عکس‌های دستگاه">' + ic('cam') + '</button><button class="ib" data-a="mkdir" title="پوشه‌ی تازه" aria-label="پوشه‌ی تازه">' + ic('plus') + '</button>';
    h += '<div class="seg" role="group" aria-label="گروه‌بندی">' + [['none', 'ساده'], ['kind', 'نوع'], ['date', 'تاریخ']].map(function (g) { return '<button data-grp="' + g[0] + '"' + (V.group === g[0] ? ' class="on" aria-pressed="true"' : '') + '>' + g[1] + '</button>' }).join('') + '</div>';
    h += '<div class="seg" role="group" aria-label="نما">' + [['list', 'فهرست'], ['grid', 'کاشی']].map(function (g) { return '<button data-view="' + g[0] + '" aria-label="' + g[1] + '"' + (V.view === g[0] ? ' class="on" aria-pressed="true"' : '') + '>' + ic(g[0]) + '</button>' }).join('') + '</div>';
    h += '<div class="seg" role="group" aria-label="پنل‌ها"><button data-inf="pv" aria-label="پیش‌نمایش"' + (V.inf === 'pv' ? ' class="on"' : '') + '>' + ic('info') + '</button><button data-inf="an" aria-label="تحلیل فضا"' + (V.inf === 'an' ? ' class="on"' : '') + '>' + ic('chart') + '</button><button class="hid-m' + (V.dual ? ' on' : '') + '" data-a="dual" aria-label="دو پنجره">' + ic('split') + '</button></div>';
  }
  h += '<label class="srch">' + ic('search') + '<input id="q" placeholder="' + (fl ? 'صافی همین پوشه' : 'جست‌وجو') + '" value="' + esc(V.q) + '" aria-label="صافی"></label><button class="ib" data-a="find" title="جست‌وجوی همه‌جا (⌘K)">' + ic('search') + '<span class="hid-m">همه‌جا</span></button>';
  $('#tb').innerHTML = h;
}
function pathbar() {
  var pb = $('#pb'); if (V.page !== 'files') { pb.hidden = true; return } pb.hidden = false;
  pb.innerHTML = pathOf(V.cur).map(function (n) { return '<button data-open="' + n.id + '">' + esc(n.name) + '</button>' }).join('<span>‹</span>') + (V.kind ? '<span>‹</span><button>' + KIND[V.kind][0] + '</button>' : '');
}
function status() {
  var s = selIds(), t; if (s.length) t = fa(s.length) + ' مورد انتخاب شده · <span class="ltr">' + fsz(s.reduce(function (a, i) { return a + sizeOf(N(i)) }, 0)) + '</span>';
  else if (V.page === 'files') { var k = kids(V.cur); t = fa(k.length) + ' مورد · <span class="ltr">' + fsz(sizeOf(N(V.cur))) + '</span>' } else t = '';
  $('#sb').innerHTML = '<span>' + t + '</span><span class="sp"></span>' + (s.length ? '<button class="btn s g" data-a="sel-move">انتقال…</button><button class="btn s g" data-a="sel-ws">به فضای کاری…</button><button class="btn s d" data-a="sel-del">حذف</button>' : '<span>فایل‌های بارگذاری‌شده فعلاً روی همین دستگاه نگه‌داری می‌شوند</span>');
}

/* ───── کارت‌ها ───── */
function thumb(n) { if (URLS[n.id]) return Promise.resolve(URLS[n.id]); return IDB.get(n.id).then(function (b) { if (!b) return ''; return URLS[n.id] = URL.createObjectURL(b) }) }
function foldHTML(color, top, bottom, icn, linked) { return '<span class="fold" style="--c:' + color + '"><span class="bk"></span><span class="pp"></span><span class="pp"></span><span class="fr"><b>' + top + '</b>' + ic(icn) + '<small>' + bottom + '</small></span>' + (linked ? '<span class="lk">' + ic('link') + '</span>' : '') + '</span>' }
function dirColor(n) { return n.color || '#4a6fe0' }
function card(n) {
  var s = V.sel[n.id] ? ' sel' : '', a = ' data-id="' + n.id + '"';
  if (n.type === 'dir') return '<button class="it' + s + '"' + a + '>' + foldHTML(dirColor(n), fa(countOf(n)) + ' مورد', fsz(sizeOf(n)), n.fav ? 'star' : 'folder', (n.links || []).length) + '<span class="nm"><bdi>' + esc(n.name) + '</bdi></span></button>';
  var k = kindOf(n.name), body = '<span class="ext">' + esc((extOf(n.name) || '—').toUpperCase()) + '</span>';
  if (n.text) body = '<span class="tx">' + esc(n.text.slice(0, 400)) + '</span>';
  return '<button class="it' + s + '"' + a + '><span class="fc" style="--c:' + KIND[k][1] + '"' + (k === 'image' && !n.sample ? ' data-th="' + n.id + '"' : '') + '>' + body + (n.fav ? '<span class="star">★</span>' : '') + ((n.links || []).length ? '<span class="chain">' + ic('link') + '</span>' : '') + '</span><span class="nm">' + esc(n.name) + '</span><span class="mt"><span class="ltr">' + fsz(n.size) + '</span> · ' + ago(n.mt || n.ts) + '</span></button>';
}
function rowsHTML(a) { return '<table class="lst"><thead><tr><th>نام</th><th class="hm">نوع</th><th>اندازه</th><th class="hm">تغییر</th><th></th></tr></thead><tbody>' + a.map(function (n) { var k = n.type === 'dir' ? null : kindOf(n.name); return '<tr data-id="' + n.id + '"' + (V.sel[n.id] ? ' class="sel"' : '') + '><td class="n"><span class="kd" style="--c:' + (k ? KIND[k][1] : dirColor(n)) + '">' + (k ? esc((extOf(n.name) || '—').toUpperCase().slice(0, 4)) : 'DIR') + '</span>' + esc(n.name) + (n.fav ? ' ★' : '') + '</td><td class="hm">' + (k ? KIND[k][0] : 'پوشه · ' + fa(countOf(n)) + ' مورد') + '</td><td class="ltr">' + fsz(sizeOf(n)) + '</td><td class="hm">' + ago(n.mt || n.ts) + '</td><td><button class="ib" data-more="' + n.id + '" aria-label="گزینه‌ها" style="height:28px;min-width:28px;padding:0 4px">' + ic('dots') + '</button></td></tr>' }).join('') + '</tbody></table>' }
function block(label, a) { if (!a.length) return ''; return '<div class="sec">' + label + ' <em>' + fa(a.length) + '</em></div>' + (V.view === 'grid' ? '<div class="grid">' + a.map(card).join('') + '</div>' : rowsHTML(a)) }
function content() {
  var c = $('#cnt'), pg = V.page, h = '';
  if (pg === 'files') h = filesPage(); else if (pg.indexOf('ws:') === 0) h = wsPage(); else if (pg === 'bm') h = bmPage(); else if (pg === 'clean') h = cleanPage(); else if (pg === 'conn') h = connPage(); else if (pg === 'trash') h = trashPage();
  else { var a = live().filter(function (n) { return pg === 'fav' ? n.fav : n.type === 'file' }); if (pg === 'recent') a = a.sort(function (x, y) { return (y.mt || y.ts) - (x.mt || x.ts) }).slice(0, 40); h = a.length ? block(pg === 'fav' ? 'ستاره‌دارها' : 'آخرین تغییرها', a) : '<div class="empty">هنوز چیزی اینجا نیست.</div>' }
  c.innerHTML = h;
  $$('[data-th]', c).forEach(function (el) { thumb(N(el.dataset.th)).then(function (u) { if (u) el.innerHTML = '<img alt="" src="' + u + '">' }) });
}
function filesPage() {
  var all = sorted(kids(V.cur)), q = V.q.trim().toLowerCase(); if (q) all = all.filter(function (n) { return n.name.toLowerCase().indexOf(q) >= 0 });
  var dirs = all.filter(function (n) { return n.type === 'dir' }), fs = all.filter(function (n) { return n.type === 'file' });
  if (V.kind) return block(KIND[V.kind][0], fs.filter(function (f) { return kindOf(f.name) === V.kind })) || '<div class="empty">خالی است.</div>';
  if (!all.length) return '<div class="empty">' + (q ? 'چیزی با این نام در این پوشه نیست.' : 'این پوشه خالی است.<br>فایل‌ها را اینجا رها کنید یا «بارگذاری» را بزنید.') + '</div>';
  var h = block('پوشه‌ها', dirs);
  if (V.group === 'kind' && fs.length > 3 && !q) {
    var g = {}; fs.forEach(function (f) { var k = kindOf(f.name); (g[k] = g[k] || []).push(f) });
    h += '<div class="sec">بر اساس نوع <em>' + fa(Object.keys(g).length) + '</em></div><div class="grid">' + Object.keys(KIND).filter(function (k) { return g[k] }).map(function (k) { return '<button class="it" data-kind="' + k + '">' + foldHTML(KIND[k][1], fa(g[k].length) + ' فایل', fsz(g[k].reduce(function (s, f) { return s + f.size }, 0)), KIND[k][2]) + '<span class="nm">' + KIND[k][0] + '</span></button>' }).join('') + '</div>';
  } else if (V.group === 'date' && !q) {
    var bk = [['امروز', 1], ['این هفته', 7], ['این ماه', 30], ['سه ماه اخیر', 90], ['قدیمی‌تر', 1e9]], prev = 0; fs.sort(function (x, y) { return (y.mt || y.ts) - (x.mt || x.ts) });
    bk.forEach(function (b) { var lo = prev; prev = b[1]; h += block(b[0], fs.filter(function (f) { var d = (now() - (f.mt || f.ts)) / DAY; return d >= lo && d < b[1] })) });
  } else h += block('فایل‌ها', fs);
  return h;
}
/* ───── پنل اطلاعات ───── */
function suggestions(scope) {
  var fs = scope.filter(function (n) { return n.type === 'file' }), out = [], seen = {}, dup = [];
  fs.forEach(function (f) { var key = f.name.replace(/\s*(\(\d+\)|copy|کپی)(?=\.[^.]+$)/i, '').toLowerCase() + '|' + f.size; if (seen[key]) dup.push(f); else seen[key] = f });
  if (dup.length) out.push({ k: 'dup', t: fa(dup.length) + ' فایل تکراری', why: 'همان نام و همان اندازه‌ی فایل دیگری را دارند.', items: dup, safe: true });
  var ins = fs.filter(function (f) { return kindOf(f.name) === 'app' }); if (ins.length) out.push({ k: 'app', t: fa(ins.length) + ' نصب‌کننده', why: 'بعد از نصب برنامه معمولاً دیگر لازم نیستند.', items: ins, safe: true });
  var part = fs.filter(function (f) { return /\.(crdownload|part|tmp)$/i.test(f.name) }); if (part.length) out.push({ k: 'tmp', t: fa(part.length) + ' دانلود ناتمام', why: 'فایل‌های نیمه‌کاره‌ای که قابل استفاده نیستند.', items: part, safe: true });
  var old = fs.filter(function (f) { return now() - (f.mt || f.ts) > 90 * DAY && dup.indexOf(f) < 0 && ins.indexOf(f) < 0 }); if (old.length) out.push({ k: 'old', t: fa(old.length) + ' فایل قدیمی‌تر از ۹۰ روز', why: 'مدت زیادی است تغییری نکرده‌اند؛ شاید دیگر لازم نباشند.', items: old });
  var big = fs.filter(function (f) { return f.size > 100 * 1048576 && ins.indexOf(f) < 0 }); if (big.length) out.push({ k: 'big', t: fa(big.length) + ' فایل بزرگ', why: 'هر کدام بیش از ۱۰۰ مگابایت جا گرفته‌اند.', items: big });
  var revs = fs.filter(function (f) { var m = /^(.*)-rev(\d+)(\.[^.]+)$/i.exec(f.name); return m && fs.some(function (g) { var x = /^(.*)-rev(\d+)(\.[^.]+)$/i.exec(g.name); return x && x[1] === m[1] && x[3] === m[3] && +x[2] > +m[2] }) }); if (revs.length) out.push({ k: 'rev', t: fa(revs.length) + ' بازنگری قدیمی نقشه/برنامه', why: 'نسخه‌ی rev تازه‌تری از همین فایل وجود دارد.', items: revs });
  return out;
}
function info() {
  var el = $('#inf'), s = selIds(), fl = V.page === 'files';
  if (!fl || (window.innerWidth <= 860 && !s.length)) { el.hidden = true; return }
  el.hidden = false; var h = '';
  if (s.length === 1 && (V.inf === 'pv' || window.innerWidth <= 860 || N(s[0]).type === 'file')) { el.innerHTML = previewHTML(N(s[0])); fillPreview(N(s[0])); return }
  var d = N(V.cur), fs = kids(V.cur), tot = sizeOf(d), parts = [];
  fs.filter(function (n) { return n.type === 'dir' }).forEach(function (n) { parts.push({ n: n.name, c: dirColor(n), s: sizeOf(n) }) });
  var g = {}; fs.filter(function (n) { return n.type === 'file' }).forEach(function (f) { var k = kindOf(f.name); g[k] = (g[k] || 0) + f.size }); Object.keys(g).forEach(function (k) { parts.push({ n: KIND[k][0], c: KIND[k][1], s: g[k] }) });
  parts.sort(function (a, b) { return b.s - a.s });
  h += '<h2>' + esc(d.name) + '</h2><p class="big"><span class="ltr">' + fsz(tot) + '</span> <small>در مجموع</small></p><small style="color:var(--muted)">' + fa(fs.filter(function (n) { return n.type === 'dir' }).length) + ' پوشه · ' + fa(fs.filter(function (n) { return n.type === 'file' }).length) + ' فایل آزاد</small>';
  h += '<div class="cap">چه چیزی جا گرفته</div>' + (parts.slice(0, 7).map(function (p) { return '<div class="sz" style="--c:' + p.c + '"><div><i></i><span>' + esc(p.n) + '</span><b>' + fsz(p.s) + '</b></div><u><s style="width:' + (tot ? Math.max(2, p.s / tot * 100) : 0) + '%"></s></u></div>' }).join('') || '<small style="color:var(--muted)">خالی</small>');
  var sg = suggestions(fs); if (sg.length) h += '<div class="cap">پیشنهادها</div>' + sg.slice(0, 3).map(function (x) { return '<div class="sug"><b>' + x.t + ' · <span class="ltr">' + fsz(x.items.reduce(function (a, f) { return a + f.size }, 0)) + '</span></b><p>' + x.why + '</p><button class="btn s g" data-sug="' + x.k + '">بررسی…</button></div>' }).join('');
  if (fs.filter(function (n) { return n.type === 'file' }).length > 3) h += '<button class="btn w" data-a="tidy" style="margin-top:8px">مرتب‌سازی «' + esc(d.name) + '»…</button>';
  el.innerHTML = h;
}
function linkChips(n) { return (n.links || []).map(function (l, i) { var p = B.platform ? B.platform(l.p) : null; return '<span class="tag" style="border-color:' + (p ? p.color : '') + '">' + esc(p ? p.n + ' — ' + p.fa : l.p) + (l.ref ? ' · ' + esc(l.ref) : '') + ' <button data-unlink="' + i + '" aria-label="حذف اتصال" style="background:none;border:0;padding:0 2px;color:var(--muted)">×</button></span>' }).join('') }
function previewHTML(n) {
  var k = n.type === 'dir' ? null : kindOf(n.name), h = '<h2>' + esc(n.name) + '</h2><div class="pv" id="pvBox">' + (n.type === 'dir' ? foldHTML(dirColor(n), fa(countOf(n)) + ' مورد', fsz(sizeOf(n)), 'folder') : '<span class="kd" style="--c:' + KIND[k][1] + ';font-size:16px;padding:10px 14px">' + esc((extOf(n.name) || '—').toUpperCase()) + '</span>') + '</div>';
  h += '<div class="row" style="margin-bottom:12px"><button class="btn s" data-a="open1">' + (n.type === 'dir' ? 'باز کردن' : 'نگاه سریع') + '</button><button class="btn s g" data-a="dl1">' + ic('dl') + '</button><button class="btn s g" data-a="fav1" aria-label="ستاره">' + (n.fav ? '★' : '☆') + '</button><button class="btn s g" data-more="' + n.id + '" aria-label="گزینه‌ها">' + ic('dots') + '</button></div>';
  h += '<dl class="kv"><dt>نوع</dt><dd>' + (k ? KIND[k][0] : 'پوشه') + '</dd><dt>اندازه</dt><dd class="ltr">' + fsz(sizeOf(n)) + '</dd><dt>جا</dt><dd>' + esc(pathOf(n.parent).map(function (p) { return p.name }).join(' › ')) + '</dd><dt>تغییر</dt><dd>' + ago(n.mt || n.ts) + '</dd>' + (n.by ? '<dt>بارگذار</dt><dd>' + esc(n.by) + '</dd>' : '') + (n.sample ? '<dt>وضعیت</dt><dd>فایل نمونه (بدون محتوا)</dd>' : '') + '</dl>';
  if (n.type === 'dir') h += '<div class="cap">داخل پوشه</div>' + sorted(kids(n.id)).slice(0, 8).map(function (c) { return '<div class="ck"><span>' + (c.type === 'dir' ? '📁 ' : '') + esc(c.name) + '</span><small>' + fsz(sizeOf(c)) + '</small></div>' }).join('');
  h += '<div class="cap">برچسب‌ها</div><div class="tags">' + (n.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + '</span>' }).join('') + '<button class="tag" data-a="tag1">+ برچسب</button></div>';
  h += '<div class="cap">اتصال به پلتفرم‌ها</div><div class="tags">' + linkChips(n) + '<button class="tag" data-a="link1">+ اتصال</button></div>';
  return h;
}
function fillPreview(n) { var bx = $('#pvBox'); if (!bx || n.type === 'dir') return; if (n.text) { bx.innerHTML = '<div class="mdv" style="padding:12px;width:100%;max-height:260px">' + md(n.text) + '</div>'; return } var k = kindOf(n.name); if (k !== 'image' && k !== 'video') return; thumb(n).then(function (u) { if (!u || !$('#pvBox')) return; $('#pvBox').innerHTML = k === 'image' ? '<img alt="" src="' + u + '">' : '<video controls playsinline src="' + u + '"></video>' }) }

/* ───── صفحه‌های دیگر ───── */
function wsPage() {
  var w = WS(); if (!w) return '<div class="empty">فضای کاری پیدا نشد.</div>'; var it = w.items.map(N).filter(function (n) { return n && !inTrash(n) });
  var h = '<div class="hero" style="background:linear-gradient(135deg,color-mix(in srgb,' + w.color + ' 35%,var(--card)),var(--card))"><h2>' + esc(w.name) + '</h2><p>' + esc(w.note || 'پوشه‌ها و فایل‌های این کار از هر جای فایل منیجر، در یک صفحه. چیزی کپی یا جابه‌جا نمی‌شود.') + '</p><p>' + fa(it.filter(function (n) { return n.type === 'dir' }).length) + ' پوشه · ' + fa(it.filter(function (n) { return n.type === 'file' }).length) + ' فایل · <span class="ltr">' + fsz(it.reduce(function (s, n) { return s + sizeOf(n) }, 0)) + '</span></p><div class="row"><button class="btn s g" data-a="ws-edit">ویرایش</button><button class="btn s g" data-a="ws-del">حذف فضای کاری</button></div></div>';
  if (!it.length) return h + '<div class="empty">هنوز چیزی اضافه نشده.<br>در «همه‌ی فایل‌ها» روی هر پوشه یا فایل «⋯» را بزنید و «افزودن به فضای کاری» را انتخاب کنید.</div>';
  var g = { 'پوشه‌ها': [], 'نقشه‌ها و برنامه‌ها': [], 'تصویر و ویدیو': [], 'سندها': [] }; it.forEach(function (n) { var k = n.type === 'dir' ? 'پوشه‌ها' : /cad|plan/.test(kindOf(n.name)) ? 'نقشه‌ها و برنامه‌ها' : /image|video/.test(kindOf(n.name)) ? 'تصویر و ویدیو' : 'سندها'; g[k].push(n) });
  Object.keys(g).forEach(function (k) { h += block(k, g[k]) }); return h;
}
function bmPage() {
  var q = V.q.trim().toLowerCase(), colls = {}; D.bm.forEach(function (b) { colls[b.coll || 'دسته‌بندی‌نشده'] = 1 });
  var a = D.bm.filter(function (b) { return (V.bmf === 'all' || (V.bmf === 'fav' ? b.fav : (b.coll || 'دسته‌بندی‌نشده') === V.bmf)) && (!q || (b.title + b.url + (b.tags || []).join(' ')).toLowerCase().indexOf(q) >= 0) }).sort(function (x, y) { return y.ts - x.ts });
  var h = '<div class="hero"><h2>نشانک‌ها</h2><p>پیوندهای کاری (آیین‌نامه‌ها، تأمین‌کننده‌ها، مرجع‌های طراحی) کنار فایل‌ها. پیوند را کپی کنید و «افزودن پیوند» را بزنید.</p><div class="row"><button class="btn s" data-a="bm-new">' + ic('plus') + ' افزودن پیوند</button><div class="seg">' + [['all', 'همه'], ['fav', 'ستاره‌دار']].concat(Object.keys(colls).map(function (c) { return [c, c] })).map(function (f) { return '<button data-bmf="' + esc(f[0]) + '"' + (V.bmf === f[0] ? ' class="on"' : '') + '>' + esc(f[1]) + '</button>' }).join('') + '</div></div></div>';
  if (!a.length) return h + '<div class="empty">نشانکی نیست.</div>';
  var cols = ['#4a6fe0', '#2e9e57', '#d98a2b', '#c9423f', '#7a5cd6', '#3f8fa8'];
  return h + '<div class="bmg">' + a.map(function (b) { var host = ''; try { host = new URL(b.url).hostname.replace(/^www\./, '') } catch (e) { } return '<div class="bm"><div class="th" style="--c:' + cols[(host.charCodeAt(0) || 0) % cols.length] + '">' + esc((host[0] || '?').toUpperCase()) + '</div><div class="bd"><a href="' + esc(b.url) + '" target="_blank" rel="noopener noreferrer">' + esc(b.title || host) + '</a><small>' + esc(host) + '</small><div class="tags"><span class="tag">' + esc(b.coll || 'دسته‌بندی‌نشده') + '</span>' + (b.tags || []).map(function (t) { return '<span class="tag">#' + esc(t) + '</span>' }).join('') + '</div><div class="row"><button class="btn s g" data-bfav="' + b.id + '">' + (b.fav ? '★' : '☆') + '</button><button class="btn s g" data-bdel="' + b.id + '" aria-label="حذف نشانک">' + ic('trash') + '</button></div></div></div>' }).join('') + '</div>';
}
function cleanPage() {
  var all = live(), used = files().reduce(function (s, f) { return s + f.size }, 0), sg = suggestions(all), tr = Object.keys(D.nodes).map(N).filter(function (n) { return n.trash });
  if (tr.length) sg.push({ k: 'trash', t: 'سطل بازیافت', why: 'موردهایی که قبلاً حذف کرده‌اید؛ با خالی‌کردن برای همیشه می‌روند.', items: tr.map(function (n) { return { id: n.id, name: n.name, size: sizeOf(n) } }), your: true });
  var safe = sg.filter(function (x) { return x.safe }), free = safe.reduce(function (s, x) { return s + x.items.reduce(function (a, f) { return a + f.size }, 0) }, 0);
  var g = {}; files().forEach(function (f) { var k = kindOf(f.name); g[k] = (g[k] || 0) + f.size });
  var h = '<div class="hero"><h2>آزادسازی فضا</h2><p>هیچ چیزی بدون دیدن شما حذف نمی‌شود؛ همه به سطل بازیافت می‌روند و «واگرد» برشان می‌گرداند.</p><div class="meter">' + Object.keys(g).sort(function (a, b) { return g[b] - g[a] }).map(function (k) { return '<i title="' + KIND[k][0] + '" style="width:' + (g[k] / D.quota * 100) + '%;background:' + KIND[k][1] + '"></i>' }).join('') + '</div><p><b class="ltr">' + fsz(used) + '</b> از <span class="ltr">' + fsz(D.quota) + '</span> پر است · می‌توانید حدود <b class="ltr">' + fsz(free) + '</b> آزاد کنید.</p></div>';
  if (!sg.length) return h + '<div class="empty">همه‌چیز مرتب است.</div>';
  return h + sg.map(function (x) { var sz = x.items.reduce(function (a, f) { return a + f.size }, 0); return '<div class="box" data-cl="' + x.k + '"><h3>' + x.t + ' <span class="pill' + (x.safe ? '' : ' w') + '">' + (x.safe ? 'بی‌خطر' : 'تصمیم با شما') + '</span><em>' + fsz(sz) + '</em></h3><p>' + x.why + '</p>' + x.items.slice(0, 30).map(function (f) { return '<label class="ck"><input type="checkbox" value="' + f.id + '"' + (x.safe ? ' checked' : '') + '><span>' + esc(f.name) + '</span><small>' + fsz(f.size) + '</small></label>' }).join('') + '<div class="row" style="margin-top:10px"><button class="btn s' + (x.k === 'trash' ? ' d' : '') + '" data-clean="' + x.k + '">' + (x.k === 'trash' ? 'حذف همیشگی انتخاب‌شده‌ها' : 'انتقال انتخاب‌شده‌ها به سطل بازیافت') + '</button></div></div>' }).join('');
}
function connPage() {
  var linked = live().filter(function (n) { return (n.links || []).length }), by = {}; linked.forEach(function (n) { n.links.forEach(function (l) { (by[l.p] = by[l.p] || []).push({ n: n, ref: l.ref }) }) });
  var how = { 'project-control': 'پوشه‌ی هر پروژه و نسخه‌های برنامه (MPP) به پروژه و فعالیت‌های کنترل پروژه وصل می‌شوند.', mail: 'پیوست نامه‌ها از همین‌جا انتخاب می‌شود و هر نامه به فایلش برمی‌گردد.', messenger: 'فایل‌هایی که در گفت‌وگو فرستاده می‌شوند اینجا نگه‌داری می‌شوند.', 'executive-desk': 'مدارک جلسه‌های مدیرعامل (دستور جلسه، صورت‌جلسه).', 'users-panel': 'دسترسی هر پوشه از سطح و نقش کاربر در پنل کاربری می‌آید.', designer: 'فایل‌های طراحی و رندرها.', crm: 'قرارداد و مدارک هر مشتری.', portfolio: 'تصویرها و مدارک نمونه‌کارها.', training: 'جزوه‌ها و ویدیوهای آموزشی.' };
  var h = '<div class="hero"><h2>اتصال‌ها</h2><p>هر پوشه یا فایل می‌تواند به یک پلتفرم دیگر وصل باشد (مثلاً پوشه‌ی پروژه به «کنترل پروژه»). برای افزودن، روی «⋯» هر مورد بزنید و «اتصال به پلتفرم» را انتخاب کنید.</p></div>';
  return h + (B.platforms || []).filter(function (p) { return p.slug !== 'file-manager' && how[p.slug] }).map(function (p) { var a = by[p.slug] || []; return '<div class="box"><h3><i style="width:10px;height:10px;border-radius:50%;background:' + p.color + '"></i>' + p.n + ' — ' + esc(p.fa) + ' <span class="pill ' + (a.length ? '' : 'b') + '">' + (a.length ? fa(a.length) + ' اتصال' : 'بدون اتصال') + '</span></h3><p>' + how[p.slug] + '</p>' + a.map(function (x) { return '<div class="ck"><span><button class="btn s g" data-reveal="' + x.n.id + '">' + esc(x.n.name) + '</button></span><small style="direction:rtl">' + esc(x.ref || '') + '</small></div>' }).join('') + '</div>' }).join('');
}
function trashPage() { var a = Object.keys(D.nodes).map(N).filter(function (n) { return n.trash }); if (!a.length) return '<div class="empty">سطل بازیافت خالی است.</div>'; return '<div class="hero"><h2>سطل بازیافت</h2><p>موردهای حذف‌شده اینجا می‌مانند تا خودتان خالی کنید.</p><div class="row"><button class="btn s g" data-a="tr-restore">بازگرداندن همه</button><button class="btn s d" data-a="tr-empty">خالی‌کردن سطل…</button></div></div>' + block('حذف‌شده‌ها', a) }

/* ───── دو پنجره ───── */
function pane2() { var el = $('#pane2'); if (!V.dual || V.page !== 'files' || window.innerWidth <= 860) { el.hidden = true; return } el.hidden = false; var s = selIds().length; el.innerHTML = '<div class="p2h"><button class="ib" data-p2="' + (N(V.cur2).parent || 'root') + '" aria-label="بالا" style="height:30px;min-width:30px">' + ic('back') + '</button><b style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(pathOf(V.cur2).map(function (p) { return p.name }).join(' › ')) + '</b><button class="btn s" data-a="p2copy"' + (s ? '' : ' disabled') + '>کپی به اینجا</button><button class="btn s g" data-a="p2move"' + (s ? '' : ' disabled') + '>انتقال</button></div><div class="p2l tree">' + (sorted(kids(V.cur2)).map(function (n) { return '<button ' + (n.type === 'dir' ? 'data-p2="' + n.id + '"' : 'disabled') + '>' + (n.type === 'dir' ? ic('folder') : '<span class="kd" style="--c:' + KIND[kindOf(n.name)][1] + ';margin:0">' + esc(extOf(n.name).toUpperCase().slice(0, 4)) + '</span>') + '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(n.name) + '</span><small class="ltr" style="color:var(--muted)">' + fsz(sizeOf(n)) + '</small></button>' }).join('') || '<div class="empty">خالی</div>') + '</div>' }

/* ───── کارها ───── */
function uniq(name, parent) { var names = {}; kids(parent).forEach(function (n) { names[n.name] = 1 }); if (!names[name]) return name; var m = /^(.*?)(\.[^.]+)?$/.exec(name), i = 2; while (names[m[1] + ' (' + i + ')' + (m[2] || '')]) i++; return m[1] + ' (' + i + ')' + (m[2] || '') }
function addFiles(list, parent) {
  var arr = [].slice.call(list || []); if (!arr.length) return; var before = snap(), jobs = arr.map(function (f) {
    var id = uid(), n = { id: id, type: 'file', name: uniq(f.name, parent), parent: parent, size: f.size, ts: now(), mt: f.lastModified || now(), by: ME ? ME.name : '' }; D.nodes[id] = n;
    var j = IDB.put(id, f); if (isText(f.name) && f.size < 200000) j = j.then(function () { return f.text() }).then(function (t) { n.text = t }); return j
  });
  Promise.all(jobs).then(function () { UNDO = before; save(); render(); toast(fa(arr.length) + ' فایل اضافه شد.', true) });
}
function trashIds(ids) { act(fa(ids.length) + ' مورد به سطل بازیافت رفت.', function () { ids.forEach(function (i) { if (N(i)) N(i).trash = now() }); V.sel = {} }) }
function purge(id) { kids(id, true).forEach(function (c) { purge(c.id) }); IDB.del(id); delete D.nodes[id]; D.ws.forEach(function (w) { w.items = w.items.filter(function (x) { return x !== id }) }) }
function isUnder(id, anc) { while (id) { if (id === anc) return true; id = (N(id) || {}).parent } return false }
function moveIds(ids, to) { ids = ids.filter(function (i) { return !isUnder(to, i) && N(i).parent !== to }); if (!ids.length) { toast('جابه‌جایی لازم نبود.'); return } act(fa(ids.length) + ' مورد منتقل شد.', function () { ids.forEach(function (i) { N(i).name = uniq(N(i).name, to); N(i).parent = to }); V.sel = {} }) }
function cloneNode(id, to) { var n = N(id), nid = uid(), c = JSON.parse(JSON.stringify(n)); c.id = nid; c.parent = to; c.name = uniq(n.name, to); c.ts = now(); delete c.trash; D.nodes[nid] = c; if (n.type === 'file') IDB.get(id).then(function (b) { if (b) IDB.put(nid, b) }); else kids(id).forEach(function (k) { cloneNode(k.id, nid) }) }
function copyIds(ids, to) { ids = ids.filter(function (i) { return !isUnder(to, i) }); if (!ids.length) return; act(fa(ids.length) + ' مورد کپی شد.', function () { ids.forEach(function (i) { cloneNode(i, to) }) }) }
function download(n) { if (n.type === 'dir') { toast('دانلود پوشه هنوز پشتیبانی نمی‌شود؛ فایل‌ها را جدا دانلود کنید.'); return } var done = function (b) { if (!b) { toast('این فایل نمونه است و محتوایی ندارد.'); return } var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = n.name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove() }, 500) }; IDB.get(n.id).then(function (b) { done(b || (n.text != null ? new Blob([n.text], { type: 'text/plain' }) : null)) }) }
function openNode(n) { if (n.trash) return; if (n.type === 'dir') { V.back.push(V.cur + '|' + V.kind); V.fwd = []; V.page = 'files'; V.cur = n.id; V.kind = ''; V.sel = {}; V.q = ''; render() } else peek(n) }
function pickFolder(title, okLabel, cb) {
  var cur = 'root'; function draw() { var b = '<div class="tree">' + (cur !== 'root' ? '<button data-pk="' + N(cur).parent + '">' + ic('back') + ' بالا</button>' : '') + '<button class="on">' + ic('folder') + ' ' + esc(pathOf(cur).map(function (p) { return p.name }).join(' › ')) + '</button>' + sorted(kids(cur)).filter(function (n) { return n.type === 'dir' }).map(function (n) { return '<button data-pk="' + n.id + '" style="padding-inline-start:26px">' + ic('folder') + ' ' + esc(n.name) + '</button>' }).join('') + '</div>'; var s = dlg(title, b, '<button class="btn g" data-a="close">انصراف</button><button class="btn" id="pkOk">' + okLabel + '</button>'); s.addEventListener('click', function (e) { var t = e.target.closest('[data-pk]'); if (t) { cur = t.dataset.pk; draw() } }); $('#pkOk').onclick = function () { closeDlg(); cb(cur) } } draw();
}
function ask(title, label, val, cb, extra) { var s = dlg(title, '<label class="f">' + label + '<input class="inp" id="askV" value="' + esc(val || '') + '"></label>' + (extra || ''), '<button class="btn g" data-a="close">انصراف</button><button class="btn" id="askOk">تأیید</button>'); var ok = function () { var v = $('#askV').value.trim(); if (!v) return; var x = $('#askX'); closeDlg(); cb(v, x ? x.value : '') }; $('#askOk').onclick = ok; $('#askV').addEventListener('keydown', function (e) { if (e.key === 'Enter') ok() }); $('#askV').select() }
function confirmDlg(title, text, okLabel, cb) { dlg(title, '<p style="margin:0;line-height:1.9">' + text + '</p>', '<button class="btn g" data-a="close">انصراف</button><button class="btn d" id="cfOk">' + okLabel + '</button>'); $('#cfOk').onclick = function () { closeDlg(); cb() } }
function tidy() {
  var fs = kids(V.cur).filter(function (n) { return n.type === 'file' && !/\.(crdownload|part)$/i.test(n.name) }), g = {}; fs.forEach(function (f) { var k = kindOf(f.name); (g[k] = g[k] || []).push(f) });
  dlg('مرتب‌سازی «' + N(V.cur).name + '»', '<p style="margin:0;color:var(--muted);line-height:1.8">هر فایل آزاد به پوشه‌ی نوع خودش می‌رود. این برنامه‌ی کار است؛ تا تأیید نکنید چیزی جابه‌جا نمی‌شود. فایل‌های در حال دانلود دست نمی‌خورند.</p>' + Object.keys(g).map(function (k) { return '<div class="ck"><i style="width:10px;height:10px;border-radius:50%;background:' + KIND[k][1] + '"></i><span>' + fa(g[k].length) + ' فایل ← پوشه‌ی «' + KIND[k][0] + '»</span><small>' + fsz(g[k].reduce(function (s, f) { return s + f.size }, 0)) + '</small></div>' }).join(''), '<button class="btn g" data-a="close">انصراف</button><button class="btn" id="tdOk">مرتب کن</button>');
  $('#tdOk').onclick = function () { closeDlg(); act(fa(fs.length) + ' فایل مرتب شد.', function () { Object.keys(g).forEach(function (k) { var d = kids(V.cur).filter(function (n) { return n.type === 'dir' && n.name === KIND[k][0] })[0]; if (!d) { d = { id: uid(), type: 'dir', name: KIND[k][0], parent: V.cur, ts: now(), color: KIND[k][1] }; D.nodes[d.id] = d } g[k].forEach(function (f) { f.name = uniq(f.name, d.id); f.parent = d.id }) }) }) };
}
function reviewSug(k) { var x = suggestions(kids(V.cur)).filter(function (s) { return s.k === k })[0]; if (!x) return; dlg(x.t, '<p style="margin:0;color:var(--muted)">' + x.why + '</p>' + x.items.map(function (f) { return '<label class="ck"><input type="checkbox" value="' + f.id + '" checked><span>' + esc(f.name) + '</span><small>' + fsz(f.size) + '</small></label>' }).join(''), '<button class="btn g" data-a="close">انصراف</button><button class="btn" id="sgOk">انتقال به سطل بازیافت</button>'); $('#sgOk').onclick = function () { var ids = $$('#scr input:checked').map(function (i) { return i.value }); closeDlg(); if (ids.length) trashIds(ids) } }
function linkDlg(n) { dlg('اتصال «' + n.name + '» به پلتفرم', '<label class="f">پلتفرم<select class="inp" id="lkP">' + (B.platforms || []).filter(function (p) { return p.slug !== 'file-manager' }).map(function (p) { return '<option value="' + p.slug + '">' + p.n + ' — ' + esc(p.fa) + '</option>' }).join('') + '</select></label><label class="f">به چه چیزی؟ (پروژه، شماره‌ی نامه، نام مشتری…)<input class="inp" id="lkR" placeholder="مثلاً P01 · حمزه"></label>', '<button class="btn g" data-a="close">انصراف</button><button class="btn" id="lkOk">اتصال</button>'); $('#lkOk').onclick = function () { var p = $('#lkP').value, r = $('#lkR').value.trim(); closeDlg(); act('اتصال ثبت شد.', function () { (n.links = n.links || []).push({ p: p, ref: r }) }) } }
function wsPick(ids) { if (!D.ws.length) { toast('اول یک فضای کاری بسازید.'); return } dlg('افزودن به فضای کاری', '<div class="tree">' + D.ws.map(function (w) { return '<button data-wsadd="' + w.id + '"><i style="width:14px;height:12px;border-radius:4px;background:' + w.color + '"></i> ' + esc(w.name) + '</button>' }).join('') + '</div>').addEventListener('click', function (e) { var t = e.target.closest('[data-wsadd]'); if (!t) return; closeDlg(); act('به فضای کاری اضافه شد.', function () { var w = D.ws.filter(function (x) { return x.id === t.dataset.wsadd })[0]; ids.forEach(function (i) { if (w.items.indexOf(i) < 0) w.items.push(i) }) }) }) }
function wsDlg(w) { var cols = ['#4a6fe0', '#2e9e57', '#d98a2b', '#c9423f', '#7a5cd6', '#3f8fa8', '#c23a78']; dlg(w ? 'ویرایش فضای کاری' : 'فضای کاری تازه', '<label class="f">نام<input class="inp" id="wN" value="' + esc(w ? w.name : '') + '"></label><label class="f">توضیح<input class="inp" id="wT" value="' + esc(w ? w.note : '') + '"></label><label class="f">رنگ<select class="inp" id="wC">' + cols.map(function (c, i) { return '<option value="' + c + '"' + (w && w.color === c ? ' selected' : '') + '>رنگ ' + fa(i + 1) + '</option>' }).join('') + '</select></label>', '<button class="btn g" data-a="close">انصراف</button><button class="btn" id="wOk">ذخیره</button>'); $('#wOk').onclick = function () { var nm = $('#wN').value.trim(); if (!nm) return; var nt = $('#wT').value.trim(), c = $('#wC').value, id = w ? w.id : 'w' + uid(); closeDlg(); act('ذخیره شد.', function () { if (w) { w.name = nm; w.note = nt; w.color = c } else D.ws.push({ id: id, name: nm, note: nt, color: c, items: [] }) }); if (!w) go('ws:' + id) } }
function ctx(n, x, y) {
  closeCtx(); var w = V.page.indexOf('ws:') === 0, m = document.createElement('div'); m.className = 'ctx'; m.setAttribute('role', 'menu'); var b = function (a, icn, t, cls) { return '<button role="menuitem" data-c="' + a + '"' + (cls ? ' class="' + cls + '"' : '') + '>' + ic(icn) + t + '</button>' };
  m.innerHTML = n.trash ? b('restore', 'undo', 'بازگرداندن') + b('purge', 'trash', 'حذف همیشگی', 'dng') : b('open', n.type === 'dir' ? 'folder' : 'eye', n.type === 'dir' ? 'باز کردن' : 'نگاه سریع') + (n.text != null ? b('edit', 'pen', 'ویرایش متن') : '') + b('rename', 'pen', 'تغییر نام') + b('move', 'move', 'انتقال…') + b('copy', 'copy', 'کپی به…') + '<hr>' + b('fav', 'star', n.fav ? 'برداشتن ستاره' : 'ستاره‌دار') + b('tag', 'tag', 'برچسب…') + b('link', 'link', 'اتصال به پلتفرم…') + b('ws', 'ws', 'افزودن به فضای کاری…') + (w ? b('wsrm', 'x', 'برداشتن از این فضای کاری') : '') + (n.type === 'file' ? b('dl', 'dl', 'دانلود') : '') + '<hr>' + b('del', 'trash', 'حذف', 'dng');
  document.body.appendChild(m); var r = m.getBoundingClientRect(); m.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + 'px'; m.style.top = Math.max(8, Math.min(y, innerHeight - r.height - 8)) + 'px';
  m.addEventListener('click', function (e) { var t = e.target.closest('[data-c]'); if (!t) return; closeCtx(); doCtx(t.dataset.c, n) });
}
function doCtx(c, n) {
  if (c === 'open') openNode(n); else if (c === 'edit') editMd(n); else if (c === 'dl') download(n); else if (c === 'del') trashIds([n.id]); else if (c === 'link') linkDlg(n); else if (c === 'ws') wsPick([n.id]);
  else if (c === 'rename') ask('تغییر نام', 'نام تازه', n.name, function (v) { act('نام عوض شد.', function () { n.name = v; n.mt = now() }) });
  else if (c === 'move') pickFolder('انتقال «' + n.name + '» به…', 'انتقال به اینجا', function (to) { moveIds([n.id], to) });
  else if (c === 'copy') pickFolder('کپی «' + n.name + '» به…', 'کپی به اینجا', function (to) { copyIds([n.id], to) });
  else if (c === 'fav') act(n.fav ? 'ستاره برداشته شد.' : 'ستاره‌دار شد.', function () { n.fav = !n.fav });
  else if (c === 'tag') ask('برچسب‌ها', 'برچسب‌ها را با ویرگول جدا کنید', (n.tags || []).join('، '), function (v) { act('برچسب‌ها ذخیره شد.', function () { n.tags = v.split(/[،,]/).map(function (s) { return s.trim() }).filter(Boolean) }) });
  else if (c === 'wsrm') act('از فضای کاری برداشته شد.', function () { var w = WS(); w.items = w.items.filter(function (i) { return i !== n.id }) });
  else if (c === 'restore') act('بازگردانده شد.', function () { delete n.trash; if (!N(n.parent) || inTrash(N(n.parent))) n.parent = 'root' });
  else if (c === 'purge') confirmDlg('حذف همیشگی', '«' + esc(n.name) + '» برای همیشه حذف می‌شود و قابل بازگشت نیست.', 'حذف همیشگی', function () { purge(n.id); UNDO = null; save(); render() });
}
/* ───── مارک‌داون ───── */
function md(t) {
  var inl = function (s) { return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*([^*]+)\*/g, '<i>$1</i>') }, out = [], ul = false;
  String(t || '').split('\n').forEach(function (l) { var m; if ((m = /^\s*[-*]\s+(\[( |x)\]\s+)?(.*)$/i.exec(l))) { if (!ul) { out.push('<ul>'); ul = true } out.push(m[1] ? '<li class="t"><input type="checkbox" disabled' + (m[2].toLowerCase() === 'x' ? ' checked' : '') + '> ' + inl(m[3]) + '</li>' : '<li>' + inl(m[3]) + '</li>'); return } if (ul) { out.push('</ul>'); ul = false } if ((m = /^(#{1,3})\s+(.*)$/.exec(l))) out.push('<h' + m[1].length + '>' + inl(m[2]) + '</h' + m[1].length + '>'); else if ((m = /^>\s?(.*)$/.exec(l))) out.push('<blockquote>' + inl(m[1]) + '</blockquote>'); else if (l.trim()) out.push('<p style="margin:4px 0">' + inl(l) + '</p>') });
  if (ul) out.push('</ul>'); return out.join('');
}
function editMd(n) { var mode = innerWidth > 860 ? 'split' : 'edit'; var s = dlg(n.name, '<div class="seg" style="justify-self:start"><button data-md="view">پیش‌نمایش</button><button data-md="edit">ویرایش</button><button data-md="split">هر دو</button></div><div class="md" id="mdW"><textarea id="mdT" aria-label="متن">' + esc(n.text || '') + '</textarea><div class="mdv" id="mdV"></div></div>', '<button class="btn g" data-a="close">بستن</button><button class="btn" id="mdOk">ذخیره</button>', true); var set = function (m) { mode = m; $('#mdW').className = 'md' + (m === 'split' ? '' : ' one'); $('#mdT').hidden = m === 'view'; $('#mdV').hidden = m === 'edit'; $$('[data-md]', s).forEach(function (b) { b.classList.toggle('on', b.dataset.md === m) }); $('#mdV').innerHTML = md($('#mdT').value) }; set(mode); s.addEventListener('click', function (e) { var t = e.target.closest('[data-md]'); if (t) set(t.dataset.md) }); $('#mdT').addEventListener('input', function () { $('#mdV').innerHTML = md(this.value) }); $('#mdOk').onclick = function () { var v = $('#mdT').value; closeDlg(); act('ذخیره شد.', function () { n.text = v; n.size = new Blob([v]).size; n.mt = now(); delete n.sample; IDB.put(n.id, new Blob([v], { type: 'text/plain' })) }) } }
function peek(n) {
  var k = kindOf(n.name), foot = (n.text != null ? '<button class="btn g" data-pe="edit">ویرایش</button>' : '') + '<button class="btn g" data-pe="dl">دانلود</button><button class="btn" data-a="close">بستن</button>';
  var s = dlg(n.name, '<div id="pkB" style="min-height:160px;display:grid;place-items:center"><span class="kd" style="--c:' + KIND[k][1] + ';font-size:22px;padding:14px 20px">' + esc((extOf(n.name) || '—').toUpperCase()) + '</span></div><small style="color:var(--muted);text-align:center">' + KIND[k][0] + ' · <span class="ltr">' + fsz(n.size) + '</span> · ' + ago(n.mt || n.ts) + (n.sample ? ' · فایل نمونه (محتوا ندارد)' : '') + '</small>', foot, true);
  s.addEventListener('click', function (e) { var t = e.target.closest('[data-pe]'); if (!t) return; if (t.dataset.pe === 'dl') download(n); else { closeDlg(); editMd(n) } });
  if (n.text != null) { $('#pkB').innerHTML = '<div class="mdv" style="width:100%">' + (/\.md$/i.test(n.name) ? md(n.text) : '<pre style="white-space:pre-wrap;margin:0;font:inherit">' + esc(n.text) + '</pre>') + '</div>'; return }
  thumb(n).then(function (u) { var b = $('#pkB'); if (!u || !b) return; b.innerHTML = k === 'image' ? '<img alt="' + esc(n.name) + '" src="' + u + '" style="max-width:100%;max-height:64svh;border-radius:12px">' : k === 'video' ? '<video controls playsinline src="' + u + '" style="max-width:100%;max-height:64svh"></video>' : k === 'audio' ? '<audio controls src="' + u + '"></audio>' : k === 'pdf' ? '<iframe title="' + esc(n.name) + '" src="' + u + '" style="width:100%;height:64svh;border:0;border-radius:12px;background:#fff"></iframe>' : b.innerHTML });
}
/* ───── جست‌وجوی همه‌جا ───── */
function finder() {
  var s = dlg('جست‌وجو در همه‌جا', '<label class="srch" style="max-width:none">' + ic('search') + '<input id="kq" placeholder="نام پوشه، نام فایل یا کلمه‌ای داخل متن‌ها" aria-label="جست‌وجو"></label><div id="kr"></div>', '', true), hl = function (t, q) { var i = t.toLowerCase().indexOf(q); return i < 0 ? esc(t) : esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + q.length)) + '</mark>' + esc(t.slice(i + q.length)) };
  var run = function () { var q = $('#kq').value.trim().toLowerCase(), r = $('#kr'); if (!q) { r.innerHTML = '<div class="empty">چند حرف بنویسید. پوشه‌ها اول می‌آیند، بعد فایل‌ها و بعد متنِ داخل یادداشت‌ها.</div>'; return } var all = live(), a = [];
    all.forEach(function (n) { var hit = n.name.toLowerCase().indexOf(q) >= 0, tg = (n.tags || []).join(' ').toLowerCase().indexOf(q) >= 0, tx = n.text ? n.text.toLowerCase().indexOf(q) : -1; if (hit || tg || tx >= 0) a.push({ n: n, w: n.type === 'dir' ? 0 : hit ? 1 : 2, sn: !hit && tx >= 0 ? n.text.slice(Math.max(0, tx - 30), tx + 60).replace(/\n/g, ' ') : '' }) });
    a.sort(function (x, y) { return x.w - y.w || x.n.name.localeCompare(y.n.name, 'fa') }); D.bm.forEach(function (b) { if ((b.title + ' ' + b.url).toLowerCase().indexOf(q) >= 0) a.push({ b: b }) });
    r.innerHTML = a.length ? '<small style="color:var(--muted)">' + fa(a.length) + ' نتیجه</small>' + a.slice(0, 60).map(function (x) { if (x.b) return '<a class="kres" href="' + esc(x.b.url) + '" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:none">' + ic('bm') + '<span>' + hl(x.b.title, q) + '<small>نشانک</small></span></a>'; var n = x.n, k = n.type === 'file' ? kindOf(n.name) : null; return '<button class="kres" data-reveal="' + n.id + '">' + (k ? '<span class="kd" style="--c:' + KIND[k][1] + ';margin:0;flex:none">' + esc(extOf(n.name).toUpperCase().slice(0, 4) || '—') + '</span>' : ic('folder')) + '<span>' + hl(n.name, q) + '<small>' + esc(pathOf(n.parent).map(function (p) { return p.name }).join(' › ')) + (x.sn ? ' · …' + hl(x.sn, q) + '…' : '') + '</small></span></button>' }).join('') : '<div class="empty">چیزی پیدا نشد.</div>' };
  $('#kq').addEventListener('input', run); run();
}
function reveal(id) { var n = N(id); if (!n) return; closeDlg(); V.back.push(V.cur + '|' + V.kind); V.page = 'files'; V.kind = ''; V.q = ''; if (n.type === 'dir') { V.cur = id; V.sel = {} } else { V.cur = n.parent; V.sel = {}; V.sel[id] = 1; if (V.group === 'kind') V.kind = kindOf(n.name) } render() }

/* ───── رویدادها ───── */
document.addEventListener('click', function (e) {
  var t = e.target, x;
  if (!t.closest('.ctx')) closeCtx();
  if ((x = t.closest('[data-more]'))) { e.stopPropagation(); var r = x.getBoundingClientRect(); ctx(N(x.dataset.more), r.left, r.bottom + 4); return }
  if ((x = t.closest('[data-go]'))) { var g = x.dataset.go; if (g.indexOf('files:') === 0) go('files', g.slice(6)); else go(g); return }
  if ((x = t.closest('[data-open]'))) { if (V.cur !== x.dataset.open || V.kind) { V.back.push(V.cur + '|' + V.kind); V.cur = x.dataset.open; V.kind = ''; V.sel = {}; render() } return }
  if ((x = t.closest('[data-kind]'))) { V.back.push(V.cur + '|'); V.kind = x.dataset.kind; V.sel = {}; render(); return }
  if ((x = t.closest('[data-grp]'))) { V.group = x.dataset.grp; V.kind = ''; keepView(); render(); return }
  if ((x = t.closest('[data-view]'))) { V.view = x.dataset.view; keepView(); render(); return }
  if ((x = t.closest('[data-inf]'))) { V.inf = x.dataset.inf; keepView(); render(); return }
  if ((x = t.closest('[data-p2]'))) { V.cur2 = x.dataset.p2; pane2(); return }
  if ((x = t.closest('[data-sug]'))) { reviewSug(x.dataset.sug); return }
  if ((x = t.closest('[data-reveal]'))) { reveal(x.dataset.reveal); return }
  if ((x = t.closest('[data-bmf]'))) { V.bmf = x.dataset.bmf; content(); return }
  if ((x = t.closest('[data-bfav]'))) { var bb = D.bm.filter(function (b) { return b.id === x.dataset.bfav })[0]; bb.fav = !bb.fav; save(); content(); return }
  if ((x = t.closest('[data-bdel]'))) { act('نشانک حذف شد.', function () { D.bm = D.bm.filter(function (b) { return b.id !== x.dataset.bdel }) }); return }
  if ((x = t.closest('[data-unlink]'))) { var sn = N(selIds()[0]); if (sn) act('اتصال برداشته شد.', function () { sn.links.splice(+x.dataset.unlink, 1) }); return }
  if ((x = t.closest('[data-clean]'))) { var ids = $$('input:checked', x.closest('.box')).map(function (i) { return i.value }); if (!ids.length) { toast('چیزی انتخاب نشده.'); return } if (x.dataset.clean === 'trash') confirmDlg('حذف همیشگی', fa(ids.length) + ' مورد برای همیشه حذف می‌شود و قابل بازگشت نیست.', 'حذف همیشگی', function () { ids.forEach(purge); UNDO = null; save(); render() }); else trashIds(ids); return }
  if ((x = t.closest('[data-a]'))) { action(x.dataset.a); return }
  if ((x = t.closest('[data-id]')) && x.closest('#cnt')) { var id = x.dataset.id, n = N(id); if (!n) return; if (e.metaKey || e.ctrlKey || e.shiftKey) { if (V.sel[id]) delete V.sel[id]; else V.sel[id] = 1 } else if (V.sel[id] && selIds().length === 1) { openNode(n); return } else { V.sel = {}; V.sel[id] = 1 } $$('#cnt [data-id]').forEach(function (el) { el.classList.toggle('sel', !!V.sel[el.dataset.id]) }); info(); pane2(); status(); return }
  if (t.closest('#cnt') && selIds().length) { V.sel = {}; $$('#cnt .sel').forEach(function (el) { el.classList.remove('sel') }); info(); pane2(); status() }
});
document.addEventListener('dblclick', function (e) { var x = e.target.closest('#cnt [data-id]'); if (x && N(x.dataset.id)) openNode(N(x.dataset.id)) });
document.addEventListener('contextmenu', function (e) { var x = e.target.closest('#cnt [data-id]'); if (!x) return; e.preventDefault(); ctx(N(x.dataset.id), e.clientX, e.clientY) });
var lp = 0; document.addEventListener('touchstart', function (e) { var x = e.target.closest('#cnt [data-id]'); clearTimeout(lp); if (!x) return; var p = e.touches[0]; lp = setTimeout(function () { ctx(N(x.dataset.id), p.clientX, p.clientY) }, 520) }, { passive: true });
['touchend', 'touchmove', 'touchcancel'].forEach(function (ev) { document.addEventListener(ev, function () { clearTimeout(lp) }, { passive: true }) });
document.addEventListener('input', function (e) { if (e.target.id === 'q') { V.q = e.target.value; content() } });
document.addEventListener('keydown', function (e) {
  var typing = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName); if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); finder(); return } if (e.key === 'Escape') { if ($('#scr') || $('.ctx')) closeDlg(); else if (selIds().length) { V.sel = {}; render() } return }
  if (typing || $('#scr')) return; var s = selIds(); if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo() } else if (e.key === ' ' && s.length === 1) { e.preventDefault(); openNode(N(s[0])) } else if ((e.key === 'Delete' || e.key === 'Backspace') && s.length) { e.preventDefault(); trashIds(s) } else if (e.key === 'F5' && V.dual && s.length) { e.preventDefault(); copyIds(s, V.cur2) } else if (e.key === 'F6' && V.dual && s.length) { e.preventDefault(); moveIds(s, V.cur2) } else if (e.key === 'Enter' && s.length === 1) openNode(N(s[0]));
});
function action(a) {
  var s = selIds(), one = s.length === 1 ? N(s[0]) : null;
  if (a === 'close') closeDlg(); else if (a === 'undo') undo(); else if (a === 'menu') $('#side').classList.toggle('open');
  else if (a === 'back' && V.back.length) { V.fwd.push(V.cur + '|' + V.kind); var b = V.back.pop().split('|'); V.cur = N(b[0]) ? b[0] : 'root'; V.kind = b[1] || ''; V.page = 'files'; V.sel = {}; render() }
  else if (a === 'fwd' && V.fwd.length) { V.back.push(V.cur + '|' + V.kind); var f = V.fwd.pop().split('|'); V.cur = N(f[0]) ? f[0] : 'root'; V.kind = f[1] || ''; V.sel = {}; render() }
  else if (a === 'upload') $('#up').click(); else if (a === 'photos') $('#upImg').click(); else if (a === 'find') finder(); else if (a === 'tidy') tidy();
  else if (a === 'mkdir') ask('پوشه‌ی تازه', 'نام پوشه', 'پوشه‌ی تازه', function (v) { act('پوشه ساخته شد.', function () { var id = uid(); D.nodes[id] = { id: id, type: 'dir', name: uniq(v, V.cur), parent: V.cur, ts: now() } }) });
  else if (a === 'dual') { V.dual = !V.dual; render() }
  else if (a === 'p2copy') copyIds(s, V.cur2); else if (a === 'p2move') moveIds(s, V.cur2);
  else if (a === 'sel-del') trashIds(s); else if (a === 'sel-ws') wsPick(s); else if (a === 'sel-move') pickFolder('انتقال ' + fa(s.length) + ' مورد به…', 'انتقال به اینجا', function (to) { moveIds(s, to) });
  else if (a === 'open1' && one) openNode(one); else if (a === 'dl1' && one) download(one); else if (a === 'fav1' && one) doCtx('fav', one); else if (a === 'tag1' && one) doCtx('tag', one); else if (a === 'link1' && one) linkDlg(one);
  else if (a === 'ws-new') wsDlg(); else if (a === 'ws-edit') wsDlg(WS()); else if (a === 'ws-del') confirmDlg('حذف فضای کاری', 'فقط خودِ فضای کاری حذف می‌شود؛ فایل‌ها و پوشه‌ها سر جایشان می‌مانند.', 'حذف', function () { var w = WS(); D.ws = D.ws.filter(function (x) { return x !== w }); save(); go('files', 'root') });
  else if (a === 'bm-new') { var open = function (clip) { ask('افزودن پیوند', 'نشانی (URL)', /^https?:\/\//.test(clip) ? clip : 'https://', function (u, c) { if (!/^https?:\/\/\S+\.\S+/.test(u)) { toast('نشانی درست نیست.'); return } var host = ''; try { host = new URL(u).hostname.replace(/^www\./, '') } catch (e) { } var ti = $('#askT'); act('نشانک اضافه شد.', function () { D.bm.push({ id: 'b' + uid(), url: u, title: host, coll: c || '', tags: [], ts: now() }) }) }, '<label class="f">دسته<input class="inp" id="askX" placeholder="مثلاً مقررات، تأمین‌کننده"></label>') }; if (navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then(open, function () { open('') }); else open('') }
  else if (a === 'tr-restore') act('همه بازگردانده شد.', function () { Object.keys(D.nodes).map(N).forEach(function (n) { delete n.trash }) });
  else if (a === 'tr-empty') confirmDlg('خالی‌کردن سطل', 'همه‌ی موردهای سطل بازیافت برای همیشه حذف می‌شوند.', 'خالی کن', function () { Object.keys(D.nodes).map(N).filter(function (n) { return n && n.trash }).forEach(function (n) { if (N(n.id)) purge(n.id) }); UNDO = null; save(); render() });
}
$('#up').addEventListener('change', function () { addFiles(this.files, V.page === 'files' ? V.cur : 'root'); this.value = '' });
$('#upImg').addEventListener('change', function () { addFiles(this.files, V.page === 'files' ? V.cur : 'root'); this.value = '' });
var cnt = $('#cnt'); cnt.addEventListener('dragover', function (e) { if (V.page !== 'files') return; e.preventDefault(); cnt.classList.add('drop') }); cnt.addEventListener('dragleave', function () { cnt.classList.remove('drop') }); cnt.addEventListener('drop', function (e) { if (V.page !== 'files') return; e.preventDefault(); cnt.classList.remove('drop'); addFiles(e.dataTransfer.files, V.cur) });
$('#thm').addEventListener('click', function () { var d = document.documentElement, t = d.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; d.setAttribute('data-theme', t); try { localStorage.setItem('vx.fm.theme', t) } catch (e) { } });
$('#out').addEventListener('click', function () { try { localStorage.removeItem('hub.token') } catch (e) { } location.reload() });
window.addEventListener('resize', function () { clearTimeout(window.__rz); window.__rz = setTimeout(function () { info(); pane2() }, 150) });

/* ───── ورود ───── */
try { var th = localStorage.getItem('vx.fm.theme'); if (th) document.documentElement.setAttribute('data-theme', th) } catch (e) { }
function enter(r) { ME = r.user || r; $('#login').hidden = true; load().then(function () { $('#app').hidden = false; render() }, function (e) { $('#login').hidden = false; $('#le').textContent = e.status === 403 ? 'اجازه‌ی فایل منیجر را ندارید.' : 'بارگیری نشد؛ اتصال را بررسی کنید.' }) }
function showLogin() { $('#login').hidden = false; if (document.documentElement.classList.contains('tsuba-demo')) $('#demoNote').hidden = false; B.apply && B.apply() }
$('#lf').addEventListener('submit', function (e) { e.preventDefault(); $('#le').textContent = ''; api('POST', '/auth/login', { code: $('#lc').value.trim(), pin: $('#lp').value, device: 'files' }).then(function (r) { T = r.token; try { localStorage.setItem('hub.token', T) } catch (x) { } if (r.must_change) { $('#le').textContent = 'اول در پنل کاربری رمز تازه بگذارید.'; return } enter(r) }, function (x) { $('#le').textContent = x.status === 429 ? 'تلاش‌های ناموفق زیاد بود.' : x.status === 401 ? 'کد یا رمز درست نیست.' : 'اتصال برقرار نیست.' }) });
try { T = localStorage.getItem('hub.token') || '' } catch (e) { }
if (T) api('GET', '/me').then(enter, function () { T = ''; showLogin() }); else showLogin();
window.VXFM = { get D() { return D }, V: V, render: render };
})();
