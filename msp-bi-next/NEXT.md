# msp-bi-next — redesign copy of I — Project Control

Copy of `msp-bi/` (v3.64.0, 2026-11-17) made on the owner's request to apply the murmura-style redesign without touching the live platform.
- Same data: reads `../msp-bi/data/store/` (no separate data folder). Uploads still push to `msp-bi/data/store/`.
- Changes vs msp-bi: `<style id="nextTheme">` layer (mint→cream ground, dark pill active tab, yellow rail action, 26px cards);
  new tab "تقویم" (`v-cal`) = iframe `calendar.html` (Jalali month calendar: project start/finish, delays by impact, project filter chips, mini calendar, needs-attention, progress).
- Service worker cache `next-dash-v*`; visit counter site `project-control-next`.
- When approved: port `nextTheme` + calendar into `msp-bi/`, then delete this folder.
