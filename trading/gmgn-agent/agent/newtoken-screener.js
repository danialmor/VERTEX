import { runReAct } from './claude.js';
import { newTokenScreenerPrompt } from './prompt.js';
import { NEWTOKEN_SCREENER_TOOLS, makeNewTokenScreenerHandlers } from './tools.js';
import { getTrenches } from './gmgn.js';
import { getOpenPositions, getClosedPositions, isSkippedToday, setLastRun } from './state.js';
import { cfg } from './config.js';
import { log } from './logger.js';
import { getSolBalance } from './jupiter.js';

function preFilter(tokens, scr, openAddrs, closedPositions) {
  const closedAddrs = new Set(closedPositions.map(p => p.address));
  return tokens.filter(t => {
    if (openAddrs.includes(t.address)) return false;
    if (closedAddrs.has(t.address)) {
      const last = closedPositions.find(p => p.address === t.address);
      if (last && (Date.now() - new Date(last.closedAt).getTime()) < 1_800_000) return false;
    }
    if (isSkippedToday(t.address)) return false;

    if ((t.progress ?? 0) < scr.minProgress)                           return false;
    if ((t.progress ?? 0) > scr.maxProgress)                           return false;
    if ((t.smart_degen_count ?? 0) < scr.minSmartDegen)                return false;
    if ((t.holder_count ?? 0) < scr.minHolders)                        return false;
    if ((t.volume_24h ?? 0) < scr.minVolume24h)                        return false;
    if ((t.swaps_24h ?? 0) < scr.minSwaps24h)                          return false;
    if ((t.usd_market_cap ?? 0) < scr.minMcap)                         return false;
    if (scr.maxMcap > 0 && (t.usd_market_cap ?? Infinity) > scr.maxMcap) return false;
    if ((t.bundler_trader_amount_rate ?? 0) > scr.maxBundlerRate)       return false;
    if ((t.rug_ratio ?? 0) > scr.maxRugRatio)                           return false;
    if ((t.entrapment_ratio ?? 0) > scr.maxEntrapmentRatio)             return false;
    if (t.is_wash_trading)                                               return false;
    if (scr.requireRenounced && !t.renounced_mint)                      return false;
    if (scr.requireRenounced && !t.renounced_freeze_account)            return false;

    // Serial spammer: >100 launches, <1% graduation rate
    const creatorCount = t.creator_created_count ?? 0;
    const gradRate     = t.creator_created_open_ratio ?? 0;
    if (creatorCount > 100 && gradRate < 0.01) return false;

    return true;
  });
}

export async function runNewTokenScreeningCycle({ onProgress } = {}) {
  log.info('━━━ NEW-TOKEN SCREENING CYCLE START ━━━');

  const open = getOpenPositions();
  if (open.length >= cfg.maxPositions) {
    log.info(`Positions full (${open.length}/${cfg.maxPositions}) — skipping new-token screening`);
    await onProgress?.done?.(`Positions full (${open.length}/${cfg.maxPositions})`);
    return;
  }

  const SOL_RESERVE = 0.1;
  try {
    const solBal = await getSolBalance();
    if (solBal - cfg.amountSolPerTrade < SOL_RESERVE) {
      log.warn(`Low SOL: ${solBal.toFixed(4)} — need ${(cfg.amountSolPerTrade + SOL_RESERVE).toFixed(3)} minimum — skipping`);
      setLastRun('screener');
      await onProgress?.done?.(`Low SOL: ${solBal.toFixed(4)} SOL`);
      return;
    }
    log.info(`SOL balance: ${solBal.toFixed(4)} SOL`);
  } catch (e) {
    log.warn(`SOL balance check failed: ${e.message} — continuing`);
  }

  const scr       = cfg.newTokenScreening;
  const openAddrs = open.map(p => p.address);
  const closed    = getClosedPositions();

  const result = getTrenches({
    chain:             cfg.chain,
    limit:             scr.limit,
    minSmartDegen:     scr.minSmartDegen,
    minProgress:       scr.minProgress,
    maxProgress:       scr.maxProgress,
    minMcap:           scr.minMcap,
    maxMcap:           scr.maxMcap,
    maxBundlerRate:    scr.maxBundlerRate,
    maxRugRatio:       scr.maxRugRatio,
    maxEntrapmentRatio: scr.maxEntrapmentRatio,
  });

  if (!result.ok) {
    log.error(`Trenches fetch failed: ${result.error}`);
    return;
  }

  log.info(`Trenches: ${result.data.length} new_creation tokens fetched`);

  const candidates = preFilter(result.data, scr, openAddrs, closed);

  if (!candidates.length) {
    log.info('No candidates after pre-filter — skipping cycle');
    setLastRun('screener');
    await onProgress?.done?.('No candidates after filter');
    return;
  }

  log.info(`${candidates.length} candidate(s) passed pre-filter — calling LLM`);
  onProgress?.addStep?.('pre', `🔎 ${candidates.length} candidate(s) passed pre-filter`);

  // Sort by smart money signal, then by progress (further along = more validated)
  const sorted = [...candidates].sort((a, b) =>
    ((b.smart_degen_count ?? 0) + (b.renowned_count ?? 0)) -
    ((a.smart_degen_count ?? 0) + (a.renowned_count ?? 0)) ||
    (b.progress ?? 0) - (a.progress ?? 0)
  );

  const topList = sorted.slice(0, 8).map(t =>
    `${t.symbol} (${t.address}) sm=${t.smart_degen_count ?? 0} kol=${t.renowned_count ?? 0} progress=${((t.progress ?? 0) * 100).toFixed(1)}% mcap=$${Math.round(t.usd_market_cap ?? 0)}`
  ).join('\n');

  const initialMessage = `Run the new-token screening cycle. ${candidates.length} pre-filtered new_creation candidates (sorted by smart signal + bonding curve progress):\n${topList}\n\nUse get_new_tokens to get full data, research the top candidates, and make a buy or skip decision.`;

  try {
    await runReAct({
      role: 'NEWTOKEN_SCREENER',
      systemPrompt: newTokenScreenerPrompt(),
      initialMessage,
      tools: NEWTOKEN_SCREENER_TOOLS,
      handlers: makeNewTokenScreenerHandlers(),
      onProgress,
    });
    await onProgress?.done?.('New-token screening complete');
  } catch (e) {
    log.error(`New-token screening cycle error: ${e.message}`);
    await onProgress?.fail?.(e.message);
  }

  setLastRun('screener');
  log.info('━━━ NEW-TOKEN SCREENING CYCLE END ━━━');
}
