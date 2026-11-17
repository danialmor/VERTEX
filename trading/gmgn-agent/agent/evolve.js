import { runReAct } from './claude.js';
import { getClosedPositions, getLessons, getStats, addLesson, updateLesson, deleteLesson, getStatsBreakdown } from './state.js';
import { cfg } from './config.js';
import { log } from './logger.js';
import { notify } from './telegram.js';

function esc(str) { return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

const EVOLVE_TOOLS = [
  {
    name: 'get_trade_history',
    description: 'Get all closed trades with symbol, PnL%, close reason, entry score, entry reason, holdingHours (pre-computed), and peakPnlPct.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_all_lessons',
    description: 'Get all current lessons (pinned and unpinned), including STRATEGIST lessons.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_stats_breakdown',
    description: 'Get performance breakdown by exit reason (hardSL, trailingStop, timeStop, etc.) and by entry conviction score bucket. Use this to identify which patterns correlate with wins vs losses.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'add_lesson',
    description: 'Record a new strategic lesson. Use pinned=true for actionable rules that should always guide decisions.',
    input_schema: {
      type: 'object',
      required: ['lesson'],
      properties: {
        lesson: { type: 'string', description: 'Specific, actionable rule derived from trade patterns' },
        pinned: { type: 'boolean', description: 'true = always included in future prompts' },
      },
    },
  },
  {
    name: 'update_lesson',
    description: 'Update the text or pinned status of an existing lesson by its ID. Use this to refine imprecise lessons rather than adding a duplicate.',
    input_schema: {
      type: 'object',
      required: ['id'],
      properties: {
        id:     { type: 'number', description: 'Lesson ID from get_all_lessons' },
        lesson: { type: 'string', description: 'New lesson text (omit to keep current text)' },
        pinned: { type: 'boolean', description: 'true = always inject into prompts' },
      },
    },
  },
  {
    name: 'delete_lesson',
    description: 'Permanently delete a lesson by ID. Use for lessons that are contradicted by new data, duplicates, or no longer relevant.',
    input_schema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'number', description: 'Lesson ID to delete' },
      },
    },
  },
];

function evolvePrompt(stats, agentLabel) {
  return `You are GMGN ${agentLabel.toUpperCase()} STRATEGIST — a meta-learning analyst for an autonomous Solana meme-coin trader.

AGENT: ${agentLabel} strategy
MISSION: Review all past trade outcomes and existing lessons. Find patterns. Prune obsolete rules. Write new pinned lessons that will raise Win Rate above 50% and Profit Ratio above 1.5.

CURRENT PERFORMANCE:
- Closed trades: ${stats.closedCount}
- Win rate: ${stats.winRate} (target >50%)
- Profit ratio: ${stats.profitRatio} (target >1.5)
- Avg win: +${stats.avgWinPct}%  |  Avg loss: -${stats.avgLossPct}%
- Net PnL: $${stats.totalPnlUsd}

ACTIVE CONFIG:
- TP: ${cfg.takeProfitPercent}%  |  SL: ${cfg.stopLossPercent}%
- Trailing: trigger ${cfg.trailingTriggerPercent}%, drop ${cfg.trailingDropPercent}%
- Min KOL: ${cfg.screening?.minKol ?? 'n/a'}  |  Min SM: ${cfg.screening?.minSm ?? 'n/a'}
- Mcap range: $${cfg.screening?.minMcap ?? 'n/a'}–$${cfg.screening?.maxMcap ?? 'n/a'}

PROCESS:
1. Call get_stats_breakdown — understand which exit types and score buckets are causing losses
2. Call get_trade_history — study the raw trade-by-trade record (holdingHours and peakPnlPct are pre-computed)
3. Call get_all_lessons — read existing rules; identify any that are wrong, duplicated, or obsolete
4. Act on what you find:
   a. Delete lessons contradicted by new data (delete_lesson)
   b. Refine imprecise lessons to add specific numbers (update_lesson)
   c. Add 2–5 new PINNED lessons encoding concrete patterns (add_lesson with pinned=true)
5. If performance data is insufficient (< 10 trades), write 1 conservative lesson only

ANALYTICAL QUESTIONS TO ANSWER:
- Which close reason accounts for most losses? Are hard-SL exits losing more than time-stops?
- Which score bucket (7, 8, 9, 10) has the best win rate? Should the minimum score threshold be raised?
- Do positions with peakPnlPct > 50% that ended at a loss suggest trailing stop is too tight/loose?
- Are there token characteristics (mcap range, KOL count, holder count) that consistently correlate with wins?
- What is the avg holdingHours for winners vs losers? Are we holding losers too long?

Lessons must be specific and actionable. Numbers required.
BAD: "Be more selective."
GOOD: "Tokens with KOL≥5 AND SM≥10 had 3x higher win rate — require both before buying."
GOOD: "Hard-SL exits account for 70% of losses — tokens under $200K mcap trigger SL immediately due to our buy size; raise minMcap filter."
GOOD: "Score-7 entries have 28% win rate vs score-9 entries at 55% — raise minimum score to 8."`;
}

