# gmgn Trader

A Solana meme-coin trading terminal with two autonomous AI agents. The web terminal lets you manually screen, research, and trade tokens. The agents run independently in the background, each targeting a different market opportunity.

---

## Stack

- **Runtime**: Bun
- **Web server**: Bun HTTP (no framework)
- **Frontend**: Vanilla JS, no build step
- **Swaps**: Jupiter Ultra API (on-chain, wallet-signed)
- **Market data**: gmgn-cli (trending, trenches, token info, portfolio)
- **Agent LLM**: OpenRouter (deepseek/deepseek-v3.2)
- **Notifications**: Telegram Bot API (long-polling, live progress messages)
- **Process manager**: PM2

---

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
WALLET_ADDRESS=                  # your Solana wallet public key
WALLET_PRIVATE_KEY=              # base58 private key (for Jupiter signing)
OPENROUTER_API_KEY=              # from openrouter.ai/keys
JUPITER_API_KEY=                 # from jup.ag (optional, raises rate limits)
RPC_URL=                         # Helius or other Solana RPC endpoint
TELEGRAM_BOT_TOKEN=              # from @BotFather
TELEGRAM_CHAT_ID=                # your Telegram chat/user ID
AUTH_USERNAME=                   # web terminal login username
AUTH_PASSWORD_HASH=              # bcrypt hash — generate below
```

Generate the password hash:

```bash
bun setup-auth.js
```

### 3. Run the web terminal

```bash
bun server.js
```

Opens at `http://localhost:3333`.

### 4. Run the agents

Both agents can be run as separate PM2 processes. They share the same wallet and Telegram bot but maintain **independent state, position budgets, and configs**.

#### Trending Token Agent (`gmgnAgent`)

Screens established trending tokens on the 1h and 5m intervals. Higher market caps, confirmed momentum, requires KOL + smart money signal.

```bash
# One-shot modes
bun agent/index.js screen    # single screening cycle
bun agent/index.js manage    # single management cycle
bun agent/index.js status    # print current state

# Daemon via PM2
pm2 start start-gmgnAgent.sh --name gmgnAgent
pm2 save
```

#### New Token Agent (`gmgnNewToken`)

Screens freshly launched pump.fun tokens (`new_creation`) on the bonding curve. Targets early entries before the crowd, using smart money wallet activity as the primary signal.

```bash
# One-shot modes
AGENT_CONFIG_FILE=/root/trader/agent-config-newtoken.json \
AGENT_STATE_FILE=/root/trader/agent/state-newtoken.json \
bun agent/newtoken-index.js screen

# Daemon via PM2
pm2 start start-gmgnNewToken.sh --name gmgnNewToken
pm2 save
```

---

## Web Terminal

The terminal at `http://localhost:3333` has four tabs:

- **Trending** — top tokens ranked by KOL and smart money activity
- **Trenches** — new token discoveries
- **Token** — deep-dive on any token address (info, security, holders, traders)
- **Portfolio** — live holdings with unrealized PnL and one-click Sell buttons

All buy and sell actions execute via Jupiter Ultra. Trade config (amount, slippage) persists in `localStorage`.

---

## Agents

Both agents run the same two cron loops and share the same management and exit logic. The difference is the **screening source and criteria**.

| Loop | What it does |
|------|--------------|
| Screener | Fetches candidates, pre-filters in code, scores with LLM, buys if score ≥ 7/10 |
| Manager | Checks hard stops every cycle, then asks LLM to hold or close each position |

### Mode comparison

|  | trendingToken (`gmgnAgent`) | newToken (`gmgnNewToken`) |
|---|---|---|
| Data source | `getTrending` — 1h + 5m intervals merged | `getTrenches` — pump.fun `new_creation` only |
| Primary signal | KOL + SM count on established tokens | Smart money wallets entering on bonding curve |
| Screening interval | 2 min | 3 min |
| Position budget | 5 slots | 3 slots |
| Trade size | 0.1 SOL | 0.05 SOL |
| Stop loss | −15% | −20% |
| Trailing trigger | +35% | +50% |
| Trailing drop | −15% from peak | −20% from peak |
| Tiered exit | 50% at +40% | 50% at +60% |
| Time stop | 24h if PnL < +15% | 6h if PnL < +20% |
| State file | `agent/state.json` | `agent/state-newtoken.json` |
| Config file | `agent-config.json` | `agent-config-newtoken.json` |

