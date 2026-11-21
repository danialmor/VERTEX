var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker.js
var VERSION = "1.2.0";
var DOC = /^[a-z0-9._-]{1,60}$/i;
var SITE = /^[a-z0-9-]{1,40}$/;
var FILE = /^[^/\\\x00-\x1f]{1,120}\.(xlsx|xls|csv|tsv|txt|xml|json|pdf|mpp|png|jpg|jpeg|webp|docx)$/i;
var MAX_FILE = 20 * 1024 * 1024;
var MAX_DOC = 20 * 1024 * 1024;
function cors(req, env) {
  const o = req.headers.get("Origin") || "";
  const allow = (env.ORIGINS || "https://danialmor.github.io").split(",").map((s) => s.trim()).filter(Boolean);
  const ok = !o || allow.includes(o) || allow.includes("*") || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
  return { ok, h: { "Access-Control-Allow-Origin": ok && o ? o : allow[0], "Access-Control-Allow-Methods": "GET,PUT,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,X-By,X-Pin,X-If-T", "Access-Control-Max-Age": "600", Vary: "Origin" } };
}
__name(cors, "cors");
var json = /* @__PURE__ */ __name((o, s, h) => new Response(JSON.stringify(o), { status: s || 200, headers: Object.assign({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }, h) }), "json");
async function sha256(buf) {
  const d = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha256, "sha256");
async function ixSet(env, site, name, meta) {
  let ix = await env.VX.get("fidx:" + site, "json");
  if (!ix) {
    ix = [];
    let cur;
    do {
      const l = await env.VX.list({ prefix: "file:" + site + ":", cursor: cur });
      l.keys.forEach((x) => ix.push(Object.assign({ name: x.name.slice(("file:" + site + ":").length) }, x.metadata || {})));
      cur = l.list_complete ? null : l.cursor;
    } while (cur);
  }
  ix = ix.filter((x) => x.name !== name);
  if (meta) ix.push(Object.assign({ name }, meta));
  ix.sort((a, b) => a.name < b.name ? -1 : 1);
  await env.VX.put("fidx:" + site, JSON.stringify(ix));
}
__name(ixSet, "ixSet");
var worker_default = {
  async fetch(req, env) {
    const c = cors(req, env), H = c.h;
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: H });
    if (!c.ok) return json({ error: "origin-not-allowed" }, 403, H);
    const url = new URL(req.url), seg = url.pathname.split("/").filter(Boolean).map(decodeURIComponent), m = req.method;
    try {
      if (seg[0] === "health") return json({ ok: true, version: VERSION, kv: !!env.VX }, 200, H);
      if (!env.VX) return json({ error: "kv-not-bound" }, 500, H);
      if (seg[0] === "doc" && seg.length === 2) {
        const k = seg[1];
        if (!DOC.test(k)) return json({ error: "bad-name" }, 400, H);
        if (m === "GET") {
          const v = await env.VX.get("doc:" + k);
          return v === null ? json({ error: "not-found" }, 404, H) : new Response(v, { headers: Object.assign({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }, H) });
        }
        if (m === "PUT") {
          const t = await req.text();
          if (t.length > MAX_DOC) return json({ error: "too-large" }, 413, H);
          let nj;
          try {
            nj = JSON.parse(t);
          } catch (e) {
            return json({ error: "bad-json" }, 400, H);
          }
          const ift = req.headers.get("X-If-T");
          if (ift !== null) {
            const cur = await env.VX.get("doc:" + k, { cacheTtl: 30 }).catch(() => null);
            let ct = 0;
            try {
              ct = cur ? JSON.parse(cur).t || 0 : 0;
            } catch (e) {
            }
            if (String(ct) !== String(+ift || 0)) return json({ error: "conflict", t: ct }, 409, H);
          }
          await env.VX.put("doc:" + k, t, { metadata: { ts: Date.now(), by: (req.headers.get("X-By") || "").slice(0, 40) } });
          return json({ ok: true, t: Date.now() }, 200, H);
        }
        if (m === "DELETE") {
          if (env.ADMIN_PIN && req.headers.get("X-Pin") !== env.ADMIN_PIN) return json({ error: "forbidden" }, 403, H);
          await env.VX.delete("doc:" + k);
          return json({ ok: true }, 200, H);
        }
      }
      if (seg[0] === "files" && (seg.length === 2 || seg.length === 3)) {
        const site = seg[1];
        if (!SITE.test(site)) return json({ error: "bad-site" }, 400, H);
        if (seg.length === 2 && m === "GET") {
          const ix = await env.VX.get("fidx:" + site, "json");
          if (ix) return json({ files: ix }, 200, H);
          const out = [];
          let cur;
          do {
            const l = await env.VX.list({ prefix: "file:" + site + ":", cursor: cur });
            l.keys.forEach((x) => out.push(Object.assign({ name: x.name.slice(("file:" + site + ":").length) }, x.metadata || {})));
            cur = l.list_complete ? null : l.cursor;
          } while (cur);
          out.sort((a, b) => a.name < b.name ? -1 : 1);
          return json({ files: out }, 200, H);
        }
        const name = seg[2];
        if (!name || !FILE.test(name) || name.startsWith(".")) return json({ error: "bad-name" }, 400, H);
        const key = "file:" + site + ":" + name;
        if (m === "GET") {
          const v = await env.VX.get(key, "arrayBuffer");
          return v === null ? json({ error: "not-found" }, 404, H) : new Response(v, { headers: Object.assign({ "Content-Type": "application/octet-stream", "Cache-Control": "no-store" }, H) });
        }
        if (m === "PUT") {
          const b = await req.arrayBuffer();
          if (!b.byteLength) return json({ error: "empty" }, 400, H);
          if (b.byteLength > MAX_FILE) return json({ error: "too-large" }, 413, H);
          const sha = await sha256(b), meta = { size: b.byteLength, ts: Date.now(), by: (req.headers.get("X-By") || "").slice(0, 40), sha };
          await env.VX.put(key, b, { metadata: meta });
          await ixSet(env, site, name, meta);
          return json(Object.assign({ ok: true, name }, meta), 200, H);
        }
        if (m === "DELETE") {
          if (env.ADMIN_PIN && req.headers.get("X-Pin") !== env.ADMIN_PIN) return json({ error: "forbidden" }, 403, H);
          await env.VX.delete(key);
          await ixSet(env, site, name, null);
          return json({ ok: true }, 200, H);
        }
      }
      return json({ error: "not-found" }, 404, H);
    } catch (e) {
      return json({ error: "server", detail: String(e && e.message || e).slice(0, 200) }, 500, H);
    }
  }
};

// ../../../../tmp/claude-0/-home-claude/42f8f9e7-e7f3-5811-ad5f-c1e2c0f1744f/scratchpad/wr/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../tmp/claude-0/-home-claude/42f8f9e7-e7f3-5811-ad5f-c1e2c0f1744f/scratchpad/wr/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-Hhhxxw/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// ../../../../tmp/claude-0/-home-claude/42f8f9e7-e7f3-5811-ad5f-c1e2c0f1744f/scratchpad/wr/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-Hhhxxw/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
