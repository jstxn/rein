# Hooks

## What This Area Does
- Holds the Python utilities and hook handlers that surface REIN guidance at session start, prompt submission, Bash tool use, post-Bash review, and stop time.

## Key Paths
- `.codex/hooks.json`
- `.codex/hooks/rein_hook_utils.py`
- `.codex/hooks/session_start_presence.py`
- `.codex/hooks/user_prompt_submit.py`
- `.codex/hooks/pre_bash_guard.py`
- `.codex/hooks/post_bash_review.py`
- `.codex/hooks/stop_require_evidence.py`

## How It Works
- `rein_hook_utils.py` provides shared pattern matching, transcript inspection, per-session state storage, and helper functions used by the other hook files.
- `session_start_presence.py` emits a visible REIN activation message and reminder context once per session/source.
- `user_prompt_submit.py` looks for broad prompts and cleanup prompts and emits guidance toward `deep-interview`, `rein-triage`, or `ai-slop-cleaner`.
- `pre_bash_guard.py` examines Bash commands for destructive actions, test/eval mutations, missing visible triage, and missing visible assumption statements.
- `post_bash_review.py` looks at build, lint, or test command output and emits stronger guidance when failures appear.
- `stop_require_evidence.py` blocks session stop when it cannot find enough evidence-report markers in the last assistant text and the current directory is a Git repo.

## Patterns And Conventions
- Hook logic is lightweight and regex-driven.
- Most handlers are advisory and escalate by repeated-count state stored under the temp directory.
- The hook code mainly looks at prompt text, Bash commands, transcript tail text, and simple output markers instead of deep semantic program analysis.
- Hook messages are phrased as REIN-specific course correction rather than general-purpose tool warnings.

## Dependencies And Touchpoints
- The hook scripts depend on the Codex runtime passing JSON payloads over stdin.
- `rein_hook_utils.py` writes per-session state under the OS temp directory in a `rein-hooks` folder.
- The hooks mirror concerns already named in `REIN.md`, `AGENTS.md`, and the skills.
- `.codex/hooks.json` is the configuration surface that would normally activate the hook scripts.

## Findings
- Observed: `.codex/hooks.json` currently contains only `{ "hooks": {} }`.
- Observed: The hook handler files themselves implement a nontrivial REIN behavior set for session presence, prompt guidance, Bash-time warnings, verification-failure feedback, and stop-time evidence enforcement.
- Observed: `stop_require_evidence.py` is the only handler that explicitly emits `decision: "block"`.
- Observed: `rein_hook_utils.py` stores session state in the temp directory, not in the repo.
- Inferred risk: With the current empty `.codex/hooks.json`, the hook code present in the repository is likely inactive by default unless another config source or later manual step populates the hook table.
- Inferred risk: The hook handlers implement a richer behavior model than the current checked-in hook config advertises, so a reader may infer live enforcement that is not actually enabled.
