import { readFileSync } from 'fs';
import { runReAct } from './claude.js';
import { managerPrompt } from './prompt.js';
import { MANAGER_TOOLS, makeManagerHandlers } from './tools.js';
import { getPortfolioHoldings } from './gmgn.js';
import {
  getOpenPositions, closePosition as stateClose, addPosition,
  addLesson, setLastRun, getStats, updatePosition,
} from './state.js';
import { cfg, WALLET } from './config.js';
import { log } from './logger.js';
import { notify } from './telegram.js';

// Returns the set of token addresses currently open in any sibling agent's state.
// Used to prevent this agent from adopting or managing positions owned by another agent.
function getSiblingAddrs() {
  const addrs = new Set();
  for (const path of (cfg.siblingStatePaths ?? [])) {
    try {
      const raw = JSON.parse(readFileSync(path, 'utf8'));
      for (const addr of Object.keys(raw.positions ?? {})) addrs.add(addr);
    } catch {}
  }
  return addrs;
}

// Reconcile agent state against actual portfolio holdings.
// Any position the agent thinks is open but isn't in portfolio → it was closed by GMGN condition orders.
async function reconcile() {
  const holdings = getPortfolioHoldings({ chain: cfg.chain, wallet: WALLET, hideClosed: 'false' });
  if (!holdings.ok) {
    log.warn(`Reconcile: can't fetch portfolio — ${holdings.error}`);
    return;
  }

  const list = holdings.data?.list ?? holdings.data ?? [];
  const open = getOpenPositions();
  const openAddrs = new Set(open.map(p => p.address));
  const held = list.filter(h => parseFloat(h.balance ?? 0) > 0);
  const heldAddrs = new Set(held.map(h => h.token?.token_address ?? h.token?.address ?? h.address ?? ''));

  // 1. Detect untracked holdings (manual or external buy)
  const siblingAddrs = getSiblingAddrs();
  for (const h of held) {
    const addr = h.token?.token_address ?? h.token?.address ?? h.address ?? '';
    if (!openAddrs.has(addr)) {
      if (siblingAddrs.has(addr)) {
        log.info(`Reconcile: skipping ${addr.slice(0, 8)} — owned by sibling agent`);
        continue;
      }
      const symbol = h.token?.symbol ?? h.symbol ?? '?';
      log.ok(`Reconcile: found untracked position ${symbol} — starting tracking`);
      addPosition({
        address: addr,
        symbol,
        amountSol: 0,
        chain: cfg.chain,
        score: 0,
        reason: "Detected in portfolio (manual buy)",
      });
      // Add to openAddrs so we don't process it in the next step as closed
      openAddrs.add(addr);
    }
  }

  // 2. Detect external closes
  // Grace period: GMGN portfolio API takes time to index new buys.
  const GRACE_MS = 5 * 60_000;
  const now = Date.now();

  for (const pos of open) {
    const ageMs = pos.openedAt ? now - new Date(pos.openedAt).getTime() : GRACE_MS + 1;
    if (ageMs < GRACE_MS) continue;

    if (!heldAddrs.has(pos.address)) {
      // Position closed externally — find it in portfolio history to get realized PnL
      const entry  = list.find(h => (h.token?.token_address ?? h.token?.address ?? h.address) === pos.address);
      const pnlUsd = parseFloat(entry?.realized_profit ?? 0);
      const cost   = parseFloat(entry?.history_bought_cost ?? entry?.accu_cost ?? 0);
      const pnlPct = entry?.realized_profit_pnl != null
        ? parseFloat(entry.realized_profit_pnl) * 100
        : (cost > 0 ? (pnlUsd / cost) * 100 : 0);

      const sign  = pnlPct >= 0 ? '+' : '';
      const emoji = pnlPct >= 0 ? '🟢' : '🔴';
      log.ok(`Position closed externally: ${pos.symbol} — PnL ${pnlPct.toFixed(1)}%`);
      stateClose(pos.address, {
        realizedPnlUsd: pnlUsd,
        realizedPnlPct: pnlPct,
        closeReason: 'external_close',
      });
      addLesson({
        role: 'MANAGER',
        lesson: `${pos.symbol} closed externally — PnL: ${sign}${pnlPct.toFixed(1)}% ($${pnlUsd.toFixed(2)}) — ${pnlPct >= 0 ? 'win' : 'loss'}. Entry reason: "${pos.reason}"`,
      });
      notify(`${emoji} <b>CLOSED externally — ${pos.symbol.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</b>\nPnL: ${sign}${pnlPct.toFixed(1)}% ($${pnlUsd.toFixed(2)})\nReason: external close detected`);
    }
  }
}

