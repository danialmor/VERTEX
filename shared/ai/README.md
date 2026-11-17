# VERTEX local AI (shared/ai)

Runs **Qwen2.5-0.5B-Instruct** (ONNX, q4f16) fully inside the browser. Nothing is sent to any outside server.

- `ai.js`: floating icon (bottom-left), a button in the right floating rail (`.rail .vxai`), and the chat panel. Common questions about delays, progress and summaries are answered instantly and exactly from `window.VX_DATA()`. Other questions go to the model, with `window.VX_CTX()` as its context.
- `worker.js`: Web Worker running transformers.js 3.7.6 (`lib/`, vendored). Uses WebGPU when available, otherwise WASM.
- `models/qwen05/onnx/model_q4f16.onnx.part00..10`: the 483 MB model split into 45 MB parts (GitHub file limit). The worker streams the parts and caches each one in the Cache API (`vertex-ai-v1`), so it only downloads once per browser.
- Pages that use it: `msp-bi/index.html` (`<script src="../shared/ai/ai.js" defer>`); `VX_CTX`/`VX_DATA` are defined inside its app IIFE.
- Limits: the 0.5B model is weak at Persian facts; it needs about 1.5 GB of memory in WASM mode. Keep the context compact.
