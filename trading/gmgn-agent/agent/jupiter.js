import { VersionedTransaction, Keypair, Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';
import { WALLET, SOL_PRIVATE_KEY, JUPITER_KEY, RPC_URL } from './config.js';
import { log } from './logger.js';

export async function getSolBalance() {
  const conn = new Connection(RPC_URL);
  const bal  = await conn.getBalance(new PublicKey(WALLET));
  return bal / LAMPORTS_PER_SOL;
}

const ULTRA_URL  = 'https://ultra-api.jup.ag';
export const SOL_MINT = 'So11111111111111111111111111111111111111112';

function getKeypair() {
  if (!SOL_PRIVATE_KEY) throw new Error('WALLET_PRIVATE_KEY not set in .env');
  return Keypair.fromSecretKey(bs58.decode(SOL_PRIVATE_KEY));
}

function apiHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (JUPITER_KEY) h['x-api-key'] = JUPITER_KEY;
  return h;
}

async function getOrder({ inputMint, outputMint, amount, slippageBps }) {
  const params = new URLSearchParams({ inputMint, outputMint, amount: String(amount), taker: WALLET });
  if (slippageBps != null) params.set('slippageBps', String(slippageBps));

  const resp = await fetch(`${ULTRA_URL}/order?${params}`, { headers: apiHeaders() });
  const body = await resp.json();
  if (!resp.ok || body.error) return { ok: false, error: body.error ?? body.message ?? `HTTP ${resp.status}` };
  return { ok: true, data: body };
}

async function signAndExecute(order) {
  const keypair = getKeypair();
  const txBytes = Buffer.from(order.transaction, 'base64');
  const tx = VersionedTransaction.deserialize(txBytes);
  tx.sign([keypair]);
  const signedTx = Buffer.from(tx.serialize()).toString('base64');

  const resp = await fetch(`${ULTRA_URL}/execute`, {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify({ signedTransaction: signedTx, requestId: order.requestId }),
  });
  const body = await resp.json();
  if (!resp.ok || body.error) return { ok: false, error: body.error ?? body.message ?? `HTTP ${resp.status}` };
  if (body.status === 'Failed') return { ok: false, error: `Transaction failed: ${body.error ?? 'unknown'}` };
  return { ok: true, data: body };
}

export async function jupiterBuy({ outputToken, amountSol, slippageBps = 300 }) {
  const lamports = Math.round(parseFloat(amountSol) * 1_000_000_000);
  log.info(`Jupiter buy: ${lamports} lamports SOL → ${outputToken.slice(0, 8)}… (slippage ${slippageBps} bps)`);

  const order = await getOrder({ inputMint: SOL_MINT, outputMint: outputToken, amount: lamports, slippageBps });
  if (!order.ok) return order;

  const result = await signAndExecute(order.data);
  if (!result.ok) return result;

  log.ok(`Jupiter buy executed: ${result.data.signature}`);
  return { ok: true, data: result.data };
}

export async function jupiterSell({ inputToken, amountLamports, slippageBps = 300 }) {
  log.info(`Jupiter sell: ${amountLamports} lamports ${inputToken.slice(0, 8)}… → SOL (slippage ${slippageBps} bps)`);

  const order = await getOrder({ inputMint: inputToken, outputMint: SOL_MINT, amount: amountLamports, slippageBps });
  if (!order.ok) return order;

  const result = await signAndExecute(order.data);
  if (!result.ok) return result;

  log.ok(`Jupiter sell executed: ${result.data.signature}`);
  return { ok: true, data: result.data };
}
