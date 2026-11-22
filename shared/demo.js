/* حالت نمایشی برای گیت‌هاب (GitHub Pages)
   گیت‌هاب فقط فایل نمایش می‌دهد و سرور (هاب) ندارد. این فایل در همان حالت، پاسخ‌های هاب را داخل مرورگر شبیه‌سازی می‌کند
   تا بتوانید وارد شوید و کنترل پنل را ببینید. داده‌ها فقط در همین مرورگر می‌مانند.
   روی سرور واقعی هیچ کاری نمی‌کند (فقط روی *.github.io یا با ?demo=1 روشن می‌شود).
   ورود: Admin / Admin123 (مدیر اکوسیستم) · owner / Admin123 (مدیر اشتراک نمونه) · T001-0002 / Admin123 (کاربر) */
(function () {
  'use strict';
  var on = /\.github\.io$/.test(location.hostname) || /[?&]demo=1/.test(location.search);
  try { if (/[?&]demo=1/.test(location.search)) sessionStorage.setItem('tsuba.demo', '1'); if (sessionStorage.getItem('tsuba.demo') === '1') on = true } catch (e) { }
  if (!on) return;
  var KEY = 'tsuba.demo.v1', PIN = 'Admin123', B = window.BRAND, now = function () { return Date.now() / 1000 };
  function seed() {
    var t = now(), mods = B.platforms.map(function (p, i) { return { slug: p.slug, name_fa: p.fa, name_en: p.en, status: p.href ? 'live' : 'planned', path: p.href ? '/' + p.href.replace(B.base, '') : '', site: p.slug === 'executive-desk' ? 'aide' : (p.href ? 'msp-bi' : ''), color: p.color, icon: p.icon, ord: i, summary_en: p.desc_en } });
    return {
      seq: 10, modules: mods,
      tenants: [{ id: 1, code: 'T001', name: 'شرکت نمونه', status: 'active', levels: ['مدیرعامل', 'مدیر پروژه', 'سرپرست کارگاه'], contact: {} }],
      subs: [{ id: 1, tenant_id: 1, plan: 'حرفه‌ای', modules: ['project-control', 'messenger', 'mail', 'file-manager'], seats: 10, max_levels: 3, starts: t, ends: t + 300 * 86400, price: '', note: 'نمونه', created: t }],
      users: [
        { id: 1, code: 'Admin', name: 'مدیر اکوسیستم', role: 'admin', tenant_id: null, grants: { 'msp-bi': 'admin', aide: 'admin' }, pin: PIN, must_change: false, active: true, profile: {} },
        { id: 2, code: 'owner', name: 'مدیر شرکت نمونه', role: 'owner', tenant_id: 1, ucode: 'T001-0001', level: 1, mods: [], home: '', pin: PIN, must_change: false, active: true, profile: {} },
        { id: 3, code: 'site1', name: 'سرپرست نمونه', role: 'member', tenant_id: 1, ucode: 'T001-0002', level: 3, parent_id: 2, mods: ['project-control', 'mail'], home: 'project-control', pin: PIN, must_change: false, active: true, profile: {} }
      ],
      signups: [{ id: 1, ts: t - 3600, name: 'نمونه‌ی درخواست', company: 'شرکت آزمایشی', phone: '0912', email: '', note: 'کنترل پروژه برای ۵ نفر', status: 'new' }],
      audit: [{ ts: t, user: 'system', action: 'demo.seed', target: 'حالت نمایشی' }]
    };
  }
  var D; try { D = JSON.parse(localStorage.getItem(KEY)) } catch (e) { } if (!D) D = seed();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(D)) } catch (e) { } }
  /* Shared storage: the whole panel database is one online document on VERTEX Cloud (Cloudflare, doc "vertex").
     Every browser loads it on start and every change is saved back — no key needed. Fallback: the old repo file data/vertex.json (read only). */
  var CL = window.VX_CLOUD, ROOT = (B && B.base) || '/VERTEX/';
  var REMOTE = { loaded: false, t: 0, busy: false, err: '', timer: 0 };
  /* Three-way merge so two devices never erase each other's changes.
     BASE = the last version both sides agreed on. Per item: changed here → keep ours; otherwise take theirs.
     Arrays of records are matched by id / slug / code; plain objects key by key; audit logs are united. */
  var BK = KEY + '.base', BASE = null; try { BASE = JSON.parse(localStorage.getItem(BK) || 'null') } catch (e) { }
  var J = function (x) { return JSON.stringify(x) }, cp = function (x) { return x == null ? x : JSON.parse(J(x)) };
  function keyOf(x) { return x && typeof x === 'object' ? (x.id != null ? 'i' + x.id : x.slug ? 's' + x.slug : x.code ? 'c' + x.code : x.ts != null ? 't' + x.ts + (x.action || '') + (x.user || '') : 'j' + J(x)) : 'j' + J(x) }
  function isRecs(a) { return Array.isArray(a) && a.every(function (x) { return x && typeof x === 'object' && !Array.isArray(x) }) }
  function m3(b, l, r, path) {
    if (J(l) === J(r)) return cp(l);
    if (J(l) === J(b)) return cp(r);          // only they changed
    if (J(r) === J(b)) return cp(l);          // only we changed
    if (path === 'audit' && Array.isArray(l) && Array.isArray(r)) { var seen = {}, o = []; l.concat(r).forEach(function (x) { var k = keyOf(x); if (!seen[k]) { seen[k] = 1; o.push(x) } }); o.sort(function (a, c) { return (c.ts || 0) - (a.ts || 0) }); return o.slice(0, 200) }
    if (isRecs(l) && isRecs(r)) {
      var B0 = {}, L0 = {}, R0 = {}, order = [];
      (Array.isArray(b) ? b : []).forEach(function (x) { B0[keyOf(x)] = x });
      l.forEach(function (x) { var k = keyOf(x); L0[k] = x; order.push(k) }); r.forEach(function (x) { var k = keyOf(x); R0[k] = x; if (order.indexOf(k) < 0) order.push(k) });
      var out = [], maxId = 0; l.concat(r).forEach(function (x) { if (typeof x.id === 'number') maxId = Math.max(maxId, x.id) });
      order.forEach(function (k) {
        var bx = B0[k], lx = L0[k], rx = R0[k];
        if (!bx) { if (lx && rx && J(lx) !== J(rx) && typeof lx.id === 'number') { out.push(cp(rx)); var n = cp(lx); n.id = ++maxId; out.push(n) } else out.push(cp(lx || rx)); return }
        if (!lx && !rx) return;
        if (!lx) { if (J(rx) !== J(bx)) out.push(cp(rx)); return }          // we deleted; keep only if they edited it meanwhile
        if (!rx) { if (J(lx) !== J(bx)) out.push(cp(lx)); return }          // they deleted
        out.push(m3(bx, lx, rx, path + '[]'));
      });
      return out;
    }
    if (l && r && typeof l === 'object' && typeof r === 'object' && !Array.isArray(l) && !Array.isArray(r)) {
      var o2 = {}, bb = (b && typeof b === 'object') ? b : {}; Object.keys(l).concat(Object.keys(r)).forEach(function (k) {
        if (k in o2) return; var inL = k in l, inR = k in r, inB = k in bb;
        if (inL && inR) o2[k] = m3(bb[k], l[k], r[k], path ? path + '.' + k : k);
        else if (inL) { if (!inB || J(l[k]) !== J(bb[k])) o2[k] = cp(l[k]) }   // new here, or they deleted but we changed it
        else if (inR) { if (!inB || J(r[k]) !== J(bb[k])) o2[k] = cp(r[k]) }
      }); return o2;
    }
    if (typeof l === 'number' && typeof r === 'number' && /seq|_t$/.test(path)) return Math.max(l, r);
    return cp(l);                                // both changed a single value: ours wins
  }
  function setBase(h) { BASE = cp(h); try { localStorage.setItem(BK, J(BASE)) } catch (e) { } }
  function adopt(j) { if (!(j && j.hub)) return false; var before = J(D); D = BASE ? m3(BASE, D, j.hub, '') : cp(j.hub); D._t = j.t; setBase(j.hub); save(); REMOTE.t = j.t; return J(D) !== before }
  async function fetchRemote() {
    var j = null;
    if (CL && CL.on) { try { j = await CL.getDoc('vertex'); REMOTE.cloud = true } catch (e) { REMOTE.err = 'cloud' } }
    else { try { var r2 = await fetch(ROOT + 'data/vertex.json?t=' + Date.now(), { cache: 'no-store' }); if (r2.ok) j = await r2.json() } catch (e) { } }
    return j;
  }
  var ready = (async function () {
    var j = await fetchRemote();
    if (j && j.hub) { if (!BASE && (j.t || 0) <= (D._t || 0)) setBase(j.hub); adopt(j); } else if (!BASE) setBase(D);   // nothing online yet: what we have is the common base
    REMOTE.loaded = !!j; paint();
  })();
  function push() {
    if (!(CL && CL.on)) { REMOTE.err = 'no-cloud'; paint(); return }
    clearTimeout(REMOTE.timer); REMOTE.timer = setTimeout(async function () {
      REMOTE.busy = true; paint();
      try {
        for (var tries = 0; tries < 5; tries++) {
          var j = await fetchRemote(); if (j && j.hub && j.t !== REMOTE.t) adopt(j);   // merge what others saved meanwhile
          var t = Date.now(); D._t = t; save();
          try { await CL.putDoc('vertex', { v: 1, t: t, hub: D }, j ? (j.t || 0) : 0); setBase(D); REMOTE.t = t; REMOTE.err = ''; break }
          catch (e) { if (!e.conflict) throw e; await new Promise(function (z) { setTimeout(z, 400 + Math.random() * 900) }) }   // someone saved at the same moment: merge again
        }
      } catch (e) { REMOTE.err = String(e.message || e) }
      REMOTE.busy = false; paint();
    }, 800);
  }
  // Keep every open page fresh: pull others' changes every 20 s and when the page comes back into view.
  async function pull() { if (REMOTE.busy || !(CL && CL.on)) return; try { var j = await fetchRemote(); if (j && j.hub && j.t !== REMOTE.t && adopt(j)) { try { window.dispatchEvent(new CustomEvent('vx-data')) } catch (e) { } } } catch (e) { } }
  setInterval(pull, 20000); document.addEventListener('visibilitychange', function () { if (!document.hidden) pull() });
  window.VX_HUB = { pull: pull, merge: m3 };
  function paint() { var d = document.getElementById('demoBar'); if (!d) return; var sp = d.querySelector('span'); if (!sp) return;
    sp.textContent = REMOTE.busy ? 'در حال ذخیره‌ی آنلاین…' : (REMOTE.err === 'no-cloud' ? 'فضای آنلاین تنظیم نشده — تغییرها فقط در این مرورگر' : REMOTE.err ? 'ذخیره‌ی آنلاین نشد: ' + REMOTE.err : '✓ داده‌ها آنلاین ذخیره می‌شود (Cloudflare)') }
  function log(u, a, t) { D.audit.unshift({ ts: now(), user: u ? u.code : '-', action: a, target: t || '' }); D.audit = D.audit.slice(0, 2000) }
  function E(st, err) { var e = { status: st, body: { error: err } }; throw e }
  var tn = function (id) { return D.tenants.filter(function (x) { return x.id === id })[0] };
  var sub = function (id) { return D.subs.filter(function (s) { return s.tenant_id === id }).sort(function (a, b) { return b.created - a.created })[0] || null };
  var active = function (t) { var s = sub(t.id); return t.status === 'active' && !!s && (!s.ends || s.ends > now()) };
  var usr = function (id) { return D.users.filter(function (u) { return u.id === id })[0] };
  var nextId = function (a) { return a.reduce(function (m, x) { return Math.max(m, x.id) }, 0) + 1 };
  function home(u) { if (u.role === 'admin' && !u.tenant_id) return B.base + 'admin/'; if (u.tenant_id) return B.base + 'app/'; var p = B.platform(u.home); return p && p.href ? p.href : B.base }
  function sess(u, tok) {
    var t = u.tenant_id ? tn(u.tenant_id) : null, s = t ? sub(t.id) : null;
    var r = { user: { id: u.id, code: u.code, name: u.name, role: u.role }, tenant: t ? { id: t.id, code: t.code, name: t.name } : null, msp: !t ? (u.role === 'admin' || !!(u.grants && u.grants['msp-bi'])) : t.msp !== false && (u.role === 'owner' ? (s ? s.modules : []) : (u.mods || [])).indexOf('project-control') >= 0, ucode: u.ucode || '', home: home(u), panel: (u.role === 'admin' && !t) || u.role === 'owner', must_change: !!u.must_change, profile: u.profile || {}, modules: t ? (u.role === 'owner' ? (s ? s.modules : []) : u.mods) : (u.role === 'admin' ? null : [].concat(u.grants && u.grants['msp-bi'] ? ['project-control', 'messenger'] : [], u.grants && u.grants.aide ? ['executive-desk'] : [])), grants: u.grants || (t ? { 'msp-bi': 'member' } : {}) };
    r.sub_active = t ? active(t) : true; r.plan = s ? s.plan : ''; r.sub_ends = s ? s.ends : 0;
    if (tok) r.token = tok; return r;
  }
  function me(h) { var m = /demo-(\d+)/.exec(h || ''); var u = m && usr(+m[1]); if (!u || !u.active) E(401, 'unauthorized'); return u }
  function tenantRow(t) { var o = D.users.filter(function (u) { return u.tenant_id === t.id && u.role === 'owner' })[0]; return { id: t.id, code: t.code, name: t.name, status: t.status, active: active(t), sub: sub(t.id), owner: o ? { name: o.name, code: o.code } : null, users: D.users.filter(function (u) { return u.tenant_id === t.id && u.active }).length, leaders: D.users.filter(function (u) { return u.tenant_id === t.id && u.active && u.leader }).length } }
  function pub(u) { return { id: u.id, leader: !!u.leader, ucode: u.ucode, name: u.name, code: u.code, role: u.role, level: u.level, mods: u.mods || [], home: u.home, parent_id: u.parent_id || null, last_login: u.last_login || 0, active: u.active } }
  function newSub(tid, b) { var t = now(); D.subs.push({ id: nextId(D.subs), tenant_id: tid, plan: b.plan || '', modules: b.modules && b.modules.length ? b.modules : ['project-control'], seats: Math.max(1, +b.seats || 1), max_levels: Math.min(10, Math.max(1, +b.max_levels || 1)), max_projects: +b.max_projects || 0, users: b.users != null ? +b.users : null, leaders: b.leaders != null ? +b.leaders : null, starts: t, ends: +b.months ? t + b.months * 30 * 86400 : 0, price: b.price || '', note: b.note || '', created: t }) }
  function codeTaken(c) { c = String(c || '').toLowerCase(); return D.users.some(function (u) { return u.code.toLowerCase() === c || (u.ucode || '').toLowerCase() === c }) }
  function nextU(t) { var n = D.users.filter(function (u) { return u.tenant_id === t.id }).length + 1; return t.code + '-' + ('000' + n).slice(-4) }

  function route(m, p, b, h) {
    var x;
    if (p === '/health') return { ok: true, version: 'demo', test_mode: false, demo: true };
    if (p === '/modules') return { modules: D.modules };
    // ── اشتراک: تعرفه‌ها (عمومی)، ساخت حساب، سفارش و تأیید پرداخت
    if (!D.plans) D.plans = [
      { id: 1, name: 'پایه', price: 3000000, months: 1, modules: ['project-control'], seats: 3, max_levels: 2, desc: 'کنترل پروژه برای یک تیم کوچک', on: true },
      { id: 2, name: 'حرفه‌ای', price: 7500000, months: 3, modules: ['project-control', 'mail', 'file-manager', 'messenger'], seats: 10, max_levels: 3, desc: 'کنترل پروژه، نامه‌نگاری و فایل', on: true, best: true },
      { id: 3, name: 'سازمانی', price: 25000000, months: 12, modules: ['project-control', 'mail', 'file-manager', 'messenger', 'executive-desk'], seats: 40, max_levels: 6, desc: 'همه‌ی بخش‌ها برای کل شرکت', on: true }];
    if (!D.pay) D.pay = { card: '', holder: '', bank: '', note: 'مبلغ را کارت‌به‌کارت کنید و کد پیگیری را وارد کنید؛ بعد از تأیید، اشتراک فعال می‌شود.' };
    if (!D.orders) D.orders = [];
    if (!D.modules.some(function (md) { return md.slug === 'scores' })) D.modules.push({ slug: 'scores', name_fa: 'امتیازها', name_en: 'Scores', status: 'live', path: '/admin/#scores', site: 'admin', color: '#f2b640', icon: 'star', ord: 99, summary_en: 'Team activity scores' });
    if (!D.scoreW) D.scoreW = { login: 1, create: 5, update: 3, file: 4, approve: 4, other: 1 };
    if (!D.seatP) D.seatP = { user: 1, mgr: 2, off: 17 };
    if (!D.fx) D.fx = { rate: 0, t: 0, src: '' };
    if (D.planV !== 3) { D.planV = 3; var MOD = ['project-control', 'mail', 'file-manager', 'messenger', 'executive-desk', 'trading', 'scores']; var keep = D.plans.filter(function (z) { return z.id > 4 }); D.plans = [{ id: 1, name: 'پایه', price: 0, months: 1, modules: ['project-control'], seats: 4, max_levels: 2, desc: '۱ ادمین، ۳ کاربر و ۱ پروژه', on: true, base: 10, inc_u: 3, inc_m: 0, inc_p: 1 }, { id: 2, name: 'پرو', price: 0, months: 1, modules: ['project-control', 'mail', 'file-manager', 'messenger'], seats: 9, max_levels: 4, desc: '۱ ادمین، ۲ لیدر، ۶ کاربر و ۳ پروژه', on: true, best: true, base: 20, inc_u: 6, inc_m: 2, inc_p: 3 }, { id: 4, name: 'پرو مکس', price: 0, months: 1, modules: MOD, seats: 9999, max_levels: 10, desc: 'کاربر، لیدر و پروژه‌ی نامحدود با همه‌ی قابلیت‌ها', on: true, flat: 100 }].concat(keep) }
    if (D.seatP.proj == null) D.seatP.proj = 10;
    var seatQ = function (b2, pl3) { pl3 = pl3 || {}; var cl = function (v, a, z) { return Math.max(a, Math.min(z, Math.round(+v || 0))) }; var us2 = cl(b2.users, +pl3.inc_u || 0, 5000), mg2 = cl(b2.managers, +pl3.inc_m || 0, 1000), pj2 = cl(b2.projects, +pl3.inc_p || 1, 500), yr = b2.cycle === 'year', mo = yr ? 12 : 1; var per = pl3.flat ? +pl3.flat : (+pl3.base || 0) + (us2 - (+pl3.inc_u || 0)) * D.seatP.user + (mg2 - (+pl3.inc_m || 0)) * D.seatP.mgr + (pj2 - (+pl3.inc_p || 1)) * D.seatP.proj; var usd = Math.round(per * mo * (yr ? (1 - (+D.seatP.off || 0) / 100) : 1) * 100) / 100; var rial = Math.round(usd * (+D.fx.rate || 0) / 1000) * 1000; return { custom: !pl3.flat && (us2 > (+pl3.inc_u || 0) || mg2 > (+pl3.inc_m || 0) || pj2 > (+pl3.inc_p || 1)), users: us2, managers: mg2, projects: pj2, cycle: yr ? 'year' : 'month', months: mo, usd: usd, rate: +D.fx.rate || 0, rial: rial, amount: Math.round(rial / 10) } };
    if (p === '/plans' && m === 'GET') return { plans: D.plans.filter(function (x) { return x.on !== false }), pay: D.pay, seat: D.seatP, fx: D.fx };
    if (p === '/register' && m === 'POST') {
      var rc = String(b.code || '').trim(); if (!b.name || !b.company || !rc || String(b.pin || '').length < 8) E(400, 'invalid'); if (!/^[A-Za-z0-9._-]{3,30}$/.test(rc)) E(400, 'bad-code'); if (codeTaken(rc)) E(409, 'code-exists');
      var nt = { id: nextId(D.tenants), code: 'T' + ('00' + (D.tenants.length + 1)).slice(-3), name: String(b.company).slice(0, 80), status: 'active', levels: ['مدیرعامل', 'مدیر پروژه', 'سرپرست کارگاه'], contact: { phone: b.phone || '', email: b.email || '' }, self: true, created: now() };
      D.tenants.push(nt); var nu = { id: nextId(D.users), code: rc, name: String(b.name).slice(0, 80), role: 'owner', tenant_id: nt.id, ucode: nt.code + '-0001', level: 1, mods: [], home: '', pin: b.pin, must_change: false, active: true, profile: { phone: b.phone || '', email: b.email || '' } };
      D.users.push(nu); log(nu, 'auth.register', nt.code); nu.last_login = now(); return sess(nu, 'demo-' + nu.id);
    }
    if (p === '/signup' && m === 'POST') { D.signups.unshift({ id: nextId(D.signups), ts: now(), name: b.name, company: b.company, phone: b.phone, email: b.email, note: b.note, status: 'new' }); return { ok: true } }
    if (p === '/auth/login') {
      var c = String(b.code || '').toLowerCase(), u = D.users.filter(function (u) { return u.code.toLowerCase() === c || (u.ucode || '').toLowerCase() === c })[0];
      if (!u || !u.active || u.pin !== b.pin) E(401, 'bad-credentials');
      if (u.tenant_id && u.role !== 'owner' && !active(tn(u.tenant_id))) E(403, 'subscription-inactive');
      u.last_login = now(); log(u, 'auth.login'); return sess(u, 'demo-' + u.id);
    }
    var U = me(h);
    if (p === '/fx' && m === 'POST') { if (!U) E(401, 'auth'); var r0 = +b.rate || 0; if (r0 < 100000 || r0 > 100000000) E(400, 'invalid'); if (b.manual) { if (!(U.role === 'admin' && !U.tenant_id)) E(403, 'forbidden'); D.fx = { rate: Math.round(r0), t: now(), src: 'manual', lock: !!b.lock } } else if (!D.fx.lock && (now() - (D.fx.t || 0) > 600 || !D.fx.rate)) D.fx = { rate: Math.round(r0), t: now(), src: String(b.src || '').slice(0, 40) }; return { ok: true, fx: D.fx } }
    if (p === '/admin/seat' && m === 'PUT') { if (!(U.role === 'admin' && !U.tenant_id)) E(403, 'forbidden'); D.seatP = { user: Math.max(0, +b.user || 0), mgr: Math.max(0, +b.mgr || 0), proj: Math.max(0, +b.proj || 0), off: Math.max(0, Math.min(90, +b.off || 0)) }; if (b.unlock) { D.fx.lock = false; D.fx.t = 0 } log(U, 'seat.save'); return { ok: true } }
    if (p === '/me') return sess(U);
    // ── platform records for HubSDK pages (aide calendar…): /directory, /data/:site/:coll, /sync/batch — revisioned, conflict-checked, per company
    if (p === '/directory') { var dm = D.users.filter(function (u) { return u.active !== false && (U.tenant_id ? u.tenant_id === U.tenant_id : !u.tenant_id || true) }); return { users: dm.map(function (u) { return { code: u.ucode || u.code, name: u.name, role: u.role === 'owner' ? 'مدیر اشتراک' : u.role === 'admin' ? 'مدیر' : u.leader ? 'لیدر' : 'کاربر' } }) } }
    if (!D.recs) D.recs = {}; if (!D.recSeq) D.recSeq = 0;
    var rk = function (site, coll) { return (U.tenant_id || 0) + '/' + site + '/' + coll };
    if ((x = /^\/data\/([\w-]+)\/([\w-]+)$/.exec(p)) && m === 'GET') { var bag = D.recs[rk(x[1], x[2])] || {}, since = +(b.since || 0), its = Object.keys(bag).map(function (id) { var r0 = bag[id]; return { id: id, rev: r0.rev, data: r0.data, deleted: !!r0.del, seq: r0.seq } }).filter(function (i) { return since ? i.seq > since : !i.deleted }); return { items: its, seq: D.recSeq, next: null } }
    if (p === '/sync/batch' && m === 'POST') { var warnings = []; var results = (b.ops || []).slice(0, 100).map(function (o) { var k = rk(o.site, o.coll), bag = D.recs[k] = D.recs[k] || {}, cur = bag[o.id], crev = cur ? cur.rev : 0;
        if (cur && !cur.del && o.base_rev !== crev || (!cur || cur.del) && o.base_rev && o.base_rev !== crev) return { op_id: o.op_id, status: 'conflict', rev: crev, current: cur && !cur.del ? cur.data : null, deleted: !cur || !!cur.del };
        D.recSeq++; if (o.type === 'del') bag[o.id] = { rev: crev + 1, data: null, del: true, seq: D.recSeq }; else { bag[o.id] = { rev: crev + 1, data: o.data, seq: D.recSeq, by: U.code };
          if (o.coll === 'events' && o.data && o.data.start) { var att = o.data.attendees || []; Object.keys(bag).forEach(function (id2) { var e2 = bag[id2]; if (id2 === o.id || e2.del || !e2.data) return; var sh = (e2.data.attendees || []).filter(function (c) { return att.indexOf(c) >= 0 }); if (sh.length && e2.data.start < o.data.end && o.data.start < e2.data.end) warnings.push({ id: id2, title: e2.data.title, codes: sh }) }) } }
        return { op_id: o.op_id, status: 'ok', rev: bag[o.id].rev } }); return { results: results, warnings: warnings } }
    if (p === '/me/profile') { if (b.name) U.name = b.name; var av0 = (U.profile || {}).avatar || ''; U.profile = { title: b.title != null ? b.title : (U.profile || {}).title || '', phone: b.phone != null ? b.phone : (U.profile || {}).phone || '', email: b.email != null ? b.email : (U.profile || {}).email || '', avatar: b.avatar != null ? String(b.avatar).slice(0, 20) : av0 }; return sess(U) }
    if (p === '/auth/change-pin') { if (b.old !== U.pin) E(401, 'bad-credentials'); if (String(b.new || '').length < 8 || b.new === b.old) E(400, 'weak-pin'); U.pin = b.new; U.must_change = false; return { token: 'demo-' + U.id } }
    // ── 1.1: دستگاه‌ها، فعالیت، داده‌ی عمومی، دسترسی‌ها
    if (p === '/auth/logout-all') { log(U, 'logout-all'); return { ok: true } }
    if (p === '/me/activity') return { items: D.audit.filter(function (a) { return a.user === U.code }).slice(0, 60) };
    var dm = /^\/data\/([\w-]+)\/([\w-]+)(?:\/([\w.~:-]+))?$/.exec(p.split('?')[0]);
    if (dm) {
      D.data = D.data || {}; var key = dm[1] + (U.tenant_id ? '~T' + U.tenant_id : '') + '/' + dm[2], C = D.data[key] = D.data[key] || {};
      if (m === 'GET' && !dm[3]) return { items: Object.keys(C).map(function (k) { return { id: k, data: C[k].data, rev: C[k].rev } }) };
      if (m === 'GET') { if (!C[dm[3]]) E(404, 'not-found'); return { id: dm[3], data: C[dm[3]].data, rev: C[dm[3]].rev } }
      if (m === 'PUT') { var rv = (C[dm[3]] ? C[dm[3]].rev : 0) + 1; C[dm[3]] = { data: b.data, rev: rv }; return { id: dm[3], rev: rv } }
      if (m === 'DELETE') { delete C[dm[3]]; return { ok: true } }
    }
    if (p === '/scores' && m === 'GET') {
      var isA = U.role === 'admin' && !U.tenant_id, tid = isA ? +(b.tenant || 0) : U.tenant_id; if (!tid) E(400, 'tenant');
      if (!isA) { var sb = sub(tid); if (!(U.role === 'owner' && sb && (sb.modules || []).indexOf('scores') >= 0)) E(403, 'not-in-plan') }
      var days = Math.min(365, Math.max(1, +(b.days || 30))), from = now() - days * 86400, W = D.scoreW, K = ['login', 'create', 'update', 'file', 'approve', 'other'];
      var cat = function (a) { a = String(a || ''); if (/login/.test(a)) return 'login'; if (/approve|\.ok$|confirm/.test(a)) return 'approve'; if (/file|upload/.test(a)) return 'file'; if (/create|new|add|register|invite/.test(a)) return 'create'; if (/update|edit|save|change|set|reset/.test(a)) return 'update'; return 'other' };
      var us = D.users.filter(function (u) { return u.tenant_id === tid }), by = {};
      us.forEach(function (u) { by[u.code] = { code: u.code, name: u.name, ucode: u.ucode || '', role: u.role, level: u.level || 0, active: u.active !== false, n: { login: 0, create: 0, update: 0, file: 0, approve: 0, other: 0 }, last: u.last_login || 0 } });
      D.audit.forEach(function (x) { var r = by[x.user]; if (!r || x.ts < from) return; r.n[cat(x.action)]++; if (x.ts > r.last) r.last = x.ts });
      var items = Object.keys(by).map(function (k) { var r = by[k]; r.total = K.reduce(function (s0, c) { return s0 + r.n[c] * (+W[c] || 0) }, 0); return r }).sort(function (a2, b2) { return b2.total - a2.total });
      var t0 = tn(tid); return { tenant: t0 ? { id: t0.id, code: t0.code, name: t0.name } : null, days: days, weights: W, items: items };
    }
    if (p === '/admin/score-weights' && m === 'PUT') { if (!(U.role === 'admin' && !U.tenant_id)) E(403, 'forbidden'); ['login', 'create', 'update', 'file', 'approve', 'other'].forEach(function (c) { if (b[c] != null) D.scoreW[c] = Math.max(0, Math.min(100, +b[c] || 0)) }); log(U, 'scores.weights'); return { ok: true } }
    if (p === '/orders' && m === 'POST') {
      if (!U.tenant_id || U.role !== 'owner') E(403, 'forbidden'); var pl = D.plans.filter(function (x) { return x.id === +b.plan_id && x.on !== false })[0]; if (!pl) E(400, 'invalid'); if (!String(b.ref || '').trim()) E(400, 'invalid');
      var q0 = seatQ(b, pl); if (!q0.rate) E(400, 'no-rate'); var od = Object.assign({ id: nextId(D.orders), tenant_id: U.tenant_id, user: U.code, plan_id: pl.id, plan: pl.name + (q0.custom ? ' کاستوم' : '') }, q0, { ref: String(b.ref).slice(0, 60), note: String(b.note || '').slice(0, 200), ts: now(), status: 'pending' });
      D.orders.unshift(od); log(U, 'order.new', pl.name); return { ok: true, order: od };
    }
    if (p === '/orders' && m === 'GET') return { items: D.orders.filter(function (o) { return o.tenant_id === U.tenant_id }) };
    if (p === '/admin/plans' && m === 'PUT') { if (!(U.role === 'admin' && !U.tenant_id)) E(403, 'forbidden'); if (Array.isArray(b.plans)) D.plans = b.plans.map(function (x, i) { return { id: +x.id || (i + 1), name: String(x.name || '').slice(0, 40), price: Math.max(0, +x.price || 0), months: Math.max(1, +x.months || 1), modules: x.modules || ['project-control'], seats: Math.max(1, +x.seats || 1), max_levels: Math.min(10, Math.max(1, +x.max_levels || 1)), desc: String(x.desc || '').slice(0, 200), on: x.on !== false, best: !!x.best, base: Math.max(0, +x.base || 0), inc_u: Math.max(0, +x.inc_u || 0), inc_m: Math.max(0, +x.inc_m || 0), inc_p: Math.max(1, +x.inc_p || 1), flat: Math.max(0, +x.flat || 0) } }); if (b.pay) D.pay = { card: String(b.pay.card || ''), holder: String(b.pay.holder || ''), bank: String(b.pay.bank || ''), note: String(b.pay.note || '') }; log(U, 'plans.save'); return { ok: true } }
    if (p === '/admin/orders' && m === 'GET') { if (!(U.role === 'admin' && !U.tenant_id)) E(403, 'forbidden'); return { items: D.orders.map(function (o) { var t = tn(o.tenant_id); return Object.assign({ tenant: t ? t.name : '', tcode: t ? t.code : '' }, o) }) } }
    if ((x = /^\/admin\/orders\/(\d+)$/.exec(p))) { if (!(U.role === 'admin' && !U.tenant_id)) E(403, 'forbidden'); var o = D.orders.filter(function (z) { return z.id === +x[1] })[0]; if (!o) E(404, 'not-found'); if (o.status !== 'pending') E(409, 'done');
      o.status = b.status === 'ok' ? 'ok' : 'rejected'; o.done = now(); o.by = U.code;
      if (o.status === 'ok') { var pl2 = D.plans.filter(function (z) { return z.id === o.plan_id })[0] || { modules: ['project-control'], seats: 1, max_levels: 1 }; var cur0 = sub(o.tenant_id), base = cur0 && cur0.ends > now() ? cur0.ends : now(); newSub(o.tenant_id, { plan: o.plan, modules: pl2.modules, seats: pl2.flat ? 9999 : o.users != null ? (+o.users + +o.managers + 1) : pl2.seats, max_levels: pl2.max_levels, months: o.months, max_projects: pl2.flat ? 9999 : (+o.projects || 1), users: pl2.flat ? 9999 : o.users, leaders: pl2.flat ? 9999 : o.managers, price: String(o.amount), note: 'سفارش #' + o.id + ' · پیگیری ' + o.ref }); var ns = sub(o.tenant_id); ns.ends = base + o.months * 30 * 86400 }
      log(U, 'order.' + o.status, '#' + o.id); return { ok: true } }
    if (p.indexOf('/admin/') === 0) {
      if (!(U.role === 'admin' && !U.tenant_id)) E(403, 'forbidden');
      if (p === '/admin/tenants' && m === 'GET') return { tenants: D.tenants.map(tenantRow) };
      if (p === '/admin/tenants' && m === 'POST') {
        if (!b.name || !b.owner || !b.owner.username) E(400, 'invalid'); if (codeTaken(b.owner.username)) E(409, 'code-exists');
        var t = { id: nextId(D.tenants), code: 'T' + ('00' + (D.tenants.length + 1)).slice(-3), name: b.name, status: 'active', levels: [], contact: b.contact || {} }; D.tenants.push(t); newSub(t.id, b);
        var pw = b.owner.password || PIN, o = { id: nextId(D.users), code: b.owner.username, name: b.owner.name, role: 'owner', tenant_id: t.id, ucode: t.code + '-0001', level: 1, mods: [], home: '', pin: pw, must_change: true, active: true, profile: {} }; D.users.push(o);
        log(U, 'tenant.create', t.code); return { code: t.code, owner: { username: o.code, ucode: o.ucode, password: pw } };
      }
      if ((x = /^\/admin\/tenants\/(\d+)(\/subscription)?$/.exec(p))) {
        var T = tn(+x[1]); if (!T) E(404, 'not-found');
        if (x[2]) { newSub(T.id, b); log(U, 'tenant.subscription', T.code); return { ok: true } }
        if (m === 'PATCH') { if ('msp' in b) { T.msp = !!b.msp; log(U, 'tenant.msp', T.code + ':' + T.msp); return { ok: true } } T.status = b.status === 'suspended' ? 'suspended' : 'active'; log(U, 'tenant.status', T.code); return { ok: true } }
        return { tenant: T, active: active(T), subs: D.subs.filter(function (s) { return s.tenant_id === T.id }).sort(function (a, b) { return b.created - a.created }), users: D.users.filter(function (u) { return u.tenant_id === T.id }).map(pub) };
      }
      if (p === '/admin/stats') return { users: D.users.filter(function (u) { return !u.tenant_id }).length, db_kb: Math.round(JSON.stringify(D).length / 1024), logins24h: D.audit.filter(function (a) { return a.action === 'auth.login' && a.ts > now() - 86400 }).length, failed24h: 0, changes24h: 0, last_backup: 0, version: 'demo', ai: false };
      if (p === '/admin/signups') return { items: D.signups };
      if ((x = /^\/admin\/signups\/(\d+)$/.exec(p))) { D.signups.forEach(function (s) { if (s.id === +x[1]) s.status = b.status }); return { ok: true } }
      if (p === '/admin/modules') { D.modules.forEach(function (md) { if (md.slug === b.slug) { md.status = b.status; md.path = b.path; md.site = b.site } }); return { ok: true } }
      if (p === '/admin/users' && m === 'GET') return { users: D.users.filter(function (u) { return !u.tenant_id }).map(function (u) { return { id: u.id, name: u.name, code: u.code, role: u.role, grants: u.grants || {}, last_login: u.last_login || 0, active: u.active } }) };
      if (p === '/admin/users' && m === 'POST') { if (!b.code || !b.name) E(400, 'invalid'); if (codeTaken(b.code)) E(409, 'code-exists'); D.users.push({ id: nextId(D.users), code: b.code, name: b.name, role: b.role || 'member', tenant_id: null, grants: b.grants || {}, pin: PIN, must_change: true, active: true, profile: {} }); return { code: b.code, pin: PIN } }
      if ((x = /^\/admin\/users\/(\d+)(\/reset-pin)?$/.exec(p))) { var V = usr(+x[1]); if (!V) E(404, 'not-found'); if (x[2]) { V.pin = PIN; V.must_change = true; return { pin: PIN } } if ('active' in b) V.active = !!b.active; return { ok: true } }
      if (p.indexOf('/admin/audit') === 0) return { items: D.audit.slice(0, 40) };
      if (p === '/admin/clients') return { items: [] };
      if (p === '/admin/backup') return { file: 'در حالت نمایشی پشتیبان ساخته نمی‌شود' };
      if (p === '/admin/export') return D;
    }
    if (p.indexOf('/panel/') === 0) {
      if (U.role !== 'owner') E(403, 'forbidden'); var t2 = tn(U.tenant_id), s2 = sub(t2.id) || { modules: [], seats: 0, max_levels: 1 };
      var inT = function (u) { return u.tenant_id === t2.id };
      if (p === '/panel/overview') return { tenant: { name: t2.name, code: t2.code, levels: t2.levels }, sub: s2, used: D.users.filter(function (u) { return inT(u) && u.active }).length, used_leaders: D.users.filter(function (u) { return inT(u) && u.active && u.leader }).length, used_users: D.users.filter(function (u) { return inT(u) && u.active && !u.leader && u.role !== 'owner' }).length, active: active(t2), modules: D.modules.filter(function (md) { return s2.modules.indexOf(md.slug) >= 0 }) };
      if (p === '/panel/users' && m === 'GET') return { users: D.users.filter(inT).map(pub) };
      if (p === '/panel/activity') { var cs = D.users.filter(inT).map(function (u) { return u.code }); return { items: D.audit.filter(function (a) { return cs.indexOf(a.user) >= 0 }).slice(0, 150) } }
      if (p === '/panel/perms') {
        var mx = s2.max_levels || 1, mods = D.modules.filter(function (md) { return s2.modules.indexOf(md.slug) >= 0 }); t2.perms = t2.perms || {};
        if (m === 'PUT') Object.keys(b.perms || {}).forEach(function (k) { if (s2.modules.indexOf(k) >= 0) { var r = b.perms[k], c = function (v, dv) { return Math.max(1, Math.min(+v || dv, mx)) }; t2.perms[k] = { view: c(r.view, mx), edit: c(r.edit, mx), approve: c(r.approve, 1) }; if (t2.perms[k].edit > t2.perms[k].view) t2.perms[k].edit = t2.perms[k].view } });
        var out = {}; s2.modules.forEach(function (k) { out[k] = t2.perms[k] || { view: mx, edit: mx, approve: 1 } });
        return { max_levels: mx, levels: t2.levels || [], modules: mods.map(function (md) { return { slug: md.slug, name_fa: md.name_fa, name_en: md.name_en } }), perms: out };
      }
      if (p === '/panel/levels') { t2.levels = (b.names || []).slice(0, s2.max_levels); return { ok: true } }
      var chk = function () { if (!b.mods || !b.mods.length) E(400, 'no-modules'); if (b.level < 1 || b.level > s2.max_levels) E(400, 'level-out-of-range'); b.mods = b.mods.filter(function (s) { return s2.modules.indexOf(s) >= 0 }) };
      var cap = function (lead, self) { if (s2.users == null) return; var n0 = D.users.filter(function (u) { return inT(u) && u.active && u.role !== 'owner' && u !== self && !!u.leader === !!lead }).length; if (lead && n0 >= s2.leaders) E(409, 'no-leaders'); if (!lead && n0 >= s2.users) E(409, 'no-seats') };
      if (p === '/panel/users' && m === 'POST') {
        chk(); cap(b.leader); if (D.users.filter(function (u) { return inT(u) && u.active }).length >= s2.seats) E(409, 'no-seats'); if (!b.username) E(400, 'invalid'); if (codeTaken(b.username)) E(409, 'code-exists');
        var pw2 = b.password || PIN, n = { id: nextId(D.users), code: b.username, name: b.name, role: b.readonly ? 'viewer' : 'member', tenant_id: t2.id, ucode: nextU(t2), level: b.level, parent_id: b.parent_id, mods: b.mods, home: b.home || b.mods[0], pin: pw2, must_change: true, active: true, profile: {}, leader: !!b.leader }; D.users.push(n);
        log(U, 'panel.user.create', n.ucode); return { ucode: n.ucode, username: n.code, password: pw2 };
      }
      if ((x = /^\/panel\/users\/(\d+)(\/reset)?$/.exec(p))) {
        var W = usr(+x[1]); if (!W || W.tenant_id !== t2.id) E(404, 'not-found'); if (W.role === 'owner') E(403, 'owner-locked');
        if (x[2]) { W.pin = PIN; W.must_change = true; return { password: PIN } }
        chk(); if ((('active' in b) ? b.active : W.active) && (!!b.leader !== !!W.leader || !W.active)) cap(b.leader, W); W.leader = !!b.leader; W.name = b.name; W.level = b.level; W.mods = b.mods; W.home = b.home; W.parent_id = b.parent_id; W.role = b.readonly ? 'viewer' : 'member'; if ('active' in b) W.active = !!b.active; return { ok: true };
      }
    }
    E(404, 'not-found');
  }
  var of = window.fetch.bind(window);
  window.fetch = function (url, o) {
    var s = String(url && url.url || url), i = s.indexOf('/api/v1/');
    if (i >= 0 && /^https?:\/\//i.test(s) && s.indexOf(location.origin + '/') !== 0) i = -1; // other sites (e.g. coarena.ai/api/v1) go to the network
    if (i < 0) return of(url, o);
    o = o || {}; var m = (o.method || 'GET').toUpperCase(), path = s.slice(i + 7).split('?')[0], body = {}, h = (o.headers && (o.headers.Authorization || o.headers.authorization)) || '';
    try { if (o.body) body = JSON.parse(o.body) } catch (e) { }
    if (m === 'GET') { var qs = s.split('?')[1]; if (qs) qs.split('&').forEach(function (kv) { var z = kv.split('='); if (z[0]) body[decodeURIComponent(z[0])] = decodeURIComponent((z[1] || '').replace(/\+/g, ' ')) }) }
    var st = 200, out;
    // log-in always reads the latest cloud copy first, so a PIN or account changed on another device works here at once
    return ready.then(function () { return path === '/auth/login' || path === '/me' ? Promise.race([pull(), new Promise(function (r) { setTimeout(r, 4000) })]) : null }).then(function () {
      try { out = route(m, path, body, h); save(); if (m !== 'GET' && path !== '/auth/login') push() } catch (e) { st = e.status || 500; out = e.body || { error: String(e && e.message || e) } }
      return new Response(JSON.stringify(out), { status: st, headers: { 'Content-Type': 'application/json' } });
    });
  };
  /* نوار «حالت نمایشی» با دکمه‌ی پاک کردن داده‌ها */
  function bar() {
    if (document.getElementById('demoBar')) return; var d = document.createElement('div'); d.id = 'demoBar'; d.setAttribute('role', 'note');
    d.style.cssText = 'position:fixed;top:calc(8px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);z-index:100000;background:#f2b640;color:#1a1408;font:600 12px Vazirmatn,Tahoma,sans-serif;direction:rtl;border-radius:99px;padding:5px 14px;display:flex;gap:10px;align-items:center;box-shadow:0 6px 20px rgba(0,0,0,.35)';
    try{document.documentElement.classList.add('tsuba-demo')}catch(e){}
    d.innerHTML = '<span>داده‌ها از مخزن خوانده می‌شود</span>';
    // reset button removed: the data is shared by every system (data/vertex.json)
    document.body.appendChild(d); paint();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bar); else bar();
})();
