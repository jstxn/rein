# Installer And CLI

## What This Area Does
- Packages the harness as a small Node CLI that installs, updates, inspects, and removes repo-local Codex assets.

## Key Paths
- `package.json`
- `bin/rein.js`
- `lib/cli.js`

## How It Works
- `package.json` publishes a single CLI command, `rein`, that points to `bin/rein.js`.
- `bin/rein.js` is only a thin entrypoint that calls `main()` from `lib/cli.js` and exits nonzero on error.
- `lib/cli.js` holds the CLI behavior across four commands:
  - `init` — copies protocol docs, skills, and AGENTS.md guidance into a target repo or user-level `~/.codex` area. Preserves existing files unless `--force` is used.
  - `status` — reports installed version, present/missing surfaces, and skill inventory.
  - `update` — re-installs all REIN surfaces with force, replacing existing files.
  - `remove` — removes REIN.md, all REIN skills, install notes, and the REIN block from AGENTS.md/CLAUDE.md. Preserves `.rein/` since it may contain work artifacts.
- The `rein index` command family builds, queries, and status-checks a local evidence vector index under `.rein/index/`.
- `rein index` is intentionally rebuildable: protocol docs, skills, codebase maps, interview/spec artifacts, and go-stage artifacts remain the source of truth.
- AGENTS.md handling is idempotent: if a REIN block (delimited by HTML comment markers) already exists, it is replaced in place rather than duplicated.
- Install notes include the installed version for drift detection by `status`.

## Patterns And Conventions
- The installer uses straightforward file-copy logic rather than scaffolding through templates or generated manifests.
- Existing user files are treated cautiously: the default posture is skip-or-append, not overwrite.
- The installer carries a hard-coded skill inventory through `REPO_SKILLS`.
- Version is read from `package.json` and stamped into `.codex/rein-install/installed-from.txt`.
- The evidence index is dependency-free and stores chunk metadata plus contiguous Float32 vectors locally.

## Dependencies And Touchpoints
- `package.json` requires Node `>=18`.
- `lib/cli.js` depends on the repository layout staying stable because it copies files by known relative paths from `REPO_ROOT`.
- `lib/core/evidence-index.js` depends on Node core modules only and writes `.rein/index/manifest.json`, `chunks.jsonl`, and `vectors.f32`.
- The CLI depends on `.codex/skills/`, `.claude/commands/`, and `REIN.md` being present in the source repo.
- The installer writes repo guidance into `AGENTS.md` and install notes into `.codex/rein-install/` in target repos.

## Findings
- Observed: The installer copies all skills in the `REPO_SKILLS` array via hard-coded names.
- Observed: `rein update` is a convenience alias for `init --force` with auto-detected repo path.
- Observed: `rein eject` preserves `.rein/` to avoid deleting user work artifacts.
- Observed: `rein index query` filters stale sources before returning results, so changed artifacts are not served as active evidence until rebuild.
- Inferred risk: Because the installer's file inventory is hard-coded across code and documentation, adding or renaming a skill requires touching multiple surfaces to keep the shipped package and docs aligned.
