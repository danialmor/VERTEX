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
