/* VERTEX sign-in (static hosting / GitHub Pages).
   One account for the whole ecosystem. Users live in the repo: shared/users.json
   {v,users:[{u,role:'admin'|'user',sites:[slug…],salt,h}]} — PBKDF2-SHA256 hashes, never plain passwords.
   Flow: any platform page → no session → admin/ (sign in) → root page (only the platforms the user may open).
   The repo is public: this controls the app UI and keys, it does not hide repo files. */
(function () {
  var OWN = 'danialmor', REP = 'VERTEX', SK = 'vxSess', DAYS = 30;
  var SH = new URL('./', document.currentScript.src).href;          // …/shared/
  var ROOT = new URL('../', SH).href;                                 // …/VERTEX/
  var STATIC = /github\.io$/i.test(location.hostname);
  function u8b(u) { var s = ''; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }
  function bu8(b) { var s = atob(b), u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
  async function pbk(pw, salt, n) { var k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']); return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt, iterations: n, hash: 'SHA-256' }, k, 256)); }
  async function hashPw(pw) { var salt = crypto.getRandomValues(new Uint8Array(16)); return { salt: u8b(salt), h: u8b(await pbk(pw, salt, 150000)) }; }
  async function checkPw(rec, pw) { return u8b(await pbk(pw, bu8(rec.salt), 150000)) === rec.h; }
  async function vEnc(obj, pw) { var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)); var km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']); var k = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: 250000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['encrypt']); var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, k, new TextEncoder().encode(JSON.stringify(obj))); return { v: 1, alg: 'PBKDF2-SHA256-250k/AES-256-GCM', salt: u8b(salt), iv: u8b(iv), ct: u8b(new Uint8Array(ct)), t: Date.now() }; }
  function b64u(s) { return btoa(unescape(encodeURIComponent(s))); }
  async function ghPut(tok, path, obj) {
    var H = { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json' }, sha;
    var r = await fetch('https://api.github.com/repos/' + OWN + '/' + REP + '/contents/' + path + '?ref=main', { headers: H, cache: 'no-store' });
    if (r.ok) sha = (await r.json()).sha; else if (r.status !== 404) throw new Error('GitHub ' + r.status);
    var w = await fetch('https://api.github.com/repos/' + OWN + '/' + REP + '/contents/' + path, { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, H), body: JSON.stringify({ message: 'auth: ' + path, content: b64u(JSON.stringify(obj, null, 1)), sha: sha, branch: 'main' }) });
    if (!w.ok) throw new Error('GitHub ' + w.status);
  }
  async function getUsers() {
    try { var r = await fetch('https://api.github.com/repos/' + OWN + '/' + REP + '/contents/shared/users.json?ref=main&t=' + Date.now(), { headers: { Accept: 'application/vnd.github.raw+json' }, cache: 'no-store' }); if (r.ok) return await r.json(); if (r.status === 404) return null; } catch (e) {}
    try { var r2 = await fetch(BASE + 'users.json?t=' + Date.now(), { cache: 'no-store' }); if (r2.ok) return await r2.json(); if (r2.status === 404) return null; } catch (e) {}
    return undefined;
  }

  async function getUsers() {
    try { var r = await fetch('https://api.github.com/repos/' + OWN + '/' + REP + '/contents/shared/users.json?ref=main&t=' + Date.now(), { headers: { Accept: 'application/vnd.github.raw+json' }, cache: 'no-store' }); if (r.ok) return await r.json(); if (r.status === 404) return null; } catch (e) {}
    try { var r2 = await fetch(SH + 'users.json?t=' + Date.now(), { cache: 'no-store' }); if (r2.ok) return await r2.json(); if (r2.status === 404) return null; } catch (e) {}
    return undefined;
  }
  function session() { var s = null; try { s = JSON.parse(localStorage.getItem(SK) || sessionStorage.getItem(SK) || 'null'); } catch (e) {} return s && s.u && Date.now() - s.t < DAYS * 864e5 ? s : null; }
  function allowed(slug, s) { s = s || session(); if (!s) return false; if (s.role === 'admin') return true; if (slug === 'project-control' && s.msp) return true; return !slug || (s.sites || []).indexOf(slug) >= 0; }
  function save(s, remember) { try { localStorage.removeItem(SK); sessionStorage.removeItem(SK); (remember ? localStorage : sessionStorage).setItem(SK, JSON.stringify(s)); } catch (e) {} }
  async function login(u, p, remember) {
    u = String(u || '').trim().toLowerCase();
    var U = await getUsers(); if (U === undefined) throw new Error('اتصال به سرور برقرار نشد');
    var rec = U && (U.users || []).find(function (x) { return x.u === u; });
    if (!rec || !(await checkPw(rec, p))) throw new Error('نام کاربری یا رمز درست نیست');
    var s = { u: u, role: rec.role || 'user', sites: rec.sites || [], name: rec.name || '', t: Date.now() };
    save(s, remember);
    if (s.role === 'admin') { try { sessionStorage.setItem('vxPw', p); } catch (e) {} }
    return s;
  }
  async function setup(u, p, tok) {
    u = String(u || '').trim().toLowerCase();
    if (!u) throw new Error('نام کاربری لازم است'); if (p.length < 6) throw new Error('رمز حداقل ۶ نویسه');
    var r = await fetch('https://api.github.com/repos/' + OWN + '/' + REP, { headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json' }, cache: 'no-store' });
    var j = await r.json().catch(function () { return {}; }); if (!r.ok || !(j.permissions && j.permissions.push)) throw new Error('کلید GitHub اجازه‌ی نوشتن در مخزن را ندارد');
    var rec = await hashPw(p);
    await ghPut(tok, 'shared/users.json', { v: 1, users: [{ u: u, role: 'admin', sites: [], salt: rec.salt, h: rec.h, t: Date.now() }] });
    await ghPut(tok, 'shared/vault.json', await vEnc({ gh: tok }, p));
    try { localStorage.setItem('ghTok', tok); } catch (e) {}
    var s = { u: u, role: 'admin', sites: [], t: Date.now() }; save(s, true); try { sessionStorage.setItem('vxPw', p); } catch (e) {}
    return s;
  }
  function logout() { try { localStorage.removeItem(SK); sessionStorage.removeItem(SK); sessionStorage.removeItem('vxPw'); localStorage.removeItem('hub.token'); } catch (e) {} location.href = ROOT + 'admin/'; }
  // Guard a platform page: no session → sign-in page; not allowed → root page.
  function require(slug) {
    if (!STATIC) return;
    var s = session();
    if (!s) { document.documentElement.style.visibility = 'hidden'; location.replace(ROOT + 'admin/?next=' + encodeURIComponent(location.href)); return; }
    if (!allowed(slug, s)) { document.documentElement.style.visibility = 'hidden'; location.replace(ROOT + '?denied=' + encodeURIComponent(slug)); return; }
    window.VX_USER = s;
  }
  window.VX_AUTH = { ROOT: ROOT, STATIC: STATIC, session: session, allowed: allowed, login: login, setup: setup, logout: logout, require: require, getUsers: getUsers, hashPw: hashPw };
  var DEMO = STATIC && /\/msp-bi\//.test(location.pathname) && /[?&]demo\b/.test(location.search);
  var s0 = DEMO ? { u: 'demo', name: 'بازدیدکننده‌ی دمو', role: 'user', sites: ['project-control'], paid: true, demo: true } : session(); if (s0) window.VX_USER = s0;
  // One theme for the whole ecosystem: whatever dark/light a user picks on any platform is kept on every platform.
  (function () {
    var KEYS = ['dsTheme', 'tsuba.theme', 'vx.fm.theme'], U = (s0 && s0.u) || '', CK = 'vx.theme' + (U ? ':' + U : ''), de = document.documentElement, busy = false;
    var LS = window.localStorage, rawSet = Storage.prototype.setItem;
    var put = function (k, v) { try { rawSet.call(LS, k, v) } catch (e) {} };
    var save = function (t) { if (t !== 'dark' && t !== 'light') return; put(CK, t); put('vx.theme', t); KEYS.forEach(function (k) { put(k, t) }); try { var d = JSON.parse(LS.getItem('dsDisp2') || 'null'); if (d && d.theme !== t) { d.theme = t; put('dsDisp2', JSON.stringify(d)) } } catch (e) {} };
    var t0 = null; try { t0 = LS.getItem(CK) || LS.getItem('vx.theme') } catch (e) {}
    if (t0) { save(t0); de.setAttribute('data-theme', t0) }
    Storage.prototype.setItem = function (k, v) { rawSet.call(this, k, v); if (this !== LS || busy) return; busy = true; try { if (KEYS.indexOf(k) >= 0) save(String(v)); else if (k === 'dsDisp2') { var d = JSON.parse(v || 'null'); if (d && d.theme) save(d.theme) } } catch (e) {} busy = false };
    try { new MutationObserver(function () { var t = de.getAttribute('data-theme'); if ((t === 'dark' || t === 'light') && t !== LS.getItem(CK)) save(t) }).observe(de, { attributes: true, attributeFilter: ['data-theme'] }) } catch (e) {}
    addEventListener('storage', function (e) { if (e.key === CK && e.newValue && de.getAttribute('data-theme') !== e.newValue) de.setAttribute('data-theme', e.newValue) });
  })();
  // company account without an active subscription: only the purchase page in the control panel
  if (STATIC && !DEMO && s0 && s0.paid === false && !/\/admin\/?/.test(location.pathname)) { document.documentElement.style.visibility = 'hidden'; location.replace(ROOT + 'admin/#buy'); }
  // VERTEX core dashboard (msp-bi) is private to the platform admin for now; company users get the app home
  if (STATIC && !DEMO && s0 && s0.role !== 'admin' && (/\/home\//.test(location.pathname) || /\/msp-bi(-next)?\//.test(location.pathname) && !s0.msp)) { document.documentElement.style.visibility = 'hidden'; location.replace(ROOT + 'app/'); }
  // Platform switcher: a small VERTEX home button on every platform page (not on the landing, panel or app home)
  if (STATIC && s0 && !/\/(admin|app|home)\/?/.test(location.pathname) && location.pathname.replace(/\/index\.html$/, '/') !== new URL(ROOT, location.href).pathname) {
    var addHome = function () { if (document.getElementById('vxHomeBtn')) return; var a = document.createElement('a'); a.id = 'vxHomeBtn'; a.href = ROOT + (DEMO ? '' : s0.role === 'admin' ? 'home/' : 'app/'); a.title = 'خانه‌ی VERTEX'; a.setAttribute('aria-label', 'خانه‌ی VERTEX و جابه‌جایی بین پلتفرم‌ها');
      a.innerHTML = '<svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true"><path d="M14 18 L32 48 L50 18" fill="none" stroke="#7fb6ff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="32" cy="48" r="5" fill="#f0a53a"/></svg>';
      a.style.cssText = 'position:fixed;left:14px;bottom:14px;z-index:2147483000;width:46px;height:46px;border-radius:50%;background:#111827;border:1px solid rgba(127,182,255,.45);box-shadow:0 6px 20px rgba(0,0,0,.45);display:grid;place-items:center';
      if (matchMedia('(max-width:760px)').matches) a.style.bottom = '86px'; if (/\/ai\//.test(location.pathname)) { a.style.bottom = 'auto'; a.style.top = '6px'; a.style.width = a.style.height = '38px' } document.body.appendChild(a) };
    if (document.body) addHome(); else document.addEventListener('DOMContentLoaded', addHome);
  }
  var need = document.currentScript.getAttribute('data-require'); if (need && !DEMO) require(need);
  try { if (!/[?&]demo\b/.test(location.search) && !/\/aide\//.test(location.pathname) && !/\/admin\/?$/.test(location.pathname)) { var vxn = document.createElement('script'); vxn.src = ROOT + 'shared/notify.js?v=1'; vxn.defer = true; (document.head || document.documentElement).appendChild(vxn) } } catch (e) { }
})();
