# gmgnAgent — Active Strategy

Last updated: 2026-04-22

---

## Overview

Two autonomous Solana meme-coin trading agents run in parallel, each targeting a different signal source:

| Agent | PM2 | Strategy | Data source |
|-------|-----|----------|-------------|
| **gmgnAgent** (Trend) | 22 | Buys trending tokens with KOL/SM momentum | GMGN trending (1h + 5m) |
| **gmgnNewToken** (New Token) | 25 | Buys freshly launched pump.fun tokens | GMGN trenches (new_creation) |

Both share the same manager, Jupiter Ultra execution, and state schema. They run independent state files and do not compete for positions. Each agent notifies Telegram on startup, buy, and sell. Only `gmgnAgent` has a Telegram command listener; it proxies `/new_*` commands to `gmgnNewToken`'s state file.

All trades execute via **Jupiter Ultra** (on-chain, signed with the wallet private key).

**Model:** `openai/gpt-oss-120b` via OpenRouter

---

## gmgnAgent — Trend Screener

### Cycle Timing

| Cycle | Interval |
|-------|----------|
| Screening | Every 2 minutes |
| Management | Every 1 minute |

### Position Sizing

| Parameter | Value |
|-----------|-------|
| SOL per trade | 0.1 SOL |
| Max open positions | 5 |
| Max buys per cycle | 1 |
| Re-buy cooldown | 30 minutes after closing a token |

### Entry — Step 1: Hard Pre-Filter (no LLM)

Trending tokens fetched from both **1h and 5m intervals**, merged and deduped. All of the following must pass:

| Filter | Threshold |
|--------|-----------|
| Min KOL wallets | ≥ 1 |
| Min smart money wallets | ≥ 2 |
| Rug ratio | < 10% |
| Organic score | ≥ 70 |
| Market cap | $50K – $10M |
| 24h volume | > $50K |
| Volume/mcap ratio | > 0.20 (filters thin-air volume) |
| Holder count | > 150 |
| 5m price change | > +1% |
| 1h price change | > 0% |
| Bullish signal | 5m AND 1h both positive |
| 24h price change | > −50% (allows recovery; blocks freefall) |
| Already holding | Skip |
| Closed within last 30m | Skip |
| Skipped today | Skip |

**Organic score** starts at 100, deducted by inorganic signals:

| Signal | Deduction |
|--------|-----------|
| `is_wash_trading` | −60 (hard flag) |
| `rat_trader_amount_rate` | ×−60 |
| `entrapment_ratio` | ×−50 |
| `bot_degen_rate` | ×−40 |
| `bundler_rate` | ×−20 |
| `top70_sniper_hold_rate` | ×−15 |

Score clamped to 0–100. Must be ≥ 70 to proceed.

### Entry — Step 2: LLM Research

Top 8 candidates (sorted by KOL + SM count) passed to the LLM. Tools called in sequence:

1. `get_trending` — full token list
2. `get_token_info` — price, mcap, volume, momentum
3. `get_token_security` — mint/freeze authority, rug ratio, dev holding
4. `get_token_holders` — top holder concentration

### Entry — Step 3: Conviction Score (1–10)

Only tokens scoring **≥ 7** are bought.

### Exit Rules

| Rule | Condition | Action |
|------|-----------|--------|
| **Hard SL** | PnL ≤ −15% | Close immediately |
| **Tiered exit** | PnL ≥ +40% (first time) | Sell 50% of position |
| **Trailing stop** | Peak ever ≥ +35% AND current PnL ≤ peak − 15% | Close immediately |
| **Time stop** | Age > 24h AND PnL < +15% | Close immediately |
| **Absolute stop** | Age > 48h | Close immediately |

---

## gmgnNewToken — New Token Screener

### Cycle Timing

| Cycle | Interval |
|-------|----------|
| Screening | Every 3 minutes |
| Management | Every 1 minute |

### Position Sizing

| Parameter | Value |
|-----------|-------|
| SOL per trade | 0.05 SOL |
| Max open positions | 3 |
| Max buys per cycle | 1 |
| Re-buy cooldown | 30 minutes after closing a token |

### Entry — Step 1: Hard Pre-Filter (no LLM)

Tokens fetched from GMGN **trenches** (`new_creation` mode — pump.fun bonding curve tokens). All of the following must pass:

| Filter | Threshold |
|--------|-----------|
| Bonding curve progress | 5% – 85% |
| Min smart money wallets | ≥ 1 |
| Holder count | > 20 |
| 24h volume | > $1,000 |
| 24h swaps | > 5 |
| Market cap | $5K – $500K |
| Bundler rate | < 30% |
| Rug ratio | < 15% |
| Entrapment ratio | < 30% |
| Wash trading flag | Must be false |
| Mint renounced | Required |
| Freeze renounced | Required |
| Creator serial spammer | Reject if >100 launches AND <1% graduation rate |
| Already holding | Skip |
| Closed within last 30m | Skip |
| Skipped today | Skip |

