<p align="center">
   <img src="https://i.ibb.co/tTg9bJgh/rein-no-star.png" alt="rein-no-star" border="0">
</p>

# REIN (Regulated Execution and Inference Navigation)

REIN is a **lightweight** and **hands-off** harness for stricter, more explicit engineering workflow with Codex and Claude Code.

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
- which tool to target (Codex, Claude Code, or both)
- the current repository, another repository, or your user-level setup

Non-interactive examples:

```bash
rein init --repo                        # default (Codex)
rein init --repo --claude               # Claude Code only
rein init --repo --codex --claude       # both
rein init --repo --link                 # advanced: symlink packaged assets instead of copying
rein init --repo /path/to/repo --claude
rein init --user --claude
```

Other commands:

```bash
rein status              # show what's installed and whether it's outdated
rein update              # re-install REIN surfaces, replacing existing files
rein remove              # uninstall REIN from the repo (interactive)
rein remove --yes        # uninstall without prompts (preserves .rein/ artifacts)
```

The `--codex` and `--claude` flags work with `status`, `update`, and `remove` too. Without flags, these commands auto-detect which tools are installed.

`rein init --link` and `rein update --link` are advanced options for users who want linked installs. Linked installs update from one source checkout, but they depend on that source path continuing to exist.

## What `rein init` adds

Shared surfaces (always installed):
- `REIN.md`
- `.rein/` and `.rein/codebase/`

Codex surfaces (`--codex`, default):
- `.codex/skills/` with: `rein-interview`, `rein-inspect`, `rein-cleanup`, `rein-triage`, `rein-plan`, `rein-scope`, `rein-diff-review`, `rein-verify`, `rein-retro`
- `AGENTS.md` guidance block

Claude Code surfaces (`--claude`):
- `.claude/commands/` with the same 9 skills as slash commands
- `CLAUDE.md` guidance block

By default, `rein init` copies these surfaces into the target. With `--link`, REIN symlinks the packaged docs and skills instead, while still writing repo- or user-specific guidance files normally.

## How to use it

Typical workflow:

1. Run `rein init` in the repo you want to use.
2. Start a new Codex or Claude Code session in that repo.
3. Let `AGENTS.md` / `CLAUDE.md` route work through `REIN.md`.
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

## Inspiration

- [Fear-Regulated Pressure and Verification-First Prompting](resources/fear_regulated_pressure_report.pdf) -- the research paper behind REIN's protocol design
- [andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills) -- concise behavioral guidelines derived from Andrej Karpathy's observations on LLM coding pitfalls

## Notes

- REIN is a workflow harness, not a benchmark or proof of superiority.

## License

MIT
