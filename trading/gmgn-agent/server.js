import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { randomBytes } from "crypto";
import { jupiterBuy, jupiterSell } from "./agent/jupiter.js";
import { sanitize } from "./agent/logger.js";
import { addPosition } from "./agent/state.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3333;
const SOL_NATIVE = "So11111111111111111111111111111111111111112";

// ── Auth ───────────────────────────────────────────────────────────────────
const AUTH_USER = process.env.AUTH_USERNAME;
const AUTH_HASH = process.env.AUTH_PASSWORD_HASH;

if (!AUTH_USER || !AUTH_HASH) {
  console.error("\n  ✗ AUTH_USERNAME and AUTH_PASSWORD_HASH must be set in .env");
  console.error("    Run: bun setup-auth.js\n");
  process.exit(1);
}

const sessions = new Set(); // in-memory; cleared on restart

function sessionToken(req) {
  // Accept token from custom header (preferred, Cloudflare-safe) or cookie
  const hdr = req.headers.get("x-session-token");
  if (hdr) return hdr;
  const cookie = req.headers.get("cookie") || "";
  for (const part of cookie.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === "gmgn_session") return rest.join("=");
  }
  return null;
}

function isAuth(req) {
  const t = sessionToken(req);
  return t && sessions.has(t);
}

const COOKIE_OPTS = "Path=/; HttpOnly; SameSite=Strict; Secure";

// ── Wallet ─────────────────────────────────────────────────────────────────
const WALLET_ADDRESS = process.env.WALLET_ADDRESS;
if (!WALLET_ADDRESS) {
  console.error("\n  ✗ WALLET_ADDRESS not set in .env\n");
  process.exit(1);
}

console.log(`\n  Wallet: ${WALLET_ADDRESS}`);

// ── Shell helper ───────────────────────────────────────────────────────────
function runCmd(cmd) {
  try {
    const out = execSync(cmd, { timeout: 12000, encoding: "utf8" });
    return { ok: true, data: JSON.parse(out.trim()) };
  } catch (e) {
    const msg = e.stdout ? e.stdout.toString().trim() : e.message;
    return { ok: false, error: sanitize(msg) };
  }
}

