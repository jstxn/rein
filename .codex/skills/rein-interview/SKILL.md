---
name: rein-interview
description: Runtime-backed Socratic interview with durable state, clarity scoring, and spec bundle output
argument-hint: "[--quick|--standard|--deep] [--resume <slug>] <idea or vague description>"
---

<Purpose>
rein-interview is the requirements-clarification entry point for REIN when a task is vague, broad, or missing boundaries. It runs a Socratic interview while delegating all persistence, scoring, readiness gates, status reporting, and artifact writing to the `rein interview` runtime commands.
</Purpose>

<Use_When>
- The request is underspecified, risky, or likely to cause misaligned implementation
- The user wants clarification before planning or coding
- You need durable interview state, resumability, or machine-readable handoff artifacts
- You need a spec bundle that can feed `rein-plan`, direct implementation, or further refinement
</Use_When>

<Do_Not_Use_When>
- The request already has concrete file targets and stable acceptance criteria
- The user explicitly asks to skip clarification and execute immediately
- A complete rein-interview spec already exists and the next step should begin
</Do_Not_Use_When>

<Profiles>
- `--quick`: threshold `70%`, max rounds `5`
- `--standard` (default): threshold `80%`, max rounds `12`
- `--deep`: threshold `90%`, max rounds `20`
</Profiles>

<Runtime_Contract>
The runtime owns:
- durable state under `.rein/state/`
- context snapshots under `.rein/context/`
- clarity score computation
- readiness gates
- round ordering
- status display
- transcript/spec/result bundle output

You own:
- asking the next question
- interpreting the user's answer
- deciding the next target dimension
- framing the next question in your own judgment and voice
- producing the final structured summary payload for crystallization
</Runtime_Contract>

<Execution_Policy>
- Ask one question per round, never batch
- Stay intent-first until scope, non-goals, and decision boundaries are explicit
- Use runtime state at every transition point; do not keep the authoritative interview state only in prose
- Show the user current clarity progress after each runtime update
- Do not crystallize until threshold and readiness gates are satisfied, unless the user explicitly accepts the risk
- Do not implement directly inside rein-interview
- Use runtime suggestions for structure, but choose the actual next question yourself
</Execution_Policy>

<Interview_Presentation_Contract>
Use a consistent chat-safe presentation frame for every visible interview turn.

## Layout

Normal round:

```text
[ Interview ]
| Progress: Round X of Y
| Phase: clarifying structure

| Current clarity: N%

| Question
| [one to two short lines]
|
| A. ...
| B. ...
| C. ...
```

Open-question variant:

```text
[ Interview ]
| Progress: Round X of Y
| Phase: clarifying structure

| Current clarity: N%

| Question
| [one to two short lines]
```

Review:

```text
[ Review ]
| Progress: Round X of Y
| Phase: confirming summary

| Current clarity: N%

| Question
| [one to two short lines]
```

Handoff:

```text
[ Handoff ]
| Progress: Round X of Y
| Phase: preparing handoff

| Status: ready for handoff

| Question
| [one to two short lines]
```

## Formatting Rules

- Always preserve blank lines between sections exactly as shown.
- Keep `Progress` round-based: `Round X of Y`.
- Keep phase names as lowercase phrases.
- For normal rounds and review, show `Current clarity: N%`.
- For handoff, replace clarity with `Status: ready for handoff`.
- Keep the question to one ask, written in one to two short lines.
- If extra context is needed, fold it into the question itself instead of adding another section.

## Header Mapping

- Use `[ Interview ]` for normal rounds.
- Use `[ Review ]` for final confirmation and crystallization.
- Use `[ Handoff ]` for transition into the next workflow.

## Fixed Phase Vocabulary

Use only these phase names:

- `clarifying structure`
- `narrowing scope`
- `resolving tension`
- `confirming summary`
- `preparing handoff`

## Option Rules

- Use `A.`, `B.`, and `C.` options when the user is choosing between clear alternatives.
- Use an open question when structured options would feel forced.
- Do not add a separate reply-hint section for open questions.

## Transition Rules

Use clarity score as guidance, but make the final phase choice with interviewer judgment.

- Start in `clarifying structure`.
- Move into `narrowing scope` when structure is clear and clarity is at least `65%`.
- Move into `resolving tension` when contradiction exists or direction is unstable.
- Tension overrides score-based advancement.
- Move into `confirming summary` when clarity is at least `85%` and no major tension remains.
- Move into `preparing handoff` when the summary is confirmed and the next workflow is identifiable.

## Reopening Rules

- Do not move backward casually between phases.
- Allow reopening only from `[ Review ]`.
- Reopen only for material corrections affecting intent, scope boundaries, tension status, or handoff readiness.
</Interview_Presentation_Contract>

