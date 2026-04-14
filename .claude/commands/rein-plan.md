---
name: rein-plan
description: Use after triage, before implementation. Breaks complex work into sequenced steps with risks, checkpoints, and rollback boundaries.
---

# rein-plan

Use this after triage and before implementation when the work involves multiple files, multiple concerns, or a non-obvious execution order.

## When To Use

- The task touches more than two files or modules
- The execution order matters (migrations before code, types before consumers)
- There are dependencies between subtasks
- The risk of a partial implementation is high

## When Not To Use

- The task is a single-file, single-concern change
- Triage already produced a clear, linear path
- The user explicitly asks to skip planning

## Steps

1. List every discrete subtask required to complete the work.
2. Identify dependencies between subtasks. Order them so each step has its prerequisites satisfied.
3. For each step, state:
   - what changes
   - what could go wrong
   - how to verify the step succeeded before moving on
4. Identify the first safe checkpoint — the earliest point where the repo is in a valid state and work can be paused or reviewed.
5. Identify rollback boundaries — points where a partial revert is clean rather than destructive.
6. Flag any step that requires a decision the user has not yet made.

## Output

Emit a plan with:

- ordered step list with per-step risk and verification
- dependency graph (if non-linear)
- checkpoints
- rollback boundaries
- open decisions requiring user input
- estimated blast radius (files touched, APIs changed, tests affected)