// ── Login page ─────────────────────────────────────────────────────────────
const LOGIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>GMGN Agent — Login</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#07101d;color:#d8e4f0;font-family:'Segoe UI',system-ui,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center}
.card{background:#0c1825;border:1px solid #182840;border-radius:14px;padding:36px 32px;width:100%;max-width:360px;box-shadow:0 24px 64px rgba(0,0,0,.5)}
.logo{display:flex;align-items:center;gap:10px;margin-bottom:28px;justify-content:center}
.logo-dot{width:10px;height:10px;background:#0ecb81;border-radius:50%;box-shadow:0 0 10px #0ecb81}
.logo-text{font-size:16px;font-weight:700;color:#fff;letter-spacing:-.3px}
label{display:block;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#6b8aaa;margin-bottom:6px}
input{width:100%;background:#101f2e;border:1px solid #182840;border-radius:8px;padding:10px 14px;color:#d8e4f0;font-size:14px;outline:none;transition:border-color .15s;margin-bottom:16px}
input:focus{border-color:#0ecb81}
button{width:100%;background:#0ecb81;color:#000;border:none;border-radius:8px;padding:11px;font-size:14px;font-weight:700;cursor:pointer;transition:background .15s;margin-top:4px}
button:hover{background:#13e890}
button:active{transform:scale(.98)}
.err{background:rgba(246,70,93,.1);border:1px solid rgba(246,70,93,.3);color:#f6465d;border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:16px;display:none}
</style>
</head>
<body>
<div class="card">
  <div class="logo"><span class="logo-dot"></span><span class="logo-text">GMGN Agent by 🐧 Bun</span></div>
  <div class="err" id="err">Invalid username or password</div>
  <form id="form">
    <label>Username</label>
    <input type="text" id="u" autocomplete="username" autocapitalize="none" autofocus/>
    <label>Password</label>
    <input type="password" id="p" autocomplete="current-password"/>
    <button type="submit">Sign In</button>
  </form>
</div>
<script>
document.getElementById('form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.textContent = 'Signing in…'; btn.disabled = true;
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({username: document.getElementById('u').value, password: document.getElementById('p').value}),
  });
  if (res.ok) {
    const data = await res.json();
    if (data.token) localStorage.setItem('gmgn_token', data.token);
    location.href = '/';
  } else {
    document.getElementById('err').style.display = 'block';
    btn.textContent = 'Sign In'; btn.disabled = false;
    document.getElementById('p').value = '';
  }
});
</script>
</body>
</html>`;

// ── Server ─────────────────────────────────────────────────────────────────
const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    try {
      return await handleRequest(req);
    } catch (e) {
      console.error("Unhandled error:", e);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
});

async function handleRequest(req) {
    const url = new URL(req.url);
    const headers = { "Content-Type": "application/json" };

    // ── Public routes ───────────────────────────────────────────────────────
    if (url.pathname === "/login") {
      return new Response(LOGIN_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    if (url.pathname === "/api/login" && req.method === "POST") {
      const { username, password } = await req.json();
      const userOk = username === AUTH_USER;
      const passOk = userOk && await Bun.password.verify(password, AUTH_HASH);
      if (!passOk) {
        return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401, headers });
      }
      const token = randomBytes(32).toString("hex");
      sessions.add(token);
      return new Response(JSON.stringify({ ok: true, token }), {
        headers: { ...headers, "Set-Cookie": `gmgn_session=${token}; ${COOKIE_OPTS}` },
      });
    }

    if (url.pathname === "/api/logout" && req.method === "POST") {
      const t = sessionToken(req);
      if (t) sessions.delete(t);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...headers, "Set-Cookie": `gmgn_session=; Path=/; Max-Age=0` },
      });
    }

    // ── Auth gate ───────────────────────────────────────────────────────────
    const authed = isAuth(req);
    if (!authed) {
      if (req.headers.get("accept")?.includes("text/html")) {
        return Response.redirect("/login", 302);
      }
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
    }

    const jsonHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: jsonHeaders });

    // ── Serve frontend ──────────────────────────────────────────────────────
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const html = readFileSync(join(__dirname, "index.html"), "utf8");
      return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    // ── GET /api/config ─────────────────────────────────────────────────────
    if (url.pathname === "/api/config" && req.method === "GET") {
      return Response.json({ walletAddress: WALLET_ADDRESS }, { headers: jsonHeaders });
    }

    // ── GET /api/portfolio/stats ────────────────────────────────────────────
    if (url.pathname === "/api/portfolio/stats" && req.method === "GET") {
      const chain  = url.searchParams.get("chain")  || "sol";
      const period = url.searchParams.get("period") || "7d";
      const result = runCmd(
        `gmgn-cli portfolio stats --chain ${chain} --wallet ${WALLET_ADDRESS} --period ${period} --raw`
      );
      if (result.ok) return Response.json(result.data, { headers: jsonHeaders });
      return Response.json({ error: result.error }, { status: 500, headers: jsonHeaders });
    }

    // ── GET /api/portfolio/holdings ─────────────────────────────────────────
    if (url.pathname === "/api/portfolio/holdings" && req.method === "GET") {
      const chain      = url.searchParams.get("chain")      || "sol";
      const hideClosed = url.searchParams.get("hideClosed") ?? "true";
      const orderBy    = url.searchParams.get("orderBy")    || "usd_value";
      const limit      = url.searchParams.get("limit")      || "50";
      const result = runCmd(
        `gmgn-cli portfolio holdings --chain ${chain} --wallet ${WALLET_ADDRESS}` +
        ` --hide-closed ${hideClosed} --order-by ${orderBy} --limit ${limit} --raw`
      );
      if (result.ok) return Response.json(result.data, { headers: jsonHeaders });
      return Response.json({ error: result.error }, { status: 500, headers: jsonHeaders });
    }

    // ── GET /api/trenches ───────────────────────────────────────────────────
    if (url.pathname === "/api/trenches" && req.method === "GET") {
      const chain    = url.searchParams.get("chain")    || "sol";
      const type     = url.searchParams.get("type")     || "new_creation";
      const limit    = url.searchParams.get("limit")    || "50";
      const preset   = url.searchParams.get("preset")   || "";
      const sortBy   = url.searchParams.get("sortBy")   || "";
      const platform = url.searchParams.get("platform") || "";

      let cmd = `gmgn-cli market trenches --chain ${chain} --type ${type} --limit ${limit} --raw`;
      if (preset)   cmd += ` --filter-preset ${preset}`;
      if (sortBy)   cmd += ` --sort-by ${sortBy}`;
      if (platform) cmd += ` --launchpad-platform ${platform}`;

      for (const [param, flag] of [
        ["minSm","--min-smart-degen-count"],["minKol","--min-renowned-count"],
        ["maxRug","--max-rug-ratio"],["minVol","--min-volume-24h"],
        ["minMcap","--min-marketcap"],["maxMcap","--max-marketcap"],
        ["minProgress","--min-progress"],["maxProgress","--max-progress"],
      ]) {
        const v = url.searchParams.get(param);
        if (v !== null && v !== "") cmd += ` ${flag} ${v}`;
      }

      const result = runCmd(cmd);
      if (result.ok) {
        if (result.data?.data?.rank) applyBurnRugFlag(result.data.data.rank);
        return Response.json(result.data, { headers: jsonHeaders });
      }
      return Response.json({ error: result.error }, { status: 500, headers: jsonHeaders });
    }

    // ── GET /api/token/* ────────────────────────────────────────────────────
    if (url.pathname.startsWith("/api/token/") && req.method === "GET") {
      const sub     = url.pathname.split("/")[3];
      const chain   = url.searchParams.get("chain")   || "sol";
      const address = url.searchParams.get("address") || "";
      if (!address) return Response.json({ error: "address required" }, { status: 400, headers: jsonHeaders });

      let cmd;
      if (sub === "info" || sub === "security") {
        cmd = `gmgn-cli token ${sub} --chain ${chain} --address ${address} --raw`;
      } else if (sub === "holders" || sub === "traders") {
        const limit   = url.searchParams.get("limit")   || "20";
        const orderBy = url.searchParams.get("orderBy") || "amount_percentage";
        const tag     = url.searchParams.get("tag")     || "";
        cmd = `gmgn-cli token ${sub} --chain ${chain} --address ${address} --limit ${limit} --order-by ${orderBy} --raw`;
        if (tag) cmd += ` --tag ${tag}`;
      } else {
        return new Response("Not Found", { status: 404 });
      }

      const result = runCmd(cmd);
      if (result.ok) return Response.json(result.data, { headers: jsonHeaders });
      return Response.json({ error: result.error }, { status: 500, headers: jsonHeaders });
    }

    // ── GET /api/kline ─────────────────────────────────────────────────────
    if (url.pathname === "/api/kline" && req.method === "GET") {
      const chain      = url.searchParams.get("chain")      || "sol";
      const address    = url.searchParams.get("address")    || "";
      const resolution = url.searchParams.get("resolution") || "15m";
      if (!address) return Response.json({ error: "address required" }, { status: 400, headers: jsonHeaders });
      const VALID_RES = ["1m","5m","15m","1h","4h","1d"];
      if (!VALID_RES.includes(resolution)) return Response.json({ error: "invalid resolution" }, { status: 400, headers: jsonHeaders });
      const result = runCmd(`gmgn-cli market kline --chain ${chain} --address ${address} --resolution ${resolution} --raw`);
      if (result.ok) return Response.json(result.data, { headers: jsonHeaders });
      return Response.json({ error: result.error }, { status: 500, headers: jsonHeaders });
    }

    // ── Security helper ───────────────────────────────────────────────────────
function applyBurnRugFlag(tokens) {
  for (const t of tokens) {
    const burnRatio = t.burn_ratio ?? 0;
    const isBurned  = t.burn_status === 'burn' || burnRatio > 0;
    if (!isBurned) {
      t.rug_ratio = 1; // Flag as rug
    }
  }
}

// ── GET /api/trending ───────────────────────────────────────────────────
    if (url.pathname === "/api/trending" && req.method === "GET") {
      const chain    = url.searchParams.get("chain")    || "sol";
      const interval = url.searchParams.get("interval") || "1h";
      const limit    = parseInt(url.searchParams.get("limit") || "50", 10);
      const orderBy  = url.searchParams.get("orderBy")  || "volume";
      const minKol   = parseInt(url.searchParams.get("minKol") || "0", 10);
      const minSm    = parseInt(url.searchParams.get("minSm")  || "0", 10);

      const result = runCmd(
        `gmgn-cli market trending --chain ${chain} --interval ${interval} --order-by ${orderBy} --limit ${limit} --raw`
      );
      if (!result.ok) return Response.json({ error: result.error }, { status: 500, headers: jsonHeaders });

      let rank = result.data?.data?.rank || [];
      applyBurnRugFlag(rank);
      if (minKol > 0) rank = rank.filter((t) => (t.renowned_count || 0) >= minKol);
      if (minSm > 0)  rank = rank.filter((t) => (t.smart_degen_count || 0) >= minSm);

      return Response.json({ code: 0, data: { rank }, ts: Date.now() }, { headers: jsonHeaders });
    }

    // ── POST /api/swap ──────────────────────────────────────────────────────
    if (url.pathname === "/api/swap" && req.method === "POST") {
      const { outputToken, symbol, amountSol, slippage } = await req.json();

      if (!outputToken || !amountSol)
        return Response.json({ error: "outputToken and amountSol are required" }, { status: 400, headers: jsonHeaders });

      const slippageBps = slippage ? Math.round(parseFloat(slippage) * 100) : 300;

      try {
        const result = await jupiterBuy({ outputToken, amountSol: parseFloat(amountSol), slippageBps });
        if (!result.ok) return Response.json({ error: result.error }, { status: 500, headers: jsonHeaders });

        // Track the position in agent state
        addPosition({
          address: outputToken,
          symbol: symbol || "?",
          amountSol: parseFloat(amountSol),
          chain: "sol",
          score: 0,
          reason: "Manual trade via Web Terminal",
        });

        return Response.json({ ok: true, signature: result.data?.signature }, { headers: jsonHeaders });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500, headers: jsonHeaders });
      }
    }

    // ── POST /api/sell ──────────────────────────────────────────────────────
    if (url.pathname === "/api/sell" && req.method === "POST") {
      const { inputToken, amountLamports, slippage } = await req.json();

      if (!inputToken || !amountLamports)
        return Response.json({ error: "inputToken and amountLamports are required" }, { status: 400, headers: jsonHeaders });

      const slippageBps = slippage ? Math.round(parseFloat(slippage) * 100) : 300;

      try {
        const result = await jupiterSell({ inputToken, amountLamports: parseInt(amountLamports), slippageBps });
        if (!result.ok) return Response.json({ error: result.error }, { status: 500, headers: jsonHeaders });
        return Response.json({ ok: true, signature: result.data?.signature }, { headers: jsonHeaders });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500, headers: jsonHeaders });
      }
    }

    // ── GET /api/order/:id ──────────────────────────────────────────────────
    if (url.pathname.startsWith("/api/order/") && req.method === "GET") {
      const orderId = url.pathname.split("/").pop();
      const chain   = url.searchParams.get("chain") || "sol";
      const result  = runCmd(`gmgn-cli order get --chain ${chain} --order-id ${orderId} --raw`);
      if (result.ok) return Response.json(result.data, { headers: jsonHeaders });
      return Response.json({ error: result.error }, { status: 500, headers: jsonHeaders });
    }

    return new Response("Not Found", { status: 404 });
}

console.log(`  GMGN Agent → http://localhost:${PORT}\n`);
