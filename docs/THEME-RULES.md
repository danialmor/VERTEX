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
   - Pages with several frames stacked (delays, data centre, work desk on short screens): the page body (`#schedBody`, `#fiBody`, `#wkBody`) gets `.pgsc` from `fitBoxes()` and scrolls as one; add new such bodies to that list. `fitBoxes()` also runs after every tab / segment click.
   - Label text is never smaller than 10.5px.
4. Heights use `VHs()` / `svh`, never `dvh`, so the Safari toolbar showing/hiding does not shrink a frame (the home frame uses `homeFix()`).
5. Sticky headers inside a frame use `top:0` (the scroller is the inner box, it has no padding offset).
6. `overscroll-behavior:contain` on scrollers; `html, body` have `overscroll-behavior-y:none`.

## 3. Content
1. Lists of projects are rows, not buttons: a row is `role="row"` with `tabindex="0"`; only real actions look like buttons.
2. Filters inside a frame are tabs (`.pvtab`), not filled chips.
3. With many items, charts switch to a dense layout (`.efx.many`) and scroll inside their card; with one item they show detail views (`efOne`).
4. Do not duplicate an action on the same page (e.g. the delay form is opened only by "گزارش تأخیر" in the header).
5. The simulation ("ghost") mode must show **15 projects** on every page so layouts are checked at full load.

- (3.61) Side-by-side columns inside `#schedBody`, `#fiBody`, `#wkBody` are stretched to the bottom of the screen by `fillBody()` (classes `.fillg/.fillk/.fillw`); each column scrolls inside itself. Stacked layouts fall back to `.pgsc`.

## 6. Height and scroll rule (since v3.62.0) — must follow
1. **Never write `100vh`** (CSS or JS). Use `var(--vh)`; `setVH()` keeps it equal to the real visible height (`VHs()` = `innerHeight` / `visualViewport.height`). On iPad Safari `100vh` is taller than the visible area, which made every page scroll a little.
2. On desktop / iPad landscape the **page itself never scrolls**. Every frame is fitted by `fitPanes()` / `fitBoxes()` and scrolls inside itself; side-by-side columns use `fillBody()`, stacked bodies use `.pgsc`.
3. Height changes (Safari bars, bookmarks bar) re-fit the frames; only while typing in a field are small changes ignored (keyboard).
4. Minimum frame height is 220px (360px only when the screen is shorter than 560px) so a frame never pushes the page down.
5. A frame that scrolls inside itself has **no backdrop blur** (`backdrop-filter:none`) and a slightly more solid background; on Safari, blur + inner scroll + rounded corners draws broken corners.
6. Check with the crawler: every tab and sub-tab at 1366×922, 1180×760 and 1024×700, light and dark — page scroll (`ps`) must be 0.
7. (3.63) **Page lock:** at ≥900px `html`/`body` are exactly `var(--vh)` tall with `overflow:hidden`; the top bar never moves; only `.view.active` may scroll (fallback). Fitted frames are sized with `Math.floor(...) - 2` so no 1px inner scroll appears.
8. (3.63) **Dashboard tiles** are packed in tidy rows by `tlPlace()`: each row has one height, shorter tiles of the same width stack in a column, the last column widens to close any gap. Tile padding 10px 13px, gap 8px, row unit 40–50px.
