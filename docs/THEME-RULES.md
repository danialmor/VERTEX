# Theme rules (dashboard `msp-bi`, since v3.46.0)

These rules exist so that changing a theme never requires fixing individual boxes again.
The single source is the **THEME CONTRACT** block at the end of the `<style>` in `msp-bi/index.html`.

## 0. Standard box (since v3.53.0) — read this first
There are exactly **two** box shapes in the whole dashboard. The single source is the **STANDARD BOX** block at the very end of the `<style>`.

| level | what it is | tokens | look |
|---|---|---|---|
| 1 — **frame** | any large box that sits directly on the page background (`.card`, `.dframe`, `.bigbox`, `.fitc`, `.pane`, `.kcol`, `#pjPick`) | `--bx-rad`, `--bx-pad`, `--bx-bg`, `--bx-line`, `--bx-shadow` | radius `--rad`, 1px line, glass background, shadow, 14px padding |
| 2 — **card** | any box inside a frame (`.card` nested in a frame, `.kt`, `.need`, `.pvbox`, `.pvl`, `.icd`, `.plc`, `.dcst`, `.pc2`, `.gwrap`, home `.row`) | `--bx2-rad`, `--bx2-pad`, `--bx2-bg`, `--bx2-line` | radius `--rad − 8px`, 1px line, no shadow, no blur |

Rules:
1. A new box never writes its own radius, border, shadow or background. Give it `.card` (it becomes a frame on the page, a card inside a frame automatically) or add its class to the level-2 selector list.
2. No third nesting level with a border: inside a card use divider lines only.
3. Scrolling frames (`.fitc`) keep the same look; their padding is a transparent border so the scrollbar stays inside the frame.
4. The old `--tf-*` / `--tc-*` tokens now point to `--bx-*` / `--bx2-*` (`--tf-line` stays as the divider-line colour).
5. Exceptions: chat bubbles, pills/chips, buttons, the dark hero on the home page (radius only).

## 1. Tokens — the only allowed source of colour and shape
| token | used for |
|---|---|
| `--tf-bg`, `--tf-line`, `--tf-rad`, `--tf-pad` | **frames**: the large boxes that hold a page's content (`.dframe`, `#plBody`, `.fitc` boxes, info cards frame) |
| `--tc-bg`, `--tc-line`, `--tc-rad` | **cards inside frames** (info cards, project list, efficiency cards, planning cards) |
| `--sb-thumb`, `--sb-thumb-h` | scrollbars (thumb, hover); the track is always transparent |
Each theme pack only sets the base variables (`--glass2`, `--line2`, `--r-xl`, `--rad`, `--card-border`, `--ink`…); the contract derives the tokens from them. Never write a literal colour, border or radius on a frame, card or scrollbar.

## 2. Scrolling
1. A page never scrolls as a whole on tablet/desktop (width ≥ 900 px). Each page fits the screen.
2. Content that is longer than the screen scrolls **inside a fixed frame**, like the dashboard: the frame stays, only its content moves.
   - Frames built by JS: add the selector to `fitBoxes()` (gets class `.fitc` and its height from `VHs()`, the stable small viewport height).
   - Frames with their own wrapper: outer box `overflow:hidden`, inner element scrolls (`#plBody > .plsc`, `.dframe > .dsc`).
3. Every renderer that changes a frame's content calls `fitBoxes()` at the end.
4. Heights use `VHs()` / `svh`, never `dvh`, so the Safari toolbar showing/hiding does not shrink a frame (the home frame uses `homeFix()`).
5. Sticky headers inside a frame use `top:0` (the scroller is the inner box, it has no padding offset).
6. `overscroll-behavior:contain` on scrollers; `html, body` have `overscroll-behavior-y:none`.

## 3. Content
1. Lists of projects are rows, not buttons: a row is `role="row"` with `tabindex="0"`; only real actions look like buttons.
2. Filters inside a frame are tabs (`.pvtab`), not filled chips.
3. With many items, charts switch to a dense layout (`.efx.many`) and scroll inside their card; with one item they show detail views (`efOne`).
4. Do not duplicate an action on the same page (e.g. the delay form is opened only by "گزارش تأخیر" in the header).
5. The simulation ("ghost") mode must show **15 projects** on every page so layouts are checked at full load.
