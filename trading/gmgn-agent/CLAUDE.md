# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Solana meme-coin trading terminal + autonomous AI agent.
- `server.js` — Bun HTTP server (port 3333): serves the UI and provides API routes
- `index.html` — Single-page vanilla JS frontend (no framework, no build step)
- `agent/` — Autonomous trading agent (ReAct loop via OpenRouter, trades via Jupiter Ultra)

## Running

```bash
bun server.js          # web terminal at http://localhost:3333

# Agent one-shot modes
bun agent/index.js screen    # one screening cycle
bun agent/index.js manage    # one management cycle
bun agent/index.js status    # print state

# Daemon (PM2) — process name: gmgnAgent
pm2 reload gmgnAgent --update-env
pm2 logs gmgnAgent --lines 50
```

No build step. Dependencies: `bun install` (see `package.json`).

## Required `.env`

```
WALLET_ADDRESS=
WALLET_PRIVATE_KEY=       # base58 — used by Jupiter to sign transactions
OPENROUTER_API_KEY=       # LLM via OpenRouter
JUPITER_API_KEY=          # optional, raises rate limits
RPC_URL=                  # Helius or other Solana RPC
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
AUTH_USERNAME=            # web terminal login
AUTH_PASSWORD_HASH=       # bcrypt hash — generate with: bun setup-auth.js
```

## Server Architecture (`server.js`)

Five API routes:
- `GET /api/trending` — calls `gmgn-cli market trending`, filters by `minKol`/`minSm` in-process
- `GET /api/trenches` — calls `gmgn-cli market trenches`
- `POST /api/swap` — buys via **Jupiter Ultra** (`jupiterBuy()`) — accepts `{outputToken, amountSol, slippage}`; returns `{ok, signature}`
- `POST /api/sell` — sells via **Jupiter Ultra** (`jupiterSell()`) — accepts `{inputToken, amountLamports, slippage}`; returns `{ok, signature}`
- `GET /api/portfolio/*` — proxies `gmgn-cli portfolio` commands

The frontend persists state and trade config to `localStorage` under keys `gmgn_state` and `gmgn_cfg`. Session auth uses an in-memory token set (cleared on restart); token sent via `x-session-token` header or cookie.

## Jupiter Ultra (`agent/jupiter.js`)

All swaps (both web terminal and agent) go through Jupiter Ultra API (`https://ultra-api.jup.ag`):
1. `GET /order` — gets unsigned transaction
2. Sign with `Keypair.fromSecretKey(bs58.decode(WALLET_PRIVATE_KEY))`
3. `POST /execute` — submits signed transaction

Returns `{ ok: true, data: { signature } }` on success. The server flattens this to `{ ok, signature }` for the frontend.

## Agent Architecture (`agent/`)

| File | Role |
|------|------|
| `index.js` | Entry point — cron scheduling, startup validation, Telegram listener wiring |
| `screener.js` | Screening cycle — pre-filter trending tokens, call LLM to research + buy |
| `manager.js` | Management cycle — reconcile state, hard stops, call LLM to hold/close |
| `tools.js` | Tool schemas + handlers for both screener (`SCREENER_TOOLS`) and manager (`MANAGER_TOOLS`) |
| `claude.js` | ReAct loop — OpenRouter OpenAI-compatible client, converts Anthropic tool schema to OpenAI format |
| `prompt.js` | System prompts for SCREENER and MANAGER roles, injects live state + lessons |
| `evolve.js` | Strategy reflection cycle — LLM reviews trade history and writes new lessons |
| `telegram.js` | Notifications + long-poll command listener |
| `gmgn.js` | `gmgn-cli` wrappers (data only — trending, token info, portfolio; NOT used for trading) |
| `state.js` | Read/write `state.json` — positions, closed history, lessons, skip list |
| `config.js` | Loads `agent-config.json` with defaults; exports all env vars |
| `logger.js` | Structured logger with TTY-aware colours and `sanitize()` to strip secrets from logs |

## Agent Config (`agent-config.json`)

Key fields:
```json
{
  "dryRun": false,
  "amountSolPerTrade": 0.05,
  "maxPositions": 5,
  "stopLossPercent": 15,
  "takeProfitPercent": 80,
  "trailingTriggerPercent": 20,
  "trailingDropPercent": 5,
  "timeStopHours": 24,
  "timeStopMinGainPct": 15,
  "screening": {
    "minKol": 2, "minSm": 3,
    "requireBullishSignal": true,
    "minMcap": 50000, "maxMcap": 5000000
  },
  "claude": { "model": "nvidia/nemotron-3-super-120b-a12b:free" }
}
```

Reload config without restart: `pm2 reload gmgnAgent --update-env` (config is read fresh each cycle).

## Hard Exit Logic (runs every 2 min, no LLM)

In `manager.js` `hardSlCheck()`, in order:
1. Update `peakPnlPct` in position state if current PnL is a new high
2. Hard SL: PnL ≤ −15% → close immediately
3. Trailing stop: peak ever ≥ +20% AND current PnL ≤ peak − 5% → close
4. Time stop: age > 24h AND PnL < 15% → close
5. Absolute stop: age > 48h → close regardless

## Telegram Commands

`/status` `/config` `/skip` `/lesson` `/briefing` `/help` — read-only info
`/study` — trigger screening cycle
`/manage` — trigger management cycle
`/evolve` — run strategy reflection (requires ≥ 3 closed trades)

## Key Behavioural Details

- **Re-buy cooldown**: same token cannot be re-bought within 1h of being closed (enforced in pre-filter and `buy_token` handler)
- **Bullish signal filter**: token must have positive price change on 5m, 1h, AND 24h to pass pre-filter
- **Conviction gating**: LLM scores tokens 1–10; `buy_token` tool rejects score < 7 at handler level
- **One buy per cycle**: `boughtThisCycle` Set prevents multiple buys in one screening run
- **Secrets in logs**: all log output passes through `sanitize()` in `logger.js` which redacts API key patterns
- **PM2 shell wrapper**: `start-gmgnAgent.sh` exists because PM2 can't `require()` Bun ESM modules directly
