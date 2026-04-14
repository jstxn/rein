# Skills

## What This Area Does
- Defines the repo-local Codex skills that the harness expects agents to use for clarification, inspection, triage, cleanup, verification, and retrospection.

## Key Paths
- `.codex/skills/deep-interview/SKILL.md`
- `.codex/skills/deep-inspect/SKILL.md`
- `.codex/skills/rein-triage/SKILL.md`
- `.codex/skills/rein-verify/SKILL.md`
- `.codex/skills/rein-retro/SKILL.md`
- `.codex/skills/ai-slop-cleaner/SKILL.md`

## How It Works
- `deep-interview` is an intent-first clarification workflow that writes `.rein/` artifacts before implementation.
- `deep-inspect` is a documentation-first reconnaissance workflow that writes and maintains `.rein/codebase/`.
- `rein-triage` is a short pre-edit orientation step for ambiguous or multi-file work.
- `rein-verify` is the end-of-task evidence and verification pass.
- `rein-retro` captures misses and protocol improvements after a failure or suspicious shortcut.
- `ai-slop-cleaner` is the cleanup/refactor workflow with regression-tests-first discipline.
- These skills are treated as companions to `REIN.md` rather than generic standalone utilities.

## Patterns And Conventions
- Skills are plain `SKILL.md` files with short frontmatter plus a structured body.
- The skill set is workflow-oriented rather than domain-oriented; each one corresponds to a stage in how the harness expects work to happen.
- `deep-interview` and `deep-inspect` are broader orchestration skills, while `rein-triage`, `rein-verify`, and `rein-retro` are narrowly scoped procedural checkpoints.
- `ai-slop-cleaner` is the most prescriptive skill and includes explicit pass ordering, quality gates, and output format.

## Dependencies And Touchpoints
- The skill inventory is referenced in `REIN.md`, `AGENTS.md`, `README.md`, and `lib/cli.js`.
- `deep-interview` writes artifacts into `.rein/context/`, `.rein/interviews/`, and `.rein/specs/`.
- `deep-inspect` writes artifacts into `.rein/codebase/`.
- This repo's checked-in documentation under `docs/codebase/` is separate from packaged skill output and exists as repository reference material.

## Findings
- Observed: The active repo-local skill files are `deep-interview`, `deep-inspect`, `rein-triage`, `rein-verify`, `rein-retro`, and `ai-slop-cleaner`.
- Observed: `REIN.md`, `README.md`, and the installer now name `deep-inspect` alongside the other packaged skills.
- Observed: `deep-interview` is the most artifact-heavy skill and persists state in `.rein/`.
- Observed: `deep-inspect` is the only current packaged skill that explicitly generates maintained docs under `.rein/codebase/`.
- Observed: `docs/codebase/` remains this repository's own checked-in documentation tree rather than the packaged output path for `deep-inspect`.
- Inferred risk: Because the skill inventory is distributed across multiple text surfaces, newer skills can be partially integrated before every protocol and guidance surface reflects them.
- Inferred risk: Skill behavior is described in several places at once (`README.md`, `REIN.md`, `AGENTS.md`, and `lib/cli.js`), so wording drift can accumulate even when the underlying skill files stay coherent.
