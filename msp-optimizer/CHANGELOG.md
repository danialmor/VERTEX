# Changelog
## Unreleased — 0.6.0 target
- Establish mandatory documentation protocol and retrospective development baseline.
- Planned: Ribbon icons, comprehensive reader, cloud pairing/sync and MSP LIVE.
## 0.5.1-beta (source)
- Offline .NET 4.8 runtime packaging, signature check, restart handling; classic MSBuild project removes SDK dependency.
- User reported successful DLL build and ribbon display in Project 2024 x64. Installer not built/tested.
## 0.5.0-beta
- Installer and build workflow foundation.
## Earlier development (unversioned milestones)
- Isolated web module and architecture; read-only COM snapshot; authenticated loopback bridge; Equal planner and local WBS profiles; experimental reversible trial on disposable MPP only.

## 2026-11-26 — v0.6 reader/Ribbon source milestone
Connect.cs: large Office imageMso buttons, VERTEX MSP tab, AutoDispatch for callback testing. SnapshotReader.cs: additive optional project/task/resource/assignment fields via late-bound COM property reads, null and capped warnings for unavailable fields; existing protection logic preserved. SnapshotForm.cs: counts. No cloud upload added. Existing local bridge may now serialize expanded fields after explicit sharing; review privacy before sharing. Compile, image IDs, callbacks, COM reflection, performance and data parity unverified. Calendars/custom fields/baselines 1–10/timephased data not complete. Rollback via reverting the three source commits. Next: Windows build and Inspect on disposable MPP; compare counts and warnings before cloud work.

## 2026-11-26 — 0.6.0-dev.2
Added UpdateChecker.cs and Ribbon Update Plugin/Refresh Data callbacks in Connect.cs; LocalBridge.cs atomically replaces serialized snapshot while retaining session token, only after explicit refresh consent. Startup/manual check uses official repository latest release endpoint, accepts numeric msp-v tags, prompts to open official releases page. No automatic download/install or binary replacement yet: signed release pipeline and signer verification required. Latest repository release may be unrelated; dedicated MSP feed needed. No published installer verified. Build/runtime tests pending; test startup offline, no release, refresh with/without sharing, token retention and Project restart. Rollback: revert three source commits. Next: build/test dev.2, establish signed release feed and installer upgrade with Project closed. No main merge.
