
## 6.4.0 — VX-015 user profiles / VX-016 skip initial password
- admin/people.js (window.VXP): own profile editor (details, photo, documents) mounted on the Profile page; read-only profile dialog for admins
  (head-office staff, subscription users, tenant detail) via `data-vxp` buttons; "Last connected" column, lists sorted by it, online = seen < 5 min.
- Files: cloud site `vxp-<ucode>` (photo.<ext>, documents `<kind>-<id>-<name>`); metadata in user.profile {photo, photo_t, docs[]}.
- demo.js: /me updates last_seen (max every 5 min) and pushes; login pushes last_login; /auth/change-pin and /me/profile wait for the
  cloud save (push(true)) and return `cloud:true|false`; pending saves are flushed on pagehide.
- hub/server.py mirrors the profile fields; /me refreshes last_login; tenant and staff lists return profile.
- Initial password screen: «فعلاً رد شو (Skip)» enters without changing; must_change stays, so it is asked again next sign-in.

## 6.4.1 — VX-017
- User menu «تغییر رمز» opens a dialog (old, new, repeat) → /auth/change-pin, waits for the cloud save.
- The ecosystem admin (code Admin) is renamed to «دانیال» on login / first request when the name is still a default; i18n shows "Danial".

## 6.5.0 — VX-018
- Tenant detail: «نام کاربری / رمز» column, masked; 👁 calls GET /admin/tenants/:id/creds (ecosystem admin only, audit tenant.creds.view) and shows username/password with Copy. Demo (github.io) stores passwords in plain text so it works there; the real hub stores hashes and cannot show them.
