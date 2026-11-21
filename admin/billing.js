/* Control panel — subscriptions for sale.
   Admin: «قیمت‌گذاری اشتراک» — plans (price, months, modules, seats), payment details, orders to approve.
   Owner: «اشتراک و خرید» — choose a plan, pay (card to card), send the tracking code; while the company has no
   active subscription the account can only see this page (every platform page redirects here, see shared/auth.js).
   Login page: «ساخت حساب» — a company creates its own account (owner) and is sent to the purchase page. */
(function () {
  'use strict';
  var P = window.TSP; if (!P) return;
  var $ = P.$, esc = P.esc, head = P.head, toast = P.toast, api = P.api, fa = function (x) { var n = +x; return isNaN(n) ? String(x) : n.toLocaleString('fa-IR') };
  var MODN = function (s) { try { return P.modName(s) } catch (e) { return s } };
  var money = function (n) { return fa(Math.round(+n || 0)) + ' تومان' };
  var dt = function (ts) { try { return P.fmtD(ts) } catch (e) { return '' } };
  var ST = { pending: '<span class="chip warn">در انتظار تأیید</span>', ok: '<span class="chip ok">تأیید شد</span>', rejected: '<span class="chip bad">رد شد</span>' };
  var MODS_ALL = [['project-control', 'کنترل پروژه'], ['mail', 'نامه‌نگاری'], ['file-manager', 'فایل منیجر'], ['messenger', 'پیام‌رسان'], ['executive-desk', 'میز مدیرعامل و منشی'], ['trading', 'تریدینگ'], ['scores', 'امتیازها']];

  /* ── owner: purchase page */
  function buy() {
    return Promise.all([api('GET', '/plans'), api('GET', '/orders').catch(function () { return { items: [] } }), api('GET', '/me')]).then(function (R) {
      var pl = R[0].plans || [], pay = R[0].pay || {}, ords = R[1].items || [], me = R[2], pend = ords.filter(function (o) { return o.status === 'pending' })[0];
      var h = head('اشتراک و خرید', me.sub_active ? ('اشتراک فعال: <b>' + esc(me.plan || '') + '</b>' + (me.sub_ends ? ' · تا ' + dt(me.sub_ends) : '') + ' — برای تمدید یا ارتقا یکی از تعرفه‌ها را انتخاب کنید.') : 'برای استفاده از بخش‌ها، یکی از تعرفه‌ها را انتخاب و پرداخت کنید. تا فعال شدن اشتراک، فقط همین صفحه در دسترس است.');
      if (pend) h += '<div class="card mb" style="border:1px solid rgba(240,165,58,.55)"><b>سفارش شما در انتظار تأیید است</b> — تعرفه‌ی «' + esc(pend.plan) + '» · ' + money(pend.amount) + ' · کد پیگیری <span class="mono">' + esc(pend.ref) + '</span>. بعد از بررسی پرداخت، اشتراک خودکار فعال می‌شود و همین صفحه را تازه کنید.</div>';
      h += '<div class="mb" style="display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">' + pl.map(function (x) {
        return '<div class="card" style="display:grid;gap:10px;align-content:start;' + (x.best ? 'border:2px solid var(--brand,#2f78c4)' : '') + '">' + (x.best ? '<span class="chip ok" style="justify-self:start">پیشنهاد ما</span>' : '') +
          '<h2 style="margin:0;font-size:18px">' + esc(x.name) + '</h2><div style="font-size:22px;font-weight:800">' + money(x.price) + '</div><small style="color:var(--muted)">برای ' + fa(x.months) + ' ماه، ' + fa(x.seats) + ' کاربر، ' + fa(x.max_levels) + ' سطح</small>' +
          (x.desc ? '<p style="margin:0">' + esc(x.desc) + '</p>' : '') + '<ul style="margin:0;padding-inline-start:18px;display:grid;gap:4px;font-size:13px">' + (x.modules || []).map(function (m) { return '<li>' + esc(MODN(m)) + '</li>' }).join('') + '</ul>' +
          '<button class="btn p" type="button" data-buy="' + x.id + '"' + (pend ? ' disabled' : '') + '>انتخاب و پرداخت</button></div>'
      }).join('') + '</div>';
      if (ords.length) h += '<div class="card"><h2 style="margin:0 0 10px;font-size:16px">سفارش‌های شما</h2><div class="tw"><table class="tbl"><thead><tr><th>تاریخ</th><th>تعرفه</th><th>مبلغ</th><th>کد پیگیری</th><th>وضعیت</th></tr></thead><tbody>' + ords.map(function (o) { return '<tr><td>' + dt(o.ts) + '</td><td>' + esc(o.plan) + '</td><td>' + money(o.amount) + '</td><td class="mono">' + esc(o.ref) + '</td><td>' + (ST[o.status] || o.status) + '</td></tr>' }).join('') + '</tbody></table></div></div>';
      $('#pg').innerHTML = h;
      [].forEach.call(document.querySelectorAll('[data-buy]'), function (b) {
        b.onclick = function () {
          var x = pl.filter(function (z) { return String(z.id) === b.dataset.buy })[0]; if (!x) return;
          P.openDlg('<form><h2>پرداخت تعرفه‌ی «' + esc(x.name) + '»</h2><div class="card" style="display:grid;gap:6px"><div>مبلغ: <b>' + money(x.price) + '</b></div>' +
            (pay.card ? '<div>شماره‌ی کارت: <b class="mono" dir="ltr" style="user-select:all">' + esc(pay.card) + '</b></div>' : '<div style="color:#c0392b">اطلاعات پرداخت هنوز توسط مدیر ثبت نشده است.</div>') +
            (pay.holder ? '<div>به نام: <b>' + esc(pay.holder) + '</b>' + (pay.bank ? ' · ' + esc(pay.bank) : '') + '</div>' : '') + (pay.note ? '<small style="color:var(--muted)">' + esc(pay.note) + '</small>' : '') + '</div>' +
            '<label class="f">کد پیگیری / شماره‌ی تراکنش<input name="ref" class="ltr" required autocomplete="off"></label><label class="f">توضیح (اختیاری)<input name="note"></label><div class="err" role="alert"></div><div class="row"><button class="btn p">ثبت پرداخت</button><button class="btn" type="button" data-close>انصراف</button></div></form>',
            function (f) { f.onsubmit = function (e) { e.preventDefault(); api('POST', '/orders', { plan_id: x.id, ref: f.ref.value.trim(), note: f.note.value }).then(function () { P.closeDlg(); toast('پرداخت ثبت شد؛ بعد از تأیید، اشتراک فعال می‌شود.'); buy() }).catch(function (er) { f.querySelector('.err').textContent = P.emsg(er) }) } });
        }
      });
    });
  }

  /* ── admin: plans, payment details, orders */
  function pricing() {
    return Promise.all([api('GET', '/plans'), api('GET', '/admin/orders')]).then(function (R) {
      var pl = (R[0].plans || []).slice(), pay = R[0].pay || {}, ords = R[1].items || [], pend = ords.filter(function (o) { return o.status === 'pending' }).length;
      var inp = 'style="width:100%;box-sizing:border-box"';
      var row = function (x, i) {
        return '<tr data-i="' + i + '"><td><input name="name" value="' + esc(x.name) + '" ' + inp + '></td><td><input name="price" type="number" min="0" step="1000" class="ltr" value="' + (x.price || 0) + '" style="width:130px"></td><td><input name="months" type="number" min="1" value="' + (x.months || 1) + '" style="width:60px"></td><td><input name="seats" type="number" min="1" value="' + (x.seats || 1) + '" style="width:60px"></td><td><input name="max_levels" type="number" min="1" max="10" value="' + (x.max_levels || 1) + '" style="width:55px"></td>' +
          '<td><div class="mods" style="display:grid;gap:2px;font-size:12px">' + MODS_ALL.map(function (m) { return '<label><input type="checkbox" name="m" value="' + m[0] + '"' + ((x.modules || []).indexOf(m[0]) >= 0 ? ' checked' : '') + '> ' + m[1] + '</label>' }).join('') + '</div></td>' +
          '<td><input name="desc" value="' + esc(x.desc || '') + '" ' + inp + '></td><td><label><input type="checkbox" name="best"' + (x.best ? ' checked' : '') + '> پیشنهادی</label><br><label><input type="checkbox" name="on"' + (x.on !== false ? ' checked' : '') + '> فعال</label></td><td><button class="btn s" type="button" data-del="' + i + '">حذف</button></td></tr>'
      };
      var h = head('قیمت‌گذاری اشتراک', 'تعرفه‌هایی که کاربران تازه در صفحه‌ی خرید می‌بینند، اطلاعات پرداخت و سفارش‌هایی که باید تأیید شوند.', '<button class="btn p" type="button" id="plSave">ذخیره‌ی تعرفه‌ها</button>');
      h += '<div class="card mb"><h2 style="margin:0 0 10px;font-size:16px">سفارش‌ها ' + (pend ? '<span class="chip warn">' + fa(pend) + ' در انتظار</span>' : '') + '</h2>' + (ords.length ? '<div class="tw"><table class="tbl"><thead><tr><th>تاریخ</th><th>شرکت</th><th>کاربر</th><th>تعرفه</th><th>مبلغ</th><th>کد پیگیری</th><th>وضعیت</th><th></th></tr></thead><tbody>' + ords.map(function (o) { return '<tr><td>' + dt(o.ts) + '</td><td>' + esc(o.tenant) + ' <span class="mono" style="color:var(--muted)">' + esc(o.tcode) + '</span></td><td class="mono">' + esc(o.user) + '</td><td>' + esc(o.plan) + '</td><td>' + money(o.amount) + '</td><td class="mono">' + esc(o.ref) + (o.note ? '<br><small>' + esc(o.note) + '</small>' : '') + '</td><td>' + (ST[o.status] || o.status) + '</td><td class="row">' + (o.status === 'pending' ? '<button class="btn s p" type="button" data-ok="' + o.id + '">تأیید و فعال‌سازی</button><button class="btn s" type="button" data-no="' + o.id + '">رد</button>' : '') + '</td></tr>' }).join('') + '</tbody></table></div>' : '<p style="color:var(--muted);margin:0">هنوز سفارشی ثبت نشده است.</p>') + '</div>';
      h += '<div class="card mb"><h2 style="margin:0 0 10px;font-size:16px">تعرفه‌ها</h2><div class="tw"><table class="tbl" id="plT"><thead><tr><th>نام</th><th>قیمت (تومان)</th><th>ماه</th><th>کاربر</th><th>سطح</th><th>بخش‌ها</th><th>توضیح</th><th></th><th></th></tr></thead><tbody>' + pl.map(row).join('') + '</tbody></table></div><button class="btn s" type="button" id="plAdd" style="margin-top:10px">+ تعرفه‌ی جدید</button></div>';
      h += '<div class="card"><h2 style="margin:0 0 10px;font-size:16px">اطلاعات پرداخت (کارت‌به‌کارت)</h2><div class="grid g3"><label class="f">شماره‌ی کارت<input id="pyCard" class="ltr" value="' + esc(pay.card || '') + '"></label><label class="f">به نام<input id="pyHolder" value="' + esc(pay.holder || '') + '"></label><label class="f">بانک<input id="pyBank" value="' + esc(pay.bank || '') + '"></label></div><label class="f">توضیح برای خریدار<input id="pyNote" value="' + esc(pay.note || '') + '"></label><small style="color:var(--muted)">روی سرور خودمان می‌شود درگاه پرداخت آنلاین (مثل زرین‌پال) را جایگزین کرد تا تأیید خودکار شود.</small></div>';
      $('#pg').innerHTML = h;
      var read = function () { return [].map.call(document.querySelectorAll('#plT tbody tr'), function (tr, i) { var g = function (n) { return tr.querySelector('[name=' + n + ']') }; return { id: (pl[+tr.dataset.i] && pl[+tr.dataset.i].id) || (Date.now() % 100000 + i), name: g('name').value.trim() || 'تعرفه', price: +g('price').value || 0, months: +g('months').value || 1, seats: +g('seats').value || 1, max_levels: +g('max_levels').value || 1, modules: [].map.call(tr.querySelectorAll('[name=m]:checked'), function (c) { return c.value }), desc: g('desc').value, best: g('best').checked, on: g('on').checked } }) };
      $('#plAdd').onclick = function () { pl = read(); pl.push({ name: 'تعرفه‌ی جدید', price: 0, months: 1, seats: 1, max_levels: 1, modules: ['project-control'], on: true }); document.querySelector('#plT tbody').innerHTML = pl.map(row).join(''); bindDel() };
      function bindDel() { [].forEach.call(document.querySelectorAll('[data-del]'), function (b) { b.onclick = function () { pl = read(); pl.splice(+b.dataset.del, 1); document.querySelector('#plT tbody').innerHTML = pl.map(row).join(''); bindDel() } }) } bindDel();
      $('#plSave').onclick = function () { api('PUT', '/admin/plans', { plans: read(), pay: { card: $('#pyCard').value.trim(), holder: $('#pyHolder').value.trim(), bank: $('#pyBank').value.trim(), note: $('#pyNote').value.trim() } }).then(function () { toast('✓ تعرفه‌ها و اطلاعات پرداخت ذخیره شد.'); pricing() }).catch(function (x) { toast(P.emsg(x)) }) };
      [].forEach.call(document.querySelectorAll('[data-ok],[data-no]'), function (b) { b.onclick = function () { var ok = !!b.dataset.ok; if (ok && !confirm('پرداخت بررسی شد و اشتراک فعال شود؟')) return; api('POST', '/admin/orders/' + (b.dataset.ok || b.dataset.no), { status: ok ? 'ok' : 'rejected' }).then(function () { toast(ok ? '✓ اشتراک فعال شد.' : 'سفارش رد شد.'); pricing() }).catch(function (x) { toast(P.emsg(x)) }) } });
    });
  }

  P.A.pricing = pricing; P.O.buy = buy;
  var at = 1; P.NAV_ADMIN.forEach(function (x, i) { if (x[0] === 'tenants') at = i + 1 }); P.NAV_ADMIN.splice(at, 0, ['pricing', 'قیمت‌گذاری اشتراک']);
  P.NAV_OWNER.splice(Math.max(1, P.NAV_OWNER.length - 1), 0, ['buy', 'اشتراک و خرید']);

  /* ── login page: «ساخت حساب» */
  var lf = document.getElementById('lf');
  if (lf && !document.getElementById('rgOpen')) {
    var bt = document.createElement('button'); bt.type = 'button'; bt.className = 'btn'; bt.id = 'rgOpen'; bt.textContent = 'ساخت حساب شرکت';
    var su = document.getElementById('suOpen'); (su ? su.parentNode : lf).insertBefore(bt, su || null);
    bt.onclick = function () {
      P.openDlg('<form autocomplete="off"><h2>ساخت حساب شرکت</h2><p style="margin:0;color:var(--muted)">حساب مدیر شرکت ساخته می‌شود؛ بعد از انتخاب و پرداخت تعرفه، همه‌ی بخش‌های اشتراک باز می‌شود و می‌توانید کاربران شرکت را تعریف کنید.</p><div class="grid g2"><label class="f">نام و نام خانوادگی<input name="name" required></label><label class="f">نام شرکت<input name="company" required></label><label class="f">تلفن همراه<input name="phone" class="ltr" inputmode="tel"></label><label class="f">ایمیل<input name="email" class="ltr" type="email"></label><label class="f">نام کاربری (انگلیسی)<input name="code" class="ltr" required pattern="[A-Za-z0-9._\\-]{3,30}" autocapitalize="off"></label><label class="f">رمز عبور (حداقل ۸ نویسه)<input name="pin" type="password" class="ltr" minlength="8" required autocomplete="new-password"></label></div><div class="err" role="alert"></div><div class="row"><button class="btn p">ساخت حساب و رفتن به خرید اشتراک</button><button class="btn" type="button" data-close>انصراف</button></div></form>',
        function (f) {
          f.onsubmit = function (e) {
            e.preventDefault(); var er = f.querySelector('.err'); er.textContent = '';
            api('POST', '/register', { name: f.name.value.trim(), company: f.company.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(), code: f.code.value.trim(), pin: f.pin.value }).then(function (r) {
              P.T = r.token; try { localStorage.setItem('hub.token', r.token) } catch (x) { } P.closeDlg(); if (window.TSP_vxMark) window.TSP_vxMark(r); history.replaceState(null, '', '#buy'); P.enter(r);
            }).catch(function (x) { var m = P.emsg(x); if (x && x.body && x.body.error === 'code-exists') m = 'این نام کاربری قبلاً گرفته شده است.'; if (x && x.body && x.body.error === 'bad-code') m = 'نام کاربری فقط حروف انگلیسی، عدد و . _ - (۳ تا ۳۰ نویسه).'; er.textContent = m });
          }
        });
    };
  }
})();
