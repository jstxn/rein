# Protocols

## What This Area Does
- Defines the behavior contract the harness wants an agent to follow while working inside an installed repository.

## Key Paths
- `REIN.md`
- `AGENTS.md`
- `README.md`

## How It Works
- `REIN.md` is the regulated execution and inference protocol. It defines the operating posture, rules, anti-patterns, companion skills, and verification expectations for AI coding agents.
- `AGENTS.md` routes work in this repo through `REIN.md` and explicitly calls out when to use `rein-interview`, `rein-triage`, `rein-cleanup`, and `rein-verify`.
- `README.md` explains REIN's purpose, install methods, and available skills.

## Patterns And Conventions
- The repo treats behavioral guidance as product, not just documentation.
- The protocol consistently emphasizes anti-reward-hacking behavior, visible uncertainty, and evidence-backed completion.
- `AGENTS.md` acts as the repo-local routing layer that turns the protocol docs into day-to-day operating instructions.

## Dependencies And Touchpoints
- The installer copies `REIN.md` and AGENTS/CLAUDE guidance into target repos.
- The skills are named directly inside `REIN.md` and `AGENTS.md`, so protocol language and skill inventory are coupled.

## Findings
- Observed: The protocol strongly forbids mutating tests or evaluators to hide defects and requires a final evidence report.
- Observed: `REIN.md` now calls out `rein-inspect` alongside the other packaged companion skills.
- Inferred risk: Because the protocol docs and AGENTS routing are manual text surfaces rather than generated from one central source, the named skill inventory can drift from the actual installed skill set over time.
