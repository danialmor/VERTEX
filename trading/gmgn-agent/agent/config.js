import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEFAULTS = {
  enabled: true,
  dryRun: true,
  chain: 'sol',
  screeningIntervalMinutes: 5,
  managementIntervalMinutes: 2,
  maxPositions: 5,
  amountSolPerTrade: 0.05,
  stopLossPercent: 15,
  takeProfitPercent: 80,
  trailingEnabled: true,
  trailingTriggerPercent: 20,
  trailingDropPercent: 5,
  tieredExits: [],
  timeStopHours: 24,
  timeStopMinGainPct: 15,
  agentLabel: 'Agent',
  autoEvolveAfterTrades: 20,
  siblingStatePaths: [],
  screening: {
    minKol: 2,
    minSm: 3,
    min5mChangePct: 5,
    min1hChangePct: 0,
    min24hChangePct: -50,
    minOrganicScore: 60,
    minHolders: 150,
    maxRugRatio: 0.10,
    minMcap: 50000,
    maxMcap: 10000000,
    minVolume24h: 20000,
    requireBullishSignal: true,
    limit: 30,
  },
  newTokenScreening: {
    minSmartDegen: 1,
    minProgress: 0.05,
    maxProgress: 0.85,
    minHolders: 20,
    minVolume24h: 1000,
    minSwaps24h: 5,
    minMcap: 5000,
    maxMcap: 500000,
    maxBundlerRate: 0.30,
    maxRugRatio: 0.15,
    maxEntrapmentRatio: 0.30,
    requireRenounced: true,
    limit: 50,
  },
  claude: {
    model: 'nvidia/nemotron-3-super-120b-a12b:free',
    maxSteps: 15,
    temperature: 0.3,
  },
};

function load() {
  const cfgPath = process.env.AGENT_CONFIG_FILE ?? join(__dirname, '..', 'agent-config.json');
  if (!existsSync(cfgPath)) return DEFAULTS;
  try {
    const raw = JSON.parse(readFileSync(cfgPath, 'utf8'));
    return {
      ...DEFAULTS,
      ...raw,
      screening:         { ...DEFAULTS.screening,         ...(raw.screening         || {}) },
      newTokenScreening: { ...DEFAULTS.newTokenScreening, ...(raw.newTokenScreening || {}) },
      siblingStatePaths: raw.siblingStatePaths ?? DEFAULTS.siblingStatePaths,
      claude:            { ...DEFAULTS.claude,            ...(raw.claude            || {}) },
    };
  } catch {
    return DEFAULTS;
  }
}

export const cfg = load();

export const WALLET          = process.env.WALLET_ADDRESS;
export const OPENROUTER_KEY  = process.env.OPENROUTER_API_KEY;
export const SOL_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
export const JUPITER_KEY     = process.env.JUPITER_API_KEY;
export const RPC_URL         = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
export const TELEGRAM_TOKEN  = process.env.TELEGRAM_BOT_TOKEN;
export const TELEGRAM_CHAT   = process.env.TELEGRAM_CHAT_ID;
