# AGENTS.md — start here

This file is the entry point for any AI assistant or developer opening this repository.
Read it fully, then read the documents it links. **Do not start from scratch**: most of the system exists and is tested.

## What this project is
**VERTEX** (formerly TSUBA and Danimor; repo `danialmor/VERTEX`, renamed from TSUBA on 2026-11-14) is a private business ecosystem for a construction / interior-design company in Isfahan, Iran
(owner: Danial, architect and construction project manager; ~10 active projects, 30–40 users).
One domain hosts several sites ("modules") that share **one login, one database, one permission system and one integration layer**.

- User-facing language: **Persian (Farsi), right-to-left**. Documentation and code comments for maintainers: **English**.
- Primary device of the owner: **iPad, Safari, browser only**. Everything must work there.
- Preference: free / low-cost solutions; one small VPS.

## Read next (in this order)
1. `docs/STATUS.md` — what is done, what is half-done, known limitations, **what to do next**.
2. `docs/ARCHITECTURE.md` — components, data model, API reference, integration layer, security.
3. `docs/DECISIONS.md` — why things are the way they are (do not undo these without the owner's approval).
4. `docs/DEPLOY-fa.md` — server installation guide for the owner (Persian).

## Repository map
| Path | What it is |
|---|---|
| `index.html` | Ecosystem landing page: the VERTEX triangle with the 12 platforms on its three sides (noindex). |
| `shared/brand.js` | **Brand root**: name, logo, taglines and the 12 platforms (numeral, name, description, colour, icon, link). Change the brand only here. |
| `shared/demo.js` | In-browser demo hub used only on GitHub Pages (`*.github.io`) so the panel can be tried without a server. |
| `assets/vertex-mark.svg` | The logo (plain SVG triangle). `assets/tsuba-emblem.svg` is the previous logo, unused. |
| `mail/` | **Letters platform** (VI): for now a full-screen frame that runs `msp-bi/index.html?app=mail` (letters + my work desk only, same data and login). Project Control hides those two tabs unless connected in Settings → «اتصال پلتفرم‌ها» (`localStorage.pcConn`). Own design for this platform continues here. |
| `files/` | **File Manager** (platform VII): `index.html` + `files.css` + `files.js`. State is one hub record `data/file-manager/state/main`; file bytes stay in the browser (IndexedDB) until the server gets blob storage. Owner-only overview tab: `admin/filemap.js`. |
| `msp-bi/` | **Project Control** dashboard (single large HTML app, v3.64.0) + `hub-bridge.js` (server sync) + `sw.js` + PWA files. |
| `admin/` | **User Control Panel** + unified login: ecosystem-admin console (subscriptions, requests, modules, staff, system) and subscription-admin panel (users, 10 levels, profile). |
| `admin/extras.js`, `admin/sitemap.js`, `admin/lib/` | Panel extensions (permissions, notifications, search, import, security, sales) and the ecosystem site map (Drawflow, MIT). They reach the panel through `window.TSP`. |
| `aide/` | Connection/test page for the CEO & Secretary desk. The real Aide app lives in repo `danialmor/aide`. |
| `shared/sdk.js` | Browser SDK for the hub (login, offline outbox, conflicts, paging, AI streaming). |
| `hub/server.py` | **The core backend** (Python 3 standard library only, SQLite). |
| `hub/deploy/` | `install.sh` (one-command VPS install), `update.sh` + timer (auto-update from GitHub every 10 min), Caddyfile, systemd units. |
| `hub/tests/` | All tests (see below). |
| `docs/` | Documentation (English) + owner guides (Persian, `*-fa.md`). |

## How to run locally
```
python3 hub/server.py init                       # creates admin "Admin" / PIN "Admin123" and the default sites
HUB_TEST_MODE=1 HUB_STATIC_DIR=$PWD python3 hub/server.py   # http://127.0.0.1:8787/admin/ (login) and /msp-bi/
```
Environment: `HUB_DATA_DIR`, `HUB_PORT`, `HUB_STATIC_DIR`, `HUB_TEST_MODE`, `HUB_CONFIG` (JSON file, see `hub/config.example.json`).

## Tests (must stay green)
```
python3 hub/tests/test_hub.py       # auth, CAS records, sync, admin, AI gateway
python3 hub/tests/test_perf.py      # indexes, paging, ETag/304, AI streaming
python3 hub/tests/test_core.py      # ecosystem core: module registry, event bus, relations
python3 hub/tests/test_testmode.py  # test mode credentials
python3 hub/tests/test_tenants.py   # subscriptions: owner panel, levels, seats, codes, isolation, expiry
node hub/tests/sdk_test.js && node hub/tests/sdk_perf_test.js
node hub/tests/e2e_bridge.js        # real hub + browser (needs Playwright): login, server save, 2nd device, merge, files, logout
node hub/tests/e2e_panel.js         # control panel: admin creates subscription, owner adds user, user lands in his module
```

## Rules for changes
1. **All data lives on the server** (hub). The browser keeps only a session working copy that is wiped on logout. Never add a feature that stores business data only in the browser when running against the hub.
2. Dashboard changes: bump `VERSION` and add a Persian entry at the top of `CHANGELOG` inside `msp-bi/index.html`; bump the cache name in `msp-bi/sw.js`.
3. Keep the hub dependency-free (stdlib only). Add tests for every new endpoint.
4. This repository is **public**: never commit real company data, real user lists, tokens or keys.
5. UI text in Persian, RTL, with correct ZWNJ (half-space). Code, comments and docs in English (some legacy Persian comments exist).
6. Ask the owner before changing anything listed in `docs/DECISIONS.md`.
7. Never hard-code the brand name, logo or platform names in a page: read them from `shared/brand.js` (`data-brand="name|logo|tagline-en|tagline-fa|motto|favicon"`, `BRAND.label(slug,'fa')`, `BRAND.desc(slug,'fa')`). Show platforms as `<numeral> — <function>` with the description smaller below.
8. Dashboard visuals follow `docs/THEME-RULES.md`: frames, cards and scrollbars take colour and shape only from the theme tokens; long content scrolls inside fixed frames like the dashboard; check layouts with the 15-project simulation.
9. Subscription users must never see the control panel; only the ecosystem admin and subscription admins (`owner`) do. Keep data isolation per subscription (`Hub.ss`).

## Where to start
See **"Next steps"** in `docs/STATUS.md`. The top item is always the current priority.

## Standing rules from the owner (2026-11-17) — always apply
1. Platform names follow the landing image: "I — Project Control" … "XII — Trading".
2. Platform mark = inverted triangle in the platform color with its Roman numeral inside: `BRAND.mark(slug, size)` / `BRAND.markURL(slug)` in `shared/brand.js`. Use it wherever a platform logo appears.
3. Global policy lives only in `shared/policy.json`. When policy changes, edit it there; the admin panel tab "لوگو و سیاست" and `docs/POLICY.md` follow (run `node tools/platform_meta.js`).
4. Admin panel (`admin/eco.js`): "لوگو و سیاست", "سایت کلی" (whole site), and one tab per platform (currently "I — کنترل پروژه"). Add a tab for each new platform.
5. Each platform keeps an English, AI-readable `<platform>/PLATFORM.md` (purpose, build, data, rules, connections, open needs) and a generated `<platform>/platform.json` (version + changelog). Update both on every release so the panel records every change.
6. Visits: pages include `shared/track.js` with `data-site="<slug>"`. Real all-user stats need the private server (`POST /api/v1/track`, not yet implemented server-side).

## User Control Panel theme 4.0 (TailAdmin) — 2026-11-17
- `admin/panel.css` rewritten in the TailAdmin free template's design language (MIT, license in `admin/lib/TAILADMIN.LICENSE`); old CSS kept nowhere — git history has it.
- `admin/shell.js` (loaded last): grouped sidebar, header (toggle, title, search+bell moved from extras.js, theme, user menu), collapse/off-canvas sidebar. Features stay in index.html + extras/sitemap/filemap/eco/fx.js; they rely only on CSS variable names (--card, --muted, --line …) — keep them.
- Logout is in the header user menu (`#umB` → `[data-um=out]`); `#lo` still exists hidden. e2e: `node hub/tests/e2e_panel.js` (admin nav = 15).
- Saved design proposals: `docs/designs/` (see its README).
- Panel tab "Sim · گردش‌کار هوشمند" (`admin/sim.js`, admin only): connects a Sim instance (simstudioai/sim, Apache-2.0, uploaded 2026-11-17 as sim-main.zip — NOT vendored: Next.js+Postgres, needs Docker/12 GB, runs on the future VPS). Stores {url, chats, ideas} at /data/admin/sim/main. Sim /workspace forbids cross-site framing → opened in a new tab; deployed /chat/* agents are embedded in an iframe. Admin nav = 16.
- Platform XII renamed to **Trading** (`trading/`, see `trading/PLATFORM.md`): two independent tabs — GMGN Skills and the pump.fun bot (both vendored source, browse-only, run on server). `.nojekyll` added at repo root.
- Trading now has 7 module tabs (GMGN Skills, gmgnAgent, SolScope, pump.fun bot, Freqtrade, CCXT live, Order Flow live); each with GUIDE.fa.md. Details: trading/PLATFORM.md.

- Control panel → «ذخیره در GitHub» (`admin/github.js`, ecosystem admin): one GitHub key (`localStorage.ghTok`, shared by every page of the site) for all repo saves — panel data `data/vertex.json`, dashboard store `msp-bi/data/store/`, assistant key `shared/ai/config.json`; optional encrypted copy `shared/vault.json` unlocked on other devices with the admin password. Never commit a plain token.

## Control panel rule (owner, 2026-11-23) — the most important rule
The control panel (admin, tab «مرکز کنترل», `admin/monitor.js`) is the owner's monitoring center for the whole ecosystem.
1. `shared/releases.json` is the single source of versions: one ecosystem version + one version per platform, each with its own changelog. Bump the platform's version and the ecosystem version on every release.
2. Every new feature gets a code in `releases.json → features` (`VX-` ecosystem, `PC-` project control, `AD-` Aide, `MS-` messenger, `ML-` mail, `FM-` files, `TR-` trading; next free number), with a short Persian description, status (live/partial/planned), files, links to other platforms and `check` paths. The tab shows it as an expandable row and checks its connections every time it opens.
3. Every platform shows its own About (`shared/about.js`, loaded by `shared/auth.js`; Aide: menu under the brand A) from the same file.
4. Keep text in the panel small (13px body, 11.5–12px meta).
- Design versions (VX-009): yearly UI redesign = a new `admin/ui/<year>-<name>.css` over the panel.css tokens; process in `docs/UI-REDESIGN.md`.
