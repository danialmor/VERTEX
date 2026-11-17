# VERTEX Policy (generated from shared/policy.json — do not edit here)

Updated: 2026-11-17 · Owner: Danial (sole system administrator)

## brand
- One brand root: shared/brand.js. Name, colors, platform list and marks come only from there.
- Platform names follow the landing image: 'I — Project Control' … 'XII — Trading'.
- Each platform mark = inverted VERTEX triangle in the platform color with its Roman numeral inside (BRAND.mark(slug)).

## admin
- The User Control Panel is the admin's single view: 'Logo & Policy', 'Whole Site', and one tab per platform.
- Every platform change must also be recorded in its panel tab (version, changelog, how it is built, rules, needs).
- When this policy changes, the panel tab changes with it (it reads this file).

## docs
- Each platform keeps its own AI-readable notes in English: <platform>/PLATFORM.md (purpose, structure, rules, decisions).
- Versions/changelog are extracted automatically into <platform>/platform.json by tools/platform_meta.js.
- Repo-wide rules: AGENTS.md, docs/THEME-RULES.md, docs/DECISIONS.md.

## data
- Test data may live in the public repo until the private server exists (owner decision).
- Never commit secrets or tokens; the GitHub token stays only in the browser.

## ui
- One standard box design everywhere (THEME-RULES §0).
- Height/scroll rules (THEME-RULES §6): page locked on wide screens, only #stage scrolls.
- Persian UI, RTL; replies to owner in Persian, short and step by step.