---

## Trending Token Agent — Entry Rules

Tokens are fetched from both **1h and 5m intervals** and merged. Each token must pass the hard pre-filter before the LLM is invoked:

| Filter | Threshold |
|--------|-----------|
| KOL wallets | ≥ 1 |
| Smart money wallets | ≥ 2 |
| Organic score | ≥ 70 |
| Rug ratio | < 10% |
| Market cap | $50K – $10M |
| 24h volume | > $50K |
| Volume / mcap ratio | > 20% |
| Holder count | > 150 |
| 5m price change | > +1% |
| 1h price change | ≥ 0% |
| Bullish momentum | 5m AND 1h both positive |
| 24h price change | > −50% (recovery allowed) |

The **organic score** (0–100) is computed from inorganic trading signals: wash trading, rat traders, entrapment ratio, bot activity, bundler rate, and sniper holding. Tokens scoring < 70 are discarded before the LLM is called.

Surviving candidates are sorted by `(KOL + SM)` strength and passed to the LLM. The LLM calls `get_token_info`, `get_token_security`, and `get_token_holders`, then assigns a **conviction score 1–10**. Only tokens scoring ≥ 7 are bought. Max 1 buy per cycle.

---

## New Token Agent — Entry Rules

New tokens (`new_creation`) are fetched from the pump.fun bonding curve feed. Pre-filter:

| Filter | Threshold |
|--------|-----------|
| Smart money wallets | ≥ 1 |
| Bonding curve progress | 5% – 85% |
| Holder count | ≥ 20 |
| 24h volume | > $1K |
| 24h swap count | ≥ 5 |
| Market cap | $5K – $500K |
| Bundler rate | < 30% |
| Rug ratio | < 15% |
| Entrapment ratio | < 30% |
| Mint renounced | required |
| Freeze renounced | required |
| Wash trading | blocked |
| Serial spammer dev | blocked (>100 tokens, <1% graduation rate) |

Candidates are sorted by `(SM + KOL)` signal then bonding curve progress. The LLM calls `get_token_info`, `get_token_security`, and `get_token_holders` for promising candidates and assigns a **conviction score 1–10**. Only tokens scoring ≥ 7 are bought. Max 1 buy per cycle.

---

## Exit Rules (both agents, enforced every cycle — no LLM required)

| Rule | trendingToken | newToken |
|------|--------------|----------|
| Hard stop-loss | PnL ≤ −15% | PnL ≤ −20% |
| Tiered exit | Sell 50% at +40% | Sell 50% at +60% |
| Trailing stop | Peak ≥ +35%, drops 15% | Peak ≥ +50%, drops 20% |
| Time stop | Age > 24h and PnL < +15% | Age > 6h and PnL < +20% |
| Absolute stop | Age > 48h | Age > 48h |

Positions opened within the last 5 minutes are exempt from the reconcile check (GMGN portfolio API indexing grace period).

---

## GMGN Portfolio Field Notes

The GMGN portfolio API uses non-obvious field names. Key mappings used by the manager:

| What we need | GMGN field | Notes |
|---|---|---|
| Cost basis (open position) | `accu_cost` | Always 0 for closed entries |
| Cost basis (closed position) | `history_bought_cost` | Use for reconcile PnL |
| PnL % (open) | `unrealized_profit_pnl` | Ratio (×100 for %) |
| PnL % (closed/external) | `realized_profit_pnl` | Ratio (×100 for %) |
| Token address | `token.token_address` | Not `token.address` |
| Fallback when `accu_cost`=0 | `unrealized_profit` | USD; derive cost = `usd_value − unrealized_profit` |

