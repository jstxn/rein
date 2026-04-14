# Installer And CLI

## What This Area Does
- Packages the harness as a small Node CLI and installs its repo-local assets into another repository or the user-level Codex area.

## Key Paths
- `package.json`
- `bin/rein.js`
- `lib/cli.js`
- `scripts/install_codex_harness.sh`

## How It Works
- `package.json` publishes a single CLI command, `rein`, that points to `bin/rein.js`.
- `bin/rein.js` is only a thin entrypoint that calls `main()` from `lib/cli.js` and exits nonzero on error.
- `lib/cli.js` holds the real installer behavior:
  - tracks the list of repo skills to copy
  - copies protocol docs into the destination
  - copies `.codex/skills/` and `.codex/hooks/` assets
  - preserves existing files unless `--force` is used
  - writes merge notes when an existing hooks config is present
  - appends REIN guidance to an existing `AGENTS.md` instead of replacing it
  - supports repo install and user-level install modes
- `scripts/install_codex_harness.sh` is a legacy Bash wrapper that forwards to `node bin/rein.js init --repo ...`.

## Patterns And Conventions
- The installer uses straightforward file-copy logic rather than scaffolding through templates or generated manifests.
- Existing user files are treated cautiously: the default posture is skip-or-append, not overwrite.
- The installer carries a hard-coded skill inventory through `REPO_SKILLS`.
- Installer messaging assumes the user will review copied docs and then run the local eval scripts manually.

## Dependencies And Touchpoints
- `package.json` requires Node `>=18`.
- `lib/cli.js` depends on the repository layout staying stable because it copies files by known relative paths from `REPO_ROOT`.
- The CLI depends on `.codex/skills/`, `.codex/hooks/`, `REIN.md`, `VERIFY.md`, and `rein-evals/` being present in the source repo.
- The installer writes repo guidance into `AGENTS.md` and merge notes into `.codex/rein-install/` in target repos.

## Findings
- Observed: The installer copies `deep-interview`, `deep-inspect`, `ai-slop-cleaner`, `rein-triage`, `rein-verify`, and `rein-retro` via a hard-coded `REPO_SKILLS` array.
- Observed: The Bash wrapper is explicitly marked as a legacy wrapper around `rein init --repo`.
- Observed: If a destination already has `.codex/hooks.json`, the installer does not merge automatically; it copies a merge snippet into an install-notes directory instead.
- Observed: The CLI copies the hook scripts even though the source repo’s current `.codex/hooks.json` is empty.
- Inferred risk: Because the installer’s file inventory is hard-coded across code and documentation, adding or renaming a skill requires touching multiple surfaces to keep the shipped package and docs aligned.
- Inferred risk: Shipping hook scripts alongside an empty hooks config means the package can contain behavior code that is inert until some later configuration step populates the hooks table.
