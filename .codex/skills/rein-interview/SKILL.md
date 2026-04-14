---
name: rein-interview
description: Socratic deep interview with mathematical ambiguity gating before execution
argument-hint: "[--quick|--standard|--deep] <idea or vague description>"
---

<Purpose>
rein-interview is an intent-first Socratic clarification loop before planning or implementation. It turns vague ideas into execution-ready specifications by asking targeted questions about why the user wants a change, how far it should go, what should stay out of scope, and what REIN may decide without confirmation.
</Purpose>

<Use_When>
- The request is broad, ambiguous, or missing concrete acceptance criteria
- The user says "interview me", "ask me everything", "don't assume"
- The user wants to avoid misaligned implementation from underspecified requirements
- You need a requirements artifact before handing off to planning or implementation
</Use_When>

<Do_Not_Use_When>
- The request already has concrete file/symbol targets and clear acceptance criteria
- The user explicitly asks to skip planning/interview and execute immediately
- The user asks for lightweight brainstorming only
- A complete plan already exists and execution should start
</Do_Not_Use_When>

<Why_This_Exists>
Execution quality is usually bottlenecked by intent clarity, not just missing implementation detail. A single expansion pass often misses why the user wants a change, where the scope should stop, which tradeoffs are unacceptable, and which decisions still require user approval. This workflow applies Socratic pressure plus quantitative ambiguity scoring so work begins with an explicit, testable, intent-aligned spec.
</Why_This_Exists>

<Depth_Profiles>
- Quick (`--quick`): fast pre-spec pass; target threshold `<= 0.30`; max rounds 5
- Standard (`--standard`, default): full requirement interview; target threshold `<= 0.20`; max rounds 12
- Deep (`--deep`): high-rigor exploration; target threshold `<= 0.15`; max rounds 20

If no flag is provided, use Standard.
</Depth_Profiles>

<Execution_Policy>
- Ask one question per round, never batch
- Ask about intent and boundaries before implementation detail
- Target the weakest clarity dimension each round after applying the stage-priority rules below
- Treat every answer as a claim to pressure-test before moving on
- Do not rotate to a new clarity dimension just for coverage when the current answer is still vague
- Before crystallizing, complete at least one explicit pressure pass that revisits an earlier answer with a deeper follow-up
- Gather codebase facts via exploration before asking user about internals
- Prefer evidence-backed brownfield confirmation questions
- Re-score ambiguity after each answer and show progress transparently
- Do not crystallize or hand off while Non-goals or Decision Boundaries remain unresolved
</Execution_Policy>

<Steps>

## Phase 0: Preflight Context Intake

1. Parse the task and derive a short task slug.
2. Attempt to load the latest relevant context snapshot from `.rein/context/{slug}-*.md`.
3. If no snapshot exists, create a minimum context snapshot with:
   - task statement
   - desired outcome
   - stated solution
   - probable intent hypothesis
   - known facts and evidence
   - constraints
   - unknowns and open questions
   - decision-boundary unknowns
   - likely codebase touchpoints
4. Save the snapshot under `.rein/context/`.

## Phase 1: Initialize

1. Parse the depth profile.
2. Detect project context: brownfield or greenfield.
3. Initialize interview state with:
   - profile
   - initial idea
   - rounds
   - current ambiguity
   - threshold
   - max rounds
   - current stage
   - current focus
   - context snapshot path
4. Announce kickoff with profile, threshold, and current ambiguity.

## Phase 2: Socratic Interview Loop

Repeat until ambiguity is below threshold, the pressure pass is complete, readiness gates are explicit, the user exits with warning, or max rounds are reached.

### 2a) Generate the next question

Target the lowest-scoring dimension, but respect stage priority:
- Stage 1: intent, outcome, scope, non-goals, decision boundaries
- Stage 2: constraints, success criteria
- Stage 3: brownfield grounding

Follow-up pressure ladder:
1. Ask for a concrete example or evidence signal behind the latest claim
2. Probe the hidden assumption that makes the claim true
3. Force a boundary or tradeoff
4. If the answer still describes symptoms, reframe toward root cause

### 2b) Ask the question

Use the structure:

```text
Round {n} | Target: {weakest_dimension} | Ambiguity: {score}%

{question}
```

### 2c) Score ambiguity

Greenfield:
`ambiguity = 1 - (intent x 0.30 + outcome x 0.25 + scope x 0.20 + constraints x 0.15 + success x 0.10)`

Brownfield:
`ambiguity = 1 - (intent x 0.25 + outcome x 0.20 + scope x 0.20 + constraints x 0.15 + success x 0.10 + context x 0.10)`

Readiness gate:
- Non-goals must be explicit
- Decision Boundaries must be explicit
- A pressure pass must be complete

### 2d) Report progress

Show the weighted breakdown, readiness-gate status, and next focus dimension.

### 2e) Persist state

Append the round result and updated scores.

### 2f) Round controls

- Do not offer early exit before at least one explicit assumption probe and one persistent follow-up
- Round 4 and later: allow explicit early exit with risk warning
- Hard cap at profile max rounds

## Phase 3: Challenge Modes

Use each mode once when applicable:
- Contrarian
- Simplifier
- Ontologist

## Phase 4: Crystallize Artifacts

When threshold is met:

1. Write interview transcript summary to `.rein/interviews/{slug}-{timestamp}.md`
2. Write execution-ready spec to `.rein/specs/rein-interview-{slug}.md`

Spec should include:
- metadata
- context snapshot reference
- clarity breakdown
- intent
- desired outcome
- in-scope
- out-of-scope
- decision boundaries
- constraints
- testable acceptance criteria
- assumptions exposed and resolutions
- pressure-pass findings
- technical context findings
- transcript summary

## Phase 5: Execution Bridge

Present execution options:
- proceed to planning
- proceed to implementation
- refine further

Do not implement directly inside rein-interview.
</Steps>

<Final_Checklist>
- Context snapshot exists under `.rein/context/`
- Ambiguity score shown each round
- Intent-first stage priority used before implementation detail
- At least one explicit assumption probe happened before crystallization
- At least one persistent follow-up deepened a prior answer
- Transcript written under `.rein/interviews/`
- Spec written under `.rein/specs/`
- No direct implementation performed in this mode
</Final_Checklist>
