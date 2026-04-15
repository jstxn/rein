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
- producing the final structured summary payload for crystallization
</Runtime_Contract>

<Execution_Policy>
- Ask one question per round, never batch
- Stay intent-first until scope, non-goals, and decision boundaries are explicit
- Use runtime state at every transition point; do not keep the authoritative interview state only in prose
- Show the user current clarity progress after each runtime update
- Do not crystallize until threshold and readiness gates are satisfied, unless the user explicitly accepts the risk
- Do not implement directly inside rein-interview
</Execution_Policy>

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

Then call:

```bash
rein interview crystallize --slug <slug> --summary '<json>' --json
```

This writes:
- transcript: `.rein/interviews/<slug>-<timestamp>.md`
- spec bundle:
  - `.rein/specs/rein-interview-<slug>/spec.md`
  - `.rein/specs/rein-interview-<slug>/result.json`
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
- recommend the next execution bridge:
  - `rein-plan`
  - direct implementation
  - further refinement
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
