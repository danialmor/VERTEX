/* Control panel — «پرسش‌های دستیار»: every question asked to the AI assistant on any page (cloud doc ai-log).
   Questions the assistant could not answer precisely (it starts its reply with [?]) or that a user rated 👎 come here first.
   The admin writes the correct answer → saved to the cloud doc ai-kb, which the assistant reads with every question. */
(function () {
  'use strict';
  var P = window.TSP; if (!P) return;
  var $ = P.$, esc = P.esc, head = P.head, toast = P.toast;
  var fa = function (x) { var n = +x; return isNaN(n) ? String(x) : n.toLocaleString('fa-IR') };
  var dt = function (t) { try { return new Date(t).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' }) } catch (e) { return '' } };
  var ST = { f: 'open', q: '' };
  function cloud() { if (window.VX_CLOUD) return Promise.resolve(window.VX_CLOUD); return new Promise(function (res) { var sc = document.createElement('script'); sc.src = '../shared/cloud.js?v=' + Date.now(); sc.onload = function () { res(window.VX_CLOUD || null) }; sc.onerror = function () { res(null) }; document.head.appendChild(sc) }) }
  async function save(name, mut) { var CL = await cloud(); for (var k = 0; k < 4; k++) { var j = (await CL.getDoc(name)) || { items: [] }; j.items = j.items || []; mut(j.items); try { await CL.putDoc(name, { t: Date.now(), items: j.items }, j.t || 0); return } catch (e) { if (!e.conflict) throw e } } throw new Error('conflict') }
  function page() {
    return cloud().then(function (CL) { if (!CL || !CL.on) throw new Error('فضای آنلاین در دسترس نیست'); return Promise.all([CL.getDoc('ai-log'), CL.getDoc('ai-kb')]) }).then(function (R) {
      var L = ((R[0] && R[0].items) || []).slice().reverse(), KB = (R[1] && R[1].items) || [];
      var open = L.filter(function (x) { return x.na && !x.r }), q = ST.q.trim();
      var V = (ST.f === 'open' ? open : ST.f === 'kb' ? [] : L).filter(function (x) { return !q || (x.q + ' ' + x.a + ' ' + x.u).indexOf(q) >= 0 });
      var h = head('پرسش‌های دستیار', 'همه‌ی پرسش‌هایی که در صفحه‌های اکوسیستم از دستیار هوش مصنوعی شده است. پرسش‌هایی که دستیار پاسخ دقیق نداشته یا کاربر به پاسخ 👎 داده، این‌جا برای شما می‌آید؛ پاسخ درست را بنویسید تا دستیار از این به بعد از آن استفاده کند.');
      h += '<div class="mb" style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(170px,1fr))"><div class="card"><small style="color:var(--muted)">همه‌ی پرسش‌ها</small><div style="font-size:22px;font-weight:800">' + fa(L.length) + '</div></div><div class="card" style="' + (open.length ? 'border:1px solid rgba(240,165,58,.6)' : '') + '"><small style="color:var(--muted)">بی‌پاسخ / نیازمند بررسی</small><div style="font-size:22px;font-weight:800;color:' + (open.length ? '#c98a12' : 'inherit') + '">' + fa(open.length) + '</div></div><div class="card"><small style="color:var(--muted)">پاسخ‌های ثبت‌شده‌ی مدیر</small><div style="font-size:22px;font-weight:800">' + fa(KB.length) + '</div></div></div>';
      h += '<div class="card mb" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' + [['open', 'نیازمند بررسی'], ['all', 'همه‌ی پرسش‌ها'], ['kb', 'پاسخ‌های من']].map(function (x) { return '<button type="button" class="btn s' + (ST.f === x[0] ? ' p' : '') + '" data-aqf="' + x[0] + '">' + x[1] + '</button>' }).join('') + '<input id="aqS" placeholder="جست‌وجو" value="' + esc(ST.q) + '" style="flex:1;min-width:160px;padding:8px 12px;border-radius:12px;border:1px solid var(--line);background:transparent;color:inherit;font:inherit"></div>';
      if (ST.f === 'kb') h += '<div class="card">' + (KB.length ? KB.slice().reverse().map(function (k) { return '<div style="border-bottom:1px solid var(--line);padding:10px 0;display:grid;gap:4px"><b>' + esc(k.q) + '</b><div style="white-space:pre-wrap">' + esc(k.a) + '</div><small style="color:var(--muted)">' + dt(k.t) + ' · <button type="button" class="btn s" data-kbdel="' + esc(k.id) + '">حذف</button></small></div>' }).join('') : '<p style="color:var(--muted);margin:0">هنوز پاسخی ثبت نکرده‌اید.</p>') + '</div>';
      else h += '<div class="card">' + (V.length ? V.slice(0, 200).map(function (x) {
        var tag = x.r ? '<span class="chip ok">پاسخ داده شد</span>' : x.na === 2 ? '<span class="chip bad">👎 کاربر</span>' : x.na ? '<span class="chip warn">دستیار پاسخ دقیق نداشت</span>' : '';
        return '<div style="border-bottom:1px solid var(--line);padding:12px 0;display:grid;gap:6px"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><b style="font-size:14px">' + esc(x.q) + '</b>' + tag + '</div><small style="color:var(--muted)">' + esc(x.u || 'ناشناس') + ' · ' + esc(x.page || '') + ' · ' + dt(x.t) + '</small><details><summary style="cursor:pointer;color:var(--muted);font-size:12px">پاسخ دستیار</summary><div style="white-space:pre-wrap;font-size:13px;margin-top:4px">' + esc(x.a || '—') + '</div></details>' +
          (x.na && !x.r ? '<textarea data-aqa="' + esc(x.id) + '" rows="2" placeholder="پاسخ درست را بنویسید…" style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:10px;border:1px solid var(--line);background:transparent;color:inherit;font:inherit"></textarea><div class="row"><button type="button" class="btn s p" data-aqok="' + esc(x.id) + '">ثبت پاسخ و آموزش به دستیار</button><button type="button" class="btn s" data-aqx="' + esc(x.id) + '">بدون پاسخ کنار بگذار</button></div>' : (x.r && x.ans ? '<div style="font-size:13px"><b>پاسخ شما:</b> ' + esc(x.ans) + '</div>' : ''))
          + '</div>'
      }).join('') : '<p style="color:var(--muted);margin:0">' + (ST.f === 'open' ? 'پرسش بی‌پاسخی نیست. 🎉' : 'پرسشی ثبت نشده است.') + '</p>') + '</div>';
      $('#pg').innerHTML = h;
      [].forEach.call(document.querySelectorAll('[data-aqf]'), function (b) { b.onclick = function () { ST.f = b.dataset.aqf; page() } });
      var s = $('#aqS'); s.oninput = function () { ST.q = s.value; clearTimeout(s.t); s.t = setTimeout(function () { page().then(function () { var z = $('#aqS'); z.focus(); z.setSelectionRange(z.value.length, z.value.length) }) }, 300) };
      [].forEach.call(document.querySelectorAll('[data-aqok]'), function (b) { b.onclick = function () { var id = b.dataset.aqok, ta = document.querySelector('[data-aqa="' + id + '"]'), a = (ta.value || '').trim(); if (!a) { toast('پاسخ را بنویسید'); return } var it = L.filter(function (x) { return x.id === id })[0]; b.disabled = true;
        save('ai-kb', function (K) { K.push({ id: id, q: it.q, a: a, t: Date.now() }) }).then(function () { return save('ai-log', function (X) { X.forEach(function (x) { if (x.id === id) { x.r = 1; x.ans = a } }) }) }).then(function () { toast('✓ پاسخ ثبت شد؛ دستیار از این به بعد از آن استفاده می‌کند'); page() }).catch(function (e) { toast('ثبت نشد: ' + (e.message || e)); b.disabled = false }) } });
      [].forEach.call(document.querySelectorAll('[data-aqx]'), function (b) { b.onclick = function () { var id = b.dataset.aqx; save('ai-log', function (X) { X.forEach(function (x) { if (x.id === id) x.r = 1 }) }).then(page) } });
      [].forEach.call(document.querySelectorAll('[data-kbdel]'), function (b) { b.onclick = function () { if (!confirm('این پاسخ از دانش دستیار حذف شود؟')) return; var id = b.dataset.kbdel; save('ai-kb', function (K) { for (var i = K.length - 1; i >= 0; i--) if (K[i].id === id) K.splice(i, 1) }).then(page) } });
    }).catch(function (e) { $('#pg').innerHTML = head('پرسش‌های دستیار', '') + '<div class="card">' + esc(e.message || e) + '</div>' });
  }
  P.A.aiq = page;
  var at = 1; P.NAV_ADMIN.forEach(function (x, i) { if (x[0] === 'aiset') at = i + 1 }); P.NAV_ADMIN.splice(at, 0, ['aiq', 'پرسش‌های دستیار']);
})();