### Entry — Step 2: LLM Research

Top 8 candidates (sorted by SM count, then bonding curve progress) passed to the LLM. The LLM calls `get_new_tokens` for full data and evaluates:

- Security: rug ratio, creator hold/sell status, holder concentration
- Momentum: progress in 30–70% sweet spot, net buy pressure, buy/sell ratio
- Social: Twitter followers, Telegram call count
- Creator history: creatorCount, creator graduation rate

### Entry — Step 3: Conviction Score (1–10)

Only tokens scoring **≥ 7** are bought.

### Exit Rules

| Rule | Condition | Action |
|------|-----------|--------|
| **Hard SL** | PnL ≤ −20% | Close immediately |
| **Tiered exit** | PnL ≥ +60% (first time) | Sell 50% of position |
| **Trailing stop** | Peak ever ≥ +50% AND current PnL ≤ peak − 20% | Close immediately |
| **Time stop** | Age > 6h AND PnL < +20% | Close immediately |
| **Absolute stop** | Age > 48h | Close immediately |

---

## Shared Management Logic

Both agents use the same `manager.js`. Each management cycle runs in this order:

### 1. Reconcile
Compares agent state against GMGN portfolio. Any position the agent believes is open but missing from the wallet (after a 5-minute GMGN indexing grace period) is recorded as externally closed, with PnL read from GMGN's `realized_profit` / `realized_profit_pnl` fields. Untracked positions found in the wallet are adopted and tracked. Sibling agent positions (from the other agent's state file) are skipped to avoid cross-agent conflicts.

### 2. Hard Stops (no LLM)
Runs immediately against all open positions. Checks tiered exits first, then SL, trailing stop, time stop, absolute stop — in that order.

### 3. LLM Review
Remaining positions (after hard stops) are reviewed by the LLM using `get_portfolio_holdings`, `get_token_info`, `close_position`, and `hold_position`. Manager is biased toward closing; idle capital is a cost.

---

## PnL Calculation

| Field | Source | Used for |
|-------|--------|---------|
| `unrealized_profit_pnl` | GMGN | Authoritative PnL% for open positions |
| `accu_cost` + `usd_value` | GMGN | Cost basis fallback for open positions |
| `unrealized_profit` | GMGN | USD profit fallback when `accu_cost` = 0 (indexing lag) |
| `realized_profit` | GMGN (closed entries) | USD profit for externally-closed positions |
| `realized_profit_pnl` | GMGN (closed entries) | Authoritative PnL% for externally-closed positions |

`accu_cost` is always 0 for closed entries — `history_bought_cost` is used instead.

---

## State Storage

| File | Owner | Contents |
|------|-------|---------|
| `agent/state.json` | gmgnAgent | positions, closedPositions, lessons, skippedToday |
| `agent/state-newtoken.json` | gmgnNewToken | positions, closedPositions, lessons, skippedToday |

Each state file is cross-referenced by the sibling via `siblingStatePaths` to prevent double-managing the same token.

---

## Learning — Evolve Cycle

Triggered manually via `/evolve` Telegram command (requires ≥ 3 closed trades). The LLM reviews all closed trade history and existing lessons, identifies patterns distinguishing wins from losses, and writes **pinned lessons** injected into every future screening and management prompt. Lessons are capped at 100 entries (oldest unpinned pruned first).

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Win Rate | > 50% |
| Profit Ratio (avg win / avg loss) | > 1.5 |

---

## Telegram Commands (`@BungmgnBot`)

Handled by `gmgnAgent` only. Live progress messages update in-place as tool calls complete.

| Command | Action |
|---------|--------|
| `/status` | Trend agent: open positions, win rate, PnL |
| `/positions` | Live PnL per position + inline Sell buttons |
| `/wallet` | SOL balance and wallet address |
| `/config` | All active thresholds and model |
| `/briefing` | Full morning briefing (positions + stats + pinned lessons) |
| `/research [addr]` | Live token security audit (info + rug check + holders) |
| `/study` | Trigger trend screening cycle now |
| `/manage` | Trigger management cycle now |
| `/evolve` | Strategy reflection + new lessons |
| `/lesson` | All lessons (pinned + recent) |
| `/skip` | Today's skip list |
| `/new_status` | New Token agent stats (proxied from state-newtoken.json) |
| `/new_positions` | New Token agent open positions |
| `/new_config` | New Token agent config |
| `/help` | Command list |

---

---

# Audit & Inspection Report

*Audit date: 2026-04-22 — covers gmgnAgent (PM2 22) and gmgnNewToken (PM2 25)*

---

## 1. Security

### 1.1 File Permissions

