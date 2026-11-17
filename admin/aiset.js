/* Control panel — «هوش مصنوعی» (ecosystem admin): settings of the assistant used on every page of the ecosystem.
   Saved in the repo: shared/ai/config.json {enabled,name,mode,model,k,prompt,t} with the GitHub key from «ذخیره در GitHub».
   k = Coarena key, reversed+base64 (obfuscation only — the repo is public). On our own server the hub keeps the key instead (config ai_key). */
(function () {
  'use strict';
  var P = window.TSP; if (!P) return;
  var $ = P.$, esc = P.esc, head = P.head, toast = P.toast;
  var OWN = 'danialmor', REP = 'VERTEX', PATH = 'shared/ai/config.json', API = 'https://coarena.ai/api/v1';
  var STATIC = /github\.io$/i.test(location.hostname);
  var tok = function () { try { return localStorage.getItem('ghTok') || '' } catch (e) { return '' } };
  var dec = function (k) { try { return k ? atob(k).split('').reverse().join('') : '' } catch (e) { return '' } };
  var enc = function (k) { return btoa(k.split('').reverse().join('')) };
  var PAGES = [['/', 'صفحه‌ی اصلی'], ['admin/', 'کنترل پنل'], ['msp-bi/', 'I — کنترل پروژه (با داده‌ی پروژه‌ها)'], ['mail/', 'نامه‌نگاری'], ['files/', 'فایل منیجر'], ['trading/', 'تریدینگ'], ['aide/', 'میز منشی']];
  async function load() {
    var sha = '', j = null, CL = window.VX_CLOUD;
    if (CL && CL.on) { try { j = await CL.getDoc('ai-config') } catch (e) { } if (j) return { sha: '', c: Object.assign({ enabled: true, name: 'دستیار VERTEX', mode: 'coarena', model: 'claude-sonnet-5-5', k: '', prompt: '' }, j) } }
    try { var r = await fetch('https://api.github.com/repos/' + OWN + '/' + REP + '/contents/' + PATH + '?ref=main&t=' + Date.now(), { headers: Object.assign({ Accept: 'application/vnd.github+json' }, tok() ? { Authorization: 'Bearer ' + tok() } : {}), cache: 'no-store' }); if (r.ok) { var x = await r.json(); sha = x.sha; j = JSON.parse(decodeURIComponent(escape(atob(x.content.replace(/\n/g, ''))))) } } catch (e) { }
    if (!j) { try { var r2 = await fetch('../shared/ai/config.json?t=' + Date.now(), { cache: 'no-store' }); if (r2.ok) j = await r2.json() } catch (e) { } }
    return { sha: sha, c: Object.assign({ enabled: true, name: 'دستیار VERTEX', mode: 'coarena', model: 'claude-sonnet-5-5', k: '', prompt: '' }, j || {}) };
  }
  async function save(c) {
    var CL = window.VX_CLOUD; if (CL && CL.on) { await CL.putDoc('ai-config', c); return }
    if (!tok()) throw new Error('فضای آنلاین (Cloudflare) تنظیم نشده');
    var sha, r = await fetch('https://api.github.com/repos/' + OWN + '/' + REP + '/contents/' + PATH + '?ref=main', { headers: { Authorization: 'Bearer ' + tok(), Accept: 'application/vnd.github+json' }, cache: 'no-store' }); if (r.ok) sha = (await r.json()).sha;
    var w = await fetch('https://api.github.com/repos/' + OWN + '/' + REP + '/contents/' + PATH, { method: 'PUT', headers: { Authorization: 'Bearer ' + tok(), Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'panel: AI settings', content: btoa(unescape(encodeURIComponent(JSON.stringify(c, null, 1)))), sha: sha, branch: 'main' }) });
    if (!w.ok) throw new Error('GitHub ' + w.status);
  }
  var row = function (label, html, note) { return '<label style="display:grid;gap:6px"><b style="font-size:13px">' + label + '</b>' + html + (note ? '<small style="color:var(--muted)">' + note + '</small>' : '') + '</label>' };
  var inp = 'padding:10px 12px;border-radius:12px;border:1px solid var(--line);background:transparent;color:inherit;font:inherit;width:100%;box-sizing:border-box';
  function page() {
    return load().then(function (L) {
      var c = L.c, has = !!dec(c.k);
      var h = head('هوش مصنوعی', 'دستیار در همه‌ی صفحه‌های اکوسیستم؛ موتور، مدل، کلید و دستور پایه همین‌جا تنظیم می‌شود و برای همه‌ی کاربران اعمال می‌شود.', '<button class="btn pri" id="aiSave">ذخیره‌ی آنلاین</button>');
      if (!(window.VX_CLOUD && VX_CLOUD.on) && !tok() && STATIC) h += '<div class="card mb" style="border:1px solid rgba(240,165,58,.5)">فضای آنلاین (Cloudflare) هنوز تنظیم نشده است.</div>';
      if (!STATIC) h += '<div class="card mb">روی سرور خودمان، کلید Coarena در تنظیمات سرور (<code dir="ltr">ai_key</code>) نگه داشته می‌شود و به مرورگر نمی‌رسد؛ موتور و مدل از همین صفحه اعمال می‌شود.</div>';
      h += '<div class="grid g2 mb"><div class="card" style="display:grid;gap:14px"><h2 style="margin:0;font-size:16px">تنظیمات</h2>'
        + '<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="aiOn"' + (c.enabled !== false ? ' checked' : '') + '> <b>دستیار در کل اکوسیستم فعال باشد</b></label>'
        + row('نام دستیار', '<input id="aiName" style="' + inp + '" value="' + esc(c.name || '') + '">')
        + row('موتور', '<select id="aiMode" style="' + inp + '"><option value="coarena"' + (c.mode !== 'local' ? ' selected' : '') + '>آنلاین · Coarena (API رایگان، قوی)</option><option value="local"' + (c.mode === 'local' ? ' selected' : '') + '>محلی · Qwen 0.5B (داخل مرورگر، بدون اینترنت، ضعیف)</option></select>', 'محلی: بار اول ۴۸۰ مگابایت در هر مرورگر دانلود می‌شود.')
        + row('مدل Coarena', '<select id="aiModel" style="' + inp + '" dir="ltr"><option>' + esc(c.model || 'claude-sonnet-5-5') + '</option></select>', 'فهرست از coarena.ai/api/v1/models')
        + row('کلید API ‏Coarena', '<input id="aiKey" type="password" style="' + inp + '" dir="ltr" placeholder="' + (has ? '•••• ثبت شده — برای تغییر، کلید جدید را بچسبانید' : 'coa_…') + '" autocomplete="off">', has ? '<span style="color:#1f9d6b">✓ کلید ثبت شده است.</span> از coarena.ai/account/api/keys' : 'از coarena.ai/account/api/keys بگیرید.')
        + row('دستور پایه (اختیاری)', '<textarea id="aiPrompt" rows="3" style="' + inp + ';resize:vertical">' + esc(c.prompt || '') + '</textarea>', 'مثلاً: «پاسخ‌ها کوتاه و به فارسی، با اعداد دقیق».')
        + '</div><div class="card" style="display:grid;gap:12px;align-content:start"><h2 style="margin:0;font-size:16px">آزمایش</h2><small style="color:var(--muted)">یک پرسش کوتاه با همین تنظیمات (قبل از ذخیره هم کار می‌کند).</small><div style="display:flex;gap:8px"><input id="aiQ" style="' + inp + '" value="در یک جمله بگو چه کمکی در مدیریت پروژه‌ی ساختمانی می‌کنی."><button class="btn" id="aiTest">آزمایش</button></div><div id="aiOut" style="white-space:pre-wrap;font-size:13px;line-height:1.8;min-height:40px;background:var(--card2);border-radius:12px;padding:10px"></div>'
        + '<h2 style="margin:8px 0 0;font-size:16px">صفحه‌هایی که دستیار دارند</h2><ul style="margin:0;padding-inline-start:20px;display:grid;gap:4px;font-size:13px">' + PAGES.map(function (p) { return '<li><a href="../' + (p[0] === '/' ? '' : p[0]) + '" target="_blank" rel="noopener">' + p[1] + '</a></li>' }).join('') + '</ul></div></div>';
      $('#pg').innerHTML = h;
      fetch(API + '/models').then(function (r) { return r.json() }).then(function (j) { var ids = (j.data || []).map(function (m) { return m.id }); if (!ids.length) return; if (ids.indexOf(c.model) < 0) ids.unshift(c.model); $('#aiModel').innerHTML = ids.map(function (i) { return '<option' + (i === c.model ? ' selected' : '') + '>' + esc(i) + '</option>' }).join('') }).catch(function () { });
      function cur() { var k = ($('#aiKey').value || '').trim(); return { enabled: $('#aiOn').checked, name: ($('#aiName').value || '').trim() || 'دستیار VERTEX', mode: $('#aiMode').value, model: $('#aiModel').value, k: k ? enc(k) : c.k, prompt: ($('#aiPrompt').value || '').trim(), t: Date.now() } }
      $('#aiSave').onclick = async function () {
        var b = this, n = cur(); var k = ($('#aiKey').value || '').trim(); if (k && !/^coa_/.test(k)) { toast('کلید Coarena با coa_ شروع می‌شود.'); return }
        b.disabled = true; try { await save(n); toast('✓ تنظیمات هوش مصنوعی آنلاین ذخیره شد؛ همه‌ی صفحه‌ها و دستگاه‌ها از آن استفاده می‌کنند.'); page() } catch (e) { toast('ذخیره نشد: ' + (e.message || e)); b.disabled = false }
      };
      $('#aiTest').onclick = async function () {
        var o = $('#aiOut'), n = cur(), key = dec(n.k); o.textContent = '…';
        if (n.mode === 'local') { o.textContent = 'موتور محلی داخل خود صفحه‌ها اجرا می‌شود؛ برای آزمایش، آیکن دستیار پایین صفحه را باز کنید.'; return }
        try {
          var r = STATIC ? await fetch(API + '/chat/completions', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: n.model, max_tokens: 200, messages: [{ role: 'system', content: n.prompt || 'Reply in Persian.' }, { role: 'user', content: $('#aiQ').value }] }) })
            : await fetch('/api/v1/ai', { method: 'POST', headers: { Authorization: 'Bearer ' + (localStorage.getItem('hub.token') || ''), 'Content-Type': 'application/json' }, body: JSON.stringify({ system: n.prompt, prompt: $('#aiQ').value, model: n.model }) });
          var j = await r.json(); if (!r.ok) throw new Error((j.error && (j.error.message || j.error)) || ('HTTP ' + r.status));
          o.textContent = '✓ ' + (STATIC ? ((j.choices || [{}])[0].message || {}).content : j.text);
        } catch (e) { o.textContent = '✗ ' + (e.message || e) + (STATIC && !key ? ' — کلید Coarena وارد نشده.' : '') }
      };
    });
  }
  var at = 1; P.NAV_ADMIN.forEach(function (x, i) { if (x[0] === 'github') at = i + 1 });
  P.NAV_ADMIN.splice(at, 0, ['aiset', 'هوش مصنوعی']); P.A.aiset = page;
})();
