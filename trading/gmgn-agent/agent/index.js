#!/usr/bin/env bun
import cron from 'node-cron';
import { readFileSync, existsSync } from 'fs';
import { join, dirname, basename } from 'path';
import { runScreeningCycle } from './screener.js';
import { runManagementCycle } from './manager.js';
import { cfg, WALLET, OPENROUTER_KEY, SOL_PRIVATE_KEY } from './config.js';
import { getStats, getOpenPositions } from './state.js';
import { log } from './logger.js';
import { notifyStartup, sendMorningBriefing, startCommandListener, tg } from './telegram.js';
import { runEvolveCycle } from './evolve.js';
import { makeManagerHandlers } from './tools.js';

// ── Startup validation ────────────────────────────────────────────────────────
if (!WALLET) {
  console.error('\n  ✗ WALLET_ADDRESS not set in .env\n');
  process.exit(1);
}
if (!OPENROUTER_KEY) {
  console.error('\n  ✗ OPENROUTER_API_KEY not set in .env\n');
  process.exit(1);
}
if (!SOL_PRIVATE_KEY) {
  console.error('\n  ✗ WALLET_PRIVATE_KEY not set in .env\n');
  process.exit(1);
}

log.info(`  GMGN AGENT starting`);
log.info(`  Wallet:   ${WALLET}`);
log.info(`  Model:    ${cfg.claude.model}`);
log.info(`  Dry run:  ${cfg.dryRun}`);
log.info(`  Scan:     every ${cfg.screeningIntervalMinutes}m`);
log.info(`  Manage:   every ${cfg.managementIntervalMinutes}m`);
log.info(`  Max pos:  ${cfg.maxPositions} @ ${cfg.amountSolPerTrade} SOL each`);
log.info(`  SL:       ${cfg.stopLossPercent}%  |  Trailing: +${cfg.trailingTriggerPercent}% → −${cfg.trailingDropPercent}% from peak`);

const stats = getStats();
const open  = getOpenPositions();
log.info(`  State:    ${open.length} open | ${stats.closedCount} closed | WR ${stats.winRate} | PR ${stats.profitRatio} | PnL $${stats.totalPnlUsd}`);

if (cfg.dryRun) {
  log.warn('  ⚠  DRY RUN MODE — no real trades will execute');
}
log.info(`  Telegram: ${tg.enabled ? 'enabled' : 'disabled'}`);
console.log('');

// ── Busy flags (prevent overlapping cycles) ───────────────────────────────────
let screeningBusy = false;
let managementBusy = false;

async function safeScreening(onProgress) {
  if (screeningBusy) { log.warn('Screening already running — skipping'); await onProgress?.done?.('Already running'); return; }
  screeningBusy = true;
  try { await runScreeningCycle({ onProgress }); }
  catch (e) { log.error(`Screening uncaught: ${e.message}`); await onProgress?.fail?.(e.message); }
  finally { screeningBusy = false; }
}

async function safeManagement(onProgress) {
  if (managementBusy) { log.warn('Management already running — skipping'); await onProgress?.done?.('Already running'); return; }
  managementBusy = true;
  try { await runManagementCycle({ onProgress }); }
  catch (e) { log.error(`Management uncaught: ${e.message}`); await onProgress?.fail?.(e.message); }
  finally { managementBusy = false; }
}

let evolveBusy = false;
async function safeEvolve(onProgress) {
  if (evolveBusy) { log.warn('Evolve already running — skipping'); await onProgress?.done?.('Already running'); return; }
  evolveBusy = true;
  try { await runEvolveCycle({ onProgress }); }
  catch (e) { log.error(`Evolve uncaught: ${e.message}`); await onProgress?.fail?.(e.message); }
  finally { evolveBusy = false; }
}

// ── Parse mode from args ──────────────────────────────────────────────────────
const mode = process.argv[2] || 'daemon';

if (mode === 'screen') {
  await safeScreening();
  process.exit(0);
}

if (mode === 'manage') {
  await safeManagement();
  process.exit(0);
}

if (mode === 'status') {
  const s = getStats();
  const positions = getOpenPositions();
  console.log('\n  GMGN AGENT STATUS');
  console.log(`  Open positions: ${positions.length}`);
  positions.forEach(p => console.log(`    • ${p.symbol} (${p.address.slice(0,8)}) — ${p.amountSol} SOL`));
  console.log(`  Closed: ${s.closedCount} | Win rate: ${s.winRate} | Profit ratio: ${s.profitRatio} | PnL: $${s.totalPnlUsd}\n`);
  process.exit(0);
}

// ── Daemon mode: cron scheduling ──────────────────────────────────────────────
const screenCron = `*/${cfg.screeningIntervalMinutes} * * * *`;
const manageCron = `*/${cfg.managementIntervalMinutes} * * * *`;

cron.schedule(manageCron, async () => {
  await safeManagement();
  // Auto-evolve after every N closed trades
  const threshold = cfg.autoEvolveAfterTrades ?? 20;
  if (threshold > 0) {
    const { closedCount } = getStats();
    if (closedCount > 0 && closedCount % threshold === 0 && !evolveBusy) {
      log.info(`Auto-evolve triggered at ${closedCount} closed trades`);
      safeEvolve();
    }
  }
});
cron.schedule(screenCron,  () => safeScreening());
cron.schedule('0 1 * * *', sendMorningBriefing, { timezone: 'UTC' }); // 09:00 UTC+8

