# Installer And CLI

## What This Area Does
- Packages the harness as a small Node CLI that installs, updates, inspects, and removes repo-local Codex, Claude Code, and Gemini CLI assets.

## Key Paths
- `package.json`
- `bin/rein.js`
- `lib/cli.js`

## How It Works
- `package.json` publishes a single CLI command, `rein`, that points to `bin/rein.js`.
- `bin/rein.js` is only a thin entrypoint that calls `main()` from `lib/cli.js` and exits nonzero on error.
- `lib/cli.js` holds the CLI behavior across four commands:
  - `init` — copies protocol docs, skills, and tool-specific guidance into a target repo or user-level tool area. Preserves existing files unless `--force` is used.
  - `status` — reports installed version, present/missing surfaces, and skill inventory.
  - `update` — re-installs all REIN surfaces with force, replacing existing files.
  - `remove` — removes REIN.md, all REIN skills, install notes, and the REIN block from `AGENTS.md`, `CLAUDE.md`, or `GEMINI.md`. Preserves `.rein/` since it may contain work artifacts.
- AGENTS.md handling is idempotent: if a REIN block (delimited by HTML comment markers) already exists, it is replaced in place rather than duplicated.
- Install notes include the installed version for drift detection by `status`.

## Patterns And Conventions
- The installer uses straightforward file-copy logic rather than scaffolding through templates or generated manifests.
- Existing user files are treated cautiously: the default posture is skip-or-append, not overwrite.
- The installer carries a hard-coded skill inventory through `REPO_SKILLS` and maps that canonical `rein-*` inventory to Gemini's shorter skill names at the Gemini boundary.
- Version is read from `package.json` and stamped into each selected tool's `rein-install/installed-from.txt`.

## Dependencies And Touchpoints
- `package.json` requires Node `>=18`.
- `lib/cli.js` depends on the repository layout staying stable because it copies files by known relative paths from `REPO_ROOT`.
- The CLI depends on `.codex/skills/`, `.claude/commands/`, `.gemini/skills/`, and `REIN.md` being present in the source repo. Gemini skill paths intentionally omit `rein-` while Codex and Claude paths keep it.
- The installer writes repo guidance into `AGENTS.md`, `CLAUDE.md`, or `GEMINI.md` and install notes into the selected tool's `rein-install/` directory.

## Findings
- Observed: The installer copies all skills in the `REPO_SKILLS` array via hard-coded names.
- Observed: `rein update` is a convenience alias for `init --force` with auto-detected repo path.
- Observed: `rein eject` preserves `.rein/` to avoid deleting user work artifacts.
- Inferred risk: Because the installer's file inventory is hard-coded across code and documentation, adding or renaming a skill requires touching multiple surfaces to keep the shipped package and docs aligned.
