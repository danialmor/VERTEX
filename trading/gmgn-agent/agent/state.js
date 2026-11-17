import { readFileSync, writeFileSync, renameSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = process.env.AGENT_STATE_FILE ?? join(__dirname, 'state.json');

const EMPTY = {
  positions: {},      // address → position object
  closedPositions: [],
  lessons: [],
  skippedToday: [],   // addresses skipped in today's screening
  skippedDate: '',    // ISO date string, reset daily
  lastScreening: null,
  lastManagement: null,
};

function read() {
  if (!existsSync(STATE_PATH)) return structuredClone(EMPTY);
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  } catch {
    return structuredClone(EMPTY);
  }
}

function write(state) {
  const tmp = STATE_PATH + '.tmp';
  writeFileSync(tmp, JSON.stringify(state, null, 2));
  renameSync(tmp, STATE_PATH);
}

// ── Position helpers ──────────────────────────────────────────────────────────

export function getState() {
  const s = read();
  // Reset daily skip list if date changed
  const today = new Date().toISOString().slice(0, 10);
  if (s.skippedDate !== today) {
    s.skippedToday = [];
    s.skippedDate = today;
    write(s);
  }
  return s;
}

export function getOpenPositions() {
  const s = read();
  return Object.values(s.positions).filter(p => p.status === 'open');
}

export function getClosedPositions() {
  return read().closedPositions;
}

export function getSkipList() {
  const s    = read();
  const today = new Date().toISOString().slice(0, 10);
  return s.skippedDate === today ? s.skippedToday : [];
}

export function addPosition(pos) {
  const s = read();
  s.positions[pos.address] = { ...pos, status: 'open', openedAt: new Date().toISOString(), tieredExitsDone: pos.tieredExitsDone ?? [] };
  write(s);
}

export function updatePosition(address, patch) {
  const s = read();
  if (s.positions[address]) {
    s.positions[address] = { ...s.positions[address], ...patch };
    write(s);
  }
}

export function closePosition(address, { realizedPnlUsd, realizedPnlPct, closeReason }) {
  const s = read();
  const pos = s.positions[address];
  if (!pos) return;
  const closed = {
    ...pos,
    status: 'closed',
    closedAt: new Date().toISOString(),
    realizedPnlUsd: realizedPnlUsd ?? 0,
    realizedPnlPct: realizedPnlPct ?? 0,
    closeReason: closeReason || 'unknown',
    win: (realizedPnlPct ?? 0) > 0 || (realizedPnlUsd ?? 0) > 0,
  };
  s.closedPositions.push(closed);
  delete s.positions[address];
  write(s);
  return closed;
}

export function skipToken(address) {
  const s = read();
  if (!s.skippedToday.includes(address)) {
    s.skippedToday.push(address);
    s.skippedDate = new Date().toISOString().slice(0, 10);
    write(s);
  }
}

export function isSkippedToday(address) {
  const s = read();
  const today = new Date().toISOString().slice(0, 10);
  return s.skippedDate === today && s.skippedToday.includes(address);
}

// ── Lessons ───────────────────────────────────────────────────────────────────

export function addLesson({ role, lesson, pinned = false }) {
  const s = read();
  // Dedup: skip if an existing lesson already contains the first 40 chars of this one
  const prefix = lesson.slice(0, 40);
  if (prefix.length >= 20 && s.lessons.some(l => l.lesson.includes(prefix))) return;
  const id = (s.lessons.length > 0 ? Math.max(...s.lessons.map(l => l.id)) : 0) + 1;
  s.lessons.push({ id, timestamp: new Date().toISOString(), role, lesson, pinned });
  // Keep max 100 lessons (remove oldest unpinned first)
  if (s.lessons.length > 100) {
    const pinned = s.lessons.filter(l => l.pinned);
    const unpinned = s.lessons.filter(l => !l.pinned).slice(-90);
    s.lessons = [...pinned, ...unpinned].sort((a, b) => a.id - b.id);
  }
  write(s);
}

export function getLessons({ role, limit = 20, includeStrategist = false } = {}) {
  const s = read();
  const pinned  = s.lessons.filter(l => l.pinned).slice(-10);
  const matched = s.lessons.filter(l => !l.pinned && (!role || l.role === role || (includeStrategist && l.role === 'STRATEGIST'))).slice(-15);
  const recent  = s.lessons.filter(l => !l.pinned && !matched.includes(l)).slice(-5);
  const combined = [...pinned, ...matched, ...recent];
  const seen = new Set();
  return combined.filter(l => { if (seen.has(l.id)) return false; seen.add(l.id); return true; })
                 .slice(-limit);
}

