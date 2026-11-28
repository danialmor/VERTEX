# VERTEX MSP 1.7.1 — release acceptance contract
2026-11-28. User selected 1.7.1 as final installer target. User reports dev.5 installed and local dashboard connection working. Build transcript reports zero C# errors/warnings, successful Inno 7.1.1 build, one RunOnceId warning. No independent runtime verification.
## Full-package update
Replace complete installed product using a signed full installer, including Ribbon, COM registration, DLLs, UI, updater itself, API and data engines. No arbitrary remote code or unsigned DLL loading. Separate installed privileged helper, explicit UAC consent, verify pinned RSA signature and SHA256 in protected staging, reject downgrade except explicit verified rollback, check all Project processes and never force-close unsaved work. Preserve user settings and MPP files; retain verified prior package and test recovery including COM registration. Restart Project manually after installation. No production publication until end-to-end tests pass.
## Read coverage
Use Project COM object model under current user's existing permissions; no permission bypass. Inventory task/resource/assignment/project built-ins and custom fields, baselines 0–10, calendars and exceptions, dependencies, constraints, outline codes, lookup tables, formulas, timephased work/cost, EVM, enterprise fields where available. Preserve typed values and formatted values, stable identifiers, unsupported/read-error distinctions, and coverage report. Do not promise access to every UI or server-only feature. Explicit consent before sharing; no automatic writeback or public repository upload.
## Release gates
1. Provision offline release key; only public key in source.
2. Implement and test privileged full installer handoff, rollback, updater self-upgrade.
3. Standardize BUILD-EXE.cmd and trusted Windows CI build; verify licensed dependencies and Inno commercial-use terms.
4. Validate extraction parity on disposable MPP, large projects, custom fields, connection regression.
5. Build 1.7.1, sign and verify package, test update from bootstrap build and a subsequent test version; validate failure paths.
6. Publish verified assets and synchronize shared About metadata. Do not label source target as published.
This document records requirements only; no new executable implementation or release. Rollback: revert this document and target metadata edits.
