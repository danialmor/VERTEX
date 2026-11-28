# VERTEX MSP 1.8.0 base installer acceptance
2026-11-28. Consolidated requirements from project history. This is an acceptance checklist, not a release.
- Full signed package updates, independent elevated helper, explicit consent, protected staging, no forced Project closure, previous verified installer, manual rollback, persistent crash journal, post-install health check, recovery after reboot.
- Fixed VERTEX-MSP-Setup.exe asset name, Program Files VERTEX/MSPOptimizer, original developer danialmor and Telegram @Danimor1991; signed mutable deployment configuration and hosting migration.
- Windows hosted CI build with licensed Office PIAs and Inno license review, verified Microsoft runtime, logs, hash, artifact, offline owner signature, verified release publication. Never publish unsigned update.
- Multi-project registry, stable UUID and explicit copy/relink, durable snapshots, optional original MPP with consent, version history, sync acknowledgement, conflict detection, offline queue, account-scoped pairing, private storage and tenant isolation.
- Dashboard Plugin: overview, project list, WBS, Gantt, EVM, resources, cost, baseline, critical path, WBS locks, sync, connection, diagnostics. Show saved versus connected versus uploaded truthfully.
- COM extraction coverage including custom fields, baselines 0–10, calendars, dependencies, assignments, timephased values, formulas and coverage failures. No claim of full fidelity; retain original MPP separately.
- WBS finish lock equal adjustment, protect actuals, logic, milestones and baseline, preview, audit, restore; no automatic mutation until validated.
- Acceptance: clean Windows install, Project 2016/2024 x64, local connection regression, multi-project isolation, offline and interrupted update, rollback, 1.8.0 to 1.8.1 signed update, large project tests. No production release until verified.
