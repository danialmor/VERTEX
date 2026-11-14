/* پنل کاربری — تب «فایل منیجر» (فقط مدیر اکوسیستم): بخش‌های پلتفرم VII، وضعیت هر بخش و اتصال آن به پلتفرم‌های دیگر.
   داده‌ی زنده از  /data/file-manager/state/main ؛ یادداشت‌های شما در  /data/admin/filemap/main */
(function () {
  'use strict';
  var P = window.TSP; if (!P) return;
  var $ = P.$, esc = P.esc, api = P.api, head = P.head, fa = P.fa, toast = P.toast, B = window.BRAND || { platforms: [] };
  var fsz = function (b) { b = +b || 0; var u = ['B', 'KB', 'MB', 'GB'], i = 0; while (b >= 1024 && i < 3) { b /= 1024; i++ } return (i ? b.toFixed(1) : b) + ' ' + u[i] };
  var SEC = [
    ['browse', 'مرور فایل‌ها', 'پوشه‌های شیشه‌ای رنگی با تعداد و اندازه، نمای کاشی و فهرست، گروه‌بندی بر اساس نوع یا تاریخ، مسیر بالای صفحه.', 'ready'],
    ['tidy', 'مرتب‌سازی یک‌ضرب', 'فایل‌های آزاد هر پوشه به پوشه‌ی نوع خودش می‌روند؛ اول برنامه‌ی کار نشان داده می‌شود و «واگرد» دارد.', 'ready'],
    ['clean', 'آزادسازی فضا', 'تکراری‌ها، نصب‌کننده‌ها، دانلود ناتمام، فایل‌های قدیمی و بزرگ و بازنگری‌های قدیمی نقشه؛ هر پیشنهاد دلیلش را می‌گوید.', 'ready'],
    ['ws', 'فضاهای کاری', 'پوشه‌ها و فایل‌های یک کار از هر جای فایل منیجر در یک صفحه، بدون کپی یا جابه‌جایی.', 'ready'],
    ['search', 'جست‌وجوی همه‌جا', 'با ⌘K: اول پوشه‌ها، بعد فایل‌ها، بعد کلمه‌ی داخل یادداشت‌ها و نشانک‌ها.', 'ready'],
    ['dual', 'دو پنجره', 'دو پوشه کنار هم؛ کپی (F5) و انتقال (F6) انتخاب‌شده‌ها به سمت دیگر.', 'ready'],
    ['peek', 'نگاه سریع و ویرایش متن', 'تصویر، ویدیو، صدا و PDF بدون دانلود باز می‌شوند؛ یادداشت‌های متنی (Markdown) همان‌جا ویرایش می‌شوند.', 'ready'],
    ['bm', 'نشانک‌ها', 'پیوندهای کاری با دسته و برچسب، کنار فایل‌ها.', 'ready'],
    ['links', 'اتصال به پلتفرم‌ها', 'هر پوشه یا فایل به پروژه، نامه، مشتری و… وصل می‌شود و در صفحه‌ی «اتصال‌ها» دیده می‌شود.', 'part'],
    ['store', 'ذخیره‌ی خودِ فایل‌ها روی سرور', 'الان فهرست و مشخصات روی هاب است ولی خودِ فایل‌ها روی دستگاه بارگذار می‌ماند. بعد از راه‌اندازی سرور، فایل‌ها هم روی سرور می‌روند و بین کاربران مشترک می‌شوند.', 'todo'],
    ['perm', 'دسترسی پوشه‌ها بر اساس سطح', 'هر پوشه فقط برای سطح‌ها و نقش‌های مجاز دیده شود (از تب «دسترسی‌ها»).', 'todo'],
    ['ver', 'نسخه‌های هر فایل', 'نگه‌داری تاریخچه‌ی نسخه‌های نقشه و برنامه و مقایسه‌ی آن‌ها.', 'todo']
  ];
  var FLOW = {
    'project-control': ['پوشه‌ی هر پروژه، نسخه‌های برنامه (MPP) و نقشه‌ها', 'part'], mail: ['پیوست نامه‌ها از فایل منیجر انتخاب می‌شود', 'todo'], messenger: ['فایل‌های فرستاده‌شده در گفت‌وگو', 'todo'],
    'users-panel': ['ورود یکسان و (بعداً) دسترسی پوشه‌ها', 'part'], 'executive-desk': ['مدارک جلسه‌ها', 'todo'], crm: ['قرارداد و مدارک مشتری', 'todo'], designer: ['فایل‌های طراحی و رندر', 'todo'], portfolio: ['تصویر نمونه‌کارها', 'todo'], training: ['جزوه‌ها و ویدیوها', 'todo']
  };
  var ST = { ready: ['آماده', 'ok'], part: ['بخشی آماده', 'warn'], todo: ['در برنامه', ''] };
  var pill = function (s) { return '<span class="pill ' + ST[s][1] + '" style="font-size:11px;border-radius:99px;padding:2px 10px;background:' + (s === 'ready' ? 'rgba(53,194,122,.18);color:#1f9d6b' : s === 'part' ? 'rgba(240,165,58,.2);color:#b8741a' : 'rgba(127,127,140,.18);color:inherit') + '">' + ST[s][0] + '</span>' };
  function page() {
    return Promise.all([api('GET', '/data/file-manager/state/main').catch(function () { return null }), api('GET', '/data/admin/filemap/main').catch(function () { return null })]).then(function (r) {
      var D = r[0] && r[0].data, notes = (r[1] && r[1].data) || {}, rev = (r[1] && r[1].rev) || 0, nodes = D ? Object.keys(D.nodes).map(function (k) { return D.nodes[k] }) : [];
      var files = nodes.filter(function (n) { return n.type === 'file' && !n.trash }), by = {}; nodes.forEach(function (n) { (n.links || []).forEach(function (l) { by[l.p] = (by[l.p] || 0) + 1 }) });
      var kpi = function (v, t) { return '<div class="card kpi"><b>' + v + '</b><span>' + t + '</span></div>' };
      var h = head('فایل منیجر', 'پلتفرم VII — بخش‌ها، وضعیت هر کدام و اتصالش به بقیه‌ی اکوسیستم. یادداشت خودتان را کنار هر بخش بنویسید.', '<a class="btn pri" href="../files/" target="_blank" rel="noopener">باز کردن فایل منیجر</a>');
      h += '<div class="grid g4 mb">' + kpi(fa(files.length), 'فایل') + kpi('<span dir="ltr">' + fsz(files.reduce(function (s, f) { return s + (f.size || 0) }, 0)) + '</span>', 'حجم ثبت‌شده') + kpi(fa(D ? D.ws.length : 0), 'فضای کاری') + kpi(fa(Object.keys(by).reduce(function (s, k) { return s + by[k] }, 0)), 'اتصال به پلتفرم‌ها') + '</div>';
      if (!D) h += '<div class="card mb">هنوز کسی فایل منیجر را باز نکرده است؛ با اولین ورود، داده‌ی نمونه ساخته می‌شود.</div>';
      h += '<div class="card mb"><h2 style="margin:0 0 12px;font-size:16px">بخش‌ها</h2><div class="grid g2">' + SEC.map(function (s) { return '<div class="card" style="background:var(--card2);display:grid;gap:8px"><div style="display:flex;gap:8px;align-items:center;justify-content:space-between"><b>' + s[1] + '</b>' + pill(s[3]) + '</div><small style="color:var(--muted);line-height:1.8">' + s[2] + '</small><input class="fmN" data-k="' + s[0] + '" value="' + esc(notes[s[0]] || '') + '" placeholder="یادداشت شما برای این بخش…" aria-label="یادداشت ' + s[1] + '" style="width:100%"></div>' }).join('') + '</div></div>';
      h += '<div class="card"><h2 style="margin:0 0 12px;font-size:16px">اتصال‌ها به پلتفرم‌های دیگر</h2><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse"><thead><tr style="text-align:start;color:var(--muted);font-size:12px"><th style="text-align:start;padding:8px">پلتفرم</th><th style="text-align:start;padding:8px">چه چیزی رد و بدل می‌شود</th><th style="text-align:start;padding:8px">اتصال ثبت‌شده</th><th style="text-align:start;padding:8px">وضعیت</th></tr></thead><tbody>' +
        (B.platforms || []).filter(function (p) { return FLOW[p.slug] }).map(function (p) { return '<tr style="border-top:1px solid var(--line)"><td style="padding:10px 8px;white-space:nowrap"><i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:' + p.color + ';margin-inline-end:8px"></i><b>' + p.n + ' — ' + esc(p.fa) + '</b></td><td style="padding:10px 8px">' + FLOW[p.slug][0] + '</td><td style="padding:10px 8px">' + fa(by[p.slug] || 0) + '</td><td style="padding:10px 8px">' + pill(FLOW[p.slug][1]) + '</td></tr>' }).join('') + '</tbody></table></div></div>';
      $('#pg').innerHTML = h;
      var t = 0; $('#pg').addEventListener('input', function (e) { if (!e.target.classList.contains('fmN')) return; notes[e.target.dataset.k] = e.target.value; clearTimeout(t); t = setTimeout(function () { api('PUT', '/data/admin/filemap/main', { data: notes, base_rev: rev, op_id: 'fmn' + Date.now() }).then(function (x) { rev = x.rev || rev + 1 }, function () { toast('یادداشت ذخیره نشد.') }) }, 600) });
    });
  }
  var at = 2; P.NAV_ADMIN.forEach(function (x, i) { if (x[0] === 'sitemap') at = i + 1 });
  P.NAV_ADMIN.splice(at, 0, ['filemap', 'فایل منیجر']); P.A.filemap = page;
})();
