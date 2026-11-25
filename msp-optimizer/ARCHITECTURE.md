# Architecture overview
Current source: Project COM add-in -> read-only snapshot -> authenticated loopback bridge -> isolated VERTEX web module. See docs/architecture.md and docs/optimizer.md for detailed existing design.
Target (not implemented): Project -> read-only extractor -> HTTPS account-scoped cloud API -> tenant-isolated D1/R2 -> MSP LIVE dashboard. Local secure credential storage, explicit initial pairing, offline queue, revocation. WBS optimizer stays local until safe execution and rollback validated.