<Command_Sequence>

## Start a new interview

1. Parse arguments:
   - if `--resume <slug>` is present, skip to the resume flow
   - otherwise choose profile from `--quick|--standard|--deep` or default to `standard`
2. Initialize runtime state:

```bash
rein interview init --profile <quick|standard|deep> --idea "<idea>" [--slug <slug>] --json
```

3. Read the returned state and begin the interview.

## Resume an existing interview

1. Load the runtime state:

```bash
rein interview resume --slug <slug> --json
```

2. Continue from the returned `currentRound`, `readinessGates`, `weakestDimension`, and `nextAction`.
   Valid `nextAction` values are:
   - `continue`
   - `crystallize`
   - `blocked`
   - `completed`

## Persist each round

After each answer, compute updated dimension scores and readiness gates, then call:

```bash
rein interview update-round \
  --slug <slug> \
  --round <n> \
  --target <dimension> \
  --question "<question>" \
  --answer "<answer>" \
  --scores '{"intent":0.8,"outcome":0.7,"scope":0.6,"constraints":0.7,"success":0.5,"context":0.7}' \
  [--refinement "<summary>"] \
  [--challenge-mode "<contrarian|simplifier|ontologist>"] \
  [--decision-summary "<short note>"] \
  [--non-goals-explicit] \
  [--decision-boundaries-explicit] \
  [--pressure-pass-complete] \
  --json
```

Use brownfield dimensions (`intent`, `outcome`, `scope`, `constraints`, `success`, `context`) unless the interview was initialized as greenfield.

Immediately use the returned JSON to decide whether to:
- continue interviewing
- crystallize now
- stop and warn that the interview is blocked

When you want structured runtime guidance for the next move, call:

```bash
rein interview next --slug <slug> --json
```

Use its output for:
- `suggestedMode`
- `suggestedFocus`
- `questionStrategy`
- `suggestedMove`

Treat that as structure, not as a replacement for your own question framing.

## Check live status

At any time, or when you need a refreshed external view, call:

```bash
rein interview status --slug <slug> --json
```

If the user asks to continue later, tell them they can rerun:

```bash
rein interview resume --slug <slug> --json
```

## Crystallize artifacts

When the runtime says `nextAction=crystallize`, build a structured summary JSON with at least:
- `title`
- `intent`
- `desiredOutcome`
- `inScope`
- `outOfScope`
- `decisionBoundaries`
- `constraints`
- `acceptanceCriteria`
- `assumptions`
- `pressureFindings`
- `technicalContext`
- `executionBridge`
- `transcriptSummary`

Use canonical `executionBridge` values so runtime handoff stays machine-usable:
- `plan`
- `implementation`
- `refinement`
- `scope`

Then call:

```bash
rein interview crystallize --slug <slug> --summary '<json>' --json
```

This writes:
- transcript: `.rein/interviews/<slug>-<timestamp>.md`
- spec bundle:
  - `.rein/specs/rein-interview-<slug>/spec.md`
  - `.rein/specs/rein-interview-<slug>/result.json`

## Handoff orchestration

After crystallization, ask the runtime for the recommended next workflow:

```bash
rein interview handoff --slug <slug> --to plan --json
```

Use that output to:
- name the next skill or workflow
- point at the correct `result.json`
- recommend the next invocation, such as `rein-plan --from-interview <slug>`
- use `recommendedSkillInvocation` or the best available runtime handoff hint to build the final user-facing close-out
</Command_Sequence>

<Interview_Strategy>
- Prioritize the weakest dimension, but do not rotate dimensions just for coverage if the current answer is still vague
- Use concrete-example pressure before abstract architecture questions
- Make non-goals explicit early
- Make decision boundaries explicit before handoff
- Perform at least one genuine pressure pass on an earlier answer
- Use challenge modes when they materially sharpen the spec:
  - contrarian
  - simplifier
  - ontologist
</Interview_Strategy>

<Final_Output>
When crystallization succeeds:
- tell the user the final clarity score and readiness status
- point to the transcript and spec bundle paths
- add a final line in this exact form: `Recommended next step: <command or step>`
- ask the user whether the agent should do that next step now
- prefer the runtime handoff recommendation when available, for example `rein-plan --from-interview <slug>`
</Final_Output>

<Checklist>
- runtime state initialized or resumed
- each round persisted through `rein interview update-round`
- clarity shown as understanding progress, not ambiguity
- readiness gates explicit before crystallization
- transcript written
- spec bundle written
- no direct implementation performed here
</Checklist>

Task: {{ARGUMENTS}}
