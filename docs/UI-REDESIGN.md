# Yearly UI redesign (design versions) — feature VX-009

The owner releases a new visual design of the control panel once a year. Code and features never change for a redesign;
only a **design file** that overrides the tokens in `admin/panel.css` (`--bg --card --ink --line --brand --side --r --shadow …`).

## Files
- `admin/panel.css` — design 2026 (TailAdmin, MIT). The token names at its top are the contract: never rename them.
- `admin/ui/<year>-<name>.css` — a design version (e.g. `2027-adminkit.css`, AdminKit MIT). Overrides tokens + sidebar/card chrome only.
- `admin/ui/current.js` — `DEFAULT` = official version for everyone; `FILES` maps id → css. A viewer can preview another version
  in their own browser from «مرکز کنترل → نسخه‌ی طراحی» (localStorage `vxUI`).
- `shared/releases.json → ui` — list shown in the control center (id, name, base template, status, note, official).

## Yearly process
1. **Brief**: what should change (feel, density, colour), which source template (TailAdmin, AdminKit, the 100 free dashboards collection, …). Licence must be MIT or similar.
2. **Design with a design AI**: Claude (frontend-design skill / Claude Design "Design" artifact) or Figma (Figma MCP) produces the
   token set: 4–6 colours, type, radius, shadow, sidebar style, light + dark. Check iPad Safari, RTL, Persian text (Vazirmatn).
3. **Build** `admin/ui/<year>-<name>.css` with only token overrides and chrome rules; add it to `FILES` in `current.js` and to `releases.json → ui.versions` (status `preview`).
4. **Preview**: the owner opens «مرکز کنترل», presses «پیش‌نمایش», checks all tabs, comes back with «برگشت به رسمی».
5. **Release**: set `DEFAULT` in `current.js` and `ui.official` in releases.json to the new id; bump control panel version and ecosystem version; changelog entry «طراحی <year>».
6. Keep old design files: anyone can still preview them.

## Later
Apply the same mechanism to the other platforms through the central Theme project (one token file per year shared by all platforms).
