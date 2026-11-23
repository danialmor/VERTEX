# VERTEX — ecosystem email (vmail) · source

Bulwark Webmail 1.8.1 (AGPL v3, see LICENSE/NOTICE), chosen by the owner as the ecosystem email client. Kept on branch `vmail-source`.
Public address reserved: `/VERTEX/vmail/` (main branch shows a status page until the server is ready).

Needs a server: Next.js (`npm ci && npm run build && npm start`, output standalone, or the Dockerfile / docker-compose.yml) **and** a JMAP mail server
(Stalwart Mail Server) for the company domain. First run opens a setup wizard (JMAP endpoint, auth, session secret, branding).
Plan: run both on the VERTEX VPS behind Caddy, serve webmail at `/vmail/`, VERTEX theme + Persian locale (locales/), sign-in via the hub (OIDC) later.
