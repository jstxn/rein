---
name: rein-go
description: Run one task through the full REIN flow from clarification through implementation, cleanup, review, and verification
argument-hint: "[--from-interview <slug|path>] <task or idea>"
---

# rein-go

Use this when the user wants one REIN-controlled flow instead of manually invoking `rein-interview`, `rein-plan`, implementation, cleanup, review, and verification as separate steps.

`rein-go` is the end-to-end orchestration surface for REIN.

## When To Use

- The user wants one continuous REIN workflow with minimal pauses
- The task is broad enough to need clarification, planning, implementation, and post-implementation review
- A completed `rein-interview` bundle already exists and should feed directly into planning and implementation
- The user explicitly invokes `$rein-go`, `/rein-go`, or asks for a single flow command

## When Not To Use

- The task is already a tiny single-file change
- The user explicitly wants only one stage, such as interview-only or plan-only work
- The user wants to skip clarification and planning entirely

## Flow Contract

- Public entrypoint: `rein go`
- Wrapper triggers: `$rein-go` and `/rein-go`
- Default posture: keep going with minimal pauses once the flow starts
- Hard stop on:
  - dangerous or destructive actions that require approval
  - missing permissions or blocked tool access
  - any failed stage: plan, implementation, cleanup, review, or verify
- Preserve the current install and hook philosophy; do not turn REIN into a hook-first enforcement layer

## Runtime Helper

Start by asking the runtime for the current flow shape:

```bash
rein go "<task>" --json
```

If a completed interview bundle already exists:

```bash
rein go --from-interview <slug|path> --json
```

Treat the returned manifest as structure and stop-policy guidance, not as a substitute for your own engineering judgment.

## Stage Order

1. Interview
   - If the manifest mode is `fresh`, run the normal `rein-interview` flow first.
   - If the manifest mode is `from-interview`, treat the interview bundle as the source of truth and skip directly to planning.

2. Plan
   - Consume the completed `rein-interview` `result.json`.
   - Run `rein-plan` before implementation.
   - Keep the plan minimum-sufficient and aligned to the artifact.

3. Implementation
   - Implement directly from the plan.
   - Reuse existing runtime and patterns before inventing new abstractions.
   - Do not drift into installer rewrites or hook-model changes unless the task explicitly requires them.

4. Cleanup
   - Run `rein-cleanup` on the changed-file scope created by the implementation stage.
   - Keep cleanup bounded to the files and mess created by the task.

5. Review
   - Run `rein-review` on the resulting diff.
   - Fix any scope drift, debug leftovers, or suspicious test changes before continuing.

6. Verify
   - Run `rein-verify` before declaring completion.
   - The flow is not done just because implementation passed.

## Stage Rules

- Use `rein-interview` runtime commands for persistence and state.
- Use completed interview artifacts as the primary source of truth for downstream planning.
- Ask the user only when:
  - a destructive step needs approval
  - a permission boundary blocks the flow
  - a critical product decision is still unresolved and cannot be verified from the repo
- If a stage fails, stop at that stage and report the failure plainly instead of silently continuing.
- Do not skip cleanup, review, or verification just because the earlier stages succeeded.

## Output

When the flow completes:
- summarize the completed stages
- name the key files changed
- name the commands and tests run
- state any remaining risks or uncertainties

If the flow stops early:
- name the failing stage
- explain what blocked it
- state the next resume point clearly

Task: {{ARGUMENTS}}
