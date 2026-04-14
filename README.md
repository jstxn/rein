# REIN Harness

Codex-first harness for research-informed emotional-stimuli experiments in coding workflows.

This repo is no longer just a prompt file. It is a small harness that packages:

- `REIN.md`: regulated execution and inference protocol
- `VERIFY.md`: neutral matched control
- Codex-local skills for deep interviewing, codebase inspection, triage, verification, retrospectives, and anti-slop cleanup
- optional Codex hook scaffolding for future REIN experiments
- a tiny eval layer with bounded, local scoring

## What v1 is

REIN Harness v1 is a Codex-only augmentation layer for people who want:

- more visible agent diligence
- better uncertainty disclosure
- stronger anti-reward-hacking behavior
- a simple way to compare pressure framing against a neutral control

## What v1 is not

v1 is not:

- Claude Code support
- a dashboard or analytics UI
- a benchmark platform
- proof that REIN is always better than neutral prompting

## Install

Canonical install path:

```bash
npm install -g @jstxn/rein
rein init
```

`rein init` opens an interactive installer with options for:

- this repository
- another repository
- user/global level

Non-interactive examples:

```bash
rein init --repo
rein init --repo /path/to/target-repo
rein init --user
```

If you are working from this repository before publish, you can run:

```bash
node bin/rein.js init
```

What `rein init` does:

- copies `REIN.md` and `VERIFY.md` into the target repo
- installs `.codex/skills/rein-*`
- installs companion skills: `deep-interview`, `deep-inspect`, and `ai-slop-cleaner`
- for repo installs, creates `.rein/` as the repo-local REIN artifact root for packaged skills, including `.rein/codebase/` for `deep-inspect`
- installs `.codex/hooks.json` and REIN hook scaffolding when safe
- creates a minimal `AGENTS.md` when the target has none
- appends REIN guidance into an existing `AGENTS.md` when it is missing
- writes a merge snippet instead of overwriting an existing `.codex/hooks.json`

If the target already has an `.codex/hooks.json`, REIN leaves it alone by default and writes guidance under `.codex/rein-install/`.

## Day-One Workflow

Typical usage in a target repo:

1. Install the harness.
2. Let the target repo's `AGENTS.md` route work through `REIN.md`.
3. Use `deep-interview` when the request is vague or missing boundaries.
4. Use `rein-triage` before ambiguous or multi-file work.
5. Use `ai-slop-cleaner` for cleanup, deslop, or refactor work after behavior is locked.
6. Use `rein-verify` before declaring completion.
7. Use `rein-retro` after misses, shortcuts, or suspicious failures.

The goal is for users to see the harness at work, not just know it exists.

## Repository Layout

Root surfaces:

- `REIN.md`
- `VERIFY.md`
- `AGENTS.md`
- `README.md`

Codex harness surfaces:

- `.codex/skills/deep-interview/SKILL.md`
- `.codex/skills/deep-inspect/SKILL.md`
- `.codex/skills/ai-slop-cleaner/SKILL.md`
- `.codex/skills/rein-triage/SKILL.md`
- `.codex/skills/rein-verify/SKILL.md`
- `.codex/skills/rein-retro/SKILL.md`
- `.codex/hooks.json`
- `.codex/hooks/rein_hook_utils.py`
- `.codex/hooks/session_start_presence.py`
- `.codex/hooks/user_prompt_submit.py`
- `.codex/hooks/pre_bash_guard.py`
- `.codex/hooks/post_bash_review.py`
- `.codex/hooks/stop_require_evidence.py`

Repo-local REIN artifact surfaces:

- `.rein/context/`
- `.rein/interviews/`
- `.rein/specs/`
- `.rein/codebase/`

Checked-in reference docs for this repo:

- `docs/codebase/`

Eval surfaces:

- `rein-evals/tasks/`
- `rein-evals/prompts/`
- `rein-evals/run.py`
- `rein-evals/score.py`
- `rein-evals/reports/`

## Matched Controls
`REIN.md` and `VERIFY.md` are meant to be procedurally matched.

## Self-Hosting

This repository uses the same repo-local surfaces that REIN installs elsewhere:

- `AGENTS.md`
- `REIN.md`
- `.codex/hooks.json`
- `.codex/skills/`
- `.rein/`

That means REIN can help build itself without changing the user's normal `codex` entrypoint.

## Foundational Research

This project is also grounded in my own research work on regulated pressure, emotional stimuli, and coding-agent behavior.

- FEAR research report: [fear_regulated_pressure_report.pdf](./resources/fear_regulated_pressure_report.pdf)
  This document directly informs the thought process, framing, and theory behind why this project exists and how REIN is being shaped as a regulated execution and inference protocol.

## Research / References

They should share:

- the same task discipline
- the same verification expectations
- the same evidence report shape
- the same anti-reward-hacking requirements

They should differ mainly in motivational framing.

## Eval Philosophy

The eval layer is intentionally small.

It is there to support the product story and make comparisons easier, not to claim scientific proof. v1 reports should be described as directional evidence.

## Research Boundary

The design is inspired by recent work on emotion-like control variables in language models, but the implementation claim here is narrow:

- regulated pressure may improve diligence and uncertainty disclosure
- unregulated pressure may increase cheating-like behavior
- matched controls are necessary to separate framing effects from process effects

## License

MIT
