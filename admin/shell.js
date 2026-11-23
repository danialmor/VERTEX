/* VERTEX · IV — TailAdmin shell (theme 4.0). Loaded LAST. It only rearranges the chrome; every page and feature stays in index.html + extensions.
   - groups the sidebar menu (منو / اکوسیستم / ابزارها / حساب) and adds icons the other files don't provide
   - moves search + bell (#xtools from extras.js) into the header, theme toggle into the header
   - header title follows the current page; user menu replaces the sidebar footer (.me stays in DOM for compatibility)
   - sidebar: collapse to icons on desktop (remembered), off-canvas on tablet/phone */
(function () {
  'use strict';
  var P = window.TSP; if (!P) return;
  var $ = P.$, $$ = P.$$, esc = P.esc, app = $('#app'), r = document.documentElement;
  var IC = {
    monitor: 'M3 12h4l3-8 4 16 3-8h4',
    ecopolicy: 'M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z M9 12l2 2 4-4',
    aiset: 'M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z',
    github: 'M9 19c-4 1.5-4-2-6-2.5M15 21v-3.5a3 3 0 0 0-.9-2.4c3-.3 6-1.5 6-6.6a5 5 0 0 0-1.4-3.6 4.7 4.7 0 0 0-.1-3.6s-1.1-.3-3.6 1.4a12.4 12.4 0 0 0-6.5 0C6 1.3 4.9 1.6 4.9 1.6a4.7 4.7 0 0 0-.1 3.6A5 5 0 0 0 3.4 8.8c0 5.1 3 6.3 6 6.6a3 3 0 0 0-.9 2.4V21',
    ecosite: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3c2.5 3 2.5 15 0 18 M12 3c-2.5 3-2.5 15 0 18',
    'eco-pc': 'M4 4h16L12 20z',
    filemap: 'M3 7h6l2 2h10v10H3z',
    sim: 'M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2 M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'
  };
  var GROUP = [['overview', 'منو'], ['ecopolicy', 'اکوسیستم'], ['pf-project-control', 'پلتفرم‌ها'], ['sitemap', 'ابزارها'], ['tenants', 'مشتریان و کاربران'], ['users', 'کاربران و دسترسی'], ['system', 'سیستم و حساب'], ['activity', 'سیستم و حساب'], ['profile', 'حساب من']];
  var SUB = { aiset: 'اکوسیستم', github: 'اکوسیستم', ecopolicy: 'اکوسیستم', ecosite: 'اکوسیستم', 'eco-pc': 'پلتفرم I', sitemap: 'ابزارها', filemap: 'ابزارها', sim: 'ابزارها · هوش مصنوعی' };
  function decorate() {
    var nav = $('#nav'); if (!nav) return;
    $$('#nav button[data-go]').forEach(function (b) {
      if (!b.querySelector('svg') && /^pf-/.test(b.dataset.go) && window.BRAND && BRAND.mark) { b.insertAdjacentHTML('afterbegin', BRAND.mark(b.dataset.go.slice(3), 18)); var sv = b.querySelector('svg'); if (sv) sv.style.stroke = 'none' }
      if (!b.querySelector('svg') && IC[b.dataset.go]) b.insertAdjacentHTML('afterbegin', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + IC[b.dataset.go] + '"/></svg>');
      if (!b.querySelector('.lb')) { var t = [].filter.call(b.childNodes, function (n) { return n.nodeType === 3 && n.textContent.trim() }); t.forEach(function (n) { var s = document.createElement('span'); s.className = 'lb'; s.textContent = n.textContent; n.replaceWith(s) }) }
      b.title = (b.querySelector('.lb') || b).textContent.trim();
    });
    $$('#nav .grp').forEach(function (g) { g.remove() });
    var used = {};
    GROUP.forEach(function (g) { if (used[g[1]]) return; var b = $('#nav button[data-go="' + g[0] + '"]'); if (!b) return; used[g[1]] = 1; var h = document.createElement('p'); h.className = 'grp'; h.textContent = g[1]; b.parentNode.insertBefore(h, b) });
    var x = $('#xtools'); if (x && x.parentNode !== $('#hdTools')) $('#hdTools').appendChild(x);
    var S = P.S; if (S && S.user) { var n = S.user.name || ''; $('#umAv').textContent = n.trim().slice(0, 1) || '؟'; $('#umN').textContent = n; $('#umN2').textContent = n; $('#umC').textContent = S.ucode || S.user.code || '' }
    var sec = $('#umD [data-um=security]'); if (sec) sec.hidden = !$('#nav button[data-go=security]');
    title();
  }
  function title() {
    var b = $('#nav button[data-go][aria-current=page]'); if (!b) return;
    $('#hdTitle').textContent = (b.querySelector('.lb') || b).textContent.trim();
    $('#hdSub').textContent = SUB[b.dataset.go] || (P.isAdmin && P.isAdmin() ? 'مدیریت اکوسیستم' : (P.S && P.S.tenant ? P.S.tenant.name : 'کنترل پنل'));
    document.title = $('#hdTitle').textContent + ' · کنترل پنل';
  }
  var prev = P.onNav; P.onNav = function () { if (prev) prev.apply(this, arguments); decorate() };
  new MutationObserver(title).observe($('#nav'), { subtree: true, attributes: true, attributeFilter: ['aria-current'] });
  if (P.S && $('#nav .brand')) decorate();
  /* sidebar toggle */
  try { if (localStorage.getItem('vtx.sbMini') === '1') app.classList.add('mini') } catch (e) {}
  $('#sbT').onclick = function () {
    if (matchMedia('(max-width:1023px)').matches) app.classList.toggle('open');
    else { app.classList.toggle('mini'); try { localStorage.setItem('vtx.sbMini', app.classList.contains('mini') ? '1' : '0') } catch (e) {} }
  };
  $('#scrim').onclick = function () { app.classList.remove('open') };
  $('#nav').addEventListener('click', function (e) { if (e.target.closest('[data-go]')) app.classList.remove('open') });
  /* theme */
  var setIc = function () { $('#hdTheme').innerHTML = r.dataset.theme === 'dark' ? '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>' };
  setIc();
  $('#hdTheme').onclick = function () { r.dataset.theme = r.dataset.theme === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('tsuba.theme', r.dataset.theme) } catch (e) {} setIc() };
  /* user menu */
  var dd = $('#umD'), ub = $('#umB');
  ub.onclick = function (e) { e.stopPropagation(); dd.hidden = !dd.hidden; ub.setAttribute('aria-expanded', String(!dd.hidden)) };
  document.addEventListener('click', function (e) { if (!dd.hidden && !e.target.closest('.um')) { dd.hidden = true; ub.setAttribute('aria-expanded', 'false') } });
  dd.onclick = function (e) { var b = e.target.closest('[data-um]'); if (!b) return; dd.hidden = true; var k = b.dataset.um; if (k === 'home') { location.href = (window.BRAND && BRAND.base) || '../' } else if (k === 'pw') { P.openDlg('<form class="dl" style="display:grid;gap:10px"><h2>تغییر رمز</h2><label class="f">رمز فعلی<input name="old" type="password" class="ltr" autocomplete="current-password" required></label><label class="f">رمز تازه (دست‌کم ۸ نویسه)<input name="new" type="password" class="ltr" autocomplete="new-password" minlength="8" required></label><label class="f">تکرار رمز تازه<input name="rep" type="password" class="ltr" autocomplete="new-password" required></label><div class="err" role="alert"></div><div class="row"><button class="btn p">ذخیره‌ی رمز</button><button class="btn" type="button" data-close>انصراف</button></div></form>', function (f) { f.old.focus(); f.onsubmit = function (e) { e.preventDefault(); var er = f.querySelector('.err'); if (f.new.value !== f.rep.value) { er.textContent = 'رمز تازه و تکرار آن یکی نیستند.'; return } P.api('POST', '/auth/change-pin', { old: f.old.value, new: f.new.value }).then(function (r) { P.T = r.token; try { localStorage.setItem('hub.token', r.token) } catch (x) { } P.closeDlg(); P.toast(r.cloud === false ? 'رمز فقط روی این دستگاه عوض شد؛ ذخیره‌ی آنلاین انجام نشد — دوباره امتحان کنید.' : 'رمز عوض شد و روی همه‌ی دستگاه‌ها ذخیره شد.') }).catch(function (x) { er.textContent = P.emsg(x) }) } }) } else if (k === 'out') { var lo = $('#lo'); if (lo) lo.click(); else P.logout() } else P.go(k) };
})();
