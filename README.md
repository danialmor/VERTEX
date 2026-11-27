# VERTEX · Danimor Platform

ورتکس مجموعه‌ای از ابزارهای کنترل پروژه، تقویم کاری، مدیریت فایل و ارتباطات تیمی است.

| بخش | توضیح |
| --- | --- |
| [Platform Home · صفحهٔ اصلی VERTEX](https://danialmor.github.io/VERTEX/) | ورودی پلتفرم |
| [داشبورد مدیریت](https://danialmor.github.io/VERTEX/home/) | صفحهٔ مدیریت VERTEX |
| [مرکز کنترل](https://danialmor.github.io/VERTEX/admin/) | پنل مدیریت پلتفرم |
| [MSP-BI](https://danialmor.github.io/VERTEX/msp-bi/) | داشبورد برنامه‌ریزی و کنترل پروژه |
| [AIDE در VERTEX](https://danialmor.github.io/VERTEX/aide/) | تقویم و میز کار، همگام با [AIDE مستقل](https://danialmor.github.io/aide/) |
| [مدیریت فایل](https://danialmor.github.io/VERTEX/files/) | دسترسی به بخش فایل‌ها |
| [VERTEX Messenger](https://danialmor.github.io/VERTEX/messenger/) | ماژول مستقل مبتنی بر Mattermost. این لینک صفحهٔ وضعیت است و چت در انتظار راه‌اندازی سرور است. |

## مستندات

- [برنامهٔ پلتفرم](docs/PLAN-fa.md)
- [میزبانی و راه‌اندازی](docs/HOSTING-fa.md)
- [اتصال AIDE](docs/AIDE-CONTRACT-fa.md)
- [فهرست ایده‌های مسنجر](messenger/IDEAS-fa.md)

## ساختار

```
index.html             صفحهٔ ورودی VERTEX
home/                  داشبورد مدیریت
msp-bi/                داشبورد کنترل پروژه
aide/                  نسخهٔ همگام‌شده از AIDE مستقل
files/                 مدیریت فایل
messenger/             صفحهٔ وضعیت و سورس مسنجر
admin/                 مرکز کنترل
shared/sdk.js          SDK مشترک برای ورود، صف آفلاین و همگام‌سازی
hub/server.py          بک‌اند پلتفرم
hub/deploy/            تنظیمات Caddy، systemd و پشتیبان‌گیری
hub/tests/             آزمون‌های هاب
.github/workflows/     گردش‌کارهای GitHub Actions، شامل همگام‌سازی AIDE
```

## اجرای محلی برای آزمون
```
cd hub && HUB_DATA_DIR=/tmp/hubdata HUB_STATIC_DIR=.. python3 server.py init   # رمز اولیه‌ی admin
HUB_DATA_DIR=/tmp/hubdata HUB_STATIC_DIR=.. python3 server.py                  # http://127.0.0.1:8787
python3 hub/tests/test_hub.py && node hub/tests/sdk_test.js
```
