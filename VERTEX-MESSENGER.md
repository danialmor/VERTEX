# VERTEX III — Messenger (source)

This branch (`messenger-source`) holds the full Mattermost source the owner chose as the base for the VERTEX messenger (feature MS-001).
It is kept apart from `main` so GitHub Pages and the Aide sync stay light.

- Licence: see `LICENSE.txt` (source under AGPL v3 / Apache 2.0 parts; enterprise directories under `LICENSE.enterprise`). Keep these files.
- It cannot run on GitHub Pages: it needs a server (Go server + PostgreSQL + the React webapp build). Run it on the VERTEX VPS next to `hub/server.py`.
- Next steps: build (`server/` make, `webapp/` npm), deploy on the VPS behind Caddy at `/messenger/`, connect single sign-in to the VERTEX hub (OAuth/GitLab-style SSO or a small auth bridge), translate UI to Persian (i18n/), theme with the VERTEX tokens.
