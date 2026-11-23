/* VERTEX · IV — مرکز کنترل (Monitoring center), ecosystem admin only. Feature VX-006.
   Source of truth: ../shared/releases.json  (ecosystem version, per-platform versions + changelog, coded feature registry).
   Rule (AGENTS.md): every new feature gets a code in releases.json; this tab lists it, expands it (Cloudflare-style row),
   and checks its connections each time it opens (every file in "check" must answer; "links" must point to known platforms). */
(function () {
  'use strict';
  var P = window.TSP; if (!P) return;
  var $ = P.$, esc = P.esc, head = P.head, B = window.BRAND || {};
  var ROOT = '../';
  var ST = { live: ['فعال', 'ok'], partial: ['نیمه‌کاره', 'warn'], planned: ['برنامه‌ریزی', ''], off: ['خاموش', 'bad'] };
  var css = '<style>#mon{font-size:13px}#mon h2{font-size:15px;margin:0 0 10px}#mon .k{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:14px}' +
    '#mon .k .card{padding:14px 16px}#mon .k b{display:block;font-size:22px;font-weight:600;line-height:1.3}#mon .k small{color:var(--muted);font-size:12px}' +
    '#mon .card{padding:16px;margin-bottom:14px}#mon .tb{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px}#mon .tb input,#mon .tb select{font:inherit;font-size:12.5px;padding:7px 10px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:inherit}' +
    '#mon .tb input{flex:1 1 200px;min-width:160px;width:auto!important;margin:0}#mon .tb select{width:auto!important;flex:0 0 auto;margin:0}#mon .tb .btn{margin:0}#mon .rows{border:1px solid var(--line);border-radius:12px;overflow:hidden}' +
    '#mon .r{display:grid;grid-template-columns:18px 70px minmax(0,1fr) 150px 76px 70px 22px;gap:10px;align-items:center;padding:10px 12px;border-top:1px solid var(--line);cursor:pointer;background:var(--card)}#mon .r:first-child{border-top:0}' +
    '#mon .r:hover{background:var(--card2)}#mon .r.hd{cursor:default;background:var(--card2);color:var(--muted);font-size:11.5px;font-weight:500;padding:8px 12px}' +
    '#mon .code{font-family:ui-monospace,Menlo,monospace;font-size:12px;color:var(--brand)}#mon .nm{font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#mon .pl{color:var(--muted);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '#mon .dot{width:9px;height:9px;border-radius:50%;background:#98a2b3;display:inline-block}#mon .dot.ok{background:#12b76a}#mon .dot.bad{background:#f04438}#mon .dot.warn{background:#f79009}' +
    '#mon .car{transition:transform .2s;color:var(--muted)}#mon .r[aria-expanded=true] .car{transform:rotate(90deg)}#mon .x{display:none;padding:12px 16px 14px 44px;border-top:1px dashed var(--line);background:var(--card2);font-size:12.5px;line-height:1.8}' +
    '#mon .r[aria-expanded=true]+.x{display:block}#mon .x dl{display:grid;grid-template-columns:110px 1fr;gap:4px 12px;margin:0}#mon .x dt{color:var(--muted)}#mon .x dd{margin:0}#mon .x code{font-size:11.5px;background:var(--card);border:1px solid var(--line);border-radius:6px;padding:1px 6px;margin:0 2px 2px 0;display:inline-block}' +
    '#mon .pv{display:grid;grid-template-columns:28px minmax(0,1fr) 70px 90px 22px;gap:10px;align-items:center}#mon .pv .ver{font-family:ui-monospace,Menlo,monospace;font-size:12px}' +
    '#mon .log{margin:6px 0 0;padding:0;list-style:none}#mon .log li{padding:4px 0;border-top:1px solid var(--line)}#mon .log li:first-child{border-top:0}#mon .log b{font-family:ui-monospace,Menlo,monospace;font-weight:500;font-size:11.5px;margin-inline-end:6px}' +
    '@media (max-width:760px){#mon .r{grid-template-columns:14px 58px minmax(0,1fr) 64px 18px}#mon .r>.c-pl,#mon .r>.c-v{display:none}#mon .x{padding-inline-start:16px}#mon .x dl{grid-template-columns:90px 1fr}}</style>';
  var pname = function (slug) { if (slug === 'ecosystem') return 'اکوسیستم'; var p = B.platform && B.platform(slug); return p ? p.n + ' — ' + p.fa : slug };
  var fetchOk = function (path) { return fetch(ROOT + path + (path.indexOf('?') < 0 ? '?' : '&') + 'c=' + Date.now(), { method: 'GET', cache: 'no-store' }).then(function (r) { return r.ok }, function () { return false }) };

  function page() {
    $('#pg').innerHTML = css + head('مرکز کنترل', 'نسخه‌ها، قابلیت‌ها و اتصال‌های کل اکوسیستم') + '<div id="mon"><div class="card">در حال خواندن…</div></div>';
    fetch(ROOT + 'shared/releases.json?c=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json() }).then(draw, function () { $('#mon').innerHTML = '<div class="card">فایل shared/releases.json خوانده نشد.</div>' });
  }
  function draw(R) {
    var F = R.features || [], PL = R.platforms || {}, health = {}, known = Object.keys(PL).concat(['ecosystem']);
    var cnt = function (s) { return F.filter(function (f) { return f.status === s }).length };
    var h = '<div class="k"><div class="card"><small>نسخه‌ی اکوسیستم</small><b class="ver">' + esc(R.ecosystem.version) + '</b></div>' +
      '<div class="card"><small>پلتفرم‌ها</small><b>' + Object.keys(PL).length + '</b></div>' +
      '<div class="card"><small>قابلیت‌ها</small><b>' + F.length + '</b><small>' + cnt('live') + ' فعال · ' + cnt('partial') + ' نیمه · ' + cnt('planned') + ' برنامه</small></div>' +
      '<div class="card"><small>اتصال‌ها</small><b id="mH">…</b><small id="mHs">در حال بررسی</small></div></div>';
    /* platforms */
    h += '<div class="card"><h2>پلتفرم‌ها و نسخه‌ها</h2><div class="rows">' + Object.keys(PL).map(function (s) {
      var p = PL[s], last = (p.changelog || [])[0] || {};
      return '<div class="r pv" tabindex="0" role="button" aria-expanded="false"><span>' + (B.mark ? B.mark(s, 24) : '') + '</span><span class="nm">' + esc(pname(s)) + '<br><span class="pl">' + esc(last.title || '') + '</span></span><span class="ver">' + esc(p.version) + '</span><span id="pp-' + s + '"><span class="dot"></span></span><span class="car">›</span></div>' +
        '<div class="x"><dl><dt>مسیر</dt><dd>' + (p.path ? '<a href="' + ROOT + p.path + '" target="_blank" rel="noopener"><code>' + esc(p.path) + '</code></a>' : '—') + '</dd><dt>قابلیت‌ها</dt><dd>' + (F.filter(function (f) { return f.platform === s }).map(function (f) { return '<code>' + esc(f.code) + '</code>' }).join('') || '—') + '</dd></dl>' +
        '<ul class="log">' + (p.changelog || []).map(function (c) { return '<li><b>' + esc(c.v) + '</b> ' + esc(c.date || '') + ' · ' + esc(c.title) + (c.items && c.items.length ? '<br><span class="pl">' + c.items.map(esc).join(' · ') + '</span>' : '') + '</li>' }).join('') + '</ul></div>';
    }).join('') + '</div></div>';
    /* features */
    var opts = '<option value="">همه‌ی پلتفرم‌ها</option>' + known.map(function (s) { return '<option value="' + s + '">' + esc(pname(s)) + '</option>' }).join('');
    h += '<div class="card"><h2>قابلیت‌ها</h2><div class="tb"><input id="mQ" type="search" placeholder="جست‌وجوی کد یا نام…"><select id="mP">' + opts + '</select><select id="mS"><option value="">همه‌ی وضعیت‌ها</option>' + Object.keys(ST).map(function (k) { return '<option value="' + k + '">' + ST[k][0] + '</option>' }).join('') + '</select><button class="btn" type="button" id="mRe">بررسی دوباره</button></div>' +
      '<div class="rows" id="mF"></div></div>';
    /* ecosystem changelog */
    h += '<div class="card"><h2>تغییرات اکوسیستم</h2><ul class="log">' + (R.ecosystem.changelog || []).map(function (c) { return '<li><b>' + esc(c.v) + '</b> ' + esc(c.date) + ' · ' + esc(c.title) + '<br><span class="pl">' + (c.items || []).map(esc).join(' · ') + '</span></li>' }).join('') + '</ul></div>';
    $('#mon').innerHTML = h;

    function rows() {
      var q = ($('#mQ').value || '').trim().toLowerCase(), pf = $('#mP').value, sf = $('#mS').value;
      var list = F.filter(function (f) { return (!pf || f.platform === pf) && (!sf || f.status === sf) && (!q || (f.code + ' ' + f.name + ' ' + f.desc).toLowerCase().indexOf(q) >= 0) });
      $('#mF').innerHTML = '<div class="r hd"><span></span><span>کد</span><span>قابلیت</span><span class="c-pl">پلتفرم</span><span>وضعیت</span><span class="c-v">از نسخه</span><span></span></div>' + (list.length ? list.map(function (f) {
        var st = ST[f.status] || ST.planned, hl = health[f.code], dc = hl == null ? '' : hl.ok ? 'ok' : 'bad';
        return '<div class="r" tabindex="0" role="button" aria-expanded="false" data-c="' + esc(f.code) + '"><span class="dot ' + dc + '" title="' + (hl == null ? 'بدون بررسی' : hl.ok ? 'اتصال‌ها سالم' : 'اتصال ناقص') + '"></span><span class="code">' + esc(f.code) + '</span><span class="nm">' + esc(f.name) + '</span><span class="pl c-pl">' + esc(pname(f.platform)) + '</span><span><span class="chip ' + st[1] + '">' + st[0] + '</span></span><span class="pl c-v">' + esc(f.since || '—') + '</span><span class="car">›</span></div>' +
          '<div class="x"><dl><dt>توضیح</dt><dd>' + esc(f.desc) + '</dd><dt>فایل‌ها</dt><dd>' + ((f.files || []).map(function (x) { return '<code>' + esc(x) + '</code>' }).join('') || '—') + '</dd>' +
          '<dt>اتصال به</dt><dd>' + ((f.links || []).map(function (l) { return '<span class="chip' + (known.indexOf(l) < 0 ? ' bad' : '') + '">' + esc(pname(l)) + '</span> ' }).join('') || '—') + '</dd>' +
          '<dt>بررسی اتصال</dt><dd>' + (hl ? hl.items.map(function (i) { return '<span class="dot ' + (i[1] ? 'ok' : 'bad') + '"></span> <code>' + esc(i[0]) + '</code> ' }).join('') + (hl.bad.length ? '<br><span style="color:var(--bad)">پیوند ناشناخته: ' + hl.bad.map(esc).join('، ') + '</span>' : '') : (f.check && f.check.length ? 'در حال بررسی…' : 'چیزی برای بررسی نیست (هنوز ساخته نشده).')) + '</dd></dl></div>';
      }).join('') : '<div class="r hd" style="justify-content:center">موردی نیست.</div>');
    }
    $('#mon').onclick = function (e) { var r = e.target.closest('.r[role=button]'); if (!r || e.target.closest('a')) return; r.setAttribute('aria-expanded', r.getAttribute('aria-expanded') === 'true' ? 'false' : 'true') };
    $('#mon').onkeydown = function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.r[role=button]')) { e.preventDefault(); e.target.click() } };
    ['mQ', 'mP', 'mS'].forEach(function (id) { $('#' + id).oninput = rows });
    function check() {
      health = {}; rows(); var paths = {}, todo = [];
      F.forEach(function (f) { (f.check || []).forEach(function (c) { paths[c] = 1 }) });
      Object.keys(PL).forEach(function (s) { if (PL[s].path) paths[PL[s].path] = 1 });
      var res = {}; Object.keys(paths).forEach(function (p) { todo.push(fetchOk(p).then(function (ok) { res[p] = ok })) });
      Promise.all(todo).then(function () {
        var good = 0, all = 0;
        F.forEach(function (f) { var items = (f.check || []).map(function (c) { return [c, res[c]] }), bad = (f.links || []).filter(function (l) { return known.indexOf(l) < 0 }); if (!items.length && !bad.length) return; var ok = items.every(function (i) { return i[1] }) && !bad.length; health[f.code] = { ok: ok, items: items, bad: bad }; all++; if (ok) good++ });
        Object.keys(PL).forEach(function (s) { var el = $('#pp-' + s); if (!el) return; var p = PL[s].path; el.innerHTML = p ? '<span class="dot ' + (res[p] ? 'ok' : 'bad') + '"></span> <span class="pl">' + (res[p] ? 'در دسترس' : 'پاسخ نمی‌دهد') + '</span>' : '<span class="dot"></span> <span class="pl">هنوز آدرسی ندارد</span>' });
        $('#mH').textContent = good + ' / ' + all; $('#mHs').textContent = good === all ? 'همه سالم' : (all - good) + ' قابلیت اتصال ناقص دارد'; $('#mH').style.color = good === all ? 'var(--ok)' : 'var(--bad)';
        rows();
      });
    }
    $('#mRe').onclick = check; check();
  }
  P.NAV_ADMIN.splice(1, 0, ['monitor', 'مرکز کنترل']); P.A.monitor = page;
})();
