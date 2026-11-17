import { execSync } from 'child_process';

const TIMEOUT_MS = 20_000;
const SOL_NATIVE = 'So11111111111111111111111111111111111111112';

export { SOL_NATIVE };

export function runCmd(cmd) {
  try {
    const out = execSync(cmd, { timeout: TIMEOUT_MS, encoding: 'utf8' });
    return { ok: true, data: JSON.parse(out.trim()) };
  } catch (e) {
    const msg = e.stdout ? e.stdout.toString().trim() : e.message;
    return { ok: false, error: msg };
  }
}

export function getTrending({ chain = 'sol', interval = '1h', limit = 30, minKol = 0, minSm = 0 } = {}) {
  const r = runCmd(`gmgn-cli market trending --chain ${chain} --interval ${interval} --limit ${limit} --raw`);
  if (!r.ok) return r;
  let rank = r.data?.data?.rank || [];

  // Flag tokens with 0% liquidity burned as rugs (exclude pump.fun which shows 0% but burn_status="burn")
  for (const t of rank) {
    const burnRatio = t.burn_ratio ?? 0;
    const isBurned  = t.burn_status === 'burn' || burnRatio > 0;
    if (!isBurned) {
      t.rug_ratio = 1; // Flag as rug
    }
  }

  if (minKol > 0) rank = rank.filter(t => (t.renowned_count || 0) >= minKol);
  if (minSm > 0)  rank = rank.filter(t => (t.smart_degen_count || 0) >= minSm);
  return { ok: true, data: rank };
}

export function getTokenInfo({ chain = 'sol', address }) {
  const r = runCmd(`gmgn-cli token info --chain ${chain} --address ${address} --raw`);
  if (r.ok && r.data) {
    const t = r.data;
    const burnRatio = t.burn_ratio ?? 0;
    const isBurned  = t.burn_status === 'burn' || burnRatio > 0;
    if (!isBurned) {
      t.rug_ratio = 1; // Flag as rug
    }
  }
  return r;
}

export function getTokenSecurity({ chain = 'sol', address }) {
  const r = runCmd(`gmgn-cli token security --chain ${chain} --address ${address} --raw`);
  if (r.ok && r.data) {
    const t = r.data;
    const burnRatio = t.burn_ratio ?? 0;
    const isBurned  = t.burn_status === 'burn' || burnRatio > 0;
    if (!isBurned) {
      t.rug_ratio = 1; // Flag as rug
    }
  }
  return r;
}

export function getTokenHolders({ chain = 'sol', address, limit = 20 }) {
  return runCmd(`gmgn-cli token holders --chain ${chain} --address ${address} --limit ${limit} --raw`);
}

export function getTokenTraders({ chain = 'sol', address, limit = 20 }) {
  return runCmd(`gmgn-cli token traders --chain ${chain} --address ${address} --limit ${limit} --raw`);
}

export function getTrenches({
  chain = 'sol',
  limit = 50,
  minSmartDegen = 0,
  minProgress = 0,
  maxProgress = 1,
  minMcap = 0,
  maxMcap = 0,
  maxBundlerRate = 0,
  maxRugRatio = 0,
  maxEntrapmentRatio = 0,
} = {}) {
  let cmd = `gmgn-cli market trenches --chain ${chain} --type new_creation --limit ${limit} --raw`;
  if (minSmartDegen > 0)    cmd += ` --min-smart-degen-count ${minSmartDegen}`;
  if (minMcap > 0)          cmd += ` --min-marketcap ${minMcap}`;
  if (maxMcap > 0)          cmd += ` --max-marketcap ${maxMcap}`;
  if (maxBundlerRate > 0)   cmd += ` --max-bundler-rate ${maxBundlerRate}`;
  if (maxRugRatio > 0)      cmd += ` --max-rug-ratio ${maxRugRatio}`;
  if (maxEntrapmentRatio > 0) cmd += ` --max-entrapment-ratio ${maxEntrapmentRatio}`;

  const r = runCmd(cmd);
  if (!r.ok) return r;

  let tokens = r.data?.new_creation ?? [];

  // Client-side progress filter (CLI doesn't expose --min/max-progress cleanly for new_creation)
  if (minProgress > 0) tokens = tokens.filter(t => (t.progress ?? 0) >= minProgress);
  if (maxProgress < 1) tokens = tokens.filter(t => (t.progress ?? 0) <= maxProgress);

  return { ok: true, data: tokens };
}

export function getPortfolioHoldings({ chain = 'sol', wallet, hideClosed = 'false' }) {
  return runCmd(`gmgn-cli portfolio holdings --chain ${chain} --wallet ${wallet} --hide-closed ${hideClosed} --order-by usd_value --limit 50 --raw`);
}

export function getPortfolioStats({ chain = 'sol', wallet, period = '7d' }) {
  return runCmd(`gmgn-cli portfolio stats --chain ${chain} --wallet ${wallet} --period ${period} --raw`);
}

export function swapBuy({ chain = 'sol', wallet, outputToken, amountSol, conditions = [] }) {
  const lamports = Math.round(parseFloat(amountSol) * 1_000_000_000);
  let cmd = `gmgn-cli swap --chain ${chain} --from ${wallet} --input-token ${SOL_NATIVE} --output-token ${outputToken} --amount ${lamports} --auto-slippage --anti-mev --raw`;
  if (conditions.length > 0) {
    cmd += ` --priority-fee 0.00001 --tip-fee 0.00001 --condition-orders '${JSON.stringify(conditions)}'`;
  }
  return runCmd(cmd);
}

export function swapSell({ chain = 'sol', wallet, inputToken, amountLamports }) {
  return runCmd(`gmgn-cli swap --chain ${chain} --from ${wallet} --input-token ${inputToken} --output-token ${SOL_NATIVE} --amount ${amountLamports} --auto-slippage --anti-mev --raw`);
}
