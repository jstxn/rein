# Protocols

## What This Area Does
- Defines the behavior contract the harness wants an agent to follow while working inside an installed repository.

## Key Paths
- `REIN.md`
- `VERIFY.md`
- `AGENTS.md`
- `README.md`

## How It Works
- `REIN.md` is the regulated execution and inference profile. It frames the work as strict, calm, explicit, and anti-shortcut.
- `VERIFY.md` is the matched neutral control. It keeps the same procedural contract while removing the regulated-pressure framing.
- Both docs share the same staged workflow: read relevant files, verify assumptions, define success and cheating boundaries, run verification, and emit an evidence report.
- `AGENTS.md` routes work in this repo through `REIN.md` and explicitly calls out when to use `rein-interview`, `rein-triage`, `rein-cleanup`, and `rein-verify`.
- `README.md` positions REIN and VERIFY as procedurally matched surfaces whose main difference is motivational framing.

## Patterns And Conventions
- The repo treats behavioral guidance as product, not just documentation.
- The procedural contract is repeated across REIN and VERIFY so comparisons stay focused on framing rather than workflow drift.
- The protocols consistently emphasize anti-reward-hacking behavior, visible uncertainty, and evidence-backed completion.
- `AGENTS.md` acts as the repo-local routing layer that turns the protocol docs into day-to-day operating instructions.

## Dependencies And Touchpoints
- The installer copies `REIN.md`, `VERIFY.md`, and AGENTS guidance into target repos.
- The skills are named directly inside `REIN.md` and `AGENTS.md`, so protocol language and skill inventory are coupled.

## Findings
- Observed: `REIN.md` and `VERIFY.md` explicitly share the same procedural contract and differ mainly in framing.
- Observed: `AGENTS.md` currently routes this repo through `REIN.md`, not `VERIFY.md`.
- Observed: The protocol docs strongly forbid mutating tests or evaluators to hide defects and require a final evidence report.
- Observed: `REIN.md` now calls out `rein-inspect` alongside the other packaged companion skills.
- Inferred risk: Because the protocol docs and AGENTS routing are manual text surfaces rather than generated from one central source, the named skill inventory can drift from the actual installed skill set over time.
