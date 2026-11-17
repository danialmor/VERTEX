# راهنمای فارسی · Freqtrade (ربات ترید رایگان و متن‌باز)

## این چیست؟
شناخته‌شده‌ترین ربات ترید متن‌باز کریپتو (پایتون). روی بیشتر صرافی‌های بزرگ کار می‌کند (از طریق CCXT)، راهبرد را به زبان پایتون می‌نویسید، روی داده‌ی گذشته **بک‌تست** می‌کنید، پارامترها را بهینه می‌کنید (Hyperopt) و بعد ابتدا در حالت **آزمایشی (dry-run)** و سپس واقعی اجرا می‌کنید. کنترل از تلگرام یا رابط وب (FreqUI).

## راه‌اندازی (روی سرور)
روش ساده‌تر با Docker:
1. `docker compose pull`
2. `docker compose run --rm freqtrade create-userdir --userdir user_data`
3. `docker compose run --rm freqtrade new-config --config user_data/config.json` (سؤال‌ها: صرافی، ارز پایه، dry-run=بله)
4. `docker compose up -d`
بدون Docker: `./setup.sh -i` (لینوکس/مک) یا `pip install -e .`

## گردش کار پیشنهادی
1. دانلود داده: `freqtrade download-data --exchange binance --pairs BTC/USDT ETH/USDT -t 5m 1h`
2. بک‌تست: `freqtrade backtesting --strategy SampleStrategy`
3. بهینه‌سازی: `freqtrade hyperopt --strategy SampleStrategy --hyperopt-loss SharpeHyperOptLoss`
4. آزمایشی: `"dry_run": true` در config و `freqtrade trade`
5. فقط بعد از چند هفته نتیجه‌ی خوب در حالت آزمایشی، کلید API صرافی (فقط با اجازه‌ی ترید، **بدون اجازه‌ی برداشت**) را بدهید.

## کجا چه چیزی هست
- `freqtrade/templates/` و `user_data/strategies/` — راهبرد نمونه
- `config_examples/` — نمونه‌ی تنظیمات
- `docs/` — مستندات کامل (انگلیسی) در تب «راهنماها»

## نکته‌ها برای ایران
بیشتر صرافی‌های خارجی کاربران ایرانی را محدود می‌کنند؛ قوانین صرافی را بررسی کنید و سرور را در کشوری بگیرید که دسترسی مجاز دارد.

## وضعیت در ورتکس
در محیط آزمایشی نصب و اجرا شد: نسخه `2026.11-dev`، ساخت پوشه‌ی کاربر، شناسایی راهبرد نمونه (`SampleStrategy` — وضعیت OK) و فهرست صرافی‌ها درست کار کرد. پوشه‌ی آزمون‌ها (`tests/`، ۲۲ مگابایت) برای سبک ماندن سایت کپی نشده؛ در مخزن اصلی freqtrade هست. مجوز: GPL-3.0.
