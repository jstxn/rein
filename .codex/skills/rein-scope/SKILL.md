---
name: rein-scope
description: Use when requirements are too large, contradictory, or need negotiation. Produces a scope contract with what will and will not be done.
---

# rein-scope

Use this when the work as stated is too large for a single pass, contains contradictions, or needs explicit boundaries before implementation begins.

## When To Use

- The request implies more work than can be safely completed in one session
- Requirements contradict each other or contradict existing behavior
- The user asks for everything but constraints demand tradeoffs
- Scope creep is likely without an explicit boundary

## When Not To Use

- The task is already well-scoped with clear acceptance criteria
- Deep-interview has already produced a spec with explicit non-goals
- The user explicitly asks to skip scoping

## Steps

1. Restate the full request as understood.
2. Identify every distinct deliverable implied by the request.
3. Classify each deliverable:
   - **must**: required for the work to be considered complete
   - **should**: valuable but deferrable without breaking the core intent
   - **will not**: explicitly out of scope for this pass
4. For each contradiction or tension, state the conflict and propose a resolution with tradeoffs.
5. Identify what information is missing to commit to the scope.
6. Present the scope contract for user confirmation before proceeding.

## Output

Emit a scope contract with:

- restated request
- must / should / will-not classification
- conflicts identified and proposed resolutions
- missing information
- explicit confirmation request

Do not begin implementation until the user confirms the scope contract.