// Hard SL and time-stop check — runs before Claude
async function hardSlCheck(handlers) {
  const holdings = getPortfolioHoldings({ chain: cfg.chain, wallet: WALLET, hideClosed: 'true' });
  if (!holdings.ok) return;

  const list = holdings.data?.list ?? holdings.data ?? [];
  const open = getOpenPositions();
  const now  = Date.now();

  for (const pos of open) {
    const h = list.find(hh => (hh.token?.token_address ?? hh.token?.address ?? hh.address) === pos.address);
    if (!h) continue;
    const cost   = parseFloat(h.accu_cost ?? h.cost ?? h.avg_cost ?? 0);
    const curVal = parseFloat(h.usd_value ?? 0);
    // If accu_cost missing (GMGN indexing lag), derive cost from unrealized_profit
    const urPnl  = parseFloat(h.unrealized_profit ?? 0);
    const effCost = cost > 0 ? cost : (urPnl !== 0 ? curVal - urPnl : 0);
    const pnlPct  = effCost > 0 ? ((curVal - effCost) / effCost) * 100 : 0;
    const ageMs  = pos.openedAt ? now - new Date(pos.openedAt).getTime() : 0;
    const ageH   = ageMs / 3_600_000;

    // Update peak PnL for trailing stop tracking
    const peak = pos.peakPnlPct ?? 0;
    if (pnlPct > peak) {
      updatePosition(pos.address, { peakPnlPct: pnlPct });
      pos.peakPnlPct = pnlPct;
    }

    // Tiered exits — fire before SL check so partial profit is locked even if SL follows
    for (const tier of (cfg.tieredExits ?? [])) {
      if (pnlPct >= tier.triggerPct && !(pos.tieredExitsDone ?? []).includes(tier.triggerPct)) {
        log.ok(`Tiered exit for ${pos.symbol}: PnL ${pnlPct.toFixed(1)}% >= ${tier.triggerPct}% — selling ${tier.sellPct}%`);
        await handlers.partialSell({ address: pos.address, sellPct: tier.sellPct, triggerPct: tier.triggerPct, reason: `Tiered exit: ${pnlPct.toFixed(1)}% hit ${tier.triggerPct}% trigger` });
        pos.tieredExitsDone = [...(pos.tieredExitsDone ?? []), tier.triggerPct];
      }
    }

    if (pnlPct <= -cfg.stopLossPercent) {
      log.warn(`Hard SL triggered for ${pos.symbol}: ${pnlPct.toFixed(1)}%`);
      await handlers.close_position({ address: pos.address, reason: `Hard SL: ${pnlPct.toFixed(1)}%` });
      continue;
    }

    // Trailing stop: activates after peak >= trailingTriggerPercent, closes on drop >= trailingDropPercent
    const activePeak = pos.peakPnlPct ?? 0;
    if (cfg.trailingEnabled !== false && activePeak >= cfg.trailingTriggerPercent && pnlPct <= activePeak - cfg.trailingDropPercent) {
      log.warn(`Trailing stop for ${pos.symbol}: peak +${activePeak.toFixed(1)}%, now ${pnlPct.toFixed(1)}%`);
      await handlers.close_position({ address: pos.address, reason: `Trailing stop: peaked at +${activePeak.toFixed(1)}%, dropped to ${pnlPct.toFixed(1)}%` });
      continue;
    }

    // Time stop: open > timeStopHours and hasn't reached timeStopMinGainPct
    if (ageH >= cfg.timeStopHours && pnlPct < cfg.timeStopMinGainPct) {
      log.warn(`Hard time-stop for ${pos.symbol}: ${ageH.toFixed(1)}h old, PnL ${pnlPct.toFixed(1)}%`);
      await handlers.close_position({ address: pos.address, reason: `Time stop: ${ageH.toFixed(1)}h open, gain only ${pnlPct.toFixed(1)}% < ${cfg.timeStopMinGainPct}% threshold` });
      continue;
    }

    // Absolute time stop: 48h regardless
    if (ageH >= 48) {
      log.warn(`Hard 48h stop for ${pos.symbol}: ${ageH.toFixed(1)}h old`);
      await handlers.close_position({ address: pos.address, reason: `48h absolute time stop — meme narrative expired` });
    }
  }
}

export async function runManagementCycle({ onProgress } = {}) {
  log.info('━━━ MANAGEMENT CYCLE START ━━━');

  // Step 1: Reconcile closed positions
  await reconcile();

  const open = getOpenPositions();
  if (!open.length) {
    log.info('No open positions — skipping management');
    setLastRun('manager');
    await onProgress?.done?.('No open positions');
    return;
  }

  log.info(`Managing ${open.length} open position(s)`);
  onProgress?.addStep?.('open', `📂 ${open.length} open position(s)`);

  const handlers = makeManagerHandlers();

  // Step 2: Hard SL check (no Claude needed)
  await hardSlCheck(handlers);

  // Step 3: Claude reviews remaining positions
  const remaining = getOpenPositions();
  if (!remaining.length) {
    setLastRun('manager');
    log.info('━━━ MANAGEMENT CYCLE END ━━━');
    await onProgress?.done?.('Positions closed by hard stops');
    return;
  }

  const stats = getStats();
  const initialMessage = `Review ${remaining.length} open position(s). Call get_portfolio_holdings to check PnL, apply rules, and decide hold or close for each. Stats: ${JSON.stringify(stats)}`;

  try {
    await runReAct({
      role: 'MANAGER',
      systemPrompt: managerPrompt(),
      initialMessage,
      tools: MANAGER_TOOLS,
      handlers,
      onProgress,
    });
    await onProgress?.done?.('Management complete');
  } catch (e) {
    log.error(`Management cycle error: ${e.message}`);
    await onProgress?.fail?.(e.message);
  }

  setLastRun('manager');
  log.info('━━━ MANAGEMENT CYCLE END ━━━');
}
