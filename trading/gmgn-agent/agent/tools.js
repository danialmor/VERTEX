import { cfg, WALLET } from './config.js';
import { computeOrganicScore } from './screener.js';
import { log } from './logger.js';
import { notifyBuy, notifySell } from './telegram.js';
import {
  getTrending, getTrenches, getTokenInfo, getTokenSecurity, getTokenHolders, getTokenTraders,
  getPortfolioHoldings, getPortfolioStats,
} from './gmgn.js';
import { jupiterBuy, jupiterSell, getSolBalance } from './jupiter.js';
import {
  getOpenPositions, getClosedPositions, addPosition, closePosition as stateClose,
  skipToken as stateSkip, addLesson, getStats, updatePosition,
} from './state.js';

// ── Tool schemas (Anthropic format) ──────────────────────────────────────────

export const SCREENER_TOOLS = [
  {
    name: 'get_trending',
    description: 'Get trending Solana tokens with optional KOL/SM filters.',
    input_schema: {
      type: 'object',
      properties: {
        interval: { type: 'string', enum: ['1m','5m','1h','6h','24h'], description: 'Time interval' },
        limit:    { type: 'number', description: 'Max tokens to return (default 30)' },
        minKol:   { type: 'number', description: 'Min KOL/renowned count' },
        minSm:    { type: 'number', description: 'Min smart money count' },
      },
    },
  },
  {
    name: 'get_token_info',
    description: 'Get detailed info for a token: price, mcap, volume, holders, momentum.',
    input_schema: {
      type: 'object',
      required: ['address'],
      properties: {
        address: { type: 'string' },
      },
    },
  },
  {
    name: 'get_token_security',
    description: 'Get security analysis: mint authority, freeze, rug ratio, dev holding.',
    input_schema: {
      type: 'object',
      required: ['address'],
      properties: {
        address: { type: 'string' },
      },
    },
  },
  {
    name: 'get_token_holders',
    description: 'Get top holder distribution to assess concentration risk.',
    input_schema: {
      type: 'object',
      required: ['address'],
      properties: {
        address: { type: 'string' },
        limit:   { type: 'number' },
      },
    },
  },
  {
    name: 'get_token_traders',
    description: 'Get recent smart trader activity for a token.',
    input_schema: {
      type: 'object',
      required: ['address'],
      properties: {
        address: { type: 'string' },
        limit:   { type: 'number' },
      },
    },
  },
  {
    name: 'get_portfolio_stats',
    description: 'Get overall portfolio performance stats.',
    input_schema: {
      type: 'object',
      properties: {
        period: { type: 'string', enum: ['1d','7d','30d'], description: 'Period' },
      },
    },
  },
  {
    name: 'buy_token',
    description: 'Buy a token via Jupiter Ultra. Only call when conviction score ≥ 7/10 and ALL hard rules pass. TP/SL are enforced by the management cycle.',
    input_schema: {
      type: 'object',
      required: ['address', 'symbol', 'reason', 'score'],
      properties: {
        address:     { type: 'string', description: 'Token mint address' },
        symbol:      { type: 'string', description: 'Token symbol' },
        amountSol:   { type: 'number', description: 'SOL to spend (default from config)' },
        slippageBps: { type: 'number', description: 'Slippage tolerance in bps (default 300 = 3%)' },
        score:       { type: 'number', description: 'Conviction score 1-10. Must be ≥ 7 to buy.' },
        reason:      { type: 'string', description: 'Documented reason including score breakdown' },
      },
    },
  },
  {
    name: 'skip_token',
    description: 'Explicitly skip a token for today with documented reason.',
    input_schema: {
      type: 'object',
      required: ['address', 'reason'],
      properties: {
        address: { type: 'string' },
        reason:  { type: 'string' },
      },
    },
  },
  {
    name: 'add_lesson',
    description: 'Record a lesson learned for future cycles.',
    input_schema: {
      type: 'object',
      required: ['lesson'],
      properties: {
        lesson: { type: 'string' },
        pinned: { type: 'boolean', description: 'Pin to always include in future prompts' },
      },
    },
  },
];

