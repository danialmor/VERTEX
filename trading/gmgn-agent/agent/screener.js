import { runReAct } from './claude.js';
import { screenerPrompt } from './prompt.js';
import { SCREENER_TOOLS, makeScreenerHandlers } from './tools.js';
import { getTrending } from './gmgn.js';
import { getOpenPositions, getClosedPositions, isSkippedToday, setLastRun } from './state.js';
import { cfg } from './config.js';
import { log } from './logger.js';
import { getSolBalance } from './jupiter.js';

export function computeOrganicScore(t) {
  let score = 100;
  if (t.is_wash_trading)                          score -= 60;
  score -= (t.rat_trader_amount_rate  ?? 0) * 60;
  score -= (t.entrapment_ratio        ?? 0) * 50;
  score -= (t.bot_degen_rate          ?? 0) * 40;
  score -= (t.bundler_rate            ?? 0) * 20;
  score -= (t.top70_sniper_hold_rate  ?? 0) * 15;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function preFilter(tokens, scr, openAddrs, closedPositions) {
  const closedAddrs = new Set(closedPositions.map(p => p.address));
  return tokens.filter(t => {
    if (openAddrs.includes(t.address))     return false; // already holding
    if (closedAddrs.has(t.address)) {
      const last = closedPositions.find(p => p.address === t.address);
      if (last && (Date.now() - new Date(last.closedAt).getTime()) < 1_800_000) return false; // 30m cooldown
    }
    if (isSkippedToday(t.address))         return false;

    // FIX: was ?? 1 — tokens with missing rug_ratio were incorrectly rejected
    if ((t.rug_ratio ?? 0) > scr.maxRugRatio)              return false;
    if ((t.market_cap ?? 0) < scr.minMcap)                 return false;
    if ((t.market_cap ?? Infinity) > scr.maxMcap)          return false;
    if ((t.volume ?? 0) < scr.minVolume24h)                return false;
    // Volume/mcap ratio — filters thin-air volume on illiquid tokens
    if (t.market_cap > 0 && (t.volume ?? 0) / t.market_cap < 0.20) return false;
    if ((t.holder_count ?? 0) < scr.minHolders)           return false;
    if ((t.price_change_percent5m ?? 0) < scr.min5mChangePct)  return false;
    if ((t.price_change_percent1h ?? -1) < scr.min1hChangePct) return false;
    if (computeOrganicScore(t) < (scr.minOrganicScore ?? 60))  return false;
    // Require 5m AND 1h bullish; 24h floor (allow recovery — not required to be positive)
    if (scr.requireBullishSignal) {
      if ((t.price_change_percent5m ?? 0) <= 0) return false;
      if ((t.price_change_percent1h ?? 0) <= 0) return false;
      // 24h: only hard-reject tokens in outright freefall (configurable floor, default -50%)
      if ((t.price_change_percent24h ?? 0) < (scr.min24hChangePct ?? -50)) return false;
    }
    return true;
  });
}

export async function runScreeningCycle({ onProgress } = {}) {
  log.info('━━━ SCREENING CYCLE START ━━━');

  // Check capacity
  const open = getOpenPositions();
  if (open.length >= cfg.maxPositions) {
    log.info(`Positions full (${open.length}/${cfg.maxPositions}) — skipping screening`);
    await onProgress?.done?.(`Positions full (${open.length}/${cfg.maxPositions})`);
    return;
  }

  // Check SOL balance
  const SOL_RESERVE = 0.1;
  try {
    const solBal = await getSolBalance();
    if (solBal - cfg.amountSolPerTrade < SOL_RESERVE) {
      log.warn(`Low SOL: ${solBal.toFixed(4)} SOL — need ${(cfg.amountSolPerTrade + SOL_RESERVE).toFixed(3)} minimum — skipping screening`);
      setLastRun('screener');
      await onProgress?.done?.(`Low SOL: ${solBal.toFixed(4)} SOL`);
      return;
    }
    log.info(`SOL balance: ${solBal.toFixed(4)} SOL`);
  } catch (e) {
    log.warn(`SOL balance check failed: ${e.message} — continuing`);
  }

  const scr        = cfg.screening;
  const openAddrs  = open.map(p => p.address);
  const closed     = getClosedPositions();

  // Fetch trending from both 1h and 5m intervals — merge and deduplicate
  const fetch1h = getTrending({ chain: cfg.chain, interval: '1h', limit: scr.limit, minKol: scr.minKol, minSm: scr.minSm });
  const fetch5m = getTrending({ chain: cfg.chain, interval: '5m', limit: scr.limit, minKol: scr.minKol, minSm: scr.minSm });

  if (!fetch1h.ok && !fetch5m.ok) {
    log.error(`Both trending fetches failed: ${fetch1h.error}`);
    return;
  }

  // Merge — tokens appearing in both intervals are kept once (1h entry wins)
  const seen = new Set();
  const merged = [];
  for (const t of [...(fetch1h.ok ? fetch1h.data : []), ...(fetch5m.ok ? fetch5m.data : [])]) {
    if (!seen.has(t.address)) { seen.add(t.address); merged.push(t); }
  }

  log.info(`Trending: ${fetch1h.ok ? fetch1h.data.length : 0} (1h) + ${fetch5m.ok ? fetch5m.data.length : 0} (5m) = ${merged.length} unique tokens`);

  const candidates = preFilter(merged, scr, openAddrs, closed);

  if (!candidates.length) {
    log.info('No candidates after pre-filter — skipping cycle');
    setLastRun('screener');
    await onProgress?.done?.('No candidates after filter');
    return;
  }

  log.info(`${candidates.length} candidate(s) passed pre-filter — calling LLM`);
  onProgress?.addStep?.('pre', `🔎 ${candidates.length} candidate(s) passed pre-filter`);

  // Pass top candidates sorted by combined KOL+SM signal strength
  const sorted = [...candidates].sort((a, b) =>
    ((b.renowned_count ?? 0) + (b.smart_degen_count ?? 0)) -
    ((a.renowned_count ?? 0) + (a.smart_degen_count ?? 0))
  );
  const topList = sorted.slice(0, 8).map(t =>
    `${t.symbol} (${t.address}) kol=${t.renowned_count ?? 0} sm=${t.smart_degen_count ?? 0} 5m=${t.price_change_percent5m?.toFixed(1) ?? '?'}% 1h=${t.price_change_percent1h?.toFixed(1) ?? '?'}%`
  ).join('\n');

  const initialMessage = `Run the screening cycle. ${candidates.length} pre-filtered candidates (sorted by smart signal strength):\n${topList}\n\nUse get_trending to get full data, research the top candidates, and make a buy or skip decision.`;

  try {
    await runReAct({
      role: 'SCREENER',
      systemPrompt: screenerPrompt(),
      initialMessage,
      tools: SCREENER_TOOLS,
      handlers: makeScreenerHandlers(),
      onProgress,
    });
    await onProgress?.done?.('Screening complete');
  } catch (e) {
    log.error(`Screening cycle error: ${e.message}`);
    await onProgress?.fail?.(e.message);
  }

  setLastRun('screener');
  log.info('━━━ SCREENING CYCLE END ━━━');
}
