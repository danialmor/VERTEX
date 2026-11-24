/* پنل کاربری — مدیریت اکوسیستم (فقط مدیر): «لوگو و سیاست»، «سایت کلی» و یک تب برای هر پلتفرم (فعلاً I — کنترل پروژه).
   منابع: ../shared/policy.json (سیاست کلی)، ../<platform>/platform.json (نسخه و تغییرات؛ ساخته‌ی tools/platform_meta.js)،
   ../<platform>/PLATFORM.md (یادداشت ساخت برای AI)، بازدیدها از localStorage «vtx.visits» (shared/track.js). */
(function () {
  'use strict';
  var P = window.TSP; if (!P) return;
  var $ = P.$, esc = P.esc, head = P.head, B = window.BRAND || { platforms: [] };
  var j = function (u) { return fetch(u + (u.indexOf('?') < 0 ? '?' : '&') + 't=' + Date.now()).then(function (r) { if (!r.ok) throw r.status; return /\.json/.test(u) ? r.json() : r.text() }) };
  var vis = function () { try { return JSON.parse(localStorage.getItem('vtx.visits') || '{}') } catch (e) { return {} } };
  var sum = function (o, days) { var t = 0, lim = days ? new Date(Date.now() - days * 864e5).toISOString().slice(0, 10) : ''; for (var d in (o || {})) if (!lim || d >= lim) t += o[d]; return t };
  var plats = function () { return (B.platforms || []).map(function (p) { return Array.isArray(p) ? { n: p[0], slug: p[1], en: p[2], fa: p[3], color: p[6], href: p[8] } : p }) };
  var css = '<style>.eco-g{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(230px,1fr))}.eco-k{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:14px}.eco-k .card{padding:16px}.eco-k b{display:block;font-size:24px}.eco-k small{color:var(--muted)}.eco-p{display:flex;gap:12px;align-items:center}.eco-p svg{flex:none}.eco-l{margin:0;padding-inline-start:20px;line-height:1.9}.eco-v{border-inline-start:3px solid var(--line2);padding:4px 12px;margin:10px 0}.eco-v h3{margin:0;font-size:14px}.eco-v ul{margin:4px 0 0;padding-inline-start:18px;color:var(--muted);font-size:13px;line-height:1.8}.eco-md{white-space:pre-wrap;direction:ltr;text-align:left;font:13px/1.65 ui-monospace,Menlo,monospace;background:var(--card2);padding:14px;border-radius:12px;max-height:520px;overflow:auto}.eco-st{font-size:12px;padding:2px 10px;border-radius:999px;border:1px solid var(--line2)}.eco-st.ok{color:#1a8f4a;border-color:#1a8f4a}.eco-tl{display:flex;gap:4px;align-items:flex-end;height:80px}.eco-tl i{flex:1;background:#e0262f;border-radius:4px 4px 0 0;min-height:2px}</style>';
  var SEC = { brand: 'برند', admin: 'مدیریت', docs: 'مستندسازی', data: 'داده', ui: 'ظاهر و چیدمان' };

  P.A.ecopolicy = function () {
    $('#pg').innerHTML = css + head('لوگو و سیاست', 'نشان اصلی، نشان ۱۲ پلتفرم و سیاست کلی اکوسیستم در یک نگاه') + '<div id="ecoB">در حال خواندن…</div>';
    return j('../shared/policy.json').then(function (pol) {
      var h = '<div class="card"><h2>نشان پلتفرم‌ها</h2><p>قانون: مثلث وارونه‌ی ورتکس به رنگ هر پلتفرم و شماره‌ی رومی داخل آن. منبع: <code>shared/brand.js → BRAND.mark()</code></p><div class="eco-g">' +
        plats().map(function (p) { return '<div class="eco-p">' + B.mark(p.slug, 56) + '<div><b>' + p.n + ' — ' + esc(p.fa) + '</b><br><small>' + esc(p.en) + '</small><br><a href="#" data-dl="' + p.slug + '">دانلود SVG</a></div></div>' }).join('') + '</div></div>';
      h += '<div class="card"><h2>سیاست کلی <small class="eco-st">به‌روز: ' + esc(pol.updated) + '</small></h2><p>منبع واحد: <code>shared/policy.json</code> — هر تغییر سیاست همین‌جا دیده می‌شود.</p>' +
        Object.keys(pol).filter(function (k) { return Array.isArray(pol[k]) }).map(function (k) { return '<h3>' + (SEC[k] || k) + '</h3><ul class="eco-l">' + pol[k].map(function (x) { return '<li dir="ltr" style="text-align:left">' + esc(x) + '</li>' }).join('') + '</ul>' }).join('') + '</div>';
      $('#ecoB').innerHTML = h;
      $('#ecoB').onclick = function (e) { var a = e.target.closest('[data-dl]'); if (!a) return; e.preventDefault(); var l = document.createElement('a'); l.href = B.markURL(a.dataset.dl, 512); l.download = 'vertex-' + a.dataset.dl + '.svg'; l.click() };
    }, function () { $('#ecoB').textContent = 'فایل سیاست خوانده نشد.' });
  };

  P.A.ecosite = function () {
    var V = vis(), meta = {}, cfg = { active: 'cinematic', options: ['cinematic', 'classic'] }, cfgSha = '', cfgPath = '/repos/danialmor/VERTEX/contents/shared/home-config.json';
    $('#pg').innerHTML = css + head('سایت کلی', 'همه‌ی پلتفرم‌ها: وضعیت، نسخه، بازدید و انتخاب صفحه‌ی اصلی') + '<div id="ecoS"><p>در حال خواندن تنظیمات…</p></div>';
    function saveHome(mode, btn) {
      if (!/^(cinematic|classic)$/.test(mode)) return;
      var token = ''; try { token = localStorage.getItem('ghTok') || ''; } catch (e) {}
      if (!token) { toast('ابتدا کلید GitHub را در «ذخیره در GitHub» ثبت کنید.'); return; }
      btn.disabled = true; btn.textContent = 'در حال ذخیره…';
      var next = { active: mode, updated: new Date().toISOString(), options: ['cinematic', 'classic'] };
      fetch('https://api.github.com' + cfgPath + '?ref=main', { headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' }, cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error('خواندن تنظیمات GitHub ناموفق بود (' + r.status + ')'); return r.json(); })
        .then(function (old) {
          return fetch('https://api.github.com' + cfgPath, { method: 'PUT', headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'panel: switch VERTEX homepage to ' + mode, content: btoa(unescape(encodeURIComponent(JSON.stringify(next, null, 2)))), sha: old.sha, branch: 'main' }) });
        })
        .then(function (r) { if (!r.ok) throw new Error('ذخیره در GitHub ناموفق بود (' + r.status + ')'); cfg.active = mode; cfg.updated = next.updated; toast('صفحه‌ی اصلی با موفقیت تغییر کرد. پس از انتشار GitHub Pages اعمال می‌شود.'); draw(); })
        .catch(function (e) { toast(e.message || 'ذخیره انجام نشد.'); })
        .then(function () { btn.disabled = false; });
    }
    var draw = function () {
      var all = 0; for (var k in V) all += sum(V[k]);
      var active = cfg.active === 'classic' ? 'classic' : 'cinematic';
      var selector = '<div class="card" style="margin-bottom:14px"><h2>انتخاب نسخه‌ی صفحه‌ی اصلی VERTEX</h2><p>نسخه‌ی فعال برای همه‌ی بازدیدکنندگان صفحه‌ی <code>/home/</code> استفاده می‌شود. نسخه‌ی قبلی بدون تغییر در <code>/home/classic.html</code> نگه‌داری شده است.</p><div class="eco-g">' +
        '<div class="card"><h3>نسخه‌ی جدید · Cinematic</h3><p><small>هاب سه‌بعدی، مدارهای نورانی، افق دیجیتال و کارت‌های ۱۲ پلتفرم.</small></p><span class="eco-st' + (active === 'cinematic' ? ' ok' : '') + '">' + (active === 'cinematic' ? 'نسخه‌ی فعال' : 'غیرفعال') + '</span><p><a target="_blank" rel="noopener" href="../home/?preview=cinematic">پیش‌نمایش نسخه‌ی جدید ↗</a></p><button class="btn p" type="button" data-home="cinematic" ' + (active === 'cinematic' ? 'disabled' : '') + '>فعال‌کردن نسخه‌ی جدید</button></div>' +
        '<div class="card"><h3>نسخه‌ی قبلی · Classic</h3><p><small>طرح مثلثی قبلی با چیدمان اولیه‌ی دوازده پلتفرم.</small></p><span class="eco-st' + (active === 'classic' ? ' ok' : '') + '">' + (active === 'classic' ? 'نسخه‌ی فعال' : 'غیرفعال') + '</span><p><a target="_blank" rel="noopener" href="../home/classic.html">مشاهده‌ی نسخه‌ی قبلی ↗</a></p><button class="btn" type="button" data-home="classic" ' + (active === 'classic' ? 'disabled' : '') + '>بازگشت به نسخه‌ی قبلی</button></div></div><p><small>آخرین تغییر: ' + esc(cfg.updated || '—') + ' · ذخیره‌ی تغییر از طریق GitHub انجام می‌شود؛ کلید باید در بخش «ذخیره در GitHub» ثبت شده باشد.</small></p></div>';
      $('#ecoS').innerHTML = selector + '<div class="eco-k"><div class="card"><b>' + plats().filter(function (p) { return p.href }).length + ' / 12</b><small>پلتفرم فعال</small></div><div class="card"><b>' + all + '</b><small>بازدید (این مرورگر)</small></div><div class="card"><b>' + sum(V.site, 30) + '</b><small>بازدید صفحه‌ی اصلی، ۳۰ روز</small></div></div>' +
        '<div class="card"><h2>پلتفرم‌ها</h2><div class="eco-g">' + plats().map(function (p) { var m = meta[p.slug]; return '<div class="eco-p">' + B.mark(p.slug, 44) + '<div><b>' + p.n + ' — ' + esc(p.fa) + '</b><br><span class="eco-st' + (p.href ? ' ok' : '') + '">' + (p.href ? 'فعال' : 'برنامه‌ریزی') + '</span> ' + (m ? '<small>v' + esc(m.version) + '</small>' : '') + '<br><small>بازدید ۳۰ روز: ' + sum(V[p.slug], 30) + '</small></div></div>' }).join('') + '</div><p><small>آمار بازدید واقعی همه‌ی کاربران بعد از راه‌اندازی سرور اختصاصی؛ فعلاً شمارش همین مرورگر است.</small></p></div>';
      $('#ecoS').querySelectorAll('[data-home]').forEach(function (b) { b.onclick = function () { saveHome(b.getAttribute('data-home'), b); }; });
    };
    draw();
    return Promise.all([
      j('../shared/home-config.json').then(function (x) { cfg = x; }, function () {}),
      j('../msp-bi/platform.json').then(function (m) { meta['project-control'] = m; }, function () {})
    ]).then(draw);
  };

  P.A['eco-pc'] = function () {
    var p = B.platform ? B.platform('project-control') : null, V = vis()['project-control'] || {};
    $('#pg').innerHTML = css + head((p ? B.mark(p, 34) + ' ' : '') + 'I — کنترل پروژه', 'تب مدیریتی پلتفرم: آمار، نسخه‌ها، نحوه‌ی ساخت، قوانین و نیازها') + '<div id="ecoP">در حال خواندن…</div>';
    return Promise.all([j('../msp-bi/platform.json').catch(function () { return null }), j('../msp-bi/PLATFORM.md').catch(function () { return '' }), j('../msp-bi/data/store/index.json').catch(function () { return null })]).then(function (r) {
      var m = r[0] || { version: '?', changelog: [] }, md = r[1], st = r[2], days = [];
      for (var i = 29; i >= 0; i--) { var d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10); days.push(V[d] || 0) }
      var mx = Math.max.apply(0, days.concat(1)), np = st ? (Array.isArray(st) ? st.length : (st.projects || st.items || []).length || Object.keys(st).length) : '—';
      var h = '<div class="eco-k"><div class="card"><b>v' + esc(m.version) + '</b><small>نسخه‌ی فعلی</small></div><div class="card"><b>' + m.changelog.length + '</b><small>نسخه‌ی ثبت‌شده</small></div><div class="card"><b>' + sum(V, 30) + '</b><small>بازدید ۳۰ روز (این مرورگر)</small></div><div class="card"><b>' + np + '</b><small>پروژه در مخزن داده</small></div><div class="card"><b>' + esc((m.changelog[0] || {}).date || '—') + '</b><small>آخرین انتشار</small></div></div>';
      var sec = function (t) { var m2 = md.split(/\n## /).filter(function (x) { return x.indexOf(t) === 0 })[0]; return m2 ? m2.split('\n').slice(1).filter(function (l) { return /^- /.test(l) }).map(function (l) { return l.slice(2) }) : [] };
      h += '<div class="eco-k">' + [['Open needs', 'نیازها / کارهای باز'], ['Connections', 'اتصال‌ها']].map(function (q) { return '<div class="card" style="grid-column:span 2"><h2>' + q[1] + '</h2><ul class="eco-l" dir="ltr" style="text-align:left">' + sec(q[0]).map(function (x) { return '<li>' + esc(x) + '</li>' }).join('') + '</ul></div>' }).join('') + '</div>';
      h += '<div class="card"><h2>سلامت داده‌ها (مخزن)</h2><div id="ecoH">…</div></div>';
      h += '<div class="card"><h2>بازدید ۳۰ روز اخیر</h2><div class="eco-tl">' + days.map(function (x) { return '<i style="height:' + Math.round(x / mx * 100) + '%" title="' + x + '"></i>' }).join('') + '</div></div>';
      h += '<div class="card"><h2>تاریخچه‌ی نسخه‌ها</h2><p><small>خودکار از CHANGELOG داخل msp-bi/index.html — <code>node tools/platform_meta.js</code></small></p>' + m.changelog.slice(0, 15).map(function (c) { return '<div class="eco-v"><h3>v' + esc(c.v) + ' · ' + esc(c.date) + ' — ' + esc(c.title || '') + '</h3><ul>' + (c.items || []).map(function (x) { return '<li>' + esc(x) + '</li>' }).join('') + '</ul></div>' }).join('') + (m.changelog.length > 15 ? '<details><summary>نسخه‌های قدیمی‌تر (' + (m.changelog.length - 15) + ')</summary>' + m.changelog.slice(15).map(function (c) { return '<div class="eco-v"><h3>v' + esc(c.v) + ' — ' + esc(c.title || '') + '</h3></div>' }).join('') + '</details>' : '') + '</div>';
      h += '<div class="card"><h2>نحوه‌ی ساخت، قوانین و نیازها (برای AI)</h2><p><small>منبع: <code>msp-bi/PLATFORM.md</code> — با هر تغییر به‌روز می‌شود.</small></p><div class="eco-md">' + esc(md || '—') + '</div></div>';
      $('#ecoP').innerHTML = h;
      var F = [['index.json', 'فهرست برنامه‌های زمان‌بندی'], ['pinfo.json', 'اطلاعات پروژه‌ها'], ['delays.json', 'تأخیرات (فرم‌ها)'], ['dim.json', 'ابعاد/پیکربندی']];
      Promise.all(F.map(function (f) { return j('../msp-bi/data/store/' + f[0]).then(function (d) { var n = Array.isArray(d) ? d.length : d && typeof d === 'object' ? (Array.isArray(d.rows) ? d.rows.length : Object.keys(d).length) : 0; return [f, 1, n, (d && !Array.isArray(d) && typeof (d.updated || d.ts) === 'string' ? (d.updated || d.ts) : '')] }, function () { return [f, 0, 0, ''] }) })).then(function (R) {
        var e = $('#ecoH'); if (e) e.innerHTML = '<ul class="eco-l">' + R.map(function (r) { return '<li><span class="eco-st' + (r[1] ? ' ok' : '') + '">' + (r[1] ? 'موجود' : 'نیست') + '</span> ' + r[0][1] + ' <small>(' + r[0][0] + (r[1] ? ' · ' + r[2] + ' مورد' : '') + (r[3] ? ' · ' + esc(String(r[3]).slice(0, 16)) : '') + ')</small></li>' }).join('') + '</ul>';
      });
    });
  };

  var N = P.NAV_ADMIN, at = 1; N.forEach(function (x, i) { if (x[0] === 'overview') at = i + 1 });
  N.splice(at, 0, ['ecopolicy', 'لوگو و سیاست'], ['ecosite', 'سایت کلی'], ['eco-pc', 'I — کنترل پروژه']);
})();