export const MANAGER_TOOLS = [
  {
    name: 'get_portfolio_holdings',
    description: 'Get current token holdings with unrealized PnL.',
    input_schema: {
      type: 'object',
      properties: {
        hideClosed: { type: 'string', enum: ['true','false'], description: 'false = include closed' },
      },
    },
  },
  {
    name: 'get_token_info',
    description: 'Get current price/momentum for a held token.',
    input_schema: {
      type: 'object',
      required: ['address'],
      properties: {
        address: { type: 'string' },
      },
    },
  },
  {
    name: 'close_position',
    description: 'Sell 100% of a position immediately.',
    input_schema: {
      type: 'object',
      required: ['address', 'reason'],
      properties: {
        address: { type: 'string', description: 'Token mint address' },
        reason:  { type: 'string', description: 'Why closing' },
      },
    },
  },
  {
    name: 'hold_position',
    description: 'Explicitly decide to hold a position with documented reason.',
    input_schema: {
      type: 'object',
      required: ['address', 'reason'],
      properties: {
        address: { type: 'string' },
        reason:  { type: 'string' },
      },
    },
  },
  {
    name: 'add_lesson',
    description: 'Record a lesson learned for future cycles.',
    input_schema: {
      type: 'object',
      required: ['lesson'],
      properties: {
        lesson: { type: 'string' },
        pinned: { type: 'boolean' },
      },
    },
  },
];

// ── Tool handlers ─────────────────────────────────────────────────────────────