export async function runEvolveCycle({ onProgress } = {}) {
  log.info('━━━ EVOLVE CYCLE START ━━━');
  const stats = getStats();

  if (stats.closedCount < 3) {
    const msg = `⚡ Evolve skipped — need at least 3 closed trades (have ${stats.closedCount})`;
    log.info(msg);
    await notify(msg);
    await onProgress?.done(`Need ≥3 trades (have ${stats.closedCount})`);
    return;
  }

  let lessonsAddedThisCycle = 0;

  const handlers = {
    get_trade_history: async () => {
      const trades = getClosedPositions();
      return trades.map(t => {
        const holdMs = t.closedAt && t.openedAt
          ? new Date(t.closedAt).getTime() - new Date(t.openedAt).getTime()
          : null;
        return {
          symbol:       t.symbol,
          pnlPct:       t.realizedPnlPct,
          pnlUsd:       t.realizedPnlUsd,
          win:          t.win,
          closeReason:  t.closeReason,
          score:        t.score,
          peakPnlPct:   t.peakPnlPct ?? null,
          holdingHours: holdMs != null ? parseFloat((holdMs / 3600000).toFixed(2)) : null,
          entryReason:  t.reason,
          openedAt:     t.openedAt,
          closedAt:     t.closedAt,
        };
      });
    },
    get_all_lessons: async () => getLessons({ limit: 100, includeStrategist: true }),
    get_stats_breakdown: async () => getStatsBreakdown(),
    add_lesson: async ({ lesson, pinned = false }) => {
      if (lessonsAddedThisCycle >= 5) {
        return { ok: false, error: 'Lesson cap (5 per cycle) reached. Use update_lesson to refine existing lessons instead.' };
      }
      addLesson({ role: 'STRATEGIST', lesson, pinned });
      lessonsAddedThisCycle++;
      log.ok(`Evolve lesson${pinned ? ' [PINNED]' : ''}: ${lesson.slice(0, 80)}`);
      return { ok: true, remaining: 5 - lessonsAddedThisCycle };
    },
    update_lesson: async ({ id, lesson, pinned }) => {
      const ok = updateLesson(id, { lesson, pinned });
      if (!ok) return { ok: false, error: `Lesson ID ${id} not found` };
      log.ok(`Evolve updated lesson ${id}`);
      return { ok: true };
    },
    delete_lesson: async ({ id }) => {
      const ok = deleteLesson(id);
      if (!ok) return { ok: false, error: `Lesson ID ${id} not found` };
      log.ok(`Evolve deleted lesson ${id}`);
      return { ok: true };
    },
  };

  const agentLabel = cfg.agentLabel || 'Agent';
  const initialMessage = `Run a full strategy analysis. ${stats.closedCount} closed trades available. Win rate: ${stats.winRate}, profit ratio: ${stats.profitRatio}. Start with get_stats_breakdown, then get_trade_history and get_all_lessons, then prune outdated lessons and add 2–5 new pinned lessons based on concrete patterns you find.`;

  try {
    await runReAct({
      role: 'EVOLVE',
      systemPrompt: evolvePrompt(stats, agentLabel),
      initialMessage,
      tools: EVOLVE_TOOLS,
      handlers,
      onProgress,
    });
    await notify('✅ <b>Evolve cycle complete</b> — new lessons added. Send /lesson to review.');
    await onProgress?.done('Lessons added — /lesson to review');
  } catch (e) {
    log.error(`Evolve cycle error: ${e.message}`);
    await notify(`⚠️ Evolve cycle error: ${esc(e.message)}`);
    await onProgress?.fail(e.message);
  }

  log.info('━━━ EVOLVE CYCLE END ━━━');
}
