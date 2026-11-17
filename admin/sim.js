/* User Control Panel — tab "Sim (AI workflows)" (admin only).
   Sim = open-source AI agent / workflow builder (simstudioai/sim, Apache-2.0; uploaded as sim-main.zip 2026-11-17).
   It is a Next.js + Postgres + realtime server (needs Docker, ~12 GB RAM) — it can NOT run on GitHub Pages; it runs on the future VPS.
   This tab: connection settings (instance URL), open workspace (its /workspace pages forbid cross-site framing: frame-ancestors 'self'),
   embedded deployed chat agents (/chat/* pages ARE embeddable), setup guide, and planned automations for VERTEX.
   Settings stored at /data/admin/sim/main  {url, chats:[{name,url}], ideas:{id:bool}} */
(function () {
  'use strict';
  var P = window.TSP; if (!P) return;
  var $ = P.$, esc = P.esc, api = P.api, head = P.head, fa = P.fa, toast = P.toast;
  var IDEAS = [
    ['delay', 'تأخیر تازه → خلاصه و هشدار', 'وقتی گزارش تأخیر از فرم‌ها می‌رسد، عامل هوش مصنوعی علت و اثر را خلاصه می‌کند و برای مدیر پروژه پیام می‌فرستد.'],
    ['daily', 'گزارش روزانه‌ی خودکار', 'هر شب از داده‌های کنترل پروژه یک گزارش کوتاه وضعیت ۱۵ پروژه ساخته و در نامه‌نگاری (VI) ثبت می‌شود.'],
    ['letters', 'پیش‌نویس نامه', 'از متن یک دستور کار یا تأخیر، پیش‌نویس نامه‌ی رسمی برای پیمانکار یا کارفرما.'],
    ['files', 'خواندن نقشه و مدارک', 'فایل‌های فایل منیجر (VII) به پایگاه دانش Sim می‌روند تا بشود درباره‌ی نقشه‌ها و قراردادها سؤال کرد.'],
    ['signup', 'بررسی درخواست اشتراک', 'درخواست‌های تازه‌ی اشتراک امتیازدهی و خلاصه می‌شوند و در «نیاز به تصمیم شما» می‌آیند.'],
    ['spi', 'هشدار SPI', 'اگر SPI یک پروژه زیر حد تعیین‌شده برود، هشدار و پیشنهاد اقدام.']
  ];
  var cfg = { url: '', chats: [], ideas: {} }, rev = 0;
  var norm = function (u) { u = (u || '').trim().replace(/\/+$/, ''); if (u && !/^https?:\/\//i.test(u)) u = 'https://' + u; return u };
  function save(msg) { return api('PUT', '/data/admin/sim/main', { data: cfg, base_rev: rev, op_id: 'sim' + Date.now() }).then(function (x) { rev = x.rev || rev + 1; if (msg) toast(msg) }, function () { toast('ذخیره نشد؛ دوباره امتحان کنید.') }) }
  function page() {
    return api('GET', '/data/admin/sim/main').catch(function () { return null }).then(function (r) {
      if (r && r.data) { cfg = Object.assign({ url: '', chats: [], ideas: {} }, r.data); rev = r.rev || 0 }
      draw();
    });
  }
  function draw() {
    var on = !!cfg.url, kpi = function (v, t) { return '<div class="card kpi"><b>' + v + '</b><span>' + t + '</span></div>' };
    var h = head('Sim · گردش‌کارهای هوش مصنوعی', 'سازنده‌ی عامل‌ها و گردش‌کارهای هوشمند (متن‌باز Sim). عامل‌ها را اینجا وصل، مدیریت و داخل پنل استفاده کنید.',
      on ? '<a class="btn p" href="' + esc(cfg.url) + '/workspace" target="_blank" rel="noopener">باز کردن فضای کار Sim</a>' : '');
    h += '<div class="grid g4 mb">' + kpi(on ? '<span class="chip ok">وصل</span>' : '<span class="chip warn">وصل نیست</span>', 'وضعیت اتصال') + kpi(fa(cfg.chats.length), 'عامل گفتگوی متصل') + kpi(fa(Object.keys(cfg.ideas).filter(function (k) { return cfg.ideas[k] }).length) + ' / ' + fa(IDEAS.length), 'خودکارسازی انتخاب‌شده') + kpi('<span dir="ltr">Apache-2.0</span>', 'مجوز Sim') + '</div>';
    h += '<div class="g2 grid"><div class="card"><h2>اتصال</h2><form id="simF" style="display:grid;gap:12px"><label class="f">نشانی Sim (سرور خودتان یا sim.ai)<input id="simU" class="ltr" placeholder="https://sim.your-domain.com" value="' + esc(cfg.url) + '"></label><div class="row"><button class="btn p" type="submit">ذخیره</button><button class="btn" type="button" id="simCloud">استفاده از sim.ai (ابری)</button>' + (on ? '<button class="btn d" type="button" id="simOff">قطع اتصال</button>' : '') + '</div><small style="color:var(--muted);line-height:1.9">صفحه‌های فضای کار Sim اجازه‌ی نمایش داخل سایت‌های دیگر را نمی‌دهند، برای همین در زبانه‌ی جدا باز می‌شوند. گفتگوی عامل‌هایی که منتشر می‌کنید (نشانی <span class="mono">/chat/…</span>) همین‌جا داخل پنل نشان داده می‌شود.</small></form></div>';
    h += '<div class="card"><h2>راه‌اندازی روی سرور اختصاصی</h2><ol style="margin:0;padding-inline-start:20px;line-height:2.1;color:var(--ink2)"><li>سرور با Docker و دست‌کم ۱۲ گیگابایت حافظه</li><li>اجرای <span class="mono">npx sim-setup</span> یا <span class="mono">docker compose -f docker-compose.prod.yml up -d</span></li><li>ساخت کلیدهای محرمانه در فایل <span class="mono">.env</span> (فقط روی سرور، هرگز در مخزن)</li><li>بالا آمدن روی پورت <span class="mono">3000</span> و وصل کردن یک زیردامنه، مثلاً <span class="mono">sim.دامنه‌ی‌شما</span></li><li>نشانی را در «اتصال» بنویسید</li></ol><small style="color:var(--muted)">تا سرور آماده شود می‌توانید با sim.ai (ابری) آزمایش کنید.</small></div></div>';
    h += '<div class="card mb"><h2>عامل‌های گفتگو <small style="color:var(--muted);font-weight:400;font-size:13px">بعد از Deploy → Chat در Sim، نشانی گفتگو را اینجا اضافه کنید</small></h2><form id="chF" class="row" style="margin-bottom:14px"><input id="chN" placeholder="نام عامل، مثلاً دستیار تأخیرات" style="flex:1;min-width:180px"><input id="chU" class="ltr" placeholder="https://…/chat/…" style="flex:2;min-width:220px"><button class="btn p" type="submit">افزودن</button></form>' +
      (cfg.chats.length ? '<div class="row" id="chTabs" style="margin-bottom:12px">' + cfg.chats.map(function (c, i) { return '<span class="chip" style="gap:8px;padding:6px 12px"><button type="button" data-ch="' + i + '" style="border:0;background:none;cursor:pointer;font:inherit;color:inherit">' + esc(c.name) + '</button><button type="button" data-del="' + i + '" aria-label="حذف ' + esc(c.name) + '" style="border:0;background:none;cursor:pointer;color:var(--bad)">×</button></span>' }).join('') + '</div><iframe id="chFr" title="گفتگوی عامل Sim" src="' + esc(cfg.chats[0].url) + '" style="width:100%;height:560px;border:1px solid var(--line);border-radius:12px;background:var(--card)" allow="clipboard-write; microphone"></iframe>' : '<p class="empty">هنوز عاملی اضافه نشده است.</p>') + '</div>';
    h += '<div class="card"><h2>خودکارسازی‌های پیشنهادی برای ورتکس</h2><p style="color:var(--muted);margin:0 0 14px">هر کدام را که می‌خواهید علامت بزنید تا بعد از راه‌اندازی سرور ساخته شود.</p><div class="grid g2" style="margin:0">' + IDEAS.map(function (x) { return '<label class="card" style="display:flex;gap:12px;align-items:flex-start;cursor:pointer;background:var(--card2)"><input type="checkbox" data-idea="' + x[0] + '"' + (cfg.ideas[x[0]] ? ' checked' : '') + '><span><b style="display:block;margin-bottom:4px">' + x[1] + '</b><small style="color:var(--muted);line-height:1.8">' + x[2] + '</small></span></label>' }).join('') + '</div></div>';
    $('#pg').innerHTML = h;
    $('#simF').onsubmit = function (e) { e.preventDefault(); cfg.url = norm($('#simU').value); save(cfg.url ? 'نشانی Sim ذخیره شد' : 'اتصال برداشته شد').then(draw) };
    $('#simCloud').onclick = function () { cfg.url = 'https://sim.ai'; save('به sim.ai وصل شد').then(draw) };
    var off = $('#simOff'); if (off) off.onclick = function () { cfg.url = ''; save('اتصال قطع شد').then(draw) };
    $('#chF').onsubmit = function (e) { e.preventDefault(); var n = $('#chN').value.trim(), u = norm($('#chU').value); if (!n || !u) { toast('نام و نشانی گفتگو را بنویسید'); return } if (!/\/chat\//.test(u)) toast('نشانی معمولاً شامل /chat/ است؛ بررسی کنید'); cfg.chats.push({ name: n, url: u }); save('عامل اضافه شد').then(draw) };
    var tabs = $('#chTabs'); if (tabs) tabs.onclick = function (e) { var a = e.target.closest('[data-ch]'), d = e.target.closest('[data-del]'); if (a) $('#chFr').src = cfg.chats[+a.dataset.ch].url; if (d) { cfg.chats.splice(+d.dataset.del, 1); save('حذف شد').then(draw) } };
    $('#pg').addEventListener('change', function (e) { var c = e.target.closest('[data-idea]'); if (!c) return; cfg.ideas[c.dataset.idea] = c.checked; save() });
  }
  var N = P.NAV_ADMIN, at = N.length; N.forEach(function (x, i) { if (x[0] === 'filemap') at = i + 1 });
  N.splice(at, 0, ['sim', 'Sim · گردش‌کار هوشمند']); P.A.sim = page;
})();
