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
  function allowed(slug, s) { s = s || session(); if (!s) return false; if (s.role === 'admin') return true; return !slug || (s.sites || []).indexOf(slug) >= 0; }
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
  var s0 = session(); if (s0) window.VX_USER = s0;
  var need = document.currentScript.getAttribute('data-require'); if (need) require(need);
})();
