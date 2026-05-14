<p align="center">
   <img src="https://i.ibb.co/tTg9bJgh/rein-no-star.png" alt="rein-no-star" border="0">
</p>

# REIN (Regulated Execution and Inference Navigation)

REIN is a **lightweight** and **hands-off** harness for stricter, more explicit engineering workflow with Codex, Claude Code, and Gemini CLI.

It adds:
- `REIN.md` for regulated execution and inference guidance
- packaged skills for clarification, inspection, cleanup, triage, verification, and retrospection
- `.rein/` as the repo-local artifact root for REIN-generated outputs

## Install

```bash
npm install -g @jstxn/rein
rein init
```

Interactive install lets you choose:
- which tool to target (Codex, Claude Code, Gemini CLI, or all)
- the current repository, another repository, or your user-level setup

Non-interactive examples:

```bash
rein init --repo                        # default (Codex)
rein init --repo --claude               # Claude Code only
rein init --repo --gemini               # Gemini CLI only
rein init --repo --codex --claude --gemini # all
rein init --repo --link                 # advanced: symlink packaged assets instead of copying
rein init --repo /path/to/repo --claude
rein init --user --gemini
```

Other commands:

```bash
rein status              # show what's installed and whether it's outdated
rein update              # re-install REIN surfaces, replacing existing files
rein remove              # uninstall REIN from the repo (interactive)
rein remove --yes        # uninstall without prompts (preserves .rein/ artifacts)
```

The `--codex`, `--claude`, and `--gemini` flags work with `status`, `update`, and `remove` too. Without flags, these commands auto-detect which tools are installed.

`rein init --link` and `rein update --link` are advanced options for users who want linked installs. Linked installs update from one source checkout, but they depend on that source path continuing to exist.

## Gemini CLI usage options

REIN supports Gemini CLI in two different ways, depending on whether you want a
repo-managed install or a Gemini-managed extension install.

### Option 1: `rein init --gemini`

Use this when you want REIN installed into a specific repository or into your
user-level Gemini setup with the same lifecycle as Codex and Claude Code.

```bash
# Current repository
rein init --repo --gemini

# Another repository
rein init --repo /path/to/repo --gemini

# User-level Gemini setup
rein init --user --gemini
```

This writes Gemini-native REIN surfaces:

```text
.gemini/skills/<workflow>/SKILL.md
GEMINI.md
.gemini/rein-install/installed-from.txt
```

Use this path when you want `rein status`, `rein update`, and `rein remove` to
manage the Gemini install.

### Option 2: Gemini extension install

Use this when you want Gemini CLI to manage REIN as an extension. This is the
most native Gemini CLI experience: the extension is named `rein`, and Gemini
shows workflows as extension-scoped skills such as `rein:verify`,
`rein:triage`, and `rein:cleanup`.

```bash
gemini extensions install https://github.com/jstxn/rein
```

For local development or testing an unpublished checkout:

```bash
gemini extensions install /path/to/rein
# or link the checkout so changes are picked up without reinstalling
gemini extensions link /path/to/rein
```

Gemini extension management commands run from your terminal, not from inside an
interactive Gemini CLI session. Restart Gemini CLI after installing, updating,
or linking an extension so the new skills are loaded.

Use this path when you want a Gemini-managed extension instead of repo-local
files written by `rein init`. Gemini copies installed extensions, so run
`gemini extensions update rein` when you want to pull in changes from the
source.

## What `rein init` adds

| Surface | Codex (`--codex`, default) | Claude Code (`--claude`) | Gemini CLI (`--gemini`) |
|---|---|---|---|
| Protocol doc | `REIN.md` | `REIN.md` | `REIN.md` |
| Artifact root | `.rein/`, `.rein/codebase/` | `.rein/`, `.rein/codebase/` | `.rein/`, `.rein/codebase/` |
| Skills | `.codex/skills/` | `.claude/commands/` | `.gemini/skills/` |
| Guidance block | `AGENTS.md` | `CLAUDE.md` | `GEMINI.md` |

All targets install the same 9 REIN workflows. Codex and Claude Code keep the
`rein-*` names shown below; Gemini CLI installs the same workflows without the
redundant `rein-` skill prefix. Workspace installs show names like `verify`,
and the Gemini extension namespace shows names like `rein:verify`,
`rein:triage`, and `rein:cleanup`.

- `rein-interview`
- `rein-inspect`
- `rein-triage`
- `rein-plan`
- `rein-scope`
- `rein-diff-review`
- `rein-cleanup`
- `rein-verify`
- `rein-retro`

By default, `rein init` copies these surfaces into the target. With `--link`, REIN symlinks the packaged docs and skills instead, while still writing repo- or user-specific guidance files normally.

## How to use it

Typical workflow:

1. Run `rein init` in the repo you want to use.
2. Start a new Codex, Claude Code, or Gemini CLI session in that repo.
3. Let `AGENTS.md` / `CLAUDE.md` / `GEMINI.md` route work through `REIN.md`.
4. Use the REIN workflow skills (`verify`, `triage`, etc. in Gemini CLI;
   `rein-verify`, `rein-triage`, etc. in Codex and Claude Code):
   - `rein-interview` for vague or underspecified work
   - `rein-inspect` for a durable repo map
   - `rein-triage` before ambiguous or multi-file changes
   - `rein-plan` to break complex work into sequenced steps with checkpoints
   - `rein-scope` when requirements are too large, conflicting, or need negotiation
   - `rein-diff-review` to self-review your diff before committing
   - `rein-cleanup` for cleanup/refactor work after behavior is locked
   - `rein-verify` before declaring completion
   - `rein-retro` after misses or suspicious shortcuts

## Inspiration

- [Fear-Regulated Pressure and Verification-First Prompting](resources/fear_regulated_pressure_report.pdf) -- the research paper behind REIN's protocol design
- [andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills) -- concise behavioral guidelines derived from Andrej Karpathy's observations on LLM coding pitfalls

## Notes

- REIN is a workflow harness, not a benchmark or proof of superiority.

## License

MIT
