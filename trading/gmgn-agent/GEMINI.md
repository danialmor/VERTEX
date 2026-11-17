# GEMINI.md — gmgn Trader

## Project Overview
**gmgn Trader** is an autonomous Solana meme-coin trading ecosystem. It combines a real-time web terminal for manual trading with a background AI agent that screens and manages positions 24/7.

### Architecture & Tech Stack
- **Runtime:** [Bun](https://bun.sh/)
- **Frontend:** Vanilla JS (Single-page, no build step, serves via `server.js`)
- **Backend:** Bun HTTP server (serves UI and provides API routes)
- **Trading Agent:** Autonomous ReAct loop using [OpenRouter](https://openrouter.ai/) (LLM) and [Jupiter Ultra](https://jup.ag/) (Swaps).
- **Market Data:** [gmgn-cli](https://github.com/gmgnai/gmgn-cli) integration for trending tokens, security audits, and portfolio tracking.
- **Process Management:** [PM2](https://pm2.keymetrics.io/) for daemonizing the agent and web server.
- **Notifications:** Telegram Bot API for real-time updates and remote control.

---

## Building and Running

### Prerequisites
- [Bun](https://bun.sh/) installed.
- A Solana wallet and RPC URL.
- API keys for OpenRouter and Telegram.

### Installation
```bash
bun install
```

### Configuration
1. Copy `.env.example` to `.env` and fill in the required fields.
2. Generate the web terminal password hash:
   ```bash
   bun setup-auth.js
   ```
3. Customize agent behavior in `agent-config.json`.

### Running the Web Terminal
```bash
bun server.js
```
The terminal is available at `http://localhost:3333`.

### Running the Agent
The agent can be run in one-shot modes for testing or as a daemon.
```bash
# One-shot cycles
bun agent/index.js screen    # Single screening cycle
bun agent/index.js manage    # Single management cycle
bun agent/index.js status    # Print current portfolio status

# Daemon Mode (PM2)
pm2 start start-gmgnAgent.sh --name gmgnAgent
pm2 save
```

---

## Development Conventions

### Code Structure
- `agent/`: Core agent logic (screener, manager, tools, ReAct loop).
- `server.js`: Web server and API routes.
- `index.html`: Frontend application.
- `state.json`: Persistent storage for positions, trade history, and "lessons" learned by the agent.
- `Active Strategy.md`: Documentation of the trading strategy and parameters.

### Agent Logic
The agent follows a strict lifecycle:
1. **Screener:** Filters trending tokens based on "Organic Score" (wash trading/rug ratio) and social signals (KOLs/Smart Money). Candidates are then analyzed by the LLM.
2. **Manager:** Reconciles state against on-chain holdings and enforces hard stops (SL, Trailing Stop, Time Stop).
3. **Evolve:** A reflection cycle where the LLM reviews closed trades to generate "lessons" for future cycles.

### Key Tools & Utilities
- **`agent/logger.js`:** Structured logging with automatic secret sanitization.
- **`agent/jupiter.js`:** Handles transaction signing and execution via Jupiter Ultra.
- **`agent/gmgn.js`:** Wrappers for fetching market and portfolio data.

### Contributing
- **No Build Step:** The project uses vanilla JS and Bun's native ESM support. Do not add complex build pipelines.
- **Security:** Always use `log.info`/`log.error` which passes through `sanitize()` to prevent leaking private keys or API tokens in logs.
- **Testing:** Use one-shot agent modes (`screen`, `manage`) with `"dryRun": true` in `agent-config.json` to test changes safely.
