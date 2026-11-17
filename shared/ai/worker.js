// VERTEX local AI worker — runs Qwen2.5-0.5B-Instruct fully in the browser.
// All files (library, wasm, model) are served from this repo; no external server.
import { env, AutoTokenizer, AutoModelForCausalLM, TextStreamer } from './lib/transformers.min.js';

const BASE = new URL('./', import.meta.url).href;
const MODEL = 'qwen05';
const PARTS = 11; // model_q4f16.onnx is split into 45 MB parts (GitHub file-size limit)

env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = BASE + 'models/';
env.useBrowserCache = false; // we cache the 45 MB parts ourselves (one 480 MB cache entry runs out of memory)
env.backends.onnx.wasm.wasmPaths = BASE + 'lib/';
env.backends.onnx.wasm.proxy = false;

// Serve the split model file as one streamed response, with progress.
const _fetch = self.fetch.bind(self);
self.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input.url;
  if (!url.endsWith('/onnx/model_q4f16.onnx')) return _fetch(input, init);
    const urls = Array.from({ length: PARTS }, (_, i) => url + '.part' + String(i).padStart(2, '0'));
  const total = 483003582;
  const cache = await caches.open('vertex-ai-v1').catch(() => null);
  let done = 0;
  const body = new ReadableStream({
    async start(ctrl) {
      for (const u of urls) {
        let r = cache && await cache.match(u).catch(() => null);
        if (!r) {
          r = await _fetch(u);
          if (!r.ok) { ctrl.error(new Error('missing ' + u)); return; }
          if (cache) { try { await cache.put(u, r.clone()); } catch (e) {} }
        }
        const rd = r.body.getReader();
        for (;;) {
          const { value, done: d } = await rd.read();
          if (d) break;
          done += value.length; ctrl.enqueue(value);
          post({ t: 'prog', p: Math.round(done / total * 100) });
        }
      }
      ctrl.close();
    }
  });
  const res = new Response(body, { headers: { 'content-type': 'application/octet-stream', 'content-length': String(total) } });
  return res;
};

function post(m) { self.postMessage(m); }

let tok, model, device, busy = false, stopFlag = false;

async function load() {
  if (model) return;
  device = 'wasm';
  try { if (self.navigator.gpu && await navigator.gpu.requestAdapter()) device = 'webgpu'; } catch (e) {}
  post({ t: 'status', s: 'loading', device });
  tok = await AutoTokenizer.from_pretrained(MODEL);
  model = await AutoModelForCausalLM.from_pretrained(MODEL, { dtype: 'q4f16', device });
  post({ t: 'status', s: 'ready', device });
}

self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.t === 'load') return await load();
    if (m.t === 'stop') { stopFlag = true; return; }
    if (m.t === 'chat') {
      if (busy) return; busy = true; stopFlag = false;
      await load();
      const inputs = tok.apply_chat_template(m.messages, { add_generation_prompt: true, return_dict: true });
      const streamer = new TextStreamer(tok, { skip_prompt: true, skip_special_tokens: true, callback_function: (x) => post({ t: 'tok', x }) });
      const { StoppingCriteria, StoppingCriteriaList } = await import('./lib/transformers.min.js');
      class Stop extends StoppingCriteria { _call(ids) { return new Array(ids.length).fill(stopFlag); } }
      const sc = new StoppingCriteriaList(); sc.push(new Stop());
      await model.generate({ ...inputs, max_new_tokens: m.max || 256, do_sample: false, repetition_penalty: 1.1, streamer, stopping_criteria: sc });
      busy = false; post({ t: 'done' });
    }
  } catch (err) { busy = false; post({ t: 'err', e: String(err && err.message || err) }); }
};
