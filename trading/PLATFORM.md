# XII — Trading (trading/)
Renamed from "XII — Company Space" on 2026-11-17 (owner request). Slug `trading`, color #c2185b, icon `chart`.
## Modules (independent, one tab each in trading/index.html; URL hash #gmgn / #pump)
- `gmgn-skills/` — GMGN Agent Skills (MIT, GMGN): TS CLI + 19 SKILL.md + docs/workflow-*. Needs Node 18+, GMGN_API_KEY (+ GMGN_PRIVATE_KEY signing key for orders).
- `pumpfun-bot/` — chainstacklabs/pumpfun-bonkfun-bot (Apache-2.0): Python 3.11+/uv Solana sniper bot for pump.fun / LaunchLab / letsbonk / StonkFun; configs in bots/*.yaml; author says learning-only.
Both vendored verbatim (no .git); `files.json` in each = file index for the browser (regenerate if files change).
## Rules
- Browser page only BROWSES code/docs (marked + DOMPurify from jsDelivr). Nothing executes in the browser.
- Keys (wallet private key, API keys, RPC tokens) live only on the server in .env — never in the browser, site or repo.
- Running/start-stop/logs to be wired once the VPS exists.
- `.nojekyll` at repo root is required so GitHub Pages serves `__init__.py`, `.claude-plugin/` etc. and does not run Liquid on vendored Markdown.
