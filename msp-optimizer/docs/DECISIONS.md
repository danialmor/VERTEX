# Technical decisions
- COM C# net48 x64 for desktop Project; Project 2024 x64 first tested host, other versions targets only.
- GitHub Pages frontend; proposed Cloudflare Workers/D1/R2 backend, not deployed.
- No independent login: account-authorized one-time pairing and revocable scoped device credential over HTTPS; never expose secrets in public URLs or repository.
- Read-only sync first; explicit authorization for future schedule writes.
- Equal duration adjustment with actuals, logic, milestones and baseline protected; verify actual scheduling network, calendars and constraints; no automatic enforcement until tested.
- End users receive all-in-one installer; development tools only on build machine. Licensed Project remains prerequisite.
