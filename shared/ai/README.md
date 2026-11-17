# VERTEX local AI (shared/ai)

Runs **Qwen2.5-0.5B-Instruct** (ONNX, q4f16) fully inside the browser. Nothing is sent to any outside server.

- `ai.js`: floating icon (bottom-left), a button in the right floating rail (`.rail .vxai`), and the chat panel. Common questions about delays, progress and summaries are answered instantly and exactly from `window.VX_DATA()`. Other questions go to the model, with `window.VX_CTX()` as its context.
- `worker.js`: Web Worker running transformers.js 3.7.6 (`lib/`, vendored). Uses WebGPU when available, otherwise WASM.
- `models/qwen05/onnx/model_q4f16.onnx.part00..10`: the 483 MB model split into 45 MB parts (GitHub file limit). The worker streams the parts and caches each one in the Cache API (`vertex-ai-v1`), so it only downloads once per browser.
- Pages that use it: `msp-bi/index.html` (`<script src="../shared/ai/ai.js" defer>`); `VX_CTX`/`VX_DATA` are defined inside its app IIFE.
- Limits: the 0.5B model is weak at Persian facts; it needs about 1.5 GB of memory in WASM mode. Keep the context compact.

## Online engine: Coarena (default since msp-bi 3.74)
- ⚙ in the panel: engine (`coarena` | `local`), API key, model. Saved in `localStorage.vxaiCfg` in the user's browser only. **Never commit a key.**
- Chat: `POST https://coarena.ai/api/v1/chat/completions` (OpenAI-compatible, `stream:true`), default model `claude-sonnet-5-5`; the model list comes from `GET /api/v1/models` (CORS allowed).
- Rating: 👍/👎 → `POST /api/v1/feedback {request_id, rating:"up"|"down"|null}`, where `request_id` is the `id` from the stream.
- The quick data answers (`facts()`) apply only to the local engine.

## Key management (msp-bi 3.75+)
- Only the ecosystem admin (GitHub key entered in msp-bi → بارگذاری) sees the "کلید جدید (مدیر)" field in ⚙ and saves it to `shared/ai/config.json` in the repo; all users read it from there. Encoding is only obfuscation: the repo is public.

## On our own server (hub)
- The hub's AI gateway speaks OpenAI-compatible APIs: `config.json` → `"ai_url": "https://coarena.ai/api/v1", "ai_model": "claude-sonnet-5-5", "ai_key": "coa_…"` (or env `HUB_AI_KEY`). The key stays on the server.
- `ai.js` detects it is not on github.io and calls `/api/v1/ai/stream` (SSE `{t}` … `{done,id}`) and `/api/v1/ai/feedback` with the user's `hub.token`. Model choice from ⚙ is passed through.

## Ecosystem-wide (3.81)
- Settings moved to the control panel → «هوش مصنوعی» (`admin/aiset.js`): enabled, name, mode (coarena|local), model (Coarena list), key, base prompt; saved to `shared/ai/config.json` with the GitHub key from «ذخیره در GitHub». The widget's own ⚙ is hidden.
- `ai.js` is loaded on: root, admin, msp-bi (with project data), mail, files, trading, aide. Pages without `VX_CTX` get a generic ecosystem prompt with the page title.
- `shared/demo.js` intercepts only same-origin `/api/v1/` calls (it used to swallow `https://coarena.ai/api/v1/...`).

## Voice (speech to text)
- Safari's built-in SpeechRecognition did not work on the owner's iPad, and Coarena accepts no audio, so voice uses Whisper-base (multilingual, int8, `models/whisper-base`, ~77 MB, MIT) in a Web Worker (`stt.js`, transformers.js). The 🎙 button records with MediaRecorder (the browser asks for the microphone on first tap), tap again to stop (30 s max), decodes to 16 kHz mono and transcribes. `فا/EN` button sets the spoken language (localStorage `vxaiMicLang`). The text is sent as the question.
- Spoken answers: 🔈/🔊 toggle, `speechSynthesis` (fa-IR when the text is Persian).
