// VERTEX speech-to-text worker — Whisper (base, multilingual, int8) running fully in the browser.
// Model files are served from this repo (shared/ai/models/whisper-base, ~77 MB, cached by the browser after the first use).
import { env, pipeline } from './lib/transformers.min.js';

const BASE = new URL('./', import.meta.url).href;
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = BASE + 'models/';
env.useBrowserCache = true;
env.backends.onnx.wasm.wasmPaths = BASE + 'lib/';
env.backends.onnx.wasm.proxy = false;

let asr = null;
async function load() {
  if (asr) return asr;
  let device = 'wasm';
  try { if (self.navigator.gpu && await navigator.gpu.requestAdapter()) device = 'webgpu'; } catch (e) {}
  const opts = { dtype: { encoder_model: 'q8', decoder_model_merged: 'q8' }, device,
    progress_callback: (p) => { if (p.status === 'progress' && p.total) self.postMessage({ t: 'prog', file: p.file, p: Math.round(p.loaded / p.total * 100) }); } };
  try { asr = await pipeline('automatic-speech-recognition', 'whisper-base', opts); }
  catch (e) { if (device !== 'wasm') { opts.device = 'wasm'; asr = await pipeline('automatic-speech-recognition', 'whisper-base', opts); } else throw e; }
  self.postMessage({ t: 'ready' });
  return asr;
}
self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.t === 'load') { await load(); return; }
    if (m.t === 'stt') {
      const a = await load();
      const o = { task: 'transcribe', chunk_length_s: 30, max_new_tokens: 128, no_repeat_ngram_size: 3 }; if (m.lang) o.language = m.lang;
      const out = await a(m.audio, o);
      self.postMessage({ t: 'text', id: m.id, text: String((out && out.text) || '').trim() });
    }
  } catch (err) { self.postMessage({ t: 'err', id: m.id, e: String(err && err.message || err) }); }
};
