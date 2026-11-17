#!/usr/bin/env bun
import cron from 'node-cron';
import { runNewTokenScreeningCycle } from './newtoken-screener.js';
import { runManagementCycle } from './manager.js';
import { cfg, WALLET, OPENROUTER_KEY, SOL_PRIVATE_KEY } from './config.js';
import { getStats, getOpenPositions } from './state.js';
import { log } from './logger.js';
import { notifyStartup, sendMorningBriefing } from './telegram.js';
import { runEvolveCycle } from './evolve.js';
import { makeManagerHandlers } from './tools.js';

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

log.info(`  GMGN NEW-TOKEN AGENT starting`);
log.info(`  Wallet:   ${WALLET}`);
log.info(`  Model:    ${cfg.claude.model}`);
log.info(`  Dry run:  ${cfg.dryRun}`);
log.info(`  Scan:     every ${cfg.screeningIntervalMinutes}m (new_creation mode)`);
log.info(`  Manage:   every ${cfg.managementIntervalMinutes}m`);
log.info(`  Max pos:  ${cfg.maxPositions} @ ${cfg.amountSolPerTrade} SOL each`);
log.info(`  SL:       ${cfg.stopLossPercent}%  |  Trailing: +${cfg.trailingTriggerPercent}% → −${cfg.trailingDropPercent}% from peak`);

const stats = getStats();
const open  = getOpenPositions();
log.info(`  State:    ${open.length} open | ${stats.closedCount} closed | WR ${stats.winRate} | PR ${stats.profitRatio} | PnL $${stats.totalPnlUsd}`);

if (cfg.dryRun) {
  log.warn('  ⚠  DRY RUN MODE — no real trades will execute');
}
console.log('');

// ── Busy flags ────────────────────────────────────────────────────────────────
let screeningBusy  = false;
let managementBusy = false;
let evolveBusy     = false;

async function safeScreening(onProgress) {
  if (screeningBusy) { log.warn('New-token screening already running — skipping'); await onProgress?.done?.('Already running'); return; }
  screeningBusy = true;
  try { await runNewTokenScreeningCycle({ onProgress }); }
  catch (e) { log.error(`New-token screening uncaught: ${e.message}`); await onProgress?.fail?.(e.message); }
  finally { screeningBusy = false; }
}

async function safeManagement(onProgress) {
  if (managementBusy) { log.warn('Management already running — skipping'); await onProgress?.done?.('Already running'); return; }
  managementBusy = true;
  try { await runManagementCycle({ onProgress }); }
  catch (e) { log.error(`Management uncaught: ${e.message}`); await onProgress?.fail?.(e.message); }
  finally { managementBusy = false; }
}

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
  console.log('\n  GMGN NEW-TOKEN AGENT STATUS');
  console.log(`  Open positions: ${positions.length}`);
  positions.forEach(p => console.log(`    • ${p.symbol} (${p.address.slice(0,8)}) — ${p.amountSol} SOL`));
  console.log(`  Closed: ${s.closedCount} | Win rate: ${s.winRate} | Profit ratio: ${s.profitRatio} | PnL: $${s.totalPnlUsd}\n`);
  process.exit(0);
}

// ── Daemon mode ───────────────────────────────────────────────────────────────
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
cron.schedule('0 1 * * *', sendMorningBriefing, { timezone: 'UTC' });

log.info(`Cron: management every ${cfg.managementIntervalMinutes}m, new-token screening every ${cfg.screeningIntervalMinutes}m`);
log.info('New-token agent running. Ctrl+C to stop.\n');

// No Telegram command listener — notifications only (avoids conflict with gmgnAgent listener)
await notifyStartup({ dryRun: cfg.dryRun, model: cfg.claude.model, sl: cfg.stopLossPercent, trailingTrigger: cfg.trailingTriggerPercent, trailingDrop: cfg.trailingDropPercent });

// Run both cycles immediately on start
await safeManagement();
await safeScreening();