export function makeScreenerHandlers() {
  const boughtThisCycle = new Set();

  return {
    get_trending: async ({ interval = '1h', limit, minKol, minSm } = {}) => {
      const scr = cfg.screening;
      // GMGN API does not support 4h — remap to 6h
      if (interval === '4h') interval = '6h';
      const r = getTrending({
        chain: cfg.chain,
        interval,
        limit: limit ?? scr.limit,
        minKol: minKol ?? scr.minKol,
        minSm:  minSm  ?? scr.minSm,
      });
      if (!r.ok) return { error: r.error };
      // Attach pre-filter summary
      const open = getOpenPositions().map(p => p.address);
      const filtered = r.data.filter(t => !open.includes(t.address));
      return {
        total: filtered.length,
        tokens: filtered.slice(0, 20).map(t => ({
          address:        t.address,
          symbol:         t.symbol,
          mcap:           t.market_cap,
          price:          t.price,
          change5m:       t.price_change_percent5m,
          change1h:       t.price_change_percent1h,
          change24h:      t.price_change_percent24h,
          volume24h:      t.volume,
          holders:        t.holder_count,
          kol:            t.renowned_count,
          sm:             t.smart_degen_count,
          rugRatio:       t.rug_ratio,
          organicScore:   computeOrganicScore(t),
          launchpad:      t.launchpad_platform,
          createdAt:      t.open_timestamp,
        })),
      };
    },

    get_token_info: async ({ address }) => {
      const r = getTokenInfo({ chain: cfg.chain, address });
      if (!r.ok) return { error: r.error };
      return r.data;
    },

    get_token_security: async ({ address }) => {
      const r = getTokenSecurity({ chain: cfg.chain, address });
      if (!r.ok) return { error: r.error };
      return r.data;
    },

    get_token_holders: async ({ address, limit = 20 }) => {
      const r = getTokenHolders({ chain: cfg.chain, address, limit });
      if (!r.ok) return { error: r.error };
      return r.data;
    },

    get_token_traders: async ({ address, limit = 20 }) => {
      const r = getTokenTraders({ chain: cfg.chain, address, limit });
      if (!r.ok) return { error: r.error };
      return r.data;
    },

    get_portfolio_stats: async ({ period = '7d' } = {}) => {
      const r = getPortfolioStats({ chain: cfg.chain, wallet: WALLET, period });
      if (!r.ok) return { error: r.error };
      return r.data;
    },

    buy_token: async ({ address, symbol, amountSol, slippageBps, score, reason }) => {
      // Guard: conviction score
      if ((score ?? 0) < 7) return { error: `Conviction score ${score} < 7 — buy rejected` };

      // Guard: one buy per cycle
      if (boughtThisCycle.has(address)) return { error: 'Already bought this token this cycle' };

      // Guard: cooldown after closing a token (4h if closed via SL, 30m otherwise)
      const lastClose = getClosedPositions().filter(p => p.address === address).sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt))[0];
      if (lastClose) {
        const elapsed = Date.now() - new Date(lastClose.closedAt).getTime();
        const wasSL = lastClose.closeReason?.toLowerCase().includes('sl') || lastClose.closeReason?.toLowerCase().includes('stop');
        const cooldown = wasSL ? 4 * 3_600_000 : 1_800_000;
        if (elapsed < cooldown) {
          const mins = Math.ceil((cooldown - elapsed) / 60000);
          return { error: `${symbol} cooldown active — ${wasSL ? 'SL hit' : 'recently closed'}, ${mins}m remaining` };
        }
      }

      // Guard: 6h cooldown after a big win (>= 30%) — KOL/SM holders distribute after a pump
      if (lastClose && lastClose.realizedPnlPct >= 30) {
        const elapsed = Date.now() - new Date(lastClose.closedAt).getTime();
        const cooldown = 6 * 3_600_000;
        if (elapsed < cooldown) {
          const mins = Math.ceil((cooldown - elapsed) / 60000);
          return { error: `${symbol} post-run cooldown — closed at +${lastClose.realizedPnlPct.toFixed(1)}%, ${mins}m remaining before re-entry` };
        }
      }

      // Guard: max positions
      const open = getOpenPositions();
      if (open.length >= cfg.maxPositions) return { error: `Max positions reached (${cfg.maxPositions})` };
      if (open.find(p => p.address === address)) return { error: 'Already holding this token' };

      const amount  = amountSol ?? cfg.amountSolPerTrade;
      const slipBps = slippageBps ?? 300;

      // Guard: minimum SOL reserve (0.1 SOL must remain after trade)
      const SOL_RESERVE = 0.1;
      const solBal = await getSolBalance();
      if (solBal - amount < SOL_RESERVE) {
        return { error: `Insufficient SOL: balance ${solBal.toFixed(4)} SOL, need ${(amount + SOL_RESERVE).toFixed(3)} (trade + ${SOL_RESERVE} reserve)` };
      }

      if (cfg.dryRun) {
        log.warn(`[DRY RUN] Would buy ${symbol} (${address.slice(0,8)}) — ${amount} SOL — score:${score} — ${reason}`);
        boughtThisCycle.add(address);
        addPosition({ address, symbol, amountSol: amount, chain: cfg.chain, score, reason });
        notifyBuy({ symbol, address, amountSol: amount, score, reason, dryRun: true });
        return { ok: true, dryRun: true, message: `[DRY RUN] Would buy ${amount} SOL of ${symbol} (score ${score})` };
      }

      const r = await jupiterBuy({ outputToken: address, amountSol: amount, slippageBps: slipBps });
      if (!r.ok) return { error: r.error };

      boughtThisCycle.add(address);
      addPosition({ address, symbol, amountSol: amount, chain: cfg.chain, score, reason });
      log.ok(`Bought ${symbol} via Jupiter — ${amount} SOL — score:${score} — tx: ${r.data?.signature}`);
      notifyBuy({ symbol, address, amountSol: amount, score, reason, dryRun: false, signature: r.data?.signature });
      return { ok: true, signature: r.data?.signature };
    },

    skip_token: async ({ address, reason }) => {
      stateSkip(address);
      log.info(`Skipped ${address.slice(0, 8)} — ${reason}`);
      return { ok: true, skipped: address, reason };
    },

    add_lesson: async ({ lesson, pinned = false }) => {
      addLesson({ role: 'SCREENER', lesson, pinned });
      return { ok: true };
    },
  };
}

