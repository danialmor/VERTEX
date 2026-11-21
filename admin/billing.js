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

  /* ── live USD→IRR (free-market). priceto.day → tgju fallback; hub keeps last good value */
  var rial = function (n) { return fa(Math.round(+n || 0)) + ' ریال' };
  function liveFx(cur) {
    cur = cur || {}; if (cur.lock || (cur.rate && Date.now() / 1000 - (cur.t || 0) < 600)) return Promise.resolve(cur);
    var tm = function (u) { return Promise.race([fetch(u, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw 0; return r.json() }), new Promise(function (_, j) { setTimeout(j, 8000) })]) };
    return tm('https://api.priceto.day/v1/latest/irr/usd').then(function (j) { if (!j || !(j.price > 100000)) throw 0; return { rate: j.price, src: 'priceto.day' } })
      .catch(function () { return tm('https://api.tgju.org/v1/market/indicator/summary-table-data/price_dollar_rl').then(function (j) { var v = +String(j.data[0][0]).replace(/[^\d]/g, ''); if (!(v > 100000)) throw 0; return { rate: v, src: 'tgju.org' } }) })
      .then(function (f) { return api('POST', '/fx', f).then(function (r) { return r.fx }).catch(function () { return { rate: f.rate, src: f.src, t: Date.now() / 1000 } }) })
      .catch(function () { return cur });
  }
  var SBCSS = '<style>.sb-tg{display:inline-flex;background:var(--card2,#1d2230);border-radius:999px;padding:4px;gap:4px;margin:0 auto}.sb-tg button{border:0;background:none;color:inherit;padding:8px 18px;border-radius:999px;cursor:pointer;font:inherit;font-size:14px}.sb-tg button.on{background:var(--card,#262c3a);box-shadow:0 1px 4px rgba(0,0,0,.35);font-weight:700}' +
    '.sb-g{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}.sb-c{background:var(--card,#1f2430);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:22px;display:grid;gap:12px;align-content:start;position:relative}.sb-c.best{border-color:var(--brand,#2f78c4);box-shadow:0 0 0 1px var(--brand,#2f78c4)}' +
    '.sb-c h3{margin:0;font-size:22px}.sb-p{font-size:30px;font-weight:800;line-height:1.1}.sb-p small{font-size:13px;font-weight:400;color:var(--muted)}.sb-c ul{list-style:none;margin:0;padding:0;display:grid;gap:8px;font-size:14px}.sb-c li:before{content:"✓";color:var(--brand,#5aa0e6);margin-inline-end:8px;font-weight:800}' +
    '.sb-st{display:grid;grid-template-columns:1fr auto;align-items:center;gap:8px;background:var(--card2,#181c26);border-radius:12px;padding:10px 12px}.sb-st .n{display:flex;align-items:center;gap:6px}.sb-st .n button{width:32px;height:32px;border-radius:50%;border:1px solid rgba(255,255,255,.15);background:none;color:inherit;font-size:18px;cursor:pointer}.sb-st input{width:58px;text-align:center;background:none;border:0;color:inherit;font:inherit;font-weight:700;font-size:16px}' +
    '.sb-fx{display:flex;flex-wrap:wrap;gap:8px 16px;justify-content:center;color:var(--muted);font-size:13px}.sb-sum{display:grid;gap:4px;text-align:center}.sb-sum b{font-size:26px}</style>';

  /* ── owner: subscription page — per-seat pricing ($/user/month, $/manager/month) in Rial */
  function buy() {
    return Promise.all([api('GET', '/plans'), api('GET', '/orders').catch(function () { return { items: [] } }), api('GET', '/me')]).then(function (R) {
      var pl = R[0].plans || [], pay = R[0].pay || {}, seat = R[0].seat || { user: 1, mgr: 2, off: 17 }, fx = R[0].fx || {}, ords = R[1].items || [], me = R[2], pend = ords.filter(function (o) { return o.status === 'pending' })[0];
      var S = buy.S || (buy.S = { cy: 'month', u: 0, m: 0, p: 0 }); seat.proj = seat.proj == null ? 10 : seat.proj;
      var R0 = function (usd) { return Math.round(usd * (fx.rate || 0) / 1000) * 1000 };
      var h = SBCSS + head('اشتراک', me.sub_active ? ('اشتراک فعال: <b>' + esc(me.plan || '') + '</b>' + (me.sub_ends ? ' · تا ' + dt(me.sub_ends) : '') + ' — برای تمدید یا افزودن نفر و پروژه یک طرح را انتخاب کنید.') : 'یک طرح انتخاب کنید؛ هر وقت لازم شد کاربر، لیدر یا پروژه اضافه کنید. همه‌ی قیمت‌ها به ریال است.');
      if (pend) h += '<div class="card mb" style="border:1px solid rgba(240,165,58,.55)"><b>سفارش شما در انتظار تأیید است</b> — «' + esc(pend.plan) + '» · ' + (pend.rial ? rial(pend.rial) : money(pend.amount)) + ' · کد پیگیری <span class="mono">' + esc(pend.ref) + '</span>. بعد از بررسی پرداخت، اشتراک خودکار فعال می‌شود.</div>';
      h += '<div class="mb" style="display:grid;gap:18px;justify-items:center;text-align:center"><h2 style="margin:0;font-size:28px">طرحی که با تیم شما رشد می‌کند</h2>' +
        '<div class="sb-tg" id="sbCy"><button type="button" data-cy="month">ماهانه</button><button type="button" data-cy="year">سالانه <small style="color:#3fb37f">' + fa(seat.off) + '٪ تخفیف</small></button></div></div>';
      h += '<div class="card mb" style="display:grid;gap:12px;max-width:900px;margin-inline:auto"><b style="text-align:center">نیاز به ظرفیت بیشتر دارید؟ به هر طرح اضافه کنید</b><div style="display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">' +
        [['u', 'کاربر اضافه'], ['m', 'لیدر اضافه'], ['p', 'پروژه‌ی اضافه']].map(function (k) { return '<div class="sb-st"><div><b>' + k[1] + '</b><br><small style="color:var(--muted)" id="sbP' + k[0] + '"></small></div><div class="n"><button type="button" data-st="' + k[0] + '" data-d="-1" aria-label="کم کردن">−</button><input id="sbI' + k[0] + '" inputmode="numeric" aria-label="' + k[1] + '" value="' + S[k[0]] + '"><button type="button" data-st="' + k[0] + '" data-d="1" aria-label="افزودن">+</button></div></div>' }).join('') + '</div>' +
        '<div class="sb-fx" id="sbFx"></div></div>';
      h += '<div class="sb-g mb" id="sbG"></div>';
      if (ords.length) h += '<div class="card"><h2 style="margin:0 0 10px;font-size:16px">سفارش‌های شما</h2><div class="tw"><table class="tbl"><thead><tr><th>تاریخ</th><th>طرح</th><th>ظرفیت</th><th>دوره</th><th>مبلغ</th><th>کد پیگیری</th><th>وضعیت</th></tr></thead><tbody>' + ords.map(function (o) { return '<tr><td>' + dt(o.ts) + '</td><td>' + esc(o.plan) + '</td><td>' + (o.users != null ? fa(o.users) + ' کاربر · ' + fa(o.managers) + ' لیدر' + (o.projects ? ' · ' + fa(o.projects) + ' پروژه' : '') : '—') + '</td><td>' + fa(o.months) + ' ماه</td><td>' + (o.rial ? rial(o.rial) : money(o.amount)) + '</td><td class="mono">' + esc(o.ref) + '</td><td>' + (ST[o.status] || o.status) + '</td></tr>' }).join('') + '</tbody></table></div></div>';
      $('#pg').innerHTML = h;
      var q = function (x) { x = x || {}; var iu = +x.inc_u || 0, im = +x.inc_m || 0, ip = +x.inc_p || 1, U0 = iu + S.u, M0 = im + S.m, P0 = ip + S.p, yr = S.cy === 'year', mo = yr ? 12 : 1; var per = x.flat ? +x.flat : (+x.base || 0) + S.u * seat.user + S.m * seat.mgr + S.p * seat.proj; var usd = Math.round(per * mo * (yr ? 1 - seat.off / 100 : 1) * 100) / 100; return { u: U0, m: M0, p: P0, flat: !!x.flat, custom: !x.flat && (S.u || S.m || S.p) > 0, mo: mo, usd: usd, rial: R0(usd) } };
      function draw() {
        [].forEach.call(document.querySelectorAll('[data-cy]'), function (b) { b.classList.toggle('on', b.dataset.cy === S.cy) });
        ['u', 'm', 'p'].forEach(function (k) { $('#sbI' + k).value = fa(S[k]); $('#sbP' + k).textContent = fx.rate ? fa(R0(seat[{ u: 'user', m: 'mgr', p: 'proj' }[k]])) + ' ریال در ماه' : '' });
        var per = S.cy === 'year' ? 'سال' : 'ماه';
        $('#sbFx').innerHTML = fx.rate ? '<span>قیمت‌ها به ریال · به‌روز ' + (fx.t ? dt(fx.t) : 'امروز') + '</span>' : '<span id="sbWait">در حال به‌روز کردن قیمت‌ها…</span>';
        $('#sbG').innerHTML = pl.map(function (x) { var Q = q(x), nm = x.name + (Q.custom ? ' کاستوم' : '');
          return '<div class="sb-c' + (x.best ? ' best' : '') + '">' + (x.best ? '<span class="chip ok" style="position:absolute;top:14px;inset-inline-end:14px">پیشنهاد ما</span>' : '') +
            '<h3>' + esc(nm) + '</h3>' + (x.desc ? '<div style="color:var(--muted);font-size:14px">' + esc(x.desc) + '</div>' : '') +
            '<div class="sb-p">' + (fx.rate ? fa(Q.rial) + ' <small>ریال / ' + per + '</small>' : '—') + '</div>' +
            '<small style="color:var(--muted)">' + (Q.flat ? 'کاربر، لیدر و پروژه‌ی نامحدود' : '۱ ادمین + ' + fa(Q.m) + ' لیدر + ' + fa(Q.u) + ' کاربر · ' + fa(Q.p) + ' پروژه') + (Q.mo === 12 ? ' · پرداخت سالانه' : '') + '</small>' +
            '<button class="btn p" type="button" style="padding:12px;border-radius:12px;font-weight:700" data-buy="' + x.id + '"' + (pend || !fx.rate ? ' disabled' : '') + '>' + (me.sub_active && me.plan === x.name ? 'تمدید ' : 'دریافت ') + esc(nm) + '</button>' +
            '<ul>' + (x.modules || []).map(function (m) { return '<li>' + esc(MODN(m)) + '</li>' }).join('') + '<li>تا ' + fa(x.max_levels) + ' سطح سازمانی</li><li>' + (Q.flat ? 'حساب و پروژه‌ی نامحدود' : fa(Q.u + Q.m + 1) + ' حساب کاربری · ' + fa(Q.p) + ' پروژه') + '</li></ul></div>'
        }).join('') || '<p style="color:var(--muted)">طرحی فعال نیست.</p>';
        bindBuy();
      }
      var num = function (v) { return +String(v).replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d) }).replace(/[^\d]/g, '') || 0 };
      [].forEach.call(document.querySelectorAll('[data-cy]'), function (b) { b.onclick = function () { S.cy = b.dataset.cy; draw() } });
      [].forEach.call(document.querySelectorAll('[data-st]'), function (b) { b.onclick = function () { var k = b.dataset.st; S[k] = Math.max(0, Math.min(500, S[k] + +b.dataset.d)); draw() } });
      ['u', 'm', 'p'].forEach(function (k) { $('#sbI' + k).onchange = function () { S[k] = Math.min(500, num(this.value)); draw() } });
      function bindBuy() {
        [].forEach.call(document.querySelectorAll('[data-buy]'), function (b) {
          b.onclick = function () {
            var x = pl.filter(function (z) { return String(z.id) === b.dataset.buy })[0]; if (!x) return; var Q = q(x);
            P.openDlg('<form><h2>پرداخت «' + esc(x.name + (Q.custom ? ' کاستوم' : '')) + '»</h2><div class="card" style="display:grid;gap:6px"><div>' + (Q.flat ? 'نامحدود' : '۱ ادمین + ' + fa(Q.m) + ' لیدر + ' + fa(Q.u) + ' کاربر · ' + fa(Q.p) + ' پروژه') + ' · ' + fa(Q.mo) + ' ماه</div><div>مبلغ: <b style="font-size:18px">' + rial(Q.rial) + '</b></div>' +
              (pay.card ? '<div>شماره‌ی کارت: <b class="mono" dir="ltr" style="user-select:all">' + esc(pay.card) + '</b></div>' : '<div style="color:#c0392b">اطلاعات پرداخت هنوز توسط مدیر ثبت نشده است.</div>') +
              (pay.holder ? '<div>به نام: <b>' + esc(pay.holder) + '</b>' + (pay.bank ? ' · ' + esc(pay.bank) : '') + '</div>' : '') + (pay.note ? '<small style="color:var(--muted)">' + esc(pay.note) + '</small>' : '') + '</div>' +
              '<label class="f">کد پیگیری / شماره‌ی تراکنش<input name="ref" class="ltr" required autocomplete="off"></label><label class="f">توضیح (اختیاری)<input name="note"></label><div class="err" role="alert"></div><div class="row"><button class="btn p">ثبت پرداخت</button><button class="btn" type="button" data-close>انصراف</button></div></form>',
              function (f) { f.onsubmit = function (e) { e.preventDefault(); api('POST', '/orders', { plan_id: x.id, users: Q.u, managers: Q.m, projects: Q.p, cycle: S.cy, ref: f.ref.value.trim(), note: f.note.value }).then(function () { P.closeDlg(); toast('پرداخت ثبت شد؛ بعد از تأیید، اشتراک فعال می‌شود.'); buy() }).catch(function (er) { f.querySelector('.err').textContent = P.emsg(er) }) } });
          }
        });
      }
      draw();
      liveFx(fx).then(function (f) { if (f && f.rate && (f.rate !== fx.rate || !fx.t)) { fx = f; if (document.getElementById('sbG')) draw() } else if (!fx.rate && document.getElementById('sbWait')) $('#sbWait').textContent = 'قیمت‌ها در دسترس نیست؛ کمی بعد دوباره امتحان کنید.' });
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
      h += '<div class="card mb"><h2 style="margin:0 0 10px;font-size:16px">سفارش‌ها ' + (pend ? '<span class="chip warn">' + fa(pend) + ' در انتظار</span>' : '') + '</h2>' + (ords.length ? '<div class="tw"><table class="tbl"><thead><tr><th>تاریخ</th><th>شرکت</th><th>کاربر</th><th>تعرفه</th><th>مبلغ</th><th>کد پیگیری</th><th>وضعیت</th><th></th></tr></thead><tbody>' + ords.map(function (o) { return '<tr><td>' + dt(o.ts) + '</td><td>' + esc(o.tenant) + ' <span class="mono" style="color:var(--muted)">' + esc(o.tcode) + '</span></td><td class="mono">' + esc(o.user) + '</td><td>' + esc(o.plan) + (o.users != null ? '<br><small>' + fa(o.users) + ' کاربر · ' + fa(o.managers) + ' لیدر · ' + fa(o.months) + ' ماه</small>' : '') + '</td><td>' + (o.rial ? rial(o.rial) + '<br><small style="color:var(--muted)">' + fa(o.usd) + ' $ × ' + fa(o.rate) + '</small>' : money(o.amount)) + '</td><td class="mono">' + esc(o.ref) + (o.note ? '<br><small>' + esc(o.note) + '</small>' : '') + '</td><td>' + (ST[o.status] || o.status) + '</td><td class="row">' + (o.status === 'pending' ? '<button class="btn s p" type="button" data-ok="' + o.id + '">تأیید و فعال‌سازی</button><button class="btn s" type="button" data-no="' + o.id + '">رد</button>' : '') + '</td></tr>' }).join('') + '</tbody></table></div>' : '<p style="color:var(--muted);margin:0">هنوز سفارشی ثبت نشده است.</p>') + '</div>';
      h += '<div class="card mb"><h2 style="margin:0 0 10px;font-size:16px">تعرفه‌ها</h2><div class="tw"><table class="tbl" id="plT"><thead><tr><th>نام</th><th>قیمت (تومان)</th><th>ماه</th><th>کاربر</th><th>سطح</th><th>بخش‌ها</th><th>توضیح</th><th></th><th></th></tr></thead><tbody>' + pl.map(row).join('') + '</tbody></table></div><button class="btn s" type="button" id="plAdd" style="margin-top:10px">+ تعرفه‌ی جدید</button></div>';
      h += '<div class="card"><h2 style="margin:0 0 10px;font-size:16px">اطلاعات پرداخت (کارت‌به‌کارت)</h2><div class="grid g3"><label class="f">شماره‌ی کارت<input id="pyCard" class="ltr" value="' + esc(pay.card || '') + '"></label><label class="f">به نام<input id="pyHolder" value="' + esc(pay.holder || '') + '"></label><label class="f">بانک<input id="pyBank" value="' + esc(pay.bank || '') + '"></label></div><label class="f">توضیح برای خریدار<input id="pyNote" value="' + esc(pay.note || '') + '"></label><small style="color:var(--muted)">روی سرور خودمان می‌شود درگاه پرداخت آنلاین (مثل زرین‌پال) را جایگزین کرد تا تأیید خودکار شود.</small></div>';
      $('#pg').innerHTML = h;
      var seat = R[0].seat || { user: 1, mgr: 2, off: 17 }, fx = R[0].fx || {};
      var hd = document.querySelector('#pg .card'); var sc = document.createElement('div'); sc.className = 'card mb'; hd.parentNode.insertBefore(sc, hd);
      sc.innerHTML = '<h2 style="margin:0 0 10px;font-size:16px">قیمت هر نفر و نرخ دلار</h2><div style="display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))"><label class="f">کاربر ($/ماه)<input id="stU" type="number" min="0" step="0.5" class="ltr" value="' + seat.user + '"></label><label class="f">لیدر ($/ماه)<input id="stM" type="number" min="0" step="0.5" class="ltr" value="' + seat.mgr + '"></label><label class="f">پروژه ($/ماه)<input id="stP" type="number" min="0" step="1" class="ltr" value="' + (seat.proj == null ? 10 : seat.proj) + '"></label><label class="f">تخفیف سالانه (٪)<input id="stO" type="number" min="0" max="90" class="ltr" value="' + seat.off + '"></label><label class="f">نرخ دستی (ریال)<input id="fxR" type="number" class="ltr" placeholder="' + (fx.rate || '') + '"></label></div>' +
        '<p style="margin:8px 0;color:var(--muted);font-size:13px">نرخ فعلی: <b>' + (fx.rate ? rial(fx.rate) : '—') + '</b> · منبع: ' + esc(fx.src || '—') + (fx.t ? ' · ' + dt(fx.t) : '') + (fx.lock ? ' · <b>قفل دستی</b>' : ' · هر ۱۰ دقیقه از priceto.day (پشتیبان tgju) به‌روز می‌شود') + '</p><div class="row"><button class="btn p s" type="button" id="stSave">ذخیره‌ی قیمت نفرات</button><button class="btn s" type="button" id="fxSet">ثبت نرخ دستی</button>' + (fx.lock ? '<button class="btn s" type="button" id="fxAuto">بازگشت به نرخ آنلاین</button>' : '') + '</div>';
      $('#stSave').onclick = function () { api('PUT', '/admin/seat', { user: +$('#stU').value, mgr: +$('#stM').value, proj: +$('#stP').value, off: +$('#stO').value }).then(function () { toast('✓ ذخیره شد.'); pricing() }).catch(function (x) { toast(P.emsg(x)) }) };
      $('#fxSet').onclick = function () { var v = +$('#fxR').value; if (!v) return toast('نرخ را به ریال وارد کنید.'); api('POST', '/fx', { rate: v, manual: 1, lock: 1 }).then(function () { toast('✓ نرخ دستی ثبت شد.'); pricing() }).catch(function (x) { toast(P.emsg(x)) }) };
      if ($('#fxAuto')) $('#fxAuto').onclick = function () { api('PUT', '/admin/seat', { user: seat.user, mgr: seat.mgr, proj: seat.proj, off: seat.off, unlock: 1 }).then(function () { return liveFx({}) }).then(function () { pricing() }) };
      if (!fx.lock) liveFx(fx);
      var read = function () { return [].map.call(document.querySelectorAll('#plT tbody tr'), function (tr, i) { var g = function (n) { return tr.querySelector('[name=' + n + ']') }; return { id: (pl[+tr.dataset.i] && pl[+tr.dataset.i].id) || (Date.now() % 100000 + i), name: g('name').value.trim() || 'تعرفه', price: +g('price').value || 0, months: +g('months').value || 1, seats: +g('seats').value || 1, max_levels: +g('max_levels').value || 1, min_u: (pl[+tr.dataset.i] || {}).min_u || 0, min_m: (pl[+tr.dataset.i] || {}).min_m || 0, flat: (pl[+tr.dataset.i] || {}).flat || 0, base: (pl[+tr.dataset.i] || {}).base || 0, inc_u: (pl[+tr.dataset.i] || {}).inc_u || 0, inc_m: (pl[+tr.dataset.i] || {}).inc_m || 0, inc_p: (pl[+tr.dataset.i] || {}).inc_p || 1, modules: [].map.call(tr.querySelectorAll('[name=m]:checked'), function (c) { return c.value }), desc: g('desc').value, best: g('best').checked, on: g('on').checked } }) };
      $('#plAdd').onclick = function () { pl = read(); pl.push({ name: 'تعرفه‌ی جدید', price: 0, months: 1, seats: 1, max_levels: 1, modules: ['project-control'], on: true }); document.querySelector('#plT tbody').innerHTML = pl.map(row).join(''); bindDel() };
      function bindDel() { [].forEach.call(document.querySelectorAll('[data-del]'), function (b) { b.onclick = function () { pl = read(); pl.splice(+b.dataset.del, 1); document.querySelector('#plT tbody').innerHTML = pl.map(row).join(''); bindDel() } }) } bindDel();
      $('#plSave').onclick = function () { api('PUT', '/admin/plans', { plans: read(), pay: { card: $('#pyCard').value.trim(), holder: $('#pyHolder').value.trim(), bank: $('#pyBank').value.trim(), note: $('#pyNote').value.trim() } }).then(function () { toast('✓ تعرفه‌ها و اطلاعات پرداخت ذخیره شد.'); pricing() }).catch(function (x) { toast(P.emsg(x)) }) };
      [].forEach.call(document.querySelectorAll('[data-ok],[data-no]'), function (b) { b.onclick = function () { var ok = !!b.dataset.ok; if (ok && !confirm('پرداخت بررسی شد و اشتراک فعال شود؟')) return; api('POST', '/admin/orders/' + (b.dataset.ok || b.dataset.no), { status: ok ? 'ok' : 'rejected' }).then(function () { toast(ok ? '✓ اشتراک فعال شد.' : 'سفارش رد شد.'); pricing() }).catch(function (x) { toast(P.emsg(x)) }) } });
    });
  }

  P.A.pricing = pricing; P.O.buy = buy;
  var at = 1; P.NAV_ADMIN.forEach(function (x, i) { if (x[0] === 'tenants') at = i + 1 }); P.NAV_ADMIN.splice(at, 0, ['pricing', 'قیمت‌گذاری اشتراک']);
  P.NAV_OWNER.splice(Math.max(1, P.NAV_OWNER.length - 1), 0, ['buy', 'اشتراک']);

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
