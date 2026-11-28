/* VERTEX · IV — one tab per platform, built automatically (feature VX-012). Ecosystem admin only.
   Every platform in shared/brand.js gets a tab «<numeral> — <name>»; a new platform gets its tab with no code change.
   Each tab gathers by itself: version + changelog + features + connection checks (shared/releases.json), module record (/modules),
   subscriptions that include it (/admin/tenants), visits (shared/track.js), build notes (<path>/PLATFORM.md) and platform-specific data.
   Advanced settings (admin): status, address, access site, a notice shown to the platform's users (shared/about.js), private notes,
   plus platform-specific controls (e.g. Project Control dashboard access per subscription). Saved with POST /admin/modules {settings}. */
(function () {
  'use strict';
  var P = window.TSP; if (!P) return;
  var $ = P.$, esc = P.esc, head = P.head, api = P.api, toast = P.toast, B = window.BRAND || { platforms: [] }, ROOT = '../';
  var j = function (u) { return fetch(ROOT + u + (u.indexOf('?') < 0 ? '?' : '&') + 'c=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw r.status; return /\.json/.test(u) ? r.json() : r.text() }) };
  var ok = function (u) { return fetch(ROOT + u + (u.indexOf('?') < 0 ? '?' : '&') + 'c=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok }, function () { return false }) };
  var plats = function () { return (B.platforms || []).map(function (p) { return Array.isArray(p) ? { n: p[0], slug: p[1], en: p[2], fa: p[3], href: p[8] } : p }) };
  var vis = function (slug) { try { return (JSON.parse(localStorage.getItem('vtx.visits') || '{}'))[slug] || {} } catch (e) { return {} } };
  var ST = { live: ['فعال', 'ok'], partial: ['نیمه‌کاره', 'warn'], planned: ['برنامه‌ریزی', ''], off: ['خاموش', 'bad'], beta: ['آزمایشی', 'warn'], retired: ['بازنشسته', 'bad'] };
  var DOCS = { 'project-control': 'msp-bi/PLATFORM.md', trading: 'trading/PLATFORM.md' };
  var css = '<style>#pf{font-size:13px}#pf .k{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:14px}#pf .k .card{padding:14px 16px}#pf .k b{display:block;font-size:21px;font-weight:600}#pf .k small{color:var(--muted);font-size:12px}' +
    '#pf .card{padding:16px;margin-bottom:14px}#pf h2{font-size:14.5px;margin:0 0 10px}#pf .two{display:grid;gap:14px;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr)}@media(max-width:980px){#pf .two{grid-template-columns:1fr}}' +
    '#pf .fs{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}#pf label.f{display:grid;gap:4px;font-size:12px;color:var(--muted)}#pf textarea{min-height:70px}' +
    '#pf .li{display:grid;grid-template-columns:12px 64px minmax(0,1fr) auto;gap:10px;align-items:center;padding:7px 0;border-top:1px solid var(--line)}#pf .li:first-child{border-top:0}#pf .code{font-family:ui-monospace,Menlo,monospace;font-size:12px;color:var(--brand)}' +
    '#pf .dot{width:9px;height:9px;border-radius:50%;background:#98a2b3;display:inline-block}#pf .dot.ok{background:#12b76a}#pf .dot.bad{background:#f04438}#pf .pl{color:var(--muted);font-size:12px}' +
    '#pf .tl{display:flex;align-items:flex-end;gap:2px;height:60px}#pf .tl i{flex:1;background:var(--brand);opacity:.75;border-radius:2px 2px 0 0;min-height:2px}#pf .md{white-space:pre-wrap;font:12px/1.6 ui-monospace,Menlo,monospace;max-height:340px;overflow:auto;background:var(--card2);padding:12px;border-radius:6px;direction:ltr;text-align:left}' +
    '#pf .adm{border:1px solid var(--brand100);background:linear-gradient(var(--brand50),transparent 60%)}#pf .adm h2 small{font-weight:400;color:var(--muted);font-size:12px}#pf .lg li{padding:4px 0;border-top:1px solid var(--line);list-style:none}#pf .lg{margin:0;padding:0}#pf .lg b{font-family:ui-monospace,Menlo,monospace;font-weight:500;font-size:11.5px;margin-inline-end:6px}</style>';

  function page(p) {
    var label = p.n + ' — ' + p.fa;
    $('#pg').innerHTML = css + head((B.mark ? B.mark(p.slug, 30) + ' ' : '') + esc(label), 'تب مدیریتی پلتفرم: اطلاعات خودکار، اتصال‌ها و تنظیمات پیشرفته') + '<div id="pf"><div class="card">در حال خواندن…</div></div>';
    return Promise.all([
      j('shared/releases.json').catch(function () { return { platforms: {}, features: [], ecosystem: { version: '' } } }),
      api('GET', '/modules').catch(function () { return { modules: [] } }),
      api('GET', '/admin/tenants').catch(function () { return { tenants: [] } }),
      DOCS[p.slug] ? j(DOCS[p.slug]).catch(function () { return '' }) : Promise.resolve(''),
      p.slug === 'project-control' ? j('msp-bi/platform.json').catch(function () { return null }) : Promise.resolve(null)
    ]).then(function (r) { draw(p, r[0], (r[1].modules || []).filter(function (m) { return m.slug === p.slug })[0], r[2].tenants || [], r[3], r[4]) });
  }

  function draw(p, R, mod, tenants, md, pj) {
    var rel = (R.platforms || {})[p.slug] || null, feats = (R.features || []).filter(function (f) { return f.platform === p.slug });
    var subsHave = tenants.filter(function (t) { return t.sub && (t.sub.modules || []).indexOf(p.slug) >= 0 });
    var V = vis(p.slug), days = []; for (var i = 29; i >= 0; i--) { var d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10); days.push(V[d] || 0) }
    var v30 = days.reduce(function (a, b) { return a + b }, 0), mx = Math.max.apply(0, days.concat(1));
    var path = (rel && rel.path) || (p.href ? p.href.replace(/^.*?\/VERTEX\//, '') : '');
    var stM = mod ? (ST[mod.status] || ['—', '']) : ['ثبت نشده', 'bad'];
    var h = '<div class="k"><div class="card"><small>نسخه‌ی پلتفرم</small><b class="mono">' + esc(rel ? rel.version : '—') + '</b><small>اکوسیستم ' + esc(R.ecosystem.version) + '</small></div>' +
      '<div class="card"><small>وضعیت</small><b><span class="chip ' + stM[1] + '" style="font-size:13px">' + stM[0] + '</span></b><small id="pfReach">' + (path ? 'در حال بررسی' : 'هنوز آدرسی ندارد') + '</small></div>' +
      '<div class="card"><small>قابلیت‌ها</small><b>' + feats.length + '</b><small id="pfConn">—</small></div>' +
      '<div class="card"><small>اشتراک‌ها</small><b>' + subsHave.length + '</b><small>کل: ' + tenants.length + '</small></div>' +
      '<div class="card"><small>بازدید ۳۰ روز (این مرورگر)</small><b>' + v30 + '</b></div></div>';

    /* advanced settings */
    var se = (mod && mod.settings) || {}, no = se.notice || {};
    h += '<div class="card adm"><h2>تنظیمات پیشرفته <small>· فقط مدیر اکوسیستم</small></h2>' + (mod ? '<form id="pfSet" style="display:grid;gap:12px"><div class="fs">' +
      '<label class="f">وضعیت<select name="status">' + ['live', 'beta', 'planned', 'retired'].map(function (k) { return '<option value="' + k + '"' + (mod.status === k ? ' selected' : '') + '>' + ST[k][0] + '</option>' }).join('') + '</select></label>' +
      '<label class="f">نشانی<input name="path" class="ltr" value="' + esc(mod.path || '') + '"></label>' +
      '<label class="f">سایت دسترسی<input name="site" class="ltr" value="' + esc(mod.site || '') + '"></label></div>' +
      '<div class="fs" style="grid-template-columns:minmax(0,3fr) minmax(120px,1fr)"><label class="f">اطلاعیه برای کاربران این پلتفرم (خالی = بدون اطلاعیه)<input name="notice" value="' + esc(no.text || '') + '" placeholder="مثلاً: امشب ساعت ۲۲ به‌روزرسانی داریم."></label>' +
      '<label class="f">نوع اطلاعیه<select name="kind"><option value="info">اطلاع</option><option value="warn"' + (no.kind === 'warn' ? ' selected' : '') + '>هشدار</option></select></label></div>' +
      (p.slug === 'project-control' ? '<fieldset class="f" style="border:1px solid var(--line);border-radius:10px;padding:8px 12px"><legend>تب‌های داشبورد</legend>' + [['proj','پروژه‌ها','Projects',false],['plugin','پلاگین','Plugin',true]].map(function (t) { var on = se.tabs && t[0] in se.tabs ? se.tabs[t[0]] : t[3]; return '<label style="display:inline-flex;gap:6px;align-items:center;margin-inline-end:18px"><input type="checkbox" name="tab_' + t[0] + '"' + (on ? ' checked' : '') + '> ' + t[1] + '</label>' }).join('') + '<br><span class="pl">تب خاموش از نوار داشبورد برداشته می‌شود؛ محتوای آن پاک نمی‌شود و با روشن کردن دوباره برمی‌گردد.</span></fieldset>' : '') +
      '<label class="f">یادداشت خصوصی مدیر<textarea name="notes">' + esc(se.notes || '') + '</textarea></label>' +
      '<div class="row" style="gap:8px;align-items:center"><button class="btn p">ذخیره‌ی تنظیمات</button><span class="pl">اطلاعیه بالای همه‌ی صفحه‌های این پلتفرم نشان داده می‌شود.</span></div></form>' : '<p class="pl">این پلتفرم هنوز در ماژول‌های هاب ثبت نشده است.</p>') + '<div id="pfX"></div></div>';

    h += '<div class="two"><div>';
    /* features */
    h += '<div class="card"><h2>قابلیت‌ها</h2>' + (feats.length ? feats.map(function (f) { var s = ST[f.status] || ST.planned; return '<div class="li" data-code="' + esc(f.code) + '"><span class="dot"></span><span class="code">' + esc(f.code) + '</span><span>' + esc(f.name) + '<br><span class="pl">' + esc(f.desc) + '</span></span><span class="chip ' + s[1] + '">' + s[0] + '</span></div>' }).join('') : '<p class="pl">موردی نیست.</p>') + '</div>';
    /* subscriptions */
    h += '<div class="card"><h2>اشتراک‌هایی که این پلتفرم را دارند</h2>' + (subsHave.length ? '<div class="tw"><table class="tbl"><thead><tr><th>کد</th><th>شرکت</th><th>کاربران</th><th>وضعیت</th></tr></thead><tbody>' + subsHave.map(function (t) { return '<tr data-t="' + t.id + '" tabindex="0" style="cursor:pointer"><td class="mono">' + esc(t.code) + '</td><td>' + esc(t.name) + '</td><td>' + (t.users != null ? t.users : '—') + (t.sub && t.sub.seats ? ' / ' + t.sub.seats : '') + '</td><td>' + (t.active ? '<span class="chip ok">فعال</span>' : '<span class="chip warn">غیرفعال یا منقضی</span>') + '</td></tr>' }).join('') + '</tbody></table></div>' : '<p class="pl">موردی نیست.</p>') + '</div>';
    h += '</div><div>';
    /* changelog */
    var log = ((rel && rel.changelog) || []).slice(0, 12);
    h += '<div class="card"><h2>تاریخچه‌ی نسخه‌ها</h2><ul class="lg">' + (log.map(function (c) { return '<li><b>' + esc(c.v) + '</b> ' + esc(c.date || '') + ' · ' + esc(c.title || '') + (c.items && c.items.length ? '<br><span class="pl">' + c.items.map(esc).join(' · ') + '</span>' : '') + '</li>' }).join('') || '<li class="pl">موردی نیست.</li>') + '</ul></div>';
    h += '<div class="card"><h2>بازدید ۳۰ روز اخیر</h2><div class="tl">' + days.map(function (x) { return '<i style="height:' + Math.round(x / mx * 100) + '%" title="' + x + '"></i>' }).join('') + '</div></div>';
    h += '</div></div>';
    if (md) h += '<details class="card"><summary style="cursor:pointer"><b>نحوه‌ی ساخت، قوانین و نیازها (برای AI)</b> <span class="pl">' + esc(DOCS[p.slug]) + '</span></summary><div class="md" style="margin-top:10px">' + esc(md) + '</div></details>';
    $('#pf').innerHTML = h;

    /* save settings */
    var f = $('#pfSet'); if (f) f.onsubmit = function (e) {
      e.preventDefault(); var b = f.querySelector('button.p'); b.disabled = true;
      api('POST', '/admin/modules', { slug: mod.slug, name_fa: mod.name_fa, name_en: mod.name_en, status: f.status.value, path: f.path.value.trim(), site: f.site.value.trim(), color: mod.color, icon: mod.icon, ord: mod.ord, summary_en: mod.summary_en,
        settings: { notice: f.notice.value.trim() ? { text: f.notice.value.trim(), kind: f.kind.value } : null, notes: f.notes.value, ai: se.ai !== false, tabs: p.slug === 'project-control' ? { proj: !!(f.tab_proj && f.tab_proj.checked), plugin: !!(f.tab_plugin && f.tab_plugin.checked) } : (se.tabs || null) } })
        .then(function () { toast('ذخیره شد.'); page(p) }, function (x) { toast(P.emsg(x)); b.disabled = false });
    };
    /* open a subscription */
    [].forEach.call(document.querySelectorAll('#pf tr[data-t]'), function (tr) { tr.onclick = function () { location.hash = 'tenants'; setTimeout(function () { var r = document.querySelector('tr[data-t="' + tr.dataset.t + '"]'); r && r.click() }, 700) } });
    /* connection checks */
    if (path) ok(path).then(function (y) { var e = $('#pfReach'); if (e) e.innerHTML = '<span class="dot ' + (y ? 'ok' : 'bad') + '"></span> ' + (y ? 'در دسترس' : 'پاسخ نمی‌دهد') });
    var all = 0, good = 0; Promise.all(feats.map(function (fe) {
      return Promise.all((fe.check || []).map(ok)).then(function (rs) { var row = document.querySelector('#pf .li[data-code="' + fe.code + '"] .dot'); if (!rs.length) return; all++; var y = rs.every(Boolean); if (y) good++; if (row) row.className = 'dot ' + (y ? 'ok' : 'bad') });
    })).then(function () { var e = $('#pfConn'); if (e) e.textContent = all ? good + ' / ' + all + ' اتصال سالم' : 'چیزی برای بررسی نیست (هنوز ساخته نشده).' });
    /* platform-specific controls */
    var X = $('#pfX'); if (!X) return;
    if (p.slug === 'project-control') {
      X.innerHTML = '<h3 style="margin:16px 0 8px;font-size:13.5px">دسترسی به داشبورد</h3>' + (subsHave.length ? subsHave.map(function (t) { return '<div class="row" style="justify-content:space-between;padding:6px 0;border-top:1px solid var(--line)"><span>' + esc(t.name) + ' <span class="mono pl">' + esc(t.code) + '</span></span><button class="btn" type="button" data-msp="' + t.id + '">باز کردن این بخش</button></div>' }).join('') : '<p class="pl">موردی نیست.</p>') +
        '<h3 style="margin:16px 0 8px;font-size:13.5px">سلامت داده‌ها (مخزن)</h3><div id="pfData" class="pl">…</div>';
      [].forEach.call(X.querySelectorAll('[data-msp]'), function (b) { b.onclick = function () { location.hash = 'tenants'; setTimeout(function () { var r = document.querySelector('tr[data-t="' + b.dataset.msp + '"]'); r && r.click() }, 700) } });
      var F = [['index.json', 'فهرست برنامه‌های زمان‌بندی'], ['pinfo.json', 'اطلاعات پروژه‌ها'], ['delays.json', 'تأخیرات (فرم‌ها)'], ['dim.json', 'ابعاد/پیکربندی']];
      Promise.all(F.map(function (x) { return ok('msp-bi/data/store/' + x[0]) })).then(function (rs) { var e = $('#pfData'); if (e) e.innerHTML = F.map(function (x, i) { return '<div><span class="dot ' + (rs[i] ? 'ok' : 'bad') + '"></span> ' + x[1] + ' <span class="mono">' + x[0] + '</span></div>' }).join('') });
    } else if (p.slug === 'executive-desk') {
      X.innerHTML = '<h3 style="margin:16px 0 8px;font-size:13.5px">پیوند صفحه</h3><div class="row" style="gap:8px;flex-wrap:wrap"><a class="btn" href="' + ROOT + 'aide/" target="_blank" rel="noopener">میز منشی</a><a class="btn" href="https://danialmor.github.io/aide/" target="_blank" rel="noopener">Aide (GitHub)</a><a class="btn" href="' + ROOT + 'aide/#/ceo-view" target="_blank" rel="noopener">نمای مدیرعامل از پروژه‌ها</a></div>' +
        '<p class="pl" style="margin-top:8px">صفحه‌ی مدیرعامل به استقرار worker به‌روز در Cloudflare نیاز دارد (AD-002).</p>';
    } else if (p.slug === 'users-panel') {
      X.innerHTML = '<h3 style="margin:16px 0 8px;font-size:13.5px">نسخه‌ی طراحی</h3><p class="pl">' + esc((window.VX_UI || {}).current || '') + ' · <a href="#monitor">مرکز کنترل</a></p><div class="row" style="gap:8px"><span class="pl">زبان پنل</span><button class="btn" type="button" data-lang="en">English</button><button class="btn" type="button" data-lang="fa">فارسی</button></div>';
      [].forEach.call(X.querySelectorAll('[data-lang]'), function (b) { b.onclick = function () { try { localStorage.setItem('vxLang', b.dataset.lang) } catch (e) { } location.reload() } });
    }
  }

  /* register one tab per platform (after «سایت کلی»), replacing the old single eco-pc tab */
  var N = P.NAV_ADMIN, ix = N.map(function (x) { return x[0] }).indexOf('eco-pc'); if (ix >= 0) N.splice(ix, 1);
  var at = N.map(function (x) { return x[0] }).indexOf('ecosite'); at = at < 0 ? 1 : at + 1;
  plats().forEach(function (p, i) { var key = 'pf-' + p.slug; N.splice(at + i, 0, [key, p.n + ' — ' + p.fa]); P.A[key] = function () { return page(p) } });
  window.VX_PLATFORM_TABS = plats().map(function (p) { return 'pf-' + p.slug });
})();
