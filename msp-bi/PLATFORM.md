# I — Project Control (msp-bi/)

> AI-readable record of this platform. Read before redesigning. Keep it current with every release.
> Version + changelog are generated into `msp-bi/platform.json` by `node tools/platform_meta.js`.

## Purpose
Project-portfolio control dashboard for an architecture/construction company: schedules (MS Project exports),
progress, SPI/efficiency, delays (Microsoft Forms export), timeline, calendars, project cards, next-30-days.
Owner: Danial (sole admin). UI language: Persian (RTL).

## Build
- Single file `msp-bi/index.html` (~830 KB). App code in `<script id="appMain">`, started by a loader that waits for DOMContentLoaded.
- `msp-bi/sw.js` service worker; cache name `dash-v<VERSION>` — bump each release.
- `VERSION` + Persian `CHANGELOG` array near line ~1966 of index.html (source of truth for platform.json).
- Brand from `shared/brand.js` (platform slug `project-control`, number I, color #e0262f).

## Data
- Uploads: project schedule xlsx (snapshots), `Project_information.xlsx` (PINFO), `dev.xlsx` delays (Forms export).
- Stored in browser (kv) and pushed to the public repo `msp-bi/data/store/` (`index.json`, `p-<uid>.json`, `dim.json`, `pinfo.json`, `delays.json`) via GitHub API (`storePush/storePull`, token only in localStorage `ghTok`).
- `dashReal` flag: real data vs. sample ("ghost") mode; ghost mode is admin-only in Settings.
- Key functions: `syncPX`, `syncS`, `pinfoParse`, `dlImportXlsx`, `dlRealRows`, `realPref/realSet`, `isAdm`.

## Real-data mode (3.65)
- Store now holds DimProject/DimSnapshot (dim.json), schedules p-1001 (16 snapshots) and p-1002 (baseline), pinfo, delays — imported through the app itself (scratch script mkstore2.js drives the upload tab with a mocked GitHub API).
- English names: `enOf(fa)` matches DimProject.ProjectName by the PERSIAN name, not the code (DimProject swaps 1008/1009 vs Project_information; Project_information wins). `ENX` holds names DimProject lacks (Dowran, Hezar Jarib, Hasht Behesht). `NM(fa,en)` renders English line + Persian line (project list, project header, info cards, dashboard chips).
- `metaList()` merges Project_information rows missing from DimProject.
- Home / Planning / Score: `rlHome/rlPlan/rlScore` replace sample content when PXREAL (observer on .view class + 20 s refresh while data loads). Planning comes from Project_information des/desN/desT (no designer names or sheet due dates exist in the data). Score shows real people with 0 points until activity is recorded.
## 3.66
- `NM(fa,en,code)` shows the DimProject code (ProjectUID, e.g. 1001) as a chip before the English name.
- Dashboard hero: code, English line, Persian line; "last update" is a `<select class="dsnap">` of all snapshots. `dashSnap(m,H,T)` overrides headline figures from the stored history entry (plan/act/EVM/status counts/dates/delay/S-curve). Only the LATEST snapshot keeps full tasks, so task-level tiles always use the latest (note shown).
- Global scope `GS` (localStorage gScope): header `.pillsel` is a real picker (all / one project). Applied by wrapping `leaves`, `filt`, `drawTl`, `treeHtml`, `rlHome`, `rlPlan`; dashboard switches DS_.src; project list rows hidden by data-pvopen. Mobile/iPad-portrait UI (role-based) keeps its own project picker.
- Gantt rewritten (`drawGantt` + `gzBar`, state GZ in localStorage gz): auto range over visible rows, zoom day/week/month/quarter, sticky name/start/end/% columns, filters late/critical/running/milestone, open/close all, jump to today, late overrun stripe, critical outline, milestone diamonds, Friday shading in day zoom.
## 3.70 — estimates from Project_information
- `piA(I,T)`: for projects with no schedule file, or whose latest schedule is >75 days old while Project_information shows more progress (Bolvar Mehr), planned% = elapsed share of contract start→finish, actual% = Project_information pct, delay days = schedule variance in days (or overrun past finish). Flag `est` on PX entries.
- Executive summary / efficiency / SPI / performance / time pages (renderEff) now include every project with project info (were limited to projects with schedules); a note lists estimated projects.
## Layout rules (see docs/THEME-RULES.md §0 and §6)
- One standard box. Page locked at ≥900px (`--vh`), only `#stage` scrolls.
- `fitPanes`/`fitBoxes`/`fillBody` size boxes; wrap resizes with `scSave/scRest` to avoid scroll jumps.
- Timeline: `tlPlace` equal-height row packing.

## Connections
- `?app=mail` runs the Letters / My Work Desk tabs as platform VI (`mail/` iframe). In Project Control these appear only when enabled in Settings → "Connect platforms" (`pcConn`).
- Admin panel tab "I — Project Control" reads `msp-bi/platform.json` and this file.

## Open needs
- Revit 3D model + drawings linked to schedule (completion timing) — not started.
- Real visit statistics need the private server (currently per-browser counters only).
- Real iPad Safari verification.

## 3.72.0 — project scope only inside Project Control
- `gsOn()` = `GS!=='all' && cur==='sched'`; `gIn`, `leaves`/`filt`, `drawTl`, `treeHtml`, `rlHome`, `rlPlan` scope only when it is true. Home, dashboard, projects, planning and efficiency always show all projects; `gsSet` no longer touches `DS_`/`ef`.
- The full-width `#gsBan` row was removed. The selected project shows as the inline `#gsSeg` chip before `#segS` (click opens the picker, ✕ clears). Header pill shows "all" outside Project Control.
- Timeline: bar runs to the planned end (`e-dl`), the red `.ex` hatch runs to the end with delays (`e`, `endD`), with the date in `.exl`; the row caption shows both dates.

## 3.73.0 — local AI assistant
- See `shared/ai/README.md`. Floating icon (bottom-left) and a rail button open the chat; `window.VX_DATA()` / `window.VX_CTX()` expose project facts (actual, planned-to-date, delay, planned/forecast end).

## 3.74.0 — assistant online engine (Coarena)
- Default engine is Coarena's free OpenAI-compatible API; key and model are set by the user in the panel ⚙ (stored in localStorage only). Local Qwen remains selectable. See `shared/ai/README.md`.

## 3.75.0 — server verification badges; admin-set assistant key
- Data center: `srvVerify()` compares every `stPayload()` file with the repo copy (GitHub contents API, falling back to Pages) and `dcBadges()` shows `✓ روی سرور` / `⚠ فقط این مرورگر` / `⚠ با سرور فرق دارد` per project, for pinfo and for delays, plus a summary with "ذخیره روی سرور" (admin, re-pushes all).
- `window.VX_ADMIN.put(path,obj)` writes any repo file with the admin GitHub key. The assistant key is saved by the admin to `shared/ai/config.json` (`k` = reversed+base64, NOT secret; the repo is public), and every user's assistant reads it.

## 3.76.0 — encrypted admin vault
- `shared/vault.json` = `{v,alg,salt,iv,ct,t}`; payload `{gh, coarena}` encrypted with PBKDF2-SHA256 (250k) → AES-256-GCM from the admin password (WebCrypto). Saved from the Data center "🔐" box (needs the GitHub key on that browser). On a new browser, the password unlocks it → `ghTok` stored locally → `storePush` then auto-saves every upload to the repo.
- Plain GitHub tokens must never be committed: GitHub revokes tokens pushed to public repos.

## 3.77.0 — one sign-in for the ecosystem (GitHub Pages)
- `shared/auth.js`: users in `shared/users.json` (`{u,role,sites[],salt,h}`, PBKDF2-SHA256 150k). `<script src="../shared/auth.js" data-require="<slug>">` guards a page: no session → `admin/?next=…`; slug not allowed → root `?denied=`. Used by msp-bi (project-control), trading, mail, files (file-manager), aide (executive-desk). Only active on `*.github.io`; the own server keeps its hub login.
- `admin/` on github.io: sign-in against users.json (first run = create admin + GitHub key, which also writes the vault); after sign-in → `next` or the root page. An admin opening `admin/` again enters the panel.
- Root `index.html`: signed-in users see their platforms; others are greyed with 🔒; "Sign out".
- msp-bi Data center 👥 box (admin): add/update/delete users, role and allowed platforms. Admin sign-in password also unlocks the vault (`sessionStorage.vxPw` → `vxAfterLogin`).
- 3.77.1: `admin/` on github.io uses the original panel sign-in again (demo hub users and passwords, no GitHub key, no users.json). Successful sign-in writes `vxSess` (role admin for the ecosystem admin, `sites` = the user's modules) and goes to `next` or the root page. The users.json/vault setup screen was removed from sign-in.
- Panel data (shared/demo.js on github.io): the whole hub database (users, subscriptions, modules, sign-ups…) is one file in the repo, `data/vertex.json` `{v,t,hub}`. Every browser loads it before the first API answer (newer `t` wins). Every change (not GET, not login) is written back after 1.2 s with the GitHub key already on the admin's browser (`localStorage.ghTok`); without it the bar says changes stay in this browser. The reset button was removed because the data is shared. On the own server, the hub replaces all of this.

## 3.78.0 — key-free upload via repo inbox
- Upload tab box "📤 بارگذاری روی سرور": opens GitHub's own upload page for `msp-bi/data/inbox/` (the owner is signed in to GitHub, so no key in the app). `inboxPull()` lists the folder through the public contents API (no key), downloads new files (tracked by sha in `localStorage.inboxDone`) and runs `ingest()`. Every browser does this on load, so the data is shared. Projects loaded from inbox files count as "✓ روی سرور".

## 3.79.0 — uploads on our own server
- Hub (`hub/server.py`): `GET /api/v1/files/<site>` (list: name,size,ts,by,sha), `PUT /api/v1/files/<site>/<name>` (raw body, ≤ `max_file` 25 MB, needs write grant), `GET …/<name>` (download, read grant), `DELETE …/<name>` (manager/admin). Stored under `<data_dir>/files/<site storage key>/` with `.meta.json`; per-subscription isolation via `ss()`. Tests: `hub/tests/test_files.py`.
- Dashboard: when not on github.io (`HUBF`), `ingest()` first PUTs every dropped/selected file to the hub with `hub.token`, then loads it; `inboxPull()` lists the hub folder and loads new files in every browser. On github.io the GitHub inbox flow (3.78) stays.
