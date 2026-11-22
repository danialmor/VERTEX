# API catalog (saved for later)

Two lists Danial shared on 2 Azar 1405, kept here for future VERTEX features.

- `apis-ai.csv` — AI APIs (language models, image, speech, web search).
- `apis-general.csv` — general APIs (payment, maps, weather, email, SMS, auth, files, search, translation, exchange rate, news, Telegram, QR, PDF, R2).

## Already used in VERTEX
- **AI tab → «افزودن به سرویس‌های فعال»** detects and adds: Google Gemini, OpenAI, Mistral, Groq, Cohere, OpenRouter, Hugging Face, DeepSeek, Coarena, Cloudflare Workers AI (all OpenAI-compatible chat endpoints, with fallback order).
- **Open-Meteo** — site weather and concrete rating (no key).
- Exchange rate — the subscription page uses priceto.day / tgju (free-market IRR), not ExchangeRate-API.

## Not used yet (ideas)
- Anthropic Claude — needs its own request format / a server proxy (browser CORS).
- Stability AI, Replicate — image generation (e.g. AI tiles art).
- ElevenLabs (text→speech), Deepgram / AssemblyAI (speech→text) — assistant voice.
- Tavily / Exa — web search for the assistant (news, prices).
- Telegram Bot API — notifications (delays, approvals) to Telegram.
- Resend / SendGrid — transactional email (sign-up, password reset, order approved).
- Mapbox / Google Maps — project map (now Leaflet + OSM).
- DeepL — translation; NewsAPI — industry news; Cloudflare R2 — large file storage; Stripe / PayPal — international payment; QR Server / PDFShift — QR and PDF.
