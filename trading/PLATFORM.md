# XII — Trading (trading/)
Renamed from "XII — Company Space" on 2026-11-17 (owner request). Slug `trading`, color #c2185b, icon `chart`.
## Modules (independent, one tab each in trading/index.html; URL hash #gmgn / #pump)
- `gmgn-skills/` — GMGN Agent Skills (MIT, GMGN): TS CLI + 19 SKILL.md + docs/workflow-*. Needs Node 18+, GMGN_API_KEY (+ GMGN_PRIVATE_KEY signing key for orders).
- `pumpfun-bot/` — chainstacklabs/pumpfun-bonkfun-bot (Apache-2.0): Python 3.11+/uv Solana sniper bot for pump.fun / LaunchLab / letsbonk / StonkFun; configs in bots/*.yaml; author says learning-only.
Both vendored verbatim (no .git); `files.json` in each = file index for the browser (regenerate if files change).
## Modules added 2026-11-17 (second batch; tabs #agent #sol #ft #ccxt #of)
- `gmgn-agent/` — gmgnAgent (Bun web terminal + 2 autonomous LLM trading agents, Jupiter swaps, Telegram). License not stated. `node --check` passes on all JS.
- `solscope/` — SolScope (Flask proxy + HTML) top Solana wallets from GMGN leaderboards. VERTEX patch: /proxy restricted to *.gmgn.ai (was an open proxy). Server ran locally OK.
- `freqtrade/` — freqtrade develop (GPL-3.0) WITHOUT tests/ (22 MB). Verified: pip install -e ., `freqtrade --version` 2026.11-dev, create-userdir, list-strategies (SampleStrategy OK), list-exchanges.
- `ccxt/` — trimmed ccxt 4.5.92 (MIT): README, LICENSE, wiki/, examples/js+py, dist/ccxt.browser.min.js. Full repo is 521 MB. The "live" view runs ccxt in the browser (public data; OKX, Kraken, Bitget answered in tests; Binance/Bybit/KuCoin/Coinbase/MEXC did not from the browser).
- `orderflow-src/` + `orderflow/` — Order Flow Tracker (Apache-2.0) source (demo GIFs removed) and a STATIC EXPORT built with next.config output:'export', basePath '/VERTEX/trading/orderflow' (metadata routes marked force-static). jest 150/150 passed; live Bybit WebSocket connected in test. Rebuild: copy orderflow-src, npm ci, npx next build, copy out/ → trading/orderflow/.
- Duplicate gmgn-skills uploads were byte-identical to gmgn-skills/ (not re-added).
- Every module has `GUIDE.fa.md` (Persian guide, first view in its tab). files.json per module = browser file index.
## Rules
- Browser page only BROWSES code/docs (marked + DOMPurify from jsDelivr). Nothing executes in the browser.
- Keys (wallet private key, API keys, RPC tokens) live only on the server in .env — never in the browser, site or repo.
- Running/start-stop/logs to be wired once the VPS exists.
- `.nojekyll` at repo root is required so GitHub Pages serves `__init__.py`, `.claude-plugin/` etc. and does not run Liquid on vendored Markdown.
