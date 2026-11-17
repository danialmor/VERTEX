/* Control panel — "ذخیره در GitHub" (ecosystem admin only).
   One GitHub key for the whole ecosystem: saved in this browser (localStorage.ghTok, shared by every page on the same site:
   panel data → data/vertex.json, dashboard uploads → msp-bi/data/store/, assistant key → shared/ai/config.json)
   and optionally locked with an admin password in the repo (shared/vault.json) so other devices only need the password. */
(function () {
  'use strict';
  var P = window.TSP; if (!P) return;
  var $ = P.$, esc = P.esc, head = P.head, toast = P.toast;
  var OWN = 'danialmor', REP = 'VERTEX', NEW = 'https://github.com/settings/personal-access-tokens/new';
  var tok = function () { try { return localStorage.getItem('ghTok') || '' } catch (e) { return '' } };
  var gh = function (path, o) { o = o || {}; var h = { Accept: 'application/vnd.github+json' }; if (o.t !== '' && (o.t || tok())) h.Authorization = 'Bearer ' + (o.t || tok()); return fetch('https://api.github.com' + path, { method: o.m || 'GET', headers: h, cache: 'no-store' }) };
  function u8b(u) { var s = ''; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s) }
  function bu8(b) { var s = atob(b), u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u }
  async function vKey(pw, salt) { var k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']); return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: 250000, hash: 'SHA-256' }, k, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']) }
  async function vEnc(obj, pw) { var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, await vKey(pw, salt), new TextEncoder().encode(JSON.stringify(obj))); return { v: 1, alg: 'PBKDF2-SHA256-250k/AES-256-GCM', salt: u8b(salt), iv: u8b(iv), ct: u8b(new Uint8Array(ct)), t: Date.now() } }
  async function vDec(j, pw) { var pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bu8(j.iv) }, await vKey(pw, bu8(j.salt)), bu8(j.ct)); return JSON.parse(new TextDecoder().decode(pt)) }
  async function putFile(path, obj) {
    var sha, r = await gh('/repos/' + OWN + '/' + REP + '/contents/' + path + '?ref=main'); if (r.ok) sha = (await r.json()).sha;
    var w = await fetch('https://api.github.com/repos/' + OWN + '/' + REP + '/contents/' + path, { method: 'PUT', headers: { Authorization: 'Bearer ' + tok(), Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'panel: ' + path, content: btoa(unescape(encodeURIComponent(JSON.stringify(obj, null, 1)))), sha: sha, branch: 'main' }) });
    if (!w.ok) throw new Error('GitHub ' + w.status);
  }
  async function vault() { try { var r = await gh('/repos/' + OWN + '/' + REP + '/contents/shared/vault.json?ref=main', { t: '' }); if (r.ok) { var j = await r.json(); return JSON.parse(decodeURIComponent(escape(atob(j.content.replace(/\n/g, ''))))) } } catch (e) { } return null }
  async function check() {
    if (!tok()) return { ok: false, why: 'none' };
    try { var r = await gh('/repos/' + OWN + '/' + REP); if (r.status === 401) return { ok: false, why: 'bad' }; var j = await r.json(); return j.permissions && j.permissions.push ? { ok: true } : { ok: false, why: 'ro' } } catch (e) { return { ok: false, why: 'net' } }
  }
  var STEPS = [
    ['صفحه‌ی ساخت کلید را باز کنید', 'دکمه‌ی «ساخت کلید در GitHub» را بزنید (با حساب danialmor وارد باشید).'],
    ['نام و مدت', 'Token name: <b dir="ltr">vertex</b> — Expiration: <b>No expiration</b> (یا ۱ سال).'],
    ['فقط همین مخزن', 'Repository access: <b>Only select repositories</b> و از فهرست <b dir="ltr">VERTEX</b> را انتخاب کنید.'],
    ['اجازه‌ی نوشتن', 'Permissions → Repository permissions → <b>Contents</b>: <b>Read and write</b>. (Metadata خودش Read می‌شود.)'],
    ['ساخت و کپی', 'پایین صفحه <b>Generate token</b> را بزنید و کدی را که با <b dir="ltr">github_pat_</b> شروع می‌شود کپی کنید.'],
    ['اینجا بچسبانید', 'کد را در کادر پایین بچسبانید و «اتصال» را بزنید. از این به بعد هرچه در اکوسیستم ذخیره شود روی مخزن می‌رود.']
  ];
  function page() {
    return Promise.all([check(), vault()]).then(function (r) {
      var st = r[0], vj = r[1], t = tok();
      var badge = st.ok ? '<span class="pill" style="background:rgba(53,194,122,.18);color:#1f9d6b;border-radius:99px;padding:3px 12px">✓ وصل · ذخیره روی مخزن فعال</span>'
        : '<span class="pill" style="background:rgba(240,165,58,.2);color:#b8741a;border-radius:99px;padding:3px 12px">' + ({ none: 'هنوز وصل نیست', bad: 'کلید نامعتبر یا منقضی', ro: 'کلید اجازه‌ی نوشتن ندارد', net: 'اتصال به GitHub برقرار نشد' }[st.why]) + '</span>';
      var h = head('ذخیره در GitHub', 'یک کلید برای کل اکوسیستم: داده‌ی پنل، بارگذاری‌های داشبورد و کلید دستیار، همه روی مخزن ' + OWN + '/' + REP + ' ذخیره می‌شوند.', '<a class="btn pri" href="' + NEW + '" target="_blank" rel="noopener">ساخت کلید در GitHub</a>');
      h += '<div class="card mb" style="display:grid;gap:12px"><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><h2 style="margin:0;font-size:16px">وضعیت</h2>' + badge + (t ? '<small style="color:var(--muted)" dir="ltr">' + esc(t.slice(0, 11)) + '…' + esc(t.slice(-4)) + '</small>' : '') + '</div>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap"><input id="ghIn" type="password" class="ltr" placeholder="github_pat_…" autocomplete="off" style="flex:1;min-width:220px;padding:10px 12px;border-radius:12px;border:1px solid var(--line);background:transparent;color:inherit;font:inherit"><button class="btn pri" id="ghGo">اتصال</button>' + (t ? '<button class="btn" id="ghOff">قطع از این مرورگر</button>' : '') + '</div>'
        + '<small style="color:var(--muted)">کلید فقط در همین مرورگر نگه داشته می‌شود و در مخزن به‌صورت ساده ذخیره نمی‌شود (GitHub کلیدی را که در مخزن عمومی ببیند فوراً باطل می‌کند).</small></div>';
      h += '<div class="card mb"><h2 style="margin:0 0 12px;font-size:16px">گرفتن کلید — قدم‌به‌قدم</h2><ol style="margin:0;padding-inline-start:20px;display:grid;gap:10px">' + STEPS.map(function (s) { return '<li><b>' + s[0] + '</b><div style="color:var(--muted);font-size:13px;margin-top:2px">' + s[1] + '</div></li>' }).join('') + '</ol></div>';
      h += '<div class="card mb" style="display:grid;gap:10px"><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><h2 style="margin:0;font-size:16px">🔐 دستگاه‌های دیگر</h2>' + (vj ? '<span class="pill" style="background:rgba(53,194,122,.18);color:#1f9d6b;border-radius:99px;padding:3px 12px">✓ کلید رمزدار روی مخزن</span>' : '<span class="pill" style="border-radius:99px;padding:3px 12px">ذخیره نشده</span>') + '</div>'
        + '<small style="color:var(--muted)">' + (t ? 'با یک رمز مدیر، کلید رمزگذاری‌شده (AES-256) در مخزن ذخیره می‌شود؛ روی هر دستگاه دیگر فقط همین رمز را اینجا وارد کنید.' : (vj ? 'کلید رمزدار روی مخزن هست؛ رمز مدیر را وارد کنید تا این مرورگر هم وصل شود.' : 'اول کلید را بالا وصل کنید.')) + '</small>'
        + (t || vj ? '<div style="display:flex;gap:8px;flex-wrap:wrap"><input id="vPw" type="password" placeholder="رمز مدیر" autocomplete="' + (t ? 'new-password' : 'current-password') + '" style="min-width:180px;padding:10px 12px;border-radius:12px;border:1px solid var(--line);background:transparent;color:inherit;font:inherit"><button class="btn pri" id="' + (t ? 'vSave' : 'vOpen') + '">' + (t ? 'ذخیره‌ی رمزدار روی مخزن' : 'باز کردن و اتصال') + '</button></div>' : '') + '</div>';
      h += '<div class="card"><h2 style="margin:0 0 10px;font-size:16px">چه چیزهایی روی مخزن ذخیره می‌شود</h2><ul style="margin:0;padding-inline-start:20px;display:grid;gap:6px;font-size:13px">'
        + '<li>داده‌ی کنترل پنل (کاربران، اشتراک‌ها، بخش‌ها…) → <code dir="ltr">data/vertex.json</code></li>'
        + '<li>بارگذاری‌های داشبورد کنترل پروژه → <code dir="ltr">msp-bi/data/store/</code></li>'
        + '<li>کلید دستیار هوش مصنوعی → <code dir="ltr">shared/ai/config.json</code></li>'
        + '<li>کلید رمزدار برای دستگاه‌های دیگر → <code dir="ltr">shared/vault.json</code></li></ul></div>';
      $('#pg').innerHTML = h;
      $('#ghGo').onclick = async function () {
        var v = ($('#ghIn').value || '').trim(); if (!v) { toast('کلید را بچسبانید.'); return }
        var b = this; b.disabled = true; var old = tok(); try { localStorage.setItem('ghTok', v) } catch (e) { }
        var c = await check(); if (!c.ok) { try { old ? localStorage.setItem('ghTok', old) : localStorage.removeItem('ghTok') } catch (e) { } toast({ bad: 'کلید نامعتبر است.', ro: 'این کلید اجازه‌ی نوشتن در VERTEX ندارد (قدم ۳ و ۴).', net: 'اتصال به GitHub برقرار نشد.' }[c.why] || 'وصل نشد.'); b.disabled = false; return }
        try { localStorage.removeItem('ghHash') } catch (e) { }
        toast('✓ وصل شد؛ از این به بعد ذخیره‌ها روی مخزن می‌رود.'); page();
      };
      var off = $('#ghOff'); if (off) off.onclick = function () { if (!confirm('کلید از این مرورگر پاک شود؟')) return; try { localStorage.removeItem('ghTok') } catch (e) { } page() };
      var vs = $('#vSave'); if (vs) vs.onclick = async function () { var pw = $('#vPw').value || ''; if (pw.length < 6) { toast('رمز حداقل ۶ نویسه'); return } vs.disabled = true; try { var o = { gh: tok() }; try { Object.assign(o, JSON.parse(localStorage.getItem('vaultKeys') || '{}'), { gh: tok() }) } catch (e) { } await putFile('shared/vault.json', await vEnc(o, pw)); toast('✓ کلید رمزدار روی مخزن ذخیره شد.'); page() } catch (e) { toast('ذخیره نشد: ' + (e.message || e)); vs.disabled = false } };
      var vo = $('#vOpen'); if (vo) vo.onclick = async function () { vo.disabled = true; try { var o = await vDec(vj, $('#vPw').value || ''); if (o.gh) localStorage.setItem('ghTok', o.gh); localStorage.setItem('vaultKeys', JSON.stringify(o)); toast('✓ این مرورگر وصل شد.'); page() } catch (e) { toast('رمز درست نیست.'); vo.disabled = false } };
    });
  }
  var at = 1; P.NAV_ADMIN.forEach(function (x, i) { if (x[0] === 'ecopolicy' || x[0] === 'ecosite') at = i + 1 });
  P.NAV_ADMIN.splice(at, 0, ['github', 'ذخیره در GitHub']); P.A.github = page;
})();