| File | Mode | Status |
|------|------|--------|
| `.env` | 600 | ✅ Secure |
| `.env.example` | 644 | ✅ OK (no secrets) |
| `agent/state.json` | 644 | ⚠️ World-readable — exposes position history |
| `agent/state-newtoken.json` | 644 | ⚠️ World-readable — exposes position history |
| `agent-config.json` | 644 | ✅ OK (no secrets) |
| `agent-config-newtoken.json` | 644 | ✅ OK (no secrets) |

**Action required:** `chmod 600 agent/state.json agent/state-newtoken.json`

### 1.2 Secret Handling

All credentials (`WALLET_PRIVATE_KEY`, `WALLET_ADDRESS`, `OPENROUTER_API_KEY`, `JUPITER_API_KEY`) are loaded exclusively via `process.env` in `agent/config.js`. No hardcoded values found in any source file. Error messages log variable *names* only — never values. `sanitize()` in `logger.js` provides an additional redaction layer. **CLEAN.**

### 1.3 `.gitignore` Coverage

`.env`, `agent/state.json`, `*.db`, `*.log`, `node_modules/` are all gitignored. No gaps found.

### 1.4 Server Auth & CORS (`server.js`)

**Auth:** Session tokens are 32-byte random hex, stored in-memory, transmitted via `x-session-token` header or `HttpOnly; SameSite=Strict; Secure` cookie. Password validated via bcrypt. All routes except `/login` are gated. **Solid.**

**CORS:** `Access-Control-Allow-Origin: *` is set on all authenticated responses.

⚠️ Low-risk but worth restricting to the frontend domain (`bun.mb-guild.xyz`) once traffic patterns are stable. The `SameSite=Strict` cookie and server-side session check reduce practical CSRF risk.

### 1.5 API Input Validation (`/api/swap`, `/api/sell`)

Both endpoints perform null checks on required fields but lack:
- Token address format validation (regex on Solana base58 public key)
- Numeric range checks on `amountSol` / `amountLamports` (could be negative or NaN)
- `slippage` bounds (could be 0 or > 100)

Jupiter Ultra API rejects malformed addresses downstream, but defence-in-depth validation is missing. **Low-medium risk.**

### 1.6 Unhandled Rejection Coverage

No `process.on('unhandledRejection')` handler in `index.js` or `newtoken-index.js`. PM2 will restart on crash but the rejection reason is not logged before exit. Minor gap.

---

## 2. Efficiency

### 2.1 API Calls per Screening Cycle

| Step | Calls | Notes |
|------|-------|-------|
| Trending fetch (1h + 5m) | 2 | Parallel; could merge if API supports multi-interval |
| SOL balance check | 1 | Helius RPC |
| LLM tool calls (dynamic) | ~4–8 | get_token_info, get_token_security, get_token_holders per candidate |
| **Total** | **~7–11** | |

### 2.2 API Calls per Management Cycle

| Step | Calls | Notes |
|------|-------|-------|
| Reconcile — `getPortfolioHoldings()` | 1 | |
| hardSlCheck — `getPortfolioHoldings()` | 1 | **Duplicate call — could be cached** |
| LLM tool calls (dynamic) | ~3–6 | get_portfolio_holdings, close/hold per position |
| **Total** | **~5–9** | |

**Inefficiency:** Portfolio holdings are fetched twice per management cycle (reconcile + hardSlCheck). A single cached call would halve the GMGN API load for management.

### 2.3 ReAct Loop

| Parameter | gmgnAgent | gmgnNewToken |
|-----------|-----------|--------------|
| Max steps | 15 | 20 |
| Model | `openai/gpt-oss-120b` (free tier) | Same |
| Temperature | 0.3 | 0.3 |
| Max tokens/completion | 4096 | 4096 |

Loop has a hard step limit and explicit stop conditions — no infinite loop risk. Error handling inside the loop is solid (try/catch on each tool invocation; loop continues on tool error). **Healthy.**

**Rate limit risk:** Free-tier OpenRouter model (`gpt-oss-120b`) hit `429 Rate limit exceeded: free-models-per-min` errors in earlier logs (2026-04-22 00:08–00:11 UTC). Currently stable. As trade volume grows, a paid OpenRouter tier will be required for reliable throughput.

### 2.4 Documentation vs. Code Discrepancy

The exit rule execution order in `manager.js` `hardSlCheck()` is:

1. Tiered exit (partial sell)
2. Hard SL
3. Trailing stop
4. Time stop
5. Absolute stop

The "Exit Rules" tables in this document list Hard SL first. The code order is functionally correct (tiered exits lock profit before SL kills the position) but the docs are out of sync. Tables above have been left as-is; the code is the authoritative source.

### 2.5 Code Quality