// ── New-token screener tools ──────────────────────────────────────────────────

export const NEWTOKEN_SCREENER_TOOLS = [
  {
    name: 'get_new_tokens',
    description: 'Get freshly launched pump.fun tokens (new_creation category) with optional filters.',
    input_schema: {
      type: 'object',
      properties: {
        limit:             { type: 'number', description: 'Max tokens to return (default 50)' },
        minSmartDegen:     { type: 'number', description: 'Min smart-money wallet count' },
        minProgress:       { type: 'number', description: 'Min bonding curve progress 0–1' },
        maxProgress:       { type: 'number', description: 'Max bonding curve progress 0–1' },
        minMcap:           { type: 'number', description: 'Min market cap USD' },
        maxMcap:           { type: 'number', description: 'Max market cap USD' },
      },
    },
  },
  {
    name: 'get_token_info',
    description: 'Get detailed info for a token: price, mcap, volume, holders, momentum.',
    input_schema: {
      type: 'object',
      required: ['address'],
      properties: { address: { type: 'string' } },
    },
  },
  {
    name: 'get_token_security',
    description: 'Get security analysis: mint authority, freeze, rug ratio, dev holding.',
    input_schema: {
      type: 'object',
      required: ['address'],
      properties: { address: { type: 'string' } },
    },
  },
  {
    name: 'get_token_holders',
    description: 'Get top holder distribution to assess concentration risk.',
    input_schema: {
      type: 'object',
      required: ['address'],
      properties: {
        address: { type: 'string' },
        limit:   { type: 'number' },
      },
    },
  },
  {
    name: 'buy_token',
    description: 'Buy a token via Jupiter Ultra. Only call when conviction score ≥ 7/10 and ALL hard rules pass.',
    input_schema: {
      type: 'object',
      required: ['address', 'symbol', 'reason', 'score'],
      properties: {
        address:     { type: 'string' },
        symbol:      { type: 'string' },
        amountSol:   { type: 'number' },
        slippageBps: { type: 'number' },
        score:       { type: 'number', description: 'Conviction score 1–10. Must be ≥ 7 to buy.' },
        reason:      { type: 'string' },
      },
    },
  },
  {
    name: 'skip_token',
    description: 'Explicitly skip a token for today with documented reason.',
    input_schema: {
      type: 'object',
      required: ['address', 'reason'],
      properties: {
        address: { type: 'string' },
        reason:  { type: 'string' },
      },
    },
  },
  {
    name: 'add_lesson',
    description: 'Record a lesson learned for future cycles.',
    input_schema: {
      type: 'object',
      required: ['lesson'],
      properties: {
        lesson: { type: 'string' },
        pinned: { type: 'boolean' },
      },
    },
  },
];

