<p align="center">
   <img src="https://i.ibb.co/tTg9bJgh/rein-no-star.png" alt="rein-no-star" border="0">
</p>

# REIN (Regulated Execution and Inference Navigation)

REIN is a **lightweight** and **hands-off** harness for stricter, more explicit engineering workflow with Codex, Claude Code, and Cursor.

It adds:
- `REIN.md` for regulated execution and inference guidance
- packaged skills for clarification, inspection, cleanup, triage, verification, and retrospection
- `.rein/` as the repo-local artifact root for REIN-generated outputs

> [!NOTE]
> New in REIN: `rein go` is the runtime-backed end-to-end flow. It starts the same user-facing interview that `rein-interview` uses, then carries the task through planning, implementation, cleanup, review, and verification with durable state under `.rein/`.

## New: `rein go`

If you want one REIN-controlled workflow instead of manually invoking each stage, start here:

```bash
rein go "add a CSV export for invoices"
```

You can then inspect or continue the flow with:

```bash
rein go status --slug <slug> --json
rein go resume --slug <slug> --json
```

If you are using Codex or Claude Code, the same flow can be exposed through wrapper entrypoints like `$rein-go` and `/rein-go`.

What `rein go` gives you:

- the normal user-facing REIN interview, including the clarity score and interview question flow
- durable runtime state for the full task under `.rein/`
- a runtime-backed path from interview -> plan -> implementation -> cleanup -> review -> verify
- `rein go status`, `rein go resume`, and `rein go advance` for inspecting or continuing the flow
- the option to start from an already-completed interview bundle with `--from-interview`

## Install

```bash
npm install -g @jstxn/rein
rein init
```

Interactive install lets you choose:
- which tool to target (Codex, Claude Code, Cursor, or all)
- the current repository, another repository, or your user-level setup

Non-interactive examples:

```bash
rein init --repo                        # default (Codex)
rein init --repo --claude               # Claude Code only
rein init --repo --cursor               # Cursor only
rein init --repo --codex --claude       # both
rein init --repo --codex --claude --cursor  # all
rein init --repo --link                 # advanced: symlink packaged assets instead of copying
rein init --repo /path/to/repo --claude
rein init --user --claude
```

Core flow commands:

```bash
rein go "..."          # start the runtime-backed REIN go flow from a fresh task
rein go --from-interview <slug|path> --json
rein go status --slug <slug> --json
rein go resume --slug <slug> --json
rein go advance --slug <slug> --stage <stage> --status <status> --json
```

Direct stage/runtime commands:

```bash
rein status              # show what's installed and whether it's outdated
rein update              # re-install REIN surfaces, replacing existing files
rein remove              # uninstall REIN from the repo (interactive)
rein remove --yes        # uninstall without prompts (preserves .rein/ artifacts)
rein interview init --idea "..."             # start a durable interview
rein interview status --slug my-topic        # inspect live interview state
rein interview resume --slug my-topic        # resume a saved interview
rein interview crystallize --slug my-topic --summary '{"intent":"...","desiredOutcome":"..."}'
```

The `--codex`, `--claude`, and `--cursor` flags work with `status`, `update`, and `remove` too. Without flags, these commands auto-detect which tools are installed.

`rein init --link` and `rein update --link` are advanced options for users who want linked installs. Linked installs update from one source checkout, but they depend on that source path continuing to exist.

## What `rein init` adds

| Surface | Codex (`--codex`, default) | Claude Code (`--claude`) | Cursor (`--cursor`) |
|---|---|---|---|
| Protocol doc | `REIN.md` | `REIN.md` | `REIN.md` |
| Artifact root | `.rein/`, `.rein/codebase/` | `.rein/`, `.rein/codebase/` | `.rein/`, `.rein/codebase/` |
| Skills | `.codex/skills/` | `.claude/commands/` | `.cursor/rules/` |
| Guidance block | `AGENTS.md` | `CLAUDE.md` | `AGENTS.md` |

All targets install the same 10 skills:

- `rein-go`
- `rein-interview`
- `rein-inspect`
- `rein-triage`
- `rein-plan`
- `rein-scope`
- `rein-review`
- `rein-cleanup`
- `rein-verify`
- `rein-retro`

By default, `rein init` copies these surfaces into the target. With `--link`, REIN symlinks the packaged docs and skills instead, while still writing repo- or user-specific guidance files normally.

## How to use it

Typical workflow:

1. Run `rein init` in the repo you want to use.
2. Start a new Codex, Claude Code, or Cursor session in that repo.
3. Let `AGENTS.md` / `CLAUDE.md` route work through `REIN.md`.
4. Use:
   - `rein-go` when you want REIN to carry one task through the full runtime-backed flow
   - `rein-interview` when you want the clarification stage by itself
   - `rein-inspect` for a durable repo map
   - `rein-triage` before ambiguous or multi-file changes
   - `rein-plan` to break complex work into sequenced steps with checkpoints
   - `rein-scope` when requirements are too large, conflicting, or need negotiation
   - `rein-review` to self-review your diff before committing
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
