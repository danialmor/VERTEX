/* ریشه‌ی برند اکوسیستم — نام، لوگو، شعارها و دوازده پلتفرم.
   برای تغییر برند در همه‌ی صفحه‌ها فقط همین فایل (و در صورت نیاز تصویر لوگو) را عوض کنید.
   هر صفحه این فایل را در <head> بارگذاری می‌کند و جاهایی که data-brand دارند خودکار پر می‌شوند:
     data-brand="name"        نام برند            data-brand="logo"     تصویر لوگو (src و alt)
     data-brand="tagline-en"  شعار انگلیسی        data-brand="tagline-fa" شعار فارسی
     data-brand="motto"       شعار پایین صفحه     data-brand="favicon"  آیکون تب مرورگر
   در عنوان صفحه، {brand} با نام برند جایگزین می‌شود. */
(function () {
  'use strict';
  var me = document.currentScript, base = me ? new URL('../', me.src).href : '/';
  var B = {
    name: 'VERTEX',
    kanji: '',
    tagline_en: 'Twelve Platforms · One Ecosystem',
    tagline_fa: 'اکوسیستم دوازده پلتفرم',
    motto: 'Where every line meets',
    logo: base + 'assets/vertex-mark.svg',
    logo_alt: 'VERTEX mark: a glowing inverted triangle with a bright point at its lower vertex',
    base: base,
    /* شماره‌ی رومی، شناسه (همان شناسه‌ی هاب)، نام و توضیح انگلیسی و فارسی، رنگ، آیکون، نشانی */
    platforms: [
      ['I', 'project-control', 'Project Control', 'کنترل پروژه', 'Scheduling and project management', 'زمان‌بندی و مدیریت پروژه', '#e0262f', 'crane', 'msp-bi/'],
      ['II', 'training', 'Training', 'آموزش', 'Learning and development', 'یادگیری و توسعه‌ی مهارت', '#f25a22', 'cap', ''],
      ['III', 'messenger', 'Messenger', 'مسنجر', 'Company communication', 'گفت‌وگوی درون‌سازمانی', '#f7941d', 'chat', 'messenger/'],
      ['IV', 'users-panel', 'User Control Panel', 'کنترل پنل کاربران', 'Accounts and permissions', 'حساب‌ها و دسترسی‌ها', '#fbb817', 'users', 'admin/'],
      ['V', 'executive-desk', 'CEO & Secretary Desk', 'میز مدیرعامل و منشی', 'Management and decisions', 'مدیریت و تصمیم‌گیری', '#e8d200', 'tie', 'aide/'],
      ['VI', 'mail', 'Letters & Email', 'نامه‌نگاری و ایمیل', 'Smart correspondence', 'مکاتبات هوشمند', '#8dc63f', 'mail', 'vmail/'],
      ['VII', 'file-manager', 'File Manager', 'فایل منیجر', 'Documents and files', 'اسناد و فایل‌ها', '#00a650', 'folder', 'files/'],
      ['VIII', 'portfolio', 'Portfolio', 'پرتفولیو', 'Activity and profile analysis', 'تحلیل فعالیت و سوابق', '#00a99d', 'chart', ''],
      ['IX', 'shared-cursor', 'Shared Cursor', 'موس مشترک', 'Real-time collaboration', 'همکاری هم‌زمان', '#0072bc', 'cursor', ''],
      ['X', 'designer', 'Designer Workspace', 'فضای طراح', 'Design and creativity', 'طراحی و خلاقیت', '#2e3192', 'pal', ''],
      ['XI', 'crm', 'CRM', 'مشتریان', 'Clients and relationships', 'مشتریان و ارتباطات', '#662d91', 'hand', ''],
      ['XII', 'trading', 'Trading', 'تریدینگ', 'Crypto market research and trading tools', 'ابزارهای تحلیل بازار و ترید کریپتو', '#c2185b', 'chart', 'trading/']
    ].map(function (p) { return { n: p[0], slug: p[1], en: p[2], fa: p[3], desc_en: p[4], desc_fa: p[5], color: p[6], icon: p[7], href: p[8] ? base + p[8] : '' } })
  };
  /* پلتفرم با شناسه */
  B.platform = function (slug) { for (var i = 0; i < B.platforms.length; i++) if (B.platforms[i].slug === slug) return B.platforms[i]; return null };
  /* «I — Project Control» یا «I — کنترل پروژه» */
  B.label = function (slug, lang) { var p = typeof slug === 'object' ? slug : B.platform(slug); return p ? p.n + ' \u2014 ' + (lang === 'fa' ? p.fa : p.en) : String(slug || '') };
  B.desc = function (slug, lang) { var p = typeof slug === 'object' ? slug : B.platform(slug); return p ? (lang === 'fa' ? p.desc_fa : p.desc_en) : '' };
  /* نشان هر پلتفرم (قانون G1): مثلث وارونه‌ی ورتکس به رنگ همان پلتفرم و شماره‌ی رومی‌اش داخل آن.
     B.mark('project-control', 40) → رشته‌ی SVG ؛ B.markURL(slug) → نشانی data برای favicon یا <img> */
  B.mark = function (slug, size, opt) {
    var p = typeof slug === 'object' ? slug : B.platform(slug); if (!p) return ''; size = size || 40; opt = opt || {};
    var c = p.color, id = 'vm' + p.n + Math.random().toString(36).slice(2, 6), L = p.n.length, fs = L >= 4 ? 21 : L === 3 ? 25 : L === 2 ? 30 : 34;
    var lum = (function (h) { h = h.replace('#', ''); var r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16); return (0.299 * r + 0.587 * g + 0.114 * b) / 255 })(c), ink = lum > 0.62 ? '#1a1a1a' : '#ffffff';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="' + size + '" height="' + size + '" role="img" aria-label="' + p.n + ' — ' + p.en + '"' + (opt.cls ? ' class="' + opt.cls + '"' : '') + '>' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c + '"/><stop offset="1" stop-color="' + c + '" stop-opacity=".78"/></linearGradient></defs>' +
      '<path d="M8 14 Q4 8 11 8 H89 Q96 8 92 14 L54 86 Q50 93 46 86 Z" fill="url(#' + id + ')" stroke="' + c + '" stroke-width="2" stroke-linejoin="round"/>' +
      '<text x="50" y="' + (L >= 3 ? 44 : 46) + '" text-anchor="middle" dominant-baseline="middle" font-family="Georgia,\'Times New Roman\',serif" font-weight="700" font-size="' + fs + '" fill="' + ink + '" letter-spacing=".5">' + p.n + '</text></svg>';
  };
  B.markURL = function (slug, size) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(B.mark(slug, size || 64)) };
  /* پر کردن جاهای data-brand در صفحه */
  B.apply = function (root) {
    root = root || document;
    [].forEach.call(root.querySelectorAll('[data-brand]'), function (el) {
      var k = el.getAttribute('data-brand');
      if (k === 'logo') { el.src = B.logo; if (el.hasAttribute('data-brand-alt')) el.alt = B.logo_alt }
      else if (k === 'favicon') el.href = B.logo;
      else if (k === 'name') el.textContent = B.name;
      else if (k === 'tagline-en') el.textContent = B.tagline_en;
      else if (k === 'tagline-fa') el.textContent = B.tagline_fa;
      else if (k === 'motto') el.textContent = B.motto;
    });
    /* data-mark="slug": نشان پلتفرم داخل عنصر؛ data-mark-favicon="slug" روی <link rel=icon> */
    [].forEach.call(root.querySelectorAll('[data-mark]'), function (el) { el.innerHTML = B.mark(el.getAttribute('data-mark'), +el.getAttribute('data-mark-size') || 40) });
    [].forEach.call(root.querySelectorAll('[data-mark-favicon]'), function (el) { el.href = B.markURL(el.getAttribute('data-mark-favicon')) });
    if (document.title.indexOf('{brand}') >= 0) document.title = document.title.replace(/\{brand\}/g, B.name);
  };
  window.BRAND = B;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { B.apply() }); else B.apply();
})();