export function makeNewTokenScreenerHandlers() {
  const boughtThisCycle = new Set();

  return {
    get_new_tokens: async ({ limit, minSmartDegen, minProgress, maxProgress, minMcap, maxMcap } = {}) => {
      const scr = cfg.newTokenScreening;
      const r = getTrenches({
        chain:             cfg.chain,
        limit:             limit             ?? scr.limit,
        minSmartDegen:     minSmartDegen     ?? scr.minSmartDegen,
        minProgress:       minProgress       ?? scr.minProgress,
        maxProgress:       maxProgress       ?? scr.maxProgress,
        minMcap:           minMcap           ?? scr.minMcap,
        maxMcap:           maxMcap           ?? scr.maxMcap,
        maxBundlerRate:    scr.maxBundlerRate,
        maxRugRatio:       scr.maxRugRatio,
        maxEntrapmentRatio: scr.maxEntrapmentRatio,
      });
      if (!r.ok) return { error: r.error };

      const open = getOpenPositions().map(p => p.address);
      const tokens = r.data.filter(t => !open.includes(t.address));

      return {
        total: tokens.length,
        tokens: tokens.slice(0, 20).map(t => ({
          address:           t.address,
          symbol:            t.symbol,
          mcap:              t.usd_market_cap,
          progress:          t.progress,
          holders:           t.holder_count,
          volume24h:         t.volume_24h,
          swaps24h:          t.swaps_24h,
          buys24h:           t.buys_24h,
          sells24h:          t.sells_24h,
          netBuy24h:         t.net_buy_24h,
          smartDegen:        t.smart_degen_count,
          kol:               t.renowned_count,
          rugRatio:          t.rug_ratio,
          bundlerRate:       t.bundler_trader_amount_rate,
          entrapmentRatio:   t.entrapment_ratio,
          sniperHoldRate:    t.top70_sniper_hold_rate,
          top10HolderRate:   t.top_10_holder_rate,
          creatorBalance:    t.creator_balance_rate,
          creatorCount:      t.creator_created_count,
          creatorOpenCount:  t.creator_created_open_count,
          creatorOpenRatio:  t.creator_created_open_ratio,
          creatorStatus:     t.creator_token_status,
          twitterHandle:     t.twitter_handle,
          twitterFollowers:  t.x_user_follower,
          tgCallCount:       t.tg_call_count,
          hasSocial:         t.has_at_least_one_social,
          twitterDup:        t.twitter_dup,
          imageDup:          t.image_dup,
          isWashTrading:     t.is_wash_trading,
          renouncedMint:     t.renounced_mint,
          renouncedFreeze:   t.renounced_freeze_account,
          launchpad:         t.launchpad_platform,
          createdAt:         t.created_timestamp,
        })),
      };
    },

    get_token_info: async ({ address }) => {
      const r = getTokenInfo({ chain: cfg.chain, address });
      if (!r.ok) return { error: r.error };
      return r.data;
    },

    get_token_security: async ({ address }) => {
      const r = getTokenSecurity({ chain: cfg.chain, address });
      if (!r.ok) return { error: r.error };
      return r.data;
    },

    get_token_holders: async ({ address, limit = 20 }) => {
      const r = getTokenHolders({ chain: cfg.chain, address, limit });
      if (!r.ok) return { error: r.error };
      return r.data;
    },

    buy_token: async ({ address, symbol, amountSol, slippageBps, score, reason }) => {
      if ((score ?? 0) < 7) return { error: `Conviction score ${score} < 7 — buy rejected` };
      if (boughtThisCycle.has(address)) return { error: 'Already bought this token this cycle' };

      const lastClose = getClosedPositions().filter(p => p.address === address).sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt))[0];
      if (lastClose) {
        const elapsed = Date.now() - new Date(lastClose.closedAt).getTime();
        const wasSL   = lastClose.closeReason?.toLowerCase().includes('sl') || lastClose.closeReason?.toLowerCase().includes('stop');
        const cooldown = wasSL ? 4 * 3_600_000 : 1_800_000;
        if (elapsed < cooldown) {
          const mins = Math.ceil((cooldown - elapsed) / 60000);
          return { error: `${symbol} cooldown active — ${wasSL ? 'SL hit' : 'recently closed'}, ${mins}m remaining` };
        }
      }

      const open = getOpenPositions();
      if (open.length >= cfg.maxPositions) return { error: `Max positions reached (${cfg.maxPositions})` };
      if (open.find(p => p.address === address)) return { error: 'Already holding this token' };

      const amount  = amountSol ?? cfg.amountSolPerTrade;
      const slipBps = slippageBps ?? 500; // higher default slippage for new tokens

      const SOL_RESERVE = 0.1;
      const solBal = await getSolBalance();
      if (solBal - amount < SOL_RESERVE) {
        return { error: `Insufficient SOL: balance ${solBal.toFixed(4)} SOL, need ${(amount + SOL_RESERVE).toFixed(3)}` };
      }

      if (cfg.dryRun) {
        log.warn(`[DRY RUN] Would buy ${symbol} (${address.slice(0,8)}) — ${amount} SOL — score:${score} — ${reason}`);
        boughtThisCycle.add(address);
        addPosition({ address, symbol, amountSol: amount, chain: cfg.chain, score, reason, mode: 'newToken' });
        notifyBuy({ symbol, address, amountSol: amount, score, reason, dryRun: true });
        return { ok: true, dryRun: true, message: `[DRY RUN] Would buy ${amount} SOL of ${symbol} (score ${score})` };
      }

      const r = await jupiterBuy({ outputToken: address, amountSol: amount, slippageBps: slipBps });
      if (!r.ok) return { error: r.error };

      boughtThisCycle.add(address);
      addPosition({ address, symbol, amountSol: amount, chain: cfg.chain, score, reason, mode: 'newToken' });
      log.ok(`Bought ${symbol} via Jupiter — ${amount} SOL — score:${score} — tx: ${r.data?.signature}`);
      notifyBuy({ symbol, address, amountSol: amount, score, reason, dryRun: false, signature: r.data?.signature });
      return { ok: true, signature: r.data?.signature };
    },

    skip_token: async ({ address, reason }) => {
      stateSkip(address);
      log.info(`Skipped ${address.slice(0, 8)} — ${reason}`);
      return { ok: true, skipped: address, reason };
    },

    add_lesson: async ({ lesson, pinned = false }) => {
      addLesson({ role: 'NEWTOKEN_SCREENER', lesson, pinned });
      return { ok: true };
    },
  };
}

