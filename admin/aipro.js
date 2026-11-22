/* Control panel — «هوش مصنوعی» (advanced): extra API providers with fallback order, usage signal per provider and per platform,
   and a pop-up of questions the assistant could not answer (or answered vaguely) so the admin can answer them.
   Data: cloud docs ai-config.providers [{id,name,base,k(enc),model,on,pri}], ai-usage {d:{YYYY-MM-DD:{pid:{ok,err,ms,pg}}}}, ai-log, ai-kb. */
(function () {
  'use strict';
  var P = window.TSP; if (!P || !P.A || !P.A.aiset) return;
  var $ = P.$, esc = P.esc, toast = P.toast;
  var enc = function (k) { return btoa(k.split('').reverse().join('')) };
  var fa = function (n) { return Number(n || 0).toLocaleString('fa-IR') };
  var PRE = [['openai', 'OpenAI', 'https://api.openai.com/v1', 'gpt-4o-mini'], ['openrouter', 'OpenRouter', 'https://openrouter.ai/api/v1', 'openai/gpt-4o-mini'], ['groq', 'Groq', 'https://api.groq.com/openai/v1', 'llama-3.3-70b-versatile'], ['deepseek', 'DeepSeek', 'https://api.deepseek.com/v1', 'deepseek-chat'], ['gemini', 'Google Gemini', 'https://generativelanguage.googleapis.com/v1beta/openai', 'gemini-2.0-flash'], ['coarena2', 'Coarena (کلید دوم)', 'https://coarena.ai/api/v1', 'gemini-3-8-flash'], ['custom', 'سفارشی (سازگار با OpenAI)', 'https://', '']];
  var COL = ['#2f78c4', '#f0a53a', '#3fb37f', '#8e5cf7', '#e5534b', '#00a99d', '#c0587e'];
  var PLN = { 'msp-bi': 'کنترل پروژه', admin: 'کنترل پنل', mail: 'نامه‌نگاری', files: 'فایل منیجر', trading: 'تریدینگ', aide: 'میز منشی', app: 'خانه‌ی مشترک', home: 'خانه', ai: 'پلتفرم هوش مصنوعی' };
  var VAGUE = /در داده(‌|\s)?ها نیامده|اطلاعاتی (در این مورد )?ندارم|نمی‌دانم|مشخص نیست|داده‌ای (موجود )?نیست|not (in|available in) the data|i don't know/i;
  var inp = 'padding:9px 11px;border-radius:10px;border:1px solid var(--line);background:transparent;color:inherit;font:inherit;width:100%;box-sizing:border-box';
  function CL() { return window.VX_CLOUD && VX_CLOUD.on ? VX_CLOUD : null }
  async function upd(name, mut, init) { var C = CL(); if (!C) throw new Error('فضای آنلاین در دسترس نیست'); for (var k = 0; k < 4; k++) { var j = (await C.getDoc(name)) || init(); mut(j); try { await C.putDoc(name, Object.assign(j, { t: Date.now() }), j.t0 || 0); return j } catch (e) { if (!e.conflict) throw e } } }
  var base = P.A.aiset;
  P.A.aiset = function () {
    return Promise.resolve(base.apply(this, arguments)).then(function () {
      var C = CL(); if (!C) return;
      return Promise.all([C.getDoc('ai-config'), C.getDoc('ai-usage'), C.getDoc('ai-log')]).then(function (R) { draw(R[0] || {}, (R[1] || {}).d || {}, (R[2] || {}).items || []) });
    });
  };
  function open(L) { return L.filter(function (x) { return !x.r && (x.na > 0 || x.g === -1 || VAGUE.test(x.a || '')) }) }
  function draw(cfg, U, LOG) {
    var pg = $('#pg'); if (!pg) return; var prov = (cfg.providers || []).slice().sort(function (a, b) { return (a.pri || 0) - (b.pri || 0) });
    var OPEN = open(LOG);
    // header button: unanswered pop-up
    var hb = document.createElement('button'); hb.className = 'btn' + (OPEN.length ? ' pri' : ''); hb.type = 'button'; hb.id = 'aiOpenQ'; hb.textContent = 'پرسش‌های بی‌پاسخ (' + fa(OPEN.length) + ')';
    var sv = $('#aiSave'); if (sv && sv.parentNode) sv.parentNode.insertBefore(hb, sv);
    hb.onclick = function () { qPop(LOG) };
    // 1) providers
    var days = []; for (var i = 13; i >= 0; i--) days.push(new Date(Date.now() - i * 864e5).toISOString().slice(0, 10));
    var ids = {}; Object.keys(U).forEach(function (d) { Object.keys(U[d]).forEach(function (p) { ids[p] = 1 }) }); ids.coarena = 1; prov.forEach(function (p) { ids[p.id] = 1 });
    var PID = Object.keys(ids), nm = function (id) { var p = prov.filter(function (x) { return x.id === id })[0]; return id === 'coarena' ? 'Coarena (اصلی)' : p ? p.name : id };
    var tot = function (id, k) { return days.reduce(function (s, d) { return s + (((U[d] || {})[id] || {})[k] || 0) }, 0) };
    var h = '<div class="card mb" style="display:grid;gap:12px"><div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;align-items:center"><h2 style="margin:0;font-size:16px">سرویس‌های هوش مصنوعی (API)</h2><small style="color:var(--muted)">به ترتیب اولویت امتحان می‌شوند؛ اگر یکی جواب ندهد، بعدی پاسخ می‌دهد. همه‌ی پلتفرم‌ها از همین فهرست استفاده می‌کنند.</small></div>'
      + '<div class="tw"><table class="tbl"><thead><tr><th>اولویت</th><th>سرویس</th><th>آدرس</th><th>مدل</th><th>کلید</th><th>۱۴ روز</th><th></th></tr></thead><tbody>'
      + '<tr><td>۰</td><td><b>Coarena (اصلی)</b></td><td dir="ltr">coarena.ai/api/v1</td><td dir="ltr">' + esc(cfg.model || '') + '</td><td>' + (cfg.k ? '✓' : '—') + '</td><td>' + fa(tot('coarena', 'ok')) + ' ✓ · ' + fa(tot('coarena', 'err')) + ' ✗</td><td><small style="color:var(--muted)">از تنظیمات بالا</small></td></tr>'
      + prov.map(function (p, i) { return '<tr' + (p.on === false ? ' style="opacity:.5"' : '') + '><td>' + fa(i + 1) + '</td><td><b>' + esc(p.name) + '</b></td><td dir="ltr" style="max-width:220px;overflow:hidden;text-overflow:ellipsis">' + esc(p.base) + '</td><td dir="ltr">' + esc(p.model) + '</td><td>' + (p.k ? '✓' : '—') + '</td><td>' + fa(tot(p.id, 'ok')) + ' ✓ · ' + fa(tot(p.id, 'err')) + ' ✗</td><td style="white-space:nowrap"><button class="btn s" type="button" data-pu="' + i + '" aria-label="بالاتر">▲</button> <button class="btn s" type="button" data-pt="' + i + '">آزمایش</button> <button class="btn s" type="button" data-po="' + i + '">' + (p.on === false ? 'روشن' : 'خاموش') + '</button> <button class="btn s d" type="button" data-pd="' + i + '">حذف</button></td></tr>' }).join('')
      + '</tbody></table></div><div id="pOut" style="font-size:13px;white-space:pre-wrap"></div>'
      + '<form id="pAdd" style="display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));align-items:end;border-top:1px solid var(--line);padding-top:12px">'
      + '<label style="display:grid;gap:4px"><b style="font-size:13px">سرویس</b><select name="pre" style="' + inp + '">' + PRE.map(function (x, i) { return '<option value="' + i + '">' + esc(x[1]) + '</option>' }).join('') + '</select></label>'
      + '<label style="display:grid;gap:4px"><b style="font-size:13px">آدرس API</b><input name="base" dir="ltr" style="' + inp + '" value="' + PRE[0][2] + '"></label>'
      + '<label style="display:grid;gap:4px"><b style="font-size:13px">مدل</b><input name="model" dir="ltr" style="' + inp + '" value="' + PRE[0][3] + '"></label>'
      + '<label style="display:grid;gap:4px"><b style="font-size:13px">کلید API</b><input name="key" type="password" dir="ltr" autocomplete="off" style="' + inp + '"></label>'
      + '<button class="btn pri">افزودن سرویس</button></form></div>';
    // 2) usage signal chart
    var W = 640, H = 170, mx = 1; days.forEach(function (d) { var s = 0; PID.forEach(function (p) { var a = (U[d] || {})[p] || {}; s += (a.ok || 0) + (a.err || 0) }); mx = Math.max(mx, s) });
    var bw = (W - 40) / days.length, svg = '<svg viewBox="0 0 ' + W + ' ' + (H + 26) + '" width="100%" role="img" aria-label="نمودار استفاده‌ی سرویس‌ها">';
    [0, .5, 1].forEach(function (f) { var y = 8 + (1 - f) * H; svg += '<line x1="36" x2="' + W + '" y1="' + y + '" y2="' + y + '" stroke="currentColor" stroke-opacity=".12"/><text x="30" y="' + (y + 4) + '" font-size="10" text-anchor="end" fill="currentColor" opacity=".6">' + fa(Math.round(mx * f)) + '</text>' });
    days.forEach(function (d, i) { var y = 8 + H, x = 40 + i * bw + 3; PID.forEach(function (p, k) { var a = (U[d] || {})[p] || {}; var ok = (a.ok || 0) / mx * H, er = (a.err || 0) / mx * H; if (ok) { y -= ok; svg += '<rect x="' + x + '" y="' + y + '" width="' + (bw - 6) + '" height="' + ok + '" rx="2" fill="' + COL[k % COL.length] + '"><title>' + esc(nm(p)) + ' · ' + d + ' · موفق ' + a.ok + '</title></rect>' } if (er) { y -= er; svg += '<rect x="' + x + '" y="' + y + '" width="' + (bw - 6) + '" height="' + er + '" rx="2" fill="#e5534b" opacity=".85"><title>' + esc(nm(p)) + ' · ' + d + ' · خطا ' + a.err + '</title></rect>' } }); if (i % 2 === 0) svg += '<text x="' + (x + bw / 2 - 3) + '" y="' + (H + 22) + '" font-size="9.5" text-anchor="middle" fill="currentColor" opacity=".6">' + d.slice(5) + '</text>' });
    svg += '</svg>';
    var pl = {}; days.forEach(function (d) { PID.forEach(function (p) { var g = (((U[d] || {})[p] || {}).pg) || {}; Object.keys(g).forEach(function (k) { pl[k] = (pl[k] || 0) + g[k] }) }) });
    var plMx = Math.max.apply(null, [1].concat(Object.keys(pl).map(function (k) { return pl[k] })));
    h += '<div class="grid g2 mb"><div class="card" style="display:grid;gap:10px"><h2 style="margin:0;font-size:16px">سیگنال استفاده — ۱۴ روز اخیر</h2>' + svg
      + '<div style="display:flex;flex-wrap:wrap;gap:12px;font-size:12px">' + PID.map(function (p, k) { var ok = tot(p, 'ok'), er = tot(p, 'err'), ms = tot(p, 'ms'), n = ok + er; return '<span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:' + COL[k % COL.length] + ';margin-inline-end:5px"></i>' + esc(nm(p)) + ' · ' + fa(n) + ' درخواست · ' + (n ? fa(Math.round(ok / n * 100)) + '٪ موفق' : '—') + (ok && ms ? ' · ' + fa(Math.round(ms / ok / 100) / 10) + ' ث' : '') + '</span>' }).join('') + '<span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#e5534b;margin-inline-end:5px"></i>خطا</span></div></div>'
      + '<div class="card" style="display:grid;gap:10px;align-content:start"><h2 style="margin:0;font-size:16px">اتصال پلتفرم‌ها</h2><small style="color:var(--muted)">هر پلتفرم که دستیار را صدا زده، با تعداد درخواست‌ها در ۱۴ روز.</small>'
      + Object.keys(PLN).map(function (k) { var n = pl[k] || 0; return '<div style="display:grid;grid-template-columns:120px 1fr 60px;gap:8px;align-items:center;font-size:13px"><span>' + PLN[k] + '</span><span style="height:8px;background:var(--line);border-radius:4px;overflow:hidden"><span style="display:block;height:100%;width:' + (n / plMx * 100) + '%;background:' + (n ? '#3fb37f' : 'transparent') + '"></span></span><span style="text-align:end;color:' + (n ? 'inherit' : 'var(--muted)') + '">' + (n ? fa(n) : 'بدون استفاده') + '</span></div>' }).join('') + '</div></div>';
    var box = document.createElement('div'); box.innerHTML = h; pg.appendChild(box);
    // provider actions
    var f = $('#pAdd'); f.pre.onchange = function () { var x = PRE[+f.pre.value]; f.base.value = x[2]; f.model.value = x[3] };
    var saveProv = function (L, msg) { return upd('ai-config', function (j) { j.providers = L; j.t0 = j.t }, function () { return {} }).then(function () { toast(msg); P.A.aiset() }).catch(function (e) { toast('ذخیره نشد: ' + (e.message || e)) }) };
    f.onsubmit = function (e) { e.preventDefault(); var x = PRE[+f.pre.value], b = f.base.value.trim().replace(/\/+$/, ''), m = f.model.value.trim(), k = f.key.value.trim(); if (!/^https:\/\//.test(b) || !m || !k) { toast('آدرس https، مدل و کلید لازم است.'); return }
      var L = prov.concat([{ id: x[0] + '-' + Date.now().toString(36).slice(-4), name: x[1], base: b, model: m, k: enc(k), on: true, pri: prov.length + 1 }]); saveProv(L, '✓ سرویس اضافه شد؛ همه‌ی پلتفرم‌ها از آن استفاده می‌کنند.') };
    var re = function (L) { return L.map(function (p, i) { return Object.assign({}, p, { pri: i + 1 }) }) };
    [].forEach.call(pg.querySelectorAll('[data-pu]'), function (b) { b.onclick = function () { var i = +b.dataset.pu; if (!i) return; var L = prov.slice(); var t = L[i - 1]; L[i - 1] = L[i]; L[i] = t; saveProv(re(L), '✓ ترتیب ذخیره شد.') } });
    [].forEach.call(pg.querySelectorAll('[data-po]'), function (b) { b.onclick = function () { var L = prov.slice(), i = +b.dataset.po; L[i] = Object.assign({}, L[i], { on: L[i].on === false }); saveProv(L, '✓ ذخیره شد.') } });
    [].forEach.call(pg.querySelectorAll('[data-pd]'), function (b) { b.onclick = function () { if (!confirm('این سرویس حذف شود؟')) return; var L = prov.slice(); L.splice(+b.dataset.pd, 1); saveProv(re(L), '✓ حذف شد.') } });
    [].forEach.call(pg.querySelectorAll('[data-pt]'), function (b) { b.onclick = async function () { var p = prov[+b.dataset.pt], o = $('#pOut'), k = atob(p.k || '').split('').reverse().join(''), t0 = performance.now(); o.textContent = p.name + ' …';
      try { var r = await fetch(p.base + '/chat/completions', { method: 'POST', headers: { Authorization: 'Bearer ' + k, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: p.model, max_tokens: 40, messages: [{ role: 'user', content: 'فقط بنویس: آماده‌ام' }] }) }); var j = await r.json(); if (!r.ok) throw new Error((j.error && (j.error.message || j.error)) || ('HTTP ' + r.status)); o.textContent = '✓ ' + p.name + ' (' + Math.round(performance.now() - t0) + 'ms): ' + (((j.choices || [{}])[0].message || {}).content || '') }
      catch (e) { o.textContent = '✗ ' + p.name + ': ' + (e.message || e) } } });
  }
  function qPop(LOG) {
    var L = open(LOG).slice().reverse();
    var tag = function (x) { return x.na === 2 ? 'کاربر گزارش داد' : x.g === -1 ? 'نارضایتی 👎' : x.na ? 'بی‌پاسخ' : 'پاسخ مبهم' };
    P.openDlg('<form style="max-width:760px;width:min(92vw,760px)"><h2>پرسش‌های بی‌پاسخ و مبهم (' + fa(L.length) + ')</h2><p style="margin:0;color:var(--muted)">پاسخ درست را بنویسید؛ در دانش دستیار ذخیره می‌شود و از این به بعد همه‌ی پلتفرم‌ها همین را جواب می‌دهند.</p>'
      + '<div style="display:grid;gap:10px;max-height:62vh;overflow:auto;margin:12px 0">' + (L.length ? L.map(function (x) { return '<div class="card" style="display:grid;gap:6px" data-qi="' + esc(x.id) + '"><div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between"><b>' + esc(x.q) + '</b><span class="chip" style="font-size:11px">' + tag(x) + '</span></div><small style="color:var(--muted)">' + esc(x.u || 'مهمان') + ' · ' + esc(x.page || '') + ' · ' + new Date(x.t).toLocaleString('fa-IR') + '</small>' + (x.a ? '<details><summary style="cursor:pointer;font-size:12px">پاسخ دستیار</summary><div style="font-size:12.5px;white-space:pre-wrap;color:var(--muted)">' + esc(x.a) + '</div></details>' : '') + '<textarea rows="2" placeholder="پاسخ دقیق…" style="' + inp + '"></textarea><div class="row"><button class="btn pri s" type="button" data-qa>ثبت پاسخ</button><button class="btn s" type="button" data-qx>بستن موضوع</button></div></div>' }).join('') : '<p>همه‌ی پرسش‌ها پاسخ گرفته‌اند. ✓</p>') + '</div><div class="row"><button class="btn" type="button" data-close>بستن</button></div></form>',
      function (fm) {
        var done = function (el, id, ans) { var job = ans ? upd('ai-kb', function (j) { j.items = (j.items || []).concat([{ id: id, q: (LOG.filter(function (x) { return x.id === id })[0] || {}).q, a: ans, t: Date.now() }]); j.t0 = j.t }, function () { return { items: [] } }) : Promise.resolve();
          return job.then(function () { return upd('ai-log', function (j) { (j.items || []).forEach(function (x) { if (x.id === id) { x.r = 1; if (ans) x.ans = ans } }); j.t0 = j.t }, function () { return { items: [] } }) }).then(function () { LOG.forEach(function (x) { if (x.id === id) x.r = 1 }); el.remove(); var hb = $('#aiOpenQ'); if (hb) hb.textContent = 'پرسش‌های بی‌پاسخ (' + fa(open(LOG).length) + ')'; toast(ans ? '✓ پاسخ در دانش دستیار ذخیره شد.' : '✓ موضوع بسته شد.') }).catch(function (e) { toast('ذخیره نشد: ' + (e.message || e)) }) };
        [].forEach.call(fm.querySelectorAll('[data-qi]'), function (el) { var id = el.dataset.qi; el.querySelector('[data-qa]').onclick = function () { var a = el.querySelector('textarea').value.trim(); if (!a) { toast('پاسخ را بنویسید.'); return } done(el, id, a) }; el.querySelector('[data-qx]').onclick = function () { done(el, id, '') } });
      });
  }
})();
