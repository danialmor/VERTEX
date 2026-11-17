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
