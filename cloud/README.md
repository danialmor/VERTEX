# VERTEX Cloud (Cloudflare)

Online store for the whole ecosystem on GitHub Pages: one Cloudflare Worker (`worker.js`) with one KV namespace (`VX`). No key in the browser or the repo; the Worker owns the storage.

- Panel database → doc `vertex` (`shared/demo.js`)
- AI settings (engine, model, Coarena key, prompt) → doc `ai-config` (`admin/aiset.js`, `shared/ai/ai.js`)
- Project Control uploads → files `msp-bi/*` (`msp-bi` ingest/inboxPull); processed store → docs `msp-<name>` (`ghRead`/`ghPut`)
- Client: `shared/cloud.js` (`VX_CLOUD`); URL constant `CLOUD` (empty = off; `localStorage.vxCloud` overrides for tests)

Deploy: `wrangler kv namespace create VX` → put id in `wrangler.toml` → `wrangler deploy`. Allowed origins: `ORIGINS` var. Local test: `wrangler dev --local`.
Limits (free plan): KV 1 GB, 1,000 writes/day, value ≤ 25 MB (Worker caps files at 20 MB).
