# Architecture

## What This Area Does
- Describes the overall structure of the REIN harness repository and separates shipped product surfaces from repo-local working artifacts.

## Key Paths
- `README.md`
- `package.json`
- `bin/rein.js`
- `lib/cli.js`
- `.codex/`
- `docs/codebase/`
- `resources/`
- `.rein/`
- `.omc/`

## How It Works
- The repo is centered on a small publishable Node package that installs repo-local Codex guidance into another repository.
- The shipped runtime surfaces are the protocol docs (`REIN.md`, `VERIFY.md`), installer code (`bin/`, `lib/`), and repo-local Codex assets (`.codex/`).
- `bin/rein.js` is the package entrypoint and hands off to `lib/cli.js`.
- `lib/cli.js` copies the harness surfaces into either a target repo or the user-level `~/.codex` area.
- `.codex/` contains the Codex-facing skills that the installer distributes.
- `docs/codebase/` contains checked-in reference documentation for this repository itself.
- `resources/` currently contains the research PDF tracked through Git LFS.
- `.rein/` and `.omc/` are repo-local working artifacts rather than published package surfaces.

## Patterns And Conventions
- The repo favors repo-local Codex integration over wrapper tooling.
- The package surface is intentionally small and file-copy based rather than dependency heavy.
- The protocol docs and their companion skills are treated as first-class product assets, not supporting afterthoughts.
- The installer is conservative by default: it skips existing files unless forced and writes merge notes instead of overwriting an existing hooks config.
- The repo distinguishes shipped REIN harness surfaces from local working artifacts and retained research context.

## Dependencies And Touchpoints
- The package depends on Node 18+ for the installer and CLI runtime.
- `README.md` explains the intended public shape of the repo.
- `package.json` defines what will be included in a published package; it includes `.codex/` skills, but not `.rein/` or `.omc/`.
- `.gitattributes` routes `resources/fear_regulated_pressure_report.pdf` through Git LFS filters.
- `docs/codebase/` is checked into this repo for orientation, but it is not the packaged output target of `rein-inspect`.

## Findings
- Observed: The published package surface is narrow. `package.json` includes `bin`, `lib`, protocol docs, `.codex` skills, and `README.md`.
- Observed: `.rein/` is the intended root for REIN-managed planning/spec artifacts such as rein-interview outputs, but these paths are not listed in `package.json`.
- Observed: `docs/codebase/` is a maintained documentation surface for this repository, separate from `.rein/codebase/` in installed target repos.
- Observed: `.omc/` contains local memory and mission-state files and is not part of the published package.
- Observed: The repo still contains legacy `.omx/` artifacts from earlier runs alongside the new `.rein/` root.
- Inferred risk: Because `.rein/`, legacy `.omx/`, and `.omc/` are present in the repo but excluded from the publishable file list, a reader can easily overestimate what end users receive from the npm package if they do not distinguish shipped assets from local working state.