export function makeManagerHandlers() {
  const closedThisCycle = new Set();

  return {
    get_portfolio_holdings: async ({ hideClosed = 'true' } = {}) => {
      const r = getPortfolioHoldings({ chain: cfg.chain, wallet: WALLET, hideClosed });
      if (!r.ok) return { error: r.error };
      const list = r.data?.list || r.data || [];
      // Only surface positions this agent is tracking — prevents cross-agent interference
      const open = getOpenPositions();
      const agentAddrs = new Set(open.map(p => p.address));
      const filteredList = list.filter(h => {
        const addr = h.token?.token_address ?? h.token?.address ?? h.address ?? '';
        return agentAddrs.has(addr);
      });
      return filteredList.map(h => {
        const addr     = h.token?.token_address ?? h.token?.address ?? h.address ?? '';
        const cost     = parseFloat(h.accu_cost ?? h.cost ?? h.avg_cost ?? 0);
        const curVal   = parseFloat(h.usd_value ?? 0);
        const urPnl    = parseFloat(h.unrealized_profit ?? 0);
        // Prefer GMGN's authoritative pnl ratio; fall back to computed
        const urPct    = h.unrealized_profit_pnl != null
          ? parseFloat(h.unrealized_profit_pnl) * 100
          : (cost > 0 ? ((curVal - cost) / cost) * 100 : 0);
        // Cost-basis not yet indexed by GMGN — flag so LLM does not apply exit rules
        const costBasisAvailable = cost > 0 || urPnl !== 0;
        const agentPos = open.find(p => p.address === addr);
        const ageMs    = agentPos?.openedAt ? Date.now() - new Date(agentPos.openedAt).getTime() : 0;
        const ageMin   = Math.floor(ageMs / 60000);
        const ageStr   = ageMin < 60 ? `${ageMin}m` : `${(ageMs / 3600000).toFixed(1)}h`;

        // Fetch live momentum inline so LLM has signal without a separate tool call
        let momentum = null;
        if (addr) {
          const ti = getTokenInfo({ chain: cfg.chain, address: addr });
          if (ti.ok && ti.data) {
            const d = ti.data;
            momentum = {
              price:       d.price ?? d.token_price ?? null,
              change5m:    d.price_change_percent5m ?? d.price5m ?? null,
              change1h:    d.price_change_percent1h ?? d.price1h ?? null,
              change24h:   d.price_change_percent24h ?? d.price24h ?? null,
              volume24h:   d.volume ?? d.volume24h ?? null,
              holders:     d.holder_count ?? d.holders ?? null,
              kol:         d.renowned_count ?? null,
              sm:          d.smart_degen_count ?? null,
            };
          }
        }

        return {
          address:      addr,
          symbol:       h.token?.symbol ?? h.symbol ?? '?',
          balance:      parseFloat(h.balance ?? 0),
          decimals:     h.token?.decimals ?? 9,
          usdValue:     curVal,
          cost,
          unrealizedPnlUsd: urPnl,
          unrealizedPnlPct: costBasisAvailable ? parseFloat(urPct.toFixed(2)) : null,
          costBasisAvailable,
          agentTracked: !!agentPos,
          openedAt:     agentPos?.openedAt,
          age:          ageStr,
          peakPnlPct:   agentPos?.peakPnlPct,
          conditions:   agentPos?.conditions,
          momentum,
        };
      });
    },

    get_token_info: async ({ address }) => {
      const r = getTokenInfo({ chain: cfg.chain, address });
      if (!r.ok) return { error: r.error };
      return r.data;
    },

    close_position: async ({ address, reason }) => {
      if (closedThisCycle.has(address)) return { error: 'Already closed this cycle' };

      // Get balance from portfolio
      const holdings = getPortfolioHoldings({ chain: cfg.chain, wallet: WALLET, hideClosed: 'true' });
      if (!holdings.ok) return { error: `Can't fetch holdings: ${holdings.error}` };
      const list = holdings.data?.list ?? holdings.data ?? [];
      const holding = list.find(h => (h.token?.token_address ?? h.token?.address ?? h.address) === address);
      if (!holding) return { error: 'Token not found in portfolio — may already be closed' };

      const balance  = parseFloat(holding.balance ?? 0);
      if (balance <= 0) return { error: `${address.slice(0, 8)} balance is 0 — may already be sold or not indexed yet` };

      const decimals = holding.token?.decimals ?? 9;
      const cost     = parseFloat(holding.accu_cost ?? holding.cost ?? holding.avg_cost ?? 0);
      const curVal   = parseFloat(holding.usd_value ?? 0);
      // If accu_cost missing (GMGN indexing lag), derive cost from unrealized_profit
      const urPnl    = parseFloat(holding.unrealized_profit ?? 0);
      const effCost  = cost > 0 ? cost : (urPnl !== 0 ? curVal - urPnl : 0);
      const pnlUsd   = effCost > 0 ? curVal - effCost : urPnl;
      const pnlPct   = effCost > 0 ? (pnlUsd / effCost) * 100 : 0;

      const symbol = holding.token?.symbol ?? holding.symbol ?? address.slice(0, 8);

      if (cfg.dryRun) {
        log.warn(`[DRY RUN] Would close ${symbol} — PnL: ${pnlPct.toFixed(1)}%`);
        closedThisCycle.add(address);
        stateClose(address, { realizedPnlUsd: pnlUsd, realizedPnlPct: pnlPct, closeReason: reason });
        notifySell({ symbol, address, pnlPct: pnlPct.toFixed(1), pnlUsd: pnlUsd.toFixed(2), reason, dryRun: true });
        return { ok: true, dryRun: true, message: `[DRY RUN] Would close — PnL ${pnlPct.toFixed(1)}%` };
      }

      const lamports = Math.round(balance * Math.pow(10, decimals));
      let r;
      for (const slipBps of [300, 500, 1000, 2000]) {
        r = await jupiterSell({ inputToken: address, amountLamports: lamports, slippageBps: slipBps });
        if (r.ok) break;
        log.warn({ slipBps, error: r.error }, `Sell failed — retrying with higher slippage`);
      }
      if (!r.ok) return { error: r.error };

      closedThisCycle.add(address);
      stateClose(address, { realizedPnlUsd: pnlUsd, realizedPnlPct: pnlPct, closeReason: reason });
      log.ok(`Closed ${symbol} via Jupiter — PnL: ${pnlPct.toFixed(1)}% — ${reason} — tx: ${r.data?.signature}`);
      notifySell({ symbol, address, pnlPct: pnlPct.toFixed(1), pnlUsd: pnlUsd.toFixed(2), reason, dryRun: false, signature: r.data?.signature });
      return { ok: true, pnlPct: pnlPct.toFixed(1), signature: r.data?.signature };
    },

    hold_position: async ({ address, reason }) => {
      log.info(`Hold ${address.slice(0,8)} — ${reason}`);
      return { ok: true, holding: address, reason };
    },

    add_lesson: async ({ lesson, pinned = false }) => {
      addLesson({ role: 'MANAGER', lesson, pinned });
      return { ok: true };
    },

    partialSell: async ({ address, sellPct, triggerPct, reason }) => {
      const holdings = getPortfolioHoldings({ chain: cfg.chain, wallet: WALLET, hideClosed: 'true' });
      if (!holdings.ok) return { error: `Can't fetch holdings: ${holdings.error}` };
      const list = holdings.data?.list ?? holdings.data ?? [];
      const holding = list.find(h => (h.token?.token_address ?? h.token?.address ?? h.address) === address);
      if (!holding) return { error: 'Token not found in portfolio' };

      const balance = parseFloat(holding.balance ?? 0);
      if (balance <= 0) return { error: `${address.slice(0, 8)} balance is 0` };

      const decimals     = holding.token?.decimals ?? 9;
      const tokensToSell = balance * (sellPct / 100);
      const lamports     = Math.round(tokensToSell * Math.pow(10, decimals));
      const symbol       = holding.token?.symbol ?? holding.symbol ?? address.slice(0, 8);

      const pos     = getOpenPositions().find(p => p.address === address);
      const cost    = parseFloat(holding.accu_cost ?? holding.cost ?? holding.avg_cost ?? 0);
      const curVal  = parseFloat(holding.usd_value ?? 0);
      const urPnl   = parseFloat(holding.unrealized_profit ?? 0);
      const effCost = cost > 0 ? cost : (urPnl !== 0 ? curVal - urPnl : 0);
      const pnlPct  = effCost > 0 ? ((curVal - effCost) / effCost) * 100 : 0;

      if (cfg.dryRun) {
        log.warn(`[DRY RUN] Tiered exit: would sell ${sellPct}% of ${symbol} at +${pnlPct.toFixed(1)}% (trigger ${triggerPct}%)`);
        if (pos) updatePosition(address, { tieredExitsDone: [...(pos.tieredExitsDone ?? []), triggerPct] });
        notifySell({ symbol, address, pnlPct: pnlPct.toFixed(1), pnlUsd: '0', reason: `[PARTIAL ${sellPct}%] ${reason}`, dryRun: true });
        return { ok: true, dryRun: true };
      }

      let r;
      for (const slipBps of [300, 500, 1000, 2000]) {
        r = await jupiterSell({ inputToken: address, amountLamports: lamports, slippageBps: slipBps });
        if (r.ok) break;
        log.warn({ slipBps, error: r.error }, `Partial sell failed — retrying with higher slippage`);
      }
      if (!r.ok) return { error: r.error };

      if (pos) updatePosition(address, { tieredExitsDone: [...(pos.tieredExitsDone ?? []), triggerPct] });
      log.ok(`Tiered exit: sold ${sellPct}% of ${symbol} at +${pnlPct.toFixed(1)}% — tx: ${r.data?.signature}`);
      notifySell({ symbol, address, pnlPct: pnlPct.toFixed(1), pnlUsd: '0', reason: `[PARTIAL ${sellPct}%] ${reason}`, dryRun: false, signature: r.data?.signature });
      return { ok: true, soldPct: sellPct, pnlPct: pnlPct.toFixed(1), signature: r.data?.signature };
    },
  };
}