log.info(`Cron: management every ${cfg.managementIntervalMinutes}m, screening every ${cfg.screeningIntervalMinutes}m`);
log.info('Agent running. Ctrl+C to stop.\n');

// Build sibling query handler for /new_* Telegram commands
function buildSiblingQuery() {
  const statePaths = cfg.siblingStatePaths ?? [];
  if (!statePaths.length) return null;

  function readSiblingState(statePath) {
    if (!existsSync(statePath)) return null;
    try { return JSON.parse(readFileSync(statePath, 'utf8')); } catch { return null; }
  }

  function siblingConfigPath(statePath) {
    const cfgName = 'agent-config-' + basename(statePath).replace('state-', '');
    return join(dirname(dirname(statePath)), cfgName);
  }

  function esc(str) {
    return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  return async (type) => {
    const statePath = statePaths[0];
    const state = readSiblingState(statePath);
    if (!state) return `⚠️ Could not read sibling state from <code>${esc(statePath)}</code>`;

    if (type === 'status') {
      const positions = Object.values(state.positions ?? {}).filter(p => !p.closedAt);
      const closed    = state.closedPositions ?? [];
      const wins      = closed.filter(p => p.win).length;
      const totalPnl  = closed.reduce((s, p) => s + (p.realizedPnlUsd ?? 0), 0);
      const wr        = closed.length ? `${((wins / closed.length) * 100).toFixed(0)}%` : 'n/a';
      const posLines  = positions.length
        ? positions.map(p => `  • ${esc(p.symbol)} — ${p.address.slice(0,8)}…`).join('\n')
        : '  None';
      return (
        `📊 <b>[New Token] Status</b>\n` +
        `Open: ${positions.length}\n` +
        posLines + '\n\n' +
        `Closed: ${closed.length}  |  Wins: ${wins}  |  WR: ${wr}\n` +
        `Net PnL: $${totalPnl.toFixed(2)}`
      );
    }

    if (type === 'positions') {
      const positions = Object.values(state.positions ?? {}).filter(p => !p.closedAt);
      if (!positions.length) return '📂 <b>[New Token] Open Positions</b>\nNo open positions.';
      const now   = Date.now();
      const lines = positions.map(p => {
        const ageMin = Math.floor((now - new Date(p.openedAt).getTime()) / 60000);
        const ageStr = ageMin < 60 ? `${ageMin}m` : `${(ageMin / 60).toFixed(1)}h`;
        return `• <b>${esc(p.symbol)}</b> — ${p.amountSol} SOL — age: ${ageStr}\n  <code>${p.address}</code>`;
      });
      return `📂 <b>[New Token] Open Positions (${positions.length})</b>\n\n${lines.join('\n\n')}`;
    }

    if (type === 'config') {
      const cfgPath = siblingConfigPath(statePath);
      let sibCfg = null;
      if (existsSync(cfgPath)) {
        try { sibCfg = JSON.parse(readFileSync(cfgPath, 'utf8')); } catch {}
      }
      if (!sibCfg) return `⚠️ Could not read sibling config from <code>${esc(cfgPath)}</code>`;
      const s = sibCfg.newTokenScreening ?? {};
      return (
        `⚙️ <b>[New Token] Config</b>\n\n` +
        `<b>Trade</b>\n` +
        `Amount: ${sibCfg.amountSolPerTrade} SOL\n` +
        `SL: ${sibCfg.stopLossPercent}%  |  TP: ${sibCfg.takeProfitPercent}%\n` +
        `Trailing: activates at +${sibCfg.trailingTriggerPercent}%, closes on −${sibCfg.trailingDropPercent}% from peak\n` +
        `Time stop: ${sibCfg.timeStopHours}h / min gain ${sibCfg.timeStopMinGainPct}%\n` +
        `Max positions: ${sibCfg.maxPositions}\n\n` +
        `<b>New Token Screening</b>\n` +
        `Min smart degen: ${s.minSmartDegen}\n` +
        `Progress: ${((s.minProgress ?? 0) * 100).toFixed(0)}%–${((s.maxProgress ?? 1) * 100).toFixed(0)}%\n` +
        `Mcap: $${s.minMcap}–$${s.maxMcap}\n` +
        `Holders: >${s.minHolders}  |  Max bundler: ${((s.maxBundlerRate ?? 0) * 100).toFixed(0)}%\n\n` +
        `<b>Model</b>\n` +
        `${(sibCfg.claude ?? {}).model ?? 'n/a'}\n` +
        `Dry run: ${sibCfg.dryRun ? '🟡 ON' : '🟢 OFF'}`
      );
    }

    return `⚠️ Unknown query type: ${type}`;
  };
}

const mHandlers = makeManagerHandlers();
startCommandListener({
  onStudy: safeScreening,
  onManage: safeManagement,
  onEvolve: safeEvolve,
  onSiblingQuery: buildSiblingQuery(),
  onSell: async (address) => {
    log.info(`Manual sell requested via Telegram: ${address}`);
    return mHandlers.close_position({ address, reason: 'Manual sell via Telegram' });
  }
});

await notifyStartup({ dryRun: cfg.dryRun, model: cfg.claude.model, sl: cfg.stopLossPercent, trailingTrigger: cfg.trailingTriggerPercent, trailingDrop: cfg.trailingDropPercent });

// Run both cycles immediately on start
await safeManagement();
await safeScreening();
