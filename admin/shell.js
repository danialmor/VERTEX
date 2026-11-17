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
    ecopolicy: 'M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z M9 12l2 2 4-4',
    ecosite: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3c2.5 3 2.5 15 0 18 M12 3c-2.5 3-2.5 15 0 18',
    'eco-pc': 'M4 4h16L12 20z',
    filemap: 'M3 7h6l2 2h10v10H3z'
  };
  var GROUP = [['overview', 'منو'], ['ecopolicy', 'اکوسیستم'], ['sitemap', 'ابزارها'], ['tenants', 'مشتریان و کاربران'], ['users', 'کاربران و دسترسی'], ['system', 'سیستم و حساب'], ['activity', 'سیستم و حساب'], ['profile', 'حساب من']];
  var SUB = { ecopolicy: 'اکوسیستم', ecosite: 'اکوسیستم', 'eco-pc': 'پلتفرم I', sitemap: 'ابزارها', filemap: 'ابزارها' };
  function decorate() {
    var nav = $('#nav'); if (!nav) return;
    $$('#nav button[data-go]').forEach(function (b) {
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
  dd.onclick = function (e) { var b = e.target.closest('[data-um]'); if (!b) return; dd.hidden = true; var k = b.dataset.um; if (k === 'home') { location.href = (window.BRAND && BRAND.base) || '../' } else if (k === 'out') { var lo = $('#lo'); if (lo) lo.click(); else P.logout() } else P.go(k) };
})();
