import { TELEGRAM_TOKEN, TELEGRAM_CHAT, cfg, WALLET } from './config.js';
import { getOpenPositions, getStats, getLessons, getRecentClosed, getRecentOpened, getRecentLessons, getSkipList } from './state.js';
import { getPortfolioHoldings, getTokenInfo, getTokenSecurity, getTokenHolders } from './gmgn.js';
import { log, sanitize } from './logger.js';
import { getSolBalance } from './jupiter.js';

const BASE = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

export const tg = {
  enabled: !!(TELEGRAM_TOKEN && TELEGRAM_CHAT),
};

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function api(method, body) {
  if (!tg.enabled) return;
  const isLongPoll = method === 'getUpdates' && body?.timeout;
  const timeoutMs  = isLongPoll ? (body.timeout + 10) * 1000 : 15_000;
  try {
    const r = await fetch(`${BASE}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data = await r.json();
    if (!data.ok) log.warn(`Telegram ${method} failed: ${data.description}`);
    return data;
  } catch (e) {
    log.warn(`Telegram error: ${e.message}`);
  }
}

export function notify(text) {
  return api('sendMessage', { chat_id: TELEGRAM_CHAT, text, parse_mode: 'HTML', disable_web_page_preview: true });
}

// ── Pre-built notification helpers ───────────────────────────────────────────

export function notifyStartup({ dryRun, model, sl, trailingTrigger, trailingDrop }) {
  const mode  = dryRun ? '🟡 DRY RUN' : '🟢 LIVE';
  const label = cfg.agentLabel ?? 'Agent';
  return notify(
    `🤖 <b>[${esc(label)}] started</b>\n` +
    `Mode: ${mode}\n` +
    `Model: ${esc(model)}\n` +
    `SL: ${sl}%  |  Trailing: +${trailingTrigger}% → −${trailingDrop}% from peak`
  );
}

export function notifyBuy({ symbol, address, amountSol, score, reason, dryRun, signature }) {
  const tag   = dryRun ? '[DRY RUN] ' : '';
  const label = cfg.agentLabel ?? 'Agent';
  const tx    = signature ? `\nTx: <code>${esc(signature.slice(0, 20))}…</code>` : '';
  return notify(
    `${tag}[${esc(label)}] 🟢 <b>BUY — ${esc(symbol)}</b>\n` +
    `Amount: ${amountSol} SOL\n` +
    `Score: ${score}/10\n` +
    `Reason: ${esc(reason)}` +
    tx
  );
}

export function notifySell({ symbol, address, pnlPct, pnlUsd, reason, dryRun, signature }) {
  const tag   = dryRun ? '[DRY RUN] ' : '';
  const label = cfg.agentLabel ?? 'Agent';
  const emoji = parseFloat(pnlPct) >= 0 ? '🟢' : '🔴';
  const sign  = parseFloat(pnlPct) >= 0 ? '+' : '';
  const tx    = signature ? `\nTx: <code>${esc(signature.slice(0, 20))}…</code>` : '';
  const usd   = pnlUsd != null ? ` (${sign}$${parseFloat(pnlUsd).toFixed(2)})` : '';
  return notify(
    `${tag}[${esc(label)}] ${emoji} <b>SELL — ${esc(symbol)}</b>\n` +
    `PnL: ${sign}${parseFloat(pnlPct).toFixed(1)}%${usd}\n` +
    `Reason: ${esc(reason)}` +
    tx
  );
}

export function notifyError(context, message) {
  return notify(`⚠️ <b>Error — ${esc(context)}</b>\n${esc(sanitize(String(message)))}`);
}

// ── Morning Briefing ──────────────────────────────────────────────────────────

export async function sendMorningBriefing() {
  if (!tg.enabled) return;

  const now     = new Date();
  const utc8    = new Date(now.getTime() + 8 * 3_600_000);
  const dateStr = utc8.toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });

  const label     = cfg.agentLabel ?? 'Agent';
  const stats     = getStats();
  const positions = getOpenPositions();
  const mode      = cfg.dryRun ? '🟡 DRY RUN' : '🟢 LIVE';

  // Open positions with live PnL
  let posSection = 'None';
  if (positions.length > 0) {
    const holdings = getPortfolioHoldings({ chain: cfg.chain, wallet: WALLET, hideClosed: 'true' });
    const list     = holdings.ok ? (holdings.data?.list ?? holdings.data ?? []) : [];
    posSection = positions.map(p => {
      const h      = list.find(hh => (hh.token?.token_address ?? hh.token?.address ?? hh.address) === p.address);
      const cost   = h ? parseFloat(h.accu_cost ?? h.cost ?? h.avg_cost ?? 0) : 0;
      const curVal = h ? parseFloat(h.usd_value ?? 0) : 0;
      const urPnl  = h ? parseFloat(h.unrealized_profit ?? 0) : 0;
      const pnlPct = h?.unrealized_profit_pnl != null
        ? parseFloat(h.unrealized_profit_pnl) * 100
        : (cost > 0 ? ((curVal - cost) / cost * 100) : (urPnl !== 0 ? (urPnl / (curVal - urPnl)) * 100 : 0));
      const pnlStr = pnlPct != null ? `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%` : '?';
      const emoji  = pnlPct == null ? '⬜' : pnlPct >= 0 ? '🟢' : '🔴';
      const ageH   = ((now - new Date(p.openedAt)) / 3_600_000).toFixed(1);
      return `${emoji} <b>${p.symbol}</b> — ${pnlStr} | ${p.amountSol} SOL | ${ageH}h old`;
    }).join('\n');
  }

  // Closed trades in last 24h
  const recent = getRecentClosed(24 * 3_600_000);
  const recentSection = recent.length
    ? recent.slice(-10).map(p => {
        const sign  = (p.realizedPnlPct ?? 0) >= 0 ? '+' : '';
        const emoji = (p.realizedPnlPct ?? 0) >= 0 ? '🟢' : '🔴';
        return `${emoji} ${esc(p.symbol)}  ${sign}${(p.realizedPnlPct ?? 0).toFixed(1)}%  (${esc(p.closeReason)})`;
      }).join('\n')
    : 'None in last 24h';

  // Pinned lessons
  const pinned = getLessons({}).filter(l => l.pinned).slice(-5);
  const lessonsSection = pinned.length
    ? pinned.map(l => `• ${esc(l.lesson)}`).join('\n')
    : 'None pinned yet';

  const winsN   = stats.winRate !== 'n/a'
    ? Math.round(parseFloat(stats.winRate) * stats.closedCount / 100) : 0;
  const lossesN = stats.closedCount - winsN;

  const report =
    `☀️ <b>[${esc(label)}] Morning Briefing — ${dateStr}</b>\n` +
    `Mode: ${mode}\n\n` +

    `📂 <b>Open Positions (${positions.length}/${cfg.maxPositions})</b>\n` +
    posSection + '\n\n' +

    `📊 <b>Performance (all time)</b>\n` +
    `Trades: ${stats.closedCount} closed  (${winsN}W / ${lossesN}L)\n` +
    `Win rate: ${stats.winRate}\n` +
    `Profit ratio: ${stats.profitRatio}\n` +
    `Avg win: +${stats.avgWinPct}%  |  Avg loss: -${stats.avgLossPct}%\n` +
    `Net PnL: $${stats.totalPnlUsd}\n\n` +

    `🕐 <b>Closed last 24h</b>\n` +
    recentSection + '\n\n' +

    `🧠 <b>Pinned Lessons</b>\n` +
    lessonsSection;

  log.info('Sending morning briefing');
  return notify(report);
}

// ── Command helpers ───────────────────────────────────────────────────────────

async function walletMessage() {
  try {
    const bal = await getSolBalance();
    return (
      `👛 <b>Wallet Info</b>\n\n` +
      `Address: <code>${WALLET}</code>\n` +
      `Balance: <b>${bal.toFixed(4)} SOL</b>`
    );
  } catch (e) {
    return `⚠️ Error fetching balance: ${e.message}`;
  }
}

async function positionsMessage() {
  const positions = getOpenPositions();
  if (!positions.length) return { text: '📂 <b>Open Positions</b>\nNo open positions tracked.' };

  const holdings = getPortfolioHoldings({ chain: cfg.chain, wallet: WALLET, hideClosed: 'true' });
  const list     = holdings.ok ? (holdings.data?.list ?? holdings.data ?? []) : [];
  const now      = Date.now();

  const lines = positions.map(p => {
    const h      = list.find(hh => (hh.token?.token_address ?? hh.token?.address ?? hh.address) === p.address);
    const cost   = h ? parseFloat(h.accu_cost ?? h.cost ?? h.avg_cost ?? 0) : 0;
    const curVal = h ? parseFloat(h.usd_value ?? 0) : 0;
    const urPnl  = h ? parseFloat(h.unrealized_profit ?? 0) : 0;
    const pnlPct = h?.unrealized_profit_pnl != null
      ? parseFloat(h.unrealized_profit_pnl) * 100
      : (cost > 0 ? ((curVal - cost) / cost * 100) : (urPnl !== 0 ? (urPnl / (curVal - urPnl)) * 100 : 0));
    const pnlStr = pnlPct != null ? `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%` : '?';
    const emoji  = pnlPct >= 0 ? '🟢' : '🔴';
    const ageMin = Math.floor((now - new Date(p.openedAt).getTime()) / 60000);
    const ageStr = ageMin < 60 ? `${ageMin}m` : `${(ageMin / 60).toFixed(1)}h`;
    return `${emoji} <b>${p.symbol}</b>\n<code>${p.address}</code>\nPnL: ${pnlStr} | Age: ${ageStr}`;
  });

  const buttons = positions.map(p => ([{
    text: `❌ Sell ${p.symbol}`,
    callback_data: `sell:${p.address}`
  }]));

  return {
    text: `📂 <b>Open Positions (${positions.length})</b>\n\n${lines.join('\n\n')}`,
    reply_markup: { inline_keyboard: buttons }
  };
}

function statusMessage() {
  const label    = cfg.agentLabel ?? 'Agent';
  const positions = getOpenPositions();
  const stats    = getStats();
  const posLines = positions.length
    ? positions.map(p => `  • ${p.symbol} — ${p.address.slice(0,8)}…`).join('\n')
    : '  None';
  return (
    `📊 <b>[${esc(label)}] Status</b>\n` +
    `Open: ${positions.length}/${cfg.maxPositions}\n` +
    posLines + '\n\n' +
    `Closed: ${stats.closedCount}\n` +
    `Win rate: ${stats.winRate}\n` +
    `Profit ratio: ${stats.profitRatio}\n` +
    `Avg win: +${stats.avgWinPct}%  |  Avg loss: -${stats.avgLossPct}%\n` +
    `Net PnL: $${stats.totalPnlUsd}`
  );
}

function lessonMessage() {
  const all    = getLessons({ limit: 30 });
  const pinned = all.filter(l => l.pinned);
  const recent = all.filter(l => !l.pinned).slice(-10);

  let text = `🧠 <b>Lessons (${all.length} total)</b>\n`;
  if (pinned.length) {
    text += `\n<b>★ Pinned (${pinned.length})</b>\n`;
    text += pinned.map(l => `• [${esc(l.role)}] ${esc(l.lesson)}`).join('\n');
  }
  if (recent.length) {
    text += `\n\n<b>Recent (${recent.length})</b>\n`;
    text += recent.map(l => `• [${esc(l.role)}] ${esc(l.lesson)}`).join('\n');
  }
  if (!all.length) text += '\nNo lessons recorded yet.';
  return text.slice(0, 4000);
}

function skipMessage() {
  const skips = getSkipList();
  if (!skips.length) return '⏭ <b>Skip list</b>\nEmpty today.';
  return `⏭ <b>Skip list (${skips.length} today)</b>\n` + skips.map(a => `• <code>${a.slice(0, 12)}…</code>`).join('\n');
}

function configMessage() {
  const label      = cfg.agentLabel ?? 'Agent';
  const isNewToken = cfg.agentLabel === 'New Token';

  let screeningSection;
  if (isNewToken) {
    const s = cfg.newTokenScreening;
    screeningSection =
      `<b>New Token Screening</b>\n` +
      `Min smart degen: ${s.minSmartDegen}\n` +
      `Progress: ${(s.minProgress * 100).toFixed(0)}%–${(s.maxProgress * 100).toFixed(0)}%\n` +
      `Mcap: $${s.minMcap}–$${s.maxMcap}\n` +
      `Volume 24h: >$${s.minVolume24h}  |  Swaps: >${s.minSwaps24h}\n` +
      `Holders: >${s.minHolders}\n` +
      `Max bundler rate: ${(s.maxBundlerRate * 100).toFixed(0)}%  |  Max rug ratio: ${(s.maxRugRatio * 100).toFixed(0)}%\n` +
      `Max entrapment: ${(s.maxEntrapmentRatio * 100).toFixed(0)}%  |  Renounced: ${s.requireRenounced ? 'required' : 'optional'}`;
  } else {
    const s = cfg.screening;
    screeningSection =
      `<b>Trend Screening</b>\n` +
      `Min KOL: ${s.minKol}  |  Min SM: ${s.minSm}\n` +
      `5m change: >${s.min5mChangePct}%  |  1h change: >${s.min1hChangePct}%\n` +
      `Mcap: $${s.minMcap}–$${s.maxMcap}\n` +
      `Volume 24h: >$${s.minVolume24h}\n` +
      `Holders: >${s.minHolders}  |  Max rug ratio: ${s.maxRugRatio}`;
  }

  return (
    `⚙️ <b>[${esc(label)}] Config</b>\n\n` +
    `<b>Trade</b>\n` +
    `Amount: ${cfg.amountSolPerTrade} SOL\n` +
    `SL: ${cfg.stopLossPercent}%  |  TP: ${cfg.takeProfitPercent}%\n` +
    `Trailing: activates at +${cfg.trailingTriggerPercent}%, closes on −${cfg.trailingDropPercent}% from peak\n` +
    `Time stop: ${cfg.timeStopHours}h / min gain ${cfg.timeStopMinGainPct}%\n` +
    `Max positions: ${cfg.maxPositions}\n\n` +
    screeningSection + '\n\n' +
    `<b>Model</b>\n` +
    `${cfg.claude.model}\n` +
    `Dry run: ${cfg.dryRun ? '🟡 ON' : '🟢 OFF'}`
  );
}

const HELP_TEXT =
  `📖 <b>Commands</b>\n\n` +
  `<b>Trend Agent</b>\n` +
  `/status — open positions &amp; stats\n` +
  `/positions — live PnL &amp; manual sell\n` +
  `/config — active thresholds &amp; model\n` +
  `/wallet — SOL balance &amp; address\n` +
  `/research [addr] — token security audit\n` +
  `/lesson — all lessons (pinned + recent)\n` +
  `/skip — today's skip list\n` +
  `/briefing — send morning briefing now\n\n` +
  `<b>Trend Agent Actions</b>\n` +
  `/study — run screening cycle now\n` +
  `/manage — run management cycle now\n` +
  `/evolve — strategy reflection &amp; new lessons\n\n` +
  `<b>New Token Agent</b>\n` +
  `/new_status — new token agent stats\n` +
  `/new_positions — new token open positions\n` +
  `/new_config — new token agent config\n\n` +
  `/help — this message`;

// ── Live progress message ─────────────────────────────────────────────────────

export async function createLiveMessage(header) {
  if (!tg.enabled) return null;
  const sent = await api('sendMessage', {
    chat_id: TELEGRAM_CHAT,
    text: `⏳ <b>${esc(header)}</b>`,
    parse_mode: 'HTML',
  });
  if (!sent?.ok) return null;
  const messageId = sent.result.message_id;

  const steps = [];
  let lastEditMs = 0;
  let flushTimer = null;

  function render(footer) {
    const body = steps.length
      ? steps.slice(-12).map(s => s.text).join('\n')
      : '…';
    return `⏳ <b>${esc(header)}</b>\n${body}\n${footer}`;
  }

  async function flush(footer) {
    flushTimer = null;
    lastEditMs = Date.now();
    await api('editMessageText', {
      chat_id: TELEGRAM_CHAT,
      message_id: messageId,
      text: render(footer),
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });
  }

  function scheduleFlush() {
    const delay = Math.max(0, 2000 - (Date.now() - lastEditMs));
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => flush('⏳ Running…'), delay);
  }

  return {
    addStep(id, text) {
      steps.push({ id, text });
      scheduleFlush();
    },
    updateStep(id, text) {
      const i = steps.findIndex(s => s.id === id);
      if (i >= 0) steps[i].text = text;
      else steps.push({ id, text });
      scheduleFlush();
    },
    async done(summary) {
      if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
      await flush(`✅ ${esc(summary ?? 'Done')}`);
    },
    async fail(reason) {
      if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
      await flush(`❌ ${esc(reason ?? 'Error')}`);
    },
  };
}

// ── Command listener (long-polling) ──────────────────────────────────────────

// onSiblingQuery(type) — optional callback for cross-agent queries.
// type: 'status' | 'positions' | 'config'
// Should return a formatted HTML string or null.
export function startCommandListener({ onStudy, onManage, onEvolve, onSell, onSiblingQuery } = {}) {
  if (!tg.enabled) return;
  log.info('Telegram command listener started');
  let offset = 0;

  async function poll() {
    try {
      const data = await api('getUpdates', { offset, timeout: 30, allowed_updates: ['message', 'callback_query'] });
      for (const update of (data?.ok ? data.result ?? [] : [])) {
        offset = update.update_id + 1;

        // Handle callbacks (Sell buttons)
        if (update.callback_query) {
          const cb = update.callback_query;
          const [action, address] = cb.data.split(':');
          if (action === 'sell') {
            await api('answerCallbackQuery', { callback_query_id: cb.id, text: 'Executing sell…' });
            if (onSell) {
              onSell(address).catch(e => notify(`❌ Sell failed: ${e.message}`));
            } else notify('⚠️ Sell handler not available');
          }
          continue;
        }

        const text     = (update.message?.text ?? '').trim();
        const fromChat = String(update.message?.chat?.id);
        if (fromChat !== String(TELEGRAM_CHAT)) {
          if (text.startsWith('/')) log.warn(`Telegram: ignoring msg from chat ${fromChat}`);
          continue;
        }

        const cmd  = text.split(' ')[0].split('@')[0].toLowerCase();
        const args = text.split(' ').slice(1);

        if (cmd === '/status') {
          await notify(statusMessage());

        } else if (cmd === '/positions') {
          const msg = await positionsMessage();
          await api('sendMessage', { chat_id: TELEGRAM_CHAT, ...msg, parse_mode: 'HTML' });

        } else if (cmd === '/wallet') {
          await notify(await walletMessage());

        } else if (cmd === '/research') {
          const addr = args[0];
          if (!addr) { await notify('❌ Provide a token address: <code>/research [addr]</code>'); continue; }
          const live = await createLiveMessage(`Research: ${addr.slice(0,8)}…`);
          try {
            live.addStep('info', '🔍 Fetching token info…');
            const info = getTokenInfo({ chain: cfg.chain, address: addr });
            if (!info.ok) throw new Error(info.error);
            const t = info.data;
            live.updateStep('info', `✅ <b>${esc(t.symbol)}</b> | Price: $${t.price.toFixed(6)} | Mcap: $${(t.market_cap/1000).toFixed(0)}K`);

            live.addStep('sec', '🛡 Checking security…');
            const sec = getTokenSecurity({ chain: cfg.chain, address: addr });
            if (!sec.ok) throw new Error(sec.error);
            const s = sec.data;
            const rug = (s.rug_ratio * 100).toFixed(0);
            live.updateStep('sec', `🛡 Rug: ${rug}% | Mint: ${s.renounced_mint?'✓':'✗'} | Freeze: ${s.renounced_freeze_account?'✓':'✗'}`);

            live.addStep('holders', '👥 Checking holders…');
            const hold = getTokenHolders({ chain: cfg.chain, address: addr });
            if (!hold.ok) throw new Error(hold.error);
            const h = hold.data;
            const top10 = (h.top_10_holder_rate * 100).toFixed(1);
            live.updateStep('holders', `👥 Holders: ${h.holder_count} | Top-10: ${top10}%`);

            await live.done(`${t.symbol} research complete`);
          } catch (e) {
            await live.fail(e.message);
          }

        } else if (cmd === '/lesson') {
          await notify(lessonMessage());

        } else if (cmd === '/skip') {
          await notify(skipMessage());

        } else if (cmd === '/config') {
          await notify(configMessage());

        } else if (cmd === '/briefing') {
          await sendMorningBriefing();

        } else if (cmd === '/study') {
          if (onStudy) {
            const live = await createLiveMessage('Screening cycle');
            onStudy(live).catch(async e => {
              await live?.fail(sanitize(e.message));
              notify(`⚠️ Study error: ${sanitize(e.message)}`);
            });
          } else await notify('⚠️ Study handler not available');

        } else if (cmd === '/manage') {
          if (onManage) {
            const live = await createLiveMessage('Management cycle');
            onManage(live).catch(async e => {
              await live?.fail(sanitize(e.message));
              notify(`⚠️ Manage error: ${sanitize(e.message)}`);
            });
          } else await notify('⚠️ Manage handler not available');

        } else if (cmd === '/evolve') {
          if (onEvolve) {
            const live = await createLiveMessage('Evolve cycle');
            onEvolve(live).catch(async e => {
              await live?.fail(e.message);
              notify(`⚠️ Evolve error: ${esc(e.message)}`);
            });
          } else await notify('⚠️ Evolve handler not available');

        } else if (cmd === '/new_status' || cmd === '/new_positions' || cmd === '/new_config') {
          const type = cmd.replace('/new_', '');
          if (onSiblingQuery) {
            try {
              const result = await onSiblingQuery(type);
              await notify(result ?? '⚠️ No data available');
            } catch (e) {
              await notify(`⚠️ Error reading sibling agent: ${esc(e.message)}`);
            }
          } else {
            await notify('⚠️ No sibling agent configured');
          }

        } else if (cmd === '/help') {
          await notify(HELP_TEXT);
        }
      }
    } catch (e) {
      log.warn(`Telegram poll error: ${e.message}`);
    }
    setTimeout(poll, 1000);
  }

  poll();
}
