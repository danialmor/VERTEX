/* VERTEX · user profiles and last connection (feature VX-015).
   - Every user fills in their own profile: personal details, a photo and important documents (ID copies, contracts, certificates…).
     Details live on the user record (/me/profile); the photo and documents are files in the cloud, site "vxp-<user code>".
   - The subscription admin (users list, per subscription) and the ecosystem admin (head-office staff and each subscription's users)
     open the same profile read-only with the «Profile» button.
   - Lists are sorted by last connection; "online" = seen in the last 5 minutes (the page reports activity every 5 min at most).
   Text is written in both languages here (L(fa, en)), so no dictionary entries are needed for it. */
(function () {
  'use strict';
  var EN = true; try { EN = (localStorage.getItem('vxLang') || 'en') !== 'fa' } catch (e) { }
  var L = function (fa, en) { return EN ? en : fa };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }) };
  var C = function () { return window.VX_CLOUD };
  var FIELDS = [['title', 'سمت', 'Job title'], ['dept', 'واحد', 'Department'], ['phone', 'تلفن همراه', 'Mobile'], ['email', 'ایمیل', 'Email'], ['birth', 'تاریخ تولد', 'Date of birth'], ['start', 'تاریخ شروع همکاری', 'Start date'], ['city', 'شهر', 'City'], ['emergency', 'تماس اضطراری', 'Emergency contact'], ['address', 'نشانی', 'Address'], ['bio', 'درباره‌ی من / توضیح', 'About / notes']];
  var DOCKIND = [['id', 'کارت شناسایی', 'ID card'], ['contract', 'قرارداد', 'Contract'], ['cert', 'مدرک تحصیلی / گواهی', 'Degree / certificate'], ['insurance', 'بیمه', 'Insurance'], ['cv', 'رزومه', 'CV'], ['other', 'سایر', 'Other']];
  var kindName = function (k) { var x = DOCKIND.filter(function (d) { return d[0] === k })[0]; return x ? L(x[1], x[2]) : (k || '') };
  var site = function (u) { return 'vxp-' + String(u.ucode || u.code || u.id || 'x').toLowerCase().replace(/[^a-z0-9]/g, '') };
  var size = function (n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB' };
  function ago(ts) {
    if (!ts) return '<span style="color:var(--muted)">' + L('هرگز', 'never') + '</span>';
    var d = Date.now() / 1000 - ts, t;
    if (d < 300) return '<span class="vxp-on" title="' + new Date(ts * 1000).toLocaleString() + '">● ' + L('آنلاین', 'online') + '</span>';
    if (d < 3600) t = Math.round(d / 60) + L(' دقیقه پیش', ' min ago');
    else if (d < 86400) t = Math.round(d / 3600) + L(' ساعت پیش', ' h ago');
    else if (d < 86400 * 30) t = Math.round(d / 86400) + L(' روز پیش', ' d ago');
    else t = new Date(ts * 1000).toLocaleDateString(EN ? 'en-GB' : 'fa-IR');
    return '<span title="' + new Date(ts * 1000).toLocaleString() + '">' + t + '</span>';
  }
  var seen = function (u) { return Math.max(u.last_seen || 0, u.last_login || 0) };
  var st = document.createElement('style');
  st.textContent = '.vxp-on{color:#12b76a;font-weight:600}.vxp-ph{width:96px;height:96px;border-radius:50%;object-fit:cover;background:var(--card2,#eef);display:grid;place-items:center;font-size:34px;font-weight:700;color:var(--muted)}' +
    '.vxp-mini{width:26px;height:26px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-inline-end:6px}' +
    '.vxp-kv{display:grid;grid-template-columns:minmax(110px,auto) 1fr;gap:4px 12px;font-size:13px}.vxp-kv dt{color:var(--muted)}.vxp-kv dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}' +
    '.vxp-docs{display:grid;gap:6px}.vxp-doc{display:flex;gap:8px;align-items:center;justify-content:space-between;border:1px solid var(--line,#e4e7ec);border-radius:8px;padding:6px 10px;font-size:13px}.vxp-doc a{overflow-wrap:anywhere}';
  document.head.appendChild(st);
  var photoUrl = function (u) { var p = (u.profile || {}).photo; return p && C() ? C().fileUrl(site(u), p) + '?v=' + encodeURIComponent((u.profile || {}).photo_t || p) : '' };
  function photo(u, cls) { var url = photoUrl(u); return url ? '<img class="' + (cls || 'vxp-ph') + '" src="' + esc(url) + '" alt="">' : (cls ? '' : '<div class="vxp-ph">' + esc(String(u.name || '?').trim().charAt(0)) + '</div>') }
  function docsList(u, canDel) {
    var ds = (u.profile || {}).docs || [];
    if (!ds.length) return '<small style="color:var(--muted)">' + L('مدرکی ثبت نشده است.', 'No documents yet.') + '</small>';
    return '<div class="vxp-docs">' + ds.map(function (d, i) {
      return '<div class="vxp-doc"><span><b>' + esc(kindName(d.label)) + '</b> · <a href="' + esc(C() ? C().fileUrl(site(u), d.name) : '#') + '" target="_blank" rel="noopener">' + esc(d.name) + '</a> <small style="color:var(--muted)">' + size(d.size) + '</small></span>' + (canDel ? '<button class="btn s" type="button" data-vxd="' + i + '">' + L('حذف', 'Delete') + '</button>' : '') + '</div>'
    }).join('') + '</div>';
  }
  /* read-only profile, opened by admins from the user lists */
  function view(u) {
    var P = window.TSP, p = u.profile || {};
    var kv = FIELDS.filter(function (f) { return p[f[0]] }).map(function (f) { return '<dt>' + L(f[1], f[2]) + '</dt><dd dir="auto">' + esc(p[f[0]]) + '</dd>' }).join('');
    P.openDlg('<div class="dl"><div class="row" style="gap:14px;align-items:center">' + photo(u) + '<div><h2 style="margin:0">' + esc(u.name) + '</h2><span class="mono" style="color:var(--muted)">' + esc(u.ucode || u.code) + '</span><br>' + L('آخرین اتصال: ', 'Last connected: ') + ago(seen(u)) + '</div></div>' +
      '<div class="card"><h3 style="margin:0 0 8px;font-size:14px">' + L('مشخصات', 'Details') + '</h3>' + (kv ? '<dl class="vxp-kv">' + kv + '</dl>' : '<small style="color:var(--muted)">' + L('کاربر هنوز مشخصاتی ثبت نکرده است.', 'The user has not filled in any details yet.') + '</small>') + '</div>' +
      '<div class="card"><h3 style="margin:0 0 8px;font-size:14px">' + L('مدارک مهم', 'Important documents') + '</h3>' + docsList(u, false) + '</div>' +
      '<div class="row" style="justify-content:flex-end"><button class="btn" type="button" data-close>' + L('بستن', 'Close') + '</button></div></div>');
  }
  /* columns for the admin lists */
  var cell = function (u) { return '<td>' + ago(seen(u)) + '</td>' };
  var btn = function (u) { return '<button class="btn s" type="button" data-vxp="' + esc(u.id) + '">' + L('پروفایل', 'Profile') + '</button>' };
  var sort = function (us) { return us.slice().sort(function (a, b) { return seen(b) - seen(a) }) };
  function wire(root, us) { (root || document).querySelectorAll('[data-vxp]').forEach(function (b) { b.onclick = function () { var u = us.filter(function (x) { return String(x.id) === b.dataset.vxp })[0]; if (u) view(u) } }) }
  /* the user's own profile page: details, photo, documents */
  function mount(me) {
    var P = window.TSP, host = document.querySelector('#pg .grid.g2'); if (!host) return;
    var p = me.profile || {}, u = { id: me.user.id, code: me.user.code, ucode: me.ucode, name: me.user.name, profile: p };
    var save = function (patch, msg) {
      var b = { name: u.name }; Object.keys(p).forEach(function (k) { b[k] = p[k] }); Object.keys(patch).forEach(function (k) { b[k] = patch[k] });
      return P.api('PATCH', '/me/profile', b).then(function (r) { p = u.profile = r.profile || b; P.toast((msg || L('ذخیره شد.', 'Saved.')) + (r.cloud === false ? L(' (فقط روی این دستگاه — اتصال آنلاین برقرار نشد)', ' (this device only — the online save failed)') : '')); return r })
    };
    var box = document.createElement('div'); box.className = 'card'; box.style.gridColumn = '1/-1';
    var draw = function () {
      box.innerHTML = '<h2 style="margin:0 0 10px;font-size:16px">' + L('پروفایل کامل', 'Full profile') + '</h2>' +
        '<div class="row" style="gap:16px;align-items:center;flex-wrap:wrap">' + photo(u) + '<div class="grid" style="gap:6px"><label class="btn s" style="cursor:pointer">' + L('بارگذاری عکس', 'Upload photo') + '<input type="file" id="vxpPh" accept="image/*" hidden></label>' + (p.photo ? '<button class="btn s" type="button" id="vxpPhX">' + L('حذف عکس', 'Remove photo') + '</button>' : '') + '<small style="color:var(--muted)">' + L('عکس برای مدیر اشتراک و مدیر اکوسیستم نمایش داده می‌شود.', 'Your subscription admin and the ecosystem admin can see the photo.') + '</small></div></div>' +
        '<form id="vxpF" class="grid g2" style="gap:10px;margin-top:12px">' + FIELDS.map(function (f) { var big = f[0] === 'bio' || f[0] === 'address'; return '<label class="f"' + (big ? ' style="grid-column:1/-1"' : '') + '>' + L(f[1], f[2]) + (big ? '<textarea name="' + f[0] + '" rows="2" dir="auto">' + esc(p[f[0]] || '') + '</textarea>' : '<input name="' + f[0] + '" dir="auto" value="' + esc(p[f[0]] || '') + '"' + (f[0] === 'birth' || f[0] === 'start' ? ' placeholder="1370/01/01"' : '') + '>') + '</label>' }).join('') +
        '<div style="grid-column:1/-1"><button class="btn p">' + L('ذخیره‌ی مشخصات', 'Save details') + '</button></div></form>' +
        '<h3 style="margin:16px 0 8px;font-size:14px">' + L('مدارک مهم', 'Important documents') + '</h3>' + docsList(u, true) +
        '<div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap;align-items:center"><select id="vxpK">' + DOCKIND.map(function (d) { return '<option value="' + d[0] + '">' + L(d[1], d[2]) + '</option>' }).join('') + '</select><label class="btn s" style="cursor:pointer">' + L('افزودن مدرک', 'Add document') + '<input type="file" id="vxpD" hidden></label><small id="vxpS" style="color:var(--muted)">' + L('PDF یا عکس، تا ۲۰ مگابایت', 'PDF or image, up to 20 MB') + '</small></div>';
      box.querySelector('#vxpF').onsubmit = function (e) { e.preventDefault(); var f = e.target, patch = {}; FIELDS.forEach(function (x) { patch[x[0]] = f[x[0]].value.trim() }); save(patch).then(draw) };
      var need = function () { if (!C() || !C().on) { P.toast(L('فضای آنلاین در دسترس نیست.', 'Online storage is not available.')); return false } return true };
      box.querySelector('#vxpPh').onchange = function (e) { var fl = e.target.files[0]; if (!fl || !need()) return; if (fl.size > 5e6) return P.toast(L('عکس باید کمتر از ۵ مگابایت باشد.', 'The photo must be under 5 MB.'));
        var nm = 'photo.' + ((fl.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'), f2 = new File([fl], nm, { type: fl.type });
        C().putFile(site(u), f2).then(function () { return save({ photo: nm, photo_t: String(Date.now()) }, L('عکس ذخیره شد.', 'Photo saved.')) }).then(draw).catch(function (x) { P.toast(String(x.message || x)) }) };
      if (box.querySelector('#vxpPhX')) box.querySelector('#vxpPhX').onclick = function () { var nm = p.photo; save({ photo: '' }).then(function () { if (C()) C().delFile(site(u), nm).catch(function () { }); draw() }) };
      box.querySelector('#vxpD').onchange = function (e) { var fl = e.target.files[0], k = box.querySelector('#vxpK').value; if (!fl || !need()) return; if (fl.size > 2e7) return P.toast(L('فایل باید کمتر از ۲۰ مگابایت باشد.', 'The file must be under 20 MB.'));
        var nm = k + '-' + Date.now().toString(36) + '-' + fl.name.replace(/[^\w.\-؀-ۿ]+/g, '_').slice(-60), f2 = new File([fl], nm, { type: fl.type }), sEl = box.querySelector('#vxpS');
        C().putFileP(site(u), f2, function (l, t) { sEl.textContent = Math.round(l / t * 100) + '%' }).then(function () { var ds = (p.docs || []).concat([{ name: nm, label: k, size: fl.size, ts: Date.now() / 1000 }]); return save({ docs: ds }, L('مدرک ذخیره شد.', 'Document saved.')) }).then(draw).catch(function (x) { sEl.textContent = String(x.message || x) }) };
      box.querySelectorAll('[data-vxd]').forEach(function (b) { b.onclick = function () { var d = (p.docs || [])[+b.dataset.vxd]; if (!d || !confirm(L('این مدرک حذف شود؟', 'Delete this document?'))) return; save({ docs: p.docs.filter(function (x) { return x !== d }) }).then(function () { if (C()) C().delFile(site(u), d.name).catch(function () { }); draw() }) } });
    };
    draw(); host.appendChild(box);
  }
  window.VXP = { ago: ago, seen: seen, cell: cell, btn: btn, sort: sort, wire: wire, view: view, mount: mount, L: L, photo: photo };
})();
