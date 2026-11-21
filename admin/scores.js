/* Control panel — «امتیازها»: team activity scores, per subscription.
   Owner: visible only when the company's subscription includes the «scores» module (enable it in the subscription's modules).
   Admin: «امتیاز کاربران» — pick any company and see the same page; edit the weights of each kind of action.
   Scores are counted from the activity log (login, create, update, files, approvals, other) × weights. */
(function () {
  'use strict';
  var P = window.TSP; if (!P) return;
  var $ = P.$, esc = P.esc, head = P.head, toast = P.toast, api = P.api;
  var fa = function (x) { var n = +x; return isNaN(n) ? String(x) : n.toLocaleString('fa-IR') };
  var dt = function (ts) { try { return ts ? P.fmtD(ts) : '—' } catch (e) { return '' } };
  var K = [['login', 'ورود'], ['create', 'ایجاد'], ['update', 'ویرایش'], ['file', 'فایل'], ['approve', 'تأیید'], ['other', 'سایر']];
  var ST = { days: 30, tenant: 0 };
  function enabled() { var S = P.S; return !!(S && S.tenant && (S.modules || []).some(function (m) { return (m.slug || m) === 'scores' })) }

  function view(isA) {
    var pre = isA ? api('GET', '/admin/tenants').catch(function () { return { items: [] } }) : Promise.resolve(null);
    return pre.then(function (TL) {
      var tl = TL ? (TL.items || TL.tenants || TL || []) : null; if (tl && !Array.isArray(tl)) tl = [];
      if (isA && !ST.tenant && tl.length) ST.tenant = tl[0].id;
      return api('GET', '/scores?days=' + ST.days + (isA ? '&tenant=' + ST.tenant : '')).then(function (R) { draw(R, isA, tl) }).catch(function (e) {
        $('#pg').innerHTML = head(isA ? 'امتیاز کاربران' : 'امتیازها', '') + '<div class="card">' + (e && e.body && e.body.error === 'not-in-plan' ? 'بخش امتیازها در اشتراک شما فعال نیست.' : esc(P.emsg(e))) + '</div>';
      });
    });
  }
  function draw(R, isA, tl) {
    var it = R.items || [], W = R.weights || {}, mx = Math.max.apply(null, it.map(function (x) { return x.total }).concat([1])), sum = it.reduce(function (a, x) { return a + x.total }, 0), act = it.filter(function (x) { return x.total > 0 }).length;
    var ctl = (isA ? '<select id="scT" style="padding:9px 12px;border-radius:12px;border:1px solid var(--line);background:transparent;color:inherit;font:inherit">' + tl.map(function (t) { return '<option value="' + t.id + '"' + (t.id === ST.tenant ? ' selected' : '') + '>' + esc(t.name) + ' · ' + esc(t.code) + '</option>' }).join('') + '</select>' : '') +
      '<div class="row" role="group" aria-label="بازه">' + [7, 30, 90, 365].map(function (d) { return '<button class="btn s' + (ST.days === d ? ' p' : '') + '" type="button" data-scd="' + d + '">' + (d === 365 ? 'یک سال' : fa(d) + ' روز') + '</button>' }).join('') + '</div>';
    var h = head(isA ? 'امتیاز کاربران' : 'امتیازها', (isA ? 'صفحه‌ی امتیاز هر اشتراک، همان‌طور که مدیر آن شرکت می‌بیند. ' : '') + 'امتیاز هر نفر از روی فعالیت‌های ثبت‌شده در سیستم در ' + fa(R.days) + ' روز گذشته حساب می‌شود.', ctl);
    if (R.tenant) h += '<div class="mb" style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))"><div class="card"><small style="color:var(--muted)">شرکت</small><div style="font-size:18px;font-weight:700">' + esc(R.tenant.name) + '</div></div><div class="card"><small style="color:var(--muted)">جمع امتیاز</small><div style="font-size:22px;font-weight:800">' + fa(sum) + '</div></div><div class="card"><small style="color:var(--muted)">کاربران فعال در این بازه</small><div style="font-size:22px;font-weight:800">' + fa(act) + ' از ' + fa(it.length) + '</div></div></div>';
    h += '<div class="card mb"><div class="tw"><table class="tbl"><thead><tr><th>رتبه</th><th>کاربر</th>' + K.map(function (k) { return '<th>' + k[1] + '</th>' }).join('') + '<th style="min-width:180px">امتیاز</th><th>آخرین فعالیت</th></tr></thead><tbody>' +
      (it.length ? it.map(function (x, i) { return '<tr><td><b>' + (x.total ? (i < 3 ? ['🥇', '🥈', '🥉'][i] : fa(i + 1)) : '—') + '</b></td><td><b>' + esc(x.name) + '</b><br><small class="mono" style="color:var(--muted)">' + esc(x.ucode || x.code) + '</small></td>' + K.map(function (k) { return '<td>' + fa(x.n[k[0]] || 0) + '</td>' }).join('') + '<td><div style="display:flex;align-items:center;gap:8px"><div style="flex:1;height:8px;border-radius:6px;background:var(--line);overflow:hidden"><i style="display:block;height:100%;width:' + Math.round(x.total / mx * 100) + '%;background:#f2b640"></i></div><b>' + fa(x.total) + '</b></div></td><td>' + dt(x.last) + '</td></tr>' }).join('') : '<tr><td colspan="' + (K.length + 4) + '" style="color:var(--muted)">کاربری در این شرکت نیست.</td></tr>') + '</tbody></table></div></div>';
    h += '<div class="card"><h2 style="margin:0 0 10px;font-size:15px">وزن هر نوع فعالیت</h2><div class="row" style="flex-wrap:wrap;gap:12px">' + K.map(function (k) { return '<label class="f" style="width:110px">' + k[1] + (isA ? '<input type="number" min="0" max="100" class="ltr" data-scw="' + k[0] + '" value="' + (W[k[0]] || 0) + '">' : '<b style="font-size:18px">' + fa(W[k[0]] || 0) + '</b>') + '</label>' }).join('') + (isA ? '<button class="btn p" type="button" id="scWs" style="align-self:end">ذخیره‌ی وزن‌ها</button>' : '') + '</div><small style="color:var(--muted)">امتیاز = تعداد هر نوع فعالیت × وزن آن. وزن‌ها را مدیر اکوسیستم تعیین می‌کند و برای همه‌ی اشتراک‌ها یکسان است.</small></div>';
    $('#pg').innerHTML = h;
    [].forEach.call(document.querySelectorAll('[data-scd]'), function (b) { b.onclick = function () { ST.days = +b.dataset.scd; view(isA) } });
    var ts = $('#scT'); if (ts) ts.onchange = function () { ST.tenant = +ts.value; view(isA) };
    var ws = $('#scWs'); if (ws) ws.onclick = function () { var o = {}; [].forEach.call(document.querySelectorAll('[data-scw]'), function (i) { o[i.dataset.scw] = +i.value || 0 }); api('PUT', '/admin/score-weights', o).then(function () { toast('✓ وزن‌ها ذخیره شد'); view(isA) }).catch(function (e) { toast(P.emsg(e)) }) };
  }

  P.O.scores = function () { return view(false) };
  P.A.ascores = function () { return view(true) };
  var o = ['scores', 'امتیازها', enabled]; var at = Math.max(1, P.NAV_OWNER.length - 2); P.NAV_OWNER.splice(at, 0, o);
  var at2 = 1; P.NAV_ADMIN.forEach(function (x, i) { if (x[0] === 'pricing') at2 = i + 1 }); P.NAV_ADMIN.splice(at2, 0, ['ascores', 'امتیاز کاربران']);
})();
