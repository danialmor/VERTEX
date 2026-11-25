# Roadmap
1. Ribbon icons and callback tests.
2. Comprehensive read-only project extraction (tasks, WBS, resources, assignments, cost, baseline, calendars, custom fields; document unsupported fields).
3. Account-scoped cloud API, storage and pairing; threat model and tenant isolation tests.
4. MSP LIVE dashboard and full/delta sync with offline retry and consent.
5. Safe WBS optimizer, preview, rollback and automatic enforcement after validation.
6. All-in-one installer, clean-machine and uninstall tests, release artifact and dashboard link.

## 2026-11-26 — 0.6.0-dev.2
Added UpdateChecker.cs and Ribbon Update Plugin/Refresh Data callbacks in Connect.cs; LocalBridge.cs atomically replaces serialized snapshot while retaining session token, only after explicit refresh consent. Startup/manual check uses official repository latest release endpoint, accepts numeric msp-v tags, prompts to open official releases page. No automatic download/install or binary replacement yet: signed release pipeline and signer verification required. Latest repository release may be unrelated; dedicated MSP feed needed. No published installer verified. Build/runtime tests pending; test startup offline, no release, refresh with/without sharing, token retention and Project restart. Rollback: revert three source commits. Next: build/test dev.2, establish signed release feed and installer upgrade with Project closed. No main merge.