- **No outstanding TODOs/FIXMEs.** One resolved-fix comment in `screener.js:31` notes a previous rug_ratio bug (`?? 1` → `?? 0`).
- **Error handling:** All async cycles wrapped in try/catch. Critical paths (reconcile, hardSlCheck) rely on the outer catch; acceptable.
- **Secrets in logs:** `sanitize()` covers all log output. No sensitive data exposure found.

---

## 3. Profitability

### 3.1 gmgnAgent — Trend Strategy (41 closed trades)

| Metric | Value |
|--------|-------|
| Total closed trades | 41 |
| Win rate | **39.0%** (16 wins / 25 losses) |
| Avg win PnL | **+32.1%** |
| Avg loss PnL | **−18.1%** |
| Profit factor (avg win ÷ avg loss) | **1.77×** |
| Total realized PnL | **+$9.03 USD** |
| Capital deployed | ~4.1 SOL (~41 × 0.1 SOL) |
| Open positions | 0 (flat at audit time) |

**Standout trade:** MAOMAO +141.3%. Largest documented single-token win; validates the conviction-score + trailing-stop combo for capturing outsized moves.

**Standout loss pattern:** Hard SL (−15%) triggered on DUVE (−22.9%), FLASH (−23.6%), LIGHTNING (−22.0%). SL is holding risk in check at cost of winning rate. This is expected behavior for a momentum strategy.

**Win rate context:** 39% win rate with 1.77× profit factor is mathematically profitable. Break-even win rate at this profit factor is ~36%. The strategy has ~3 percentage points of margin — workable, but thin. Evolve cycles and lessons will be critical to widen that margin.

### 3.2 gmgnNewToken — New Token Strategy (21 closed trades)

| Metric | Value |
|--------|-------|
| Total closed trades | 21 |
| Win rate | **38.1%** (8 wins / 13 losses) |
| Avg win PnL | **+52.4%** |
| Avg loss PnL | **−19.0%** |
| Profit factor (avg win ÷ avg loss) | **2.75×** |
| Total realized PnL | **+$0.22 USD** |
| Capital deployed | ~1.05 SOL (~21 × 0.05 SOL) |
| Open positions | 3/3 (full; all unrealized negative at audit time) |

**Standout trade:** SIF +169.7% (external close after tiered exit at 60% locked half the position). Demonstrates the new-token strategy's outsized upside versus trend trading.

**Current open positions (at audit):**

| Token | Unrealized PnL | Peak PnL |
|-------|---------------|---------|
| SAFEMOON | −8.3% | +37.8% |
| wagmi | −14.4% | — |
| SPHINCTR | −7.8% | — |

wagmi is closest to hard SL (−20% trigger). None have triggered exits as of audit.

**Assessment:** Despite a lower realized PnL figure ($0.22 vs $9.03), the **profit factor of 2.75× is the stronger result**. The strategy captures larger wins per trade (avg +52% vs +32%). At larger position sizes this advantage compounds significantly.

### 3.3 Combined Portfolio

| Metric | Value |
|--------|-------|
| Total closed trades | 62 |
| Combined win rate | **38.7%** |
| Total realized PnL | **+$9.25 USD** |
| Total capital deployed | ~5.15 SOL |

**Profitability verdict:** Both strategies are net-positive with 38–39% win rates and profit factors well above break-even. The system is in early operational stage (~62 closed trades). Returns will become statistically meaningful above 150–200 closed trades.

### 3.4 Learning / Evolve Cycle

`/evolve` Telegram command requires ≥ 3 closed trades (both agents qualify). No evidence in logs that an evolve cycle has been triggered since the current run began. Lessons from past cycles are stored in state files and injected into future prompts.

**Recommendation:** Run `/evolve` now. With 62 closed trades across both agents there is sufficient signal to identify exit timing patterns and false-positive conviction scores.

---

## 4. Priority Actions

| Priority | Area | Finding | Action |
|----------|------|---------|--------|
| **High** | Security | State files world-readable (644) | `chmod 600 agent/state.json agent/state-newtoken.json` |
| **High** | Profitability | No evolve cycle run since launch | Trigger `/evolve` on Telegram to update lessons from 62 closed trades |
| **Medium** | Efficiency | Portfolio holdings fetched 2× per management cycle | Cache `getPortfolioHoldings()` result and reuse in `hardSlCheck()` |
| **Medium** | Security | `/api/swap` and `/api/sell` missing input bounds | Add Solana address regex + numeric range validation |
| **Low** | Security | CORS `*` on authenticated endpoints | Restrict to `bun.mb-guild.xyz` when traffic is stable |
| **Low** | Efficiency | OpenRouter free tier rate limits | Budget for paid tier as position count scales |
| **Low** | Code quality | No global unhandledRejection handler | Add `process.on('unhandledRejection', ...)` to both index files |

---

*Report compiled by QWEN (code inspection) + Vesper (profitability analysis) · Coordinated by Orchestrator · 2026-04-22*
