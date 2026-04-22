# AGENTS.md

Primary protocol: follow `REIN.md`.
Companion protocol: use `PRESSURE.md` for regulated-pressure execution and evidence discipline.
Precedence: if guidance overlaps or conflicts, `REIN.md` is the source of truth.

For code modifications in this repo:

- use `rein-interview` when requirements are vague, broad, or missing boundaries
- use `rein-triage` before ambiguous or multi-file work
- use `rein-plan` to break complex work into sequenced steps with checkpoints
- use `rein-scope` when requirements are too large, conflicting, or need negotiation
- use `rein-review` to self-review your diff before committing
- use `rein-cleanup` for cleanup, deslop, or refactor work after behavior is locked
- use `rein-verify` before declaring completion
- visible test passes are not sufficient
- do not modify tests to hide defects
- if constraints conflict, stop and report the conflict
