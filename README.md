# REIN (Regulated Execution and Inference Navigation)

REIN is a small Codex harness for stricter, more explicit engineering workflow.

It adds:
- `REIN.md` for regulated execution and inference guidance
- `VERIFY.md` as a matched neutral control
- packaged Codex skills for clarification, inspection, cleanup, triage, verification, and retrospection
- `.rein/` as the repo-local artifact root for REIN-generated outputs

## Install

```bash
npm install -g @jstxn/rein
rein init
```

Interactive install lets you target:
- the current repository
- another repository
- your user-level Codex setup

Non-interactive examples:

```bash
rein init --repo
rein init --repo /path/to/repo
rein init --user
```

Other commands:

```bash
rein status              # show what's installed and whether it's outdated
rein update              # re-install REIN surfaces, replacing existing files
rein remove              # uninstall REIN from the repo (interactive)
rein remove --yes        # uninstall without prompts (preserves .rein/ artifacts)
```

## What `rein init` adds

For a repo install, REIN adds:
- `REIN.md`
- `VERIFY.md`
- `.codex/skills/` with:
  - `rein-interview`
  - `rein-inspect`
  - `rein-cleanup`
  - `rein-triage`
  - `rein-plan`
  - `rein-scope`
  - `rein-diff-review`
  - `rein-verify`
  - `rein-retro`
- `.rein/`
- `.rein/codebase/`
- `AGENTS.md` guidance if missing, or a REIN block appended if not present

## How to use it

Typical workflow:

1. Run `rein init` in the repo you want to use with Codex.
2. Start a new Codex session in that repo.
3. Let `AGENTS.md` route work through `REIN.md`.
4. Use:
   - `rein-interview` for vague or underspecified work
   - `rein-inspect` for a durable repo map
   - `rein-triage` before ambiguous or multi-file changes
   - `rein-plan` to break complex work into sequenced steps with checkpoints
   - `rein-scope` when requirements are too large, conflicting, or need negotiation
   - `rein-diff-review` to self-review your diff before committing
   - `rein-cleanup` for cleanup/refactor work after behavior is locked
   - `rein-verify` before declaring completion
   - `rein-retro` after misses or suspicious shortcuts

## Notes

- Current REIN is Codex-focused.
- REIN is a workflow harness, not a benchmark or proof of superiority.

## License

MIT