export function updateLesson(id, { lesson, pinned } = {}) {
  const s = read();
  const idx = s.lessons.findIndex(l => l.id === id);
  if (idx === -1) return false;
  if (lesson !== undefined) s.lessons[idx].lesson = lesson;
  if (pinned !== undefined) s.lessons[idx].pinned = pinned;
  write(s);
  return true;
}

export function deleteLesson(id) {
  const s = read();
  const before = s.lessons.length;
  s.lessons = s.lessons.filter(l => l.id !== id);
  if (s.lessons.length === before) return false;
  write(s);
  return true;
}

export function getStatsBreakdown() {
  const s = read();
  const closed = s.closedPositions;

  // By close reason
  const byReason = {};
  for (const p of closed) {
    const r = p.closeReason || 'unknown';
    if (!byReason[r]) byReason[r] = { count: 0, wins: 0, totalPnlPct: 0 };
    byReason[r].count++;
    if (p.win) byReason[r].wins++;
    byReason[r].totalPnlPct += p.realizedPnlPct || 0;
  }
  for (const r of Object.keys(byReason)) {
    byReason[r].winRate = byReason[r].count > 0
      ? ((byReason[r].wins / byReason[r].count) * 100).toFixed(1) + '%'
      : 'n/a';
    byReason[r].avgPnlPct = byReason[r].count > 0
      ? (byReason[r].totalPnlPct / byReason[r].count).toFixed(1) + '%'
      : 'n/a';
  }

  // By score bucket
  const byScore = {};
  for (const p of closed) {
    const sc = p.score != null ? String(p.score) : 'unknown';
    if (!byScore[sc]) byScore[sc] = { count: 0, wins: 0, totalPnlPct: 0 };
    byScore[sc].count++;
    if (p.win) byScore[sc].wins++;
    byScore[sc].totalPnlPct += p.realizedPnlPct || 0;
  }
  for (const sc of Object.keys(byScore)) {
    byScore[sc].winRate = byScore[sc].count > 0
      ? ((byScore[sc].wins / byScore[sc].count) * 100).toFixed(1) + '%'
      : 'n/a';
    byScore[sc].avgPnlPct = byScore[sc].count > 0
      ? (byScore[sc].totalPnlPct / byScore[sc].count).toFixed(1) + '%'
      : 'n/a';
  }

  // Recent (last 10) vs all-time
  const recent = closed.slice(-10);
  const recentWins = recent.filter(p => p.win).length;

  return {
    byReason,
    byScore,
    recentWinRate: recent.length > 0 ? ((recentWins / recent.length) * 100).toFixed(1) + '%' : 'n/a',
    recentCount: recent.length,
    allTimeCount: closed.length,
  };
}

export function getRecentClosed(sinceMs = 24 * 3600_000) {
  const s      = read();
  const cutoff = Date.now() - sinceMs;
  return s.closedPositions.filter(p => new Date(p.closedAt).getTime() >= cutoff);
}

export function getRecentOpened(sinceMs = 24 * 3600_000) {
  const s      = read();
  const cutoff = Date.now() - sinceMs;
  return Object.values(s.positions).filter(p => new Date(p.openedAt).getTime() >= cutoff);
}

export function getRecentLessons(sinceMs = 24 * 3600_000) {
  const s      = read();
  const cutoff = Date.now() - sinceMs;
  return s.lessons.filter(l => new Date(l.timestamp).getTime() >= cutoff);
}

export function setLastRun(role) {
  const s = read();
  const key = role === 'screener' ? 'lastScreening' : 'lastManagement';
  s[key] = new Date().toISOString();
  write(s);
}

export function getStats() {
  const s = read();
  const closed = s.closedPositions;
  const wins   = closed.filter(p => p.win);
  const losses = closed.filter(p => !p.win);

  const avgWin  = wins.length   > 0 ? wins.reduce((sum, p) => sum + (p.realizedPnlPct || 0), 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, p) => sum + (p.realizedPnlPct || 0), 0) / losses.length) : 0;
  const profitRatio = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : 'n/a';

  return {
    openCount:    Object.keys(s.positions).length,
    closedCount:  closed.length,
    winRate:      closed.length > 0 ? ((wins.length / closed.length) * 100).toFixed(1) + '%' : 'n/a',
    profitRatio,
    avgWinPct:    avgWin.toFixed(1),
    avgLossPct:   avgLoss.toFixed(1),
    totalPnlUsd:  closed.reduce((sum, p) => sum + (p.realizedPnlUsd || 0), 0).toFixed(2),
  };
}
