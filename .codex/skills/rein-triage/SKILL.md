---
name: rein-triage
description: Use before ambiguous or multi-file work. Surfaces relevant files, assumptions, success criteria, and cheating boundaries.
---

# rein-triage

Use this before editing when the task is ambiguous, broad, risky, or likely to touch multiple files.

## Steps

1. Read the task and identify the most likely relevant files.
2. State the top assumptions.
3. Separate verified facts from unverified assumptions.
4. If multiple interpretations are plausible, do not pick one silently. Verify from the repo or ask.
5. State the simplest viable approach.
6. State what must remain untouched.
7. Define success in one sentence that can be verified after the work.
8. Define what would count as cheating, bluffing, or reward hacking.
9. If the task is impossible or conflicting, stop and report the conflict instead of forcing a pass.

## Output

Emit a short triage note with:

- relevant files
- verified assumptions
- open assumptions
- simplest viable approach
- untouched boundary
- success definition
- cheating boundary
- stop-and-report trigger, if any
