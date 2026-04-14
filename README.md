# REIN

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

## What `rein init` adds

For a repo install, REIN adds:
- `REIN.md`
- `VERIFY.md`
- `.codex/skills/` with:
  - `deep-interview`
  - `deep-inspect`
  - `ai-slop-cleaner`
  - `rein-triage`
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
   - `deep-interview` for vague or underspecified work
   - `deep-inspect` for a durable repo map
   - `rein-triage` before ambiguous or multi-file changes
   - `ai-slop-cleaner` for cleanup/refactor work after behavior is locked
   - `rein-verify` before declaring completion
   - `rein-retro` after misses or suspicious shortcuts

## Local development

If you are working from this repo directly:

```bash
node bin/rein.js init --repo . --force
```

`rein init` installs only from REIN's own bundled package assets. It does not read REIN files from `~/.codex` or any other external repo path.

## Notes

- Current REIN is Codex-focused.
- REIN is a workflow harness, not a benchmark or proof of superiority.
- The eval layer in `rein-evals/` is directional local evidence, not scientific proof.

## License

MIT