---

## Telegram Commands

Commands trigger cycles on the trending token agent (`gmgnAgent`). The new token agent is notification-only (no command listener — avoids conflicting with the same bot).

```
/status    — open positions and performance stats
/config    — active thresholds
/briefing  — morning briefing (positions, stats, lessons)
/study     — trigger screening cycle now (live progress)
/manage    — trigger management cycle now (live progress)
/evolve    — strategy reflection, writes new lessons from trade history
/lesson    — view all lessons (pinned + recent)
/skip      — view today's skip list
/help      — command list
```

---

## Agent Config

All parameters are hot-reloaded on `pm2 reload <name> --update-env`. No restart required.

**`agent-config.json`** — trending token agent:

```json
{
  "dryRun": false,
  "amountSolPerTrade": 0.1,
  "maxPositions": 5,
  "stopLossPercent": 15,
  "trailingTriggerPercent": 35,
  "trailingDropPercent": 15,
  "timeStopHours": 24,
  "screening": {
    "minOrganicScore": 70,
    "minKol": 1,
    "minSm": 2,
    "minMcap": 50000,
    "maxMcap": 10000000
  }
}
```

**`agent-config-newtoken.json`** — new token agent:

```json
{
  "dryRun": true,
  "amountSolPerTrade": 0.05,
  "maxPositions": 3,
  "stopLossPercent": 20,
  "trailingTriggerPercent": 50,
  "trailingDropPercent": 20,
  "timeStopHours": 6,
  "newTokenScreening": {
    "minSmartDegen": 1,
    "minProgress": 0.05,
    "maxProgress": 0.85,
    "minMcap": 5000,
    "maxMcap": 500000,
    "maxBundlerRate": 0.30
  }
}
```

Set `"dryRun": true` to simulate trades without executing real swaps. The new token agent ships with dry run on by default.

---

## Project Structure

```
server.js                    # Bun HTTP server + API routes
index.html                   # Web terminal (single file, no build)
agent-config.json            # Trending token agent config (hot-reloaded)
agent-config-newtoken.json   # New token agent config (hot-reloaded)
start-gmgnAgent.sh           # PM2 wrapper for trending token agent
start-gmgnNewToken.sh        # PM2 wrapper for new token agent (sets env vars)
Active Strategy.md           # Full strategy documentation
agent/
  index.js                   # Trending agent entry point, cron, Telegram listener
  newtoken-index.js          # New token agent entry point, cron (no Telegram listener)
  screener.js                # Trending token screening cycle + organic score
  newtoken-screener.js       # New token (new_creation) screening cycle
  manager.js                 # Management cycle + hard stops + reconcile (shared)
  tools.js                   # LLM tool schemas and handlers (all modes)
  claude.js                  # ReAct loop (OpenRouter client)
  prompt.js                  # System prompts (SCREENER, NEWTOKEN_SCREENER, MANAGER)
  evolve.js                  # Strategy reflection cycle (/evolve)
  jupiter.js                 # Jupiter Ultra swap module
  telegram.js                # Notifications + long-poll command listener
  gmgn.js                    # gmgn-cli wrappers (getTrending, getTrenches, token info, portfolio)
  state.js                   # state.json read/write (path set via AGENT_STATE_FILE env var)
  config.js                  # Config loader (path set via AGENT_CONFIG_FILE env var)
  logger.js                  # Structured logger with secret sanitization
  state.json                 # Trending agent state: positions, closed history, lessons
  state-newtoken.json        # New token agent state (created on first run)
```

---

## PM2 Reference

```bash
pm2 list                                     # all processes
pm2 logs gmgnAgent --lines 50                # trending agent logs
pm2 logs gmgnNewToken --lines 50             # new token agent logs
pm2 logs gmgn-trader --lines 50             # web server logs
pm2 reload gmgnAgent --update-env            # reload trending agent after config change
pm2 reload gmgnNewToken --update-env         # reload new token agent after config change
pm2 reload gmgn-trader --update-env          # reload web server
```
