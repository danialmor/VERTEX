# VERTEX Cloud (Cloudflare)

Online store for the whole ecosystem on GitHub Pages: one Cloudflare Worker (`worker.js`) with one KV namespace (`VX`). No key in the browser or the repo; the Worker owns the storage.

- Panel database → doc `vertex` (`shared/demo.js`)
- AI settings (engine, model, Coarena key, prompt) → doc `ai-config` (`admin/aiset.js`, `shared/ai/ai.js`)
- Project Control uploads → files `msp-bi/*` (`msp-bi` ingest/inboxPull); processed store → docs `msp-<name>` (`ghRead`/`ghPut`)
- Client: `shared/cloud.js` (`VX_CLOUD`); URL constant `CLOUD` (empty = off; `localStorage.vxCloud` overrides for tests)

Deploy: `wrangler kv namespace create VX` → put id in `wrangler.toml` → `wrangler deploy`. Allowed origins: `ORIGINS` var. Local test: `wrangler dev --local`.
Limits (free plan): KV 1 GB, 1,000 writes/day, value ≤ 25 MB (Worker caps files at 20 MB).

Live: https://vertex-cloud.0tddq47ko7zqg6gdmwllyzi.workers.dev (account 6cf1c3b1…, KV `vertex-cloud-VX` 0532a269289a4eb0bed4a85b95cc817a). Files list uses an index doc `fidx:<site>` because KV list() lags up to 60 s; reads from other regions can lag up to 60 s too.
Deploy needs a Cloudflare API token (Edit Cloudflare Workers) in env `CLOUDFLARE_API_TOKEN` — never commit it.
