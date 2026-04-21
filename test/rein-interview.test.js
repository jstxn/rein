import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  formatInterviewHandoff,
  formatInterviewNext,
} from "../lib/core/interview-orchestration.js";
import { formatInterviewStatus } from "../lib/core/interview-state.js";
import { cliPath, repoRoot, runCli } from "../test-support/support.js";

function parseJson(output) {
  return JSON.parse(output.toString());
}

function summaryPayload() {
  return JSON.stringify({
    acceptanceCriteria: ["State file updates after each round", "Spec bundle is written"],
    assumptions: ["Runtime owns persistence and scoring"],
    constraints: ["Stay file-based and local", "No other skill rewrites in this iteration"],
    decisionBoundaries: ["CLI naming can be decided in implementation"],
    desiredOutcome: "A resumable rein-interview workflow with durable artifacts",
    executionBridge: ["rein-plan", "implementation", "refinement"],
    inScope: ["oclif command surface", "durable state", "spec bundle"],
    intent: "Make rein-interview production-grade and resumable",
    outOfScope: ["External plugin UX", "Other skill rewrites"],
    pressureFindings: ["Prompt-only state handling is not reliable enough"],
    technicalContext: ["State files live under .rein/state", "Spec bundle lives under .rein/specs"],
    title: "Interview runtime rewrite",
    transcriptSummary:
      "The user wants runtime-backed interview state and structured handoff artifacts.",
  });
}

test("rein interview end-to-end flow writes state, status, resume, and spec bundle", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rein-interview-e2e-"));
  const targetRepo = path.join(tempRoot, "target");
  fs.mkdirSync(targetRepo, { recursive: true });

  runCli(cliPath, ["init", "--repo", targetRepo, "--force"], {
    cwd: repoRoot,
  });

  const initState = parseJson(
    runCli(cliPath, ["interview", "init", "--idea", "Interview runtime", "--json"], {
      cwd: targetRepo,
    }),
  );

  const roundOne = parseJson(
    runCli(
      cliPath,
      [
        "interview",
        "update-round",
        "--slug",
        initState.slug,
        "--round",
        "1",
        "--target",
        "intent",
        "--question",
        "What is failing today?",
        "--answer",
        "The prompt has no durable state.",
        "--scores",
        '{"intent":0.7,"outcome":0.6,"scope":0.5,"constraints":0.5,"success":0.4,"context":0.6}',
        "--json",
      ],
      { cwd: targetRepo },
    ),
  );
  assert.equal(roundOne.currentRound, 1);
  assert.equal(roundOne.nextAction, "continue");

  const liveStatus = parseJson(
    runCli(cliPath, ["interview", "status", "--slug", initState.slug, "--json"], {
      cwd: targetRepo,
    }),
  );
  assert.equal(liveStatus.slug, initState.slug);
  assert.equal(liveStatus.currentRound, 1);

  const nextAfterRoundOne = parseJson(
    runCli(cliPath, ["interview", "next", "--slug", initState.slug, "--json"], {
      cwd: targetRepo,
    }),
  );
  assert.equal(nextAfterRoundOne.suggestedMode, "continue");
  assert.equal(nextAfterRoundOne.suggestedFocus, "nonGoalsExplicit");
  assert.equal(nextAfterRoundOne.questionStrategy, "boundary-setting");

  const roundTwo = parseJson(
    runCli(
      cliPath,
      [
        "interview",
        "update-round",
        "--slug",
        initState.slug,
        "--round",
        "2",
        "--target",
        "success",
        "--question",
        "What proves this is done?",
        "--answer",
        "A resumable runtime with structured outputs.",
        "--scores",
        '{"intent":0.95,"outcome":0.95,"scope":0.9,"constraints":0.85,"success":0.9,"context":0.9}',
        "--non-goals-explicit",
        "--decision-boundaries-explicit",
        "--pressure-pass-complete",
        "--refinement",
        "The runtime should own contracts and artifact output.",
        "--json",
      ],
      { cwd: targetRepo },
    ),
  );
  assert.equal(roundTwo.nextAction, "crystallize");

  const resumed = parseJson(
    runCli(cliPath, ["interview", "resume", "--slug", initState.slug, "--json"], {
      cwd: targetRepo,
    }),
  );
  assert.equal(resumed.nextAction, "crystallize");

  const crystallized = parseJson(
    runCli(
      cliPath,
      [
        "interview",
        "crystallize",
        "--slug",
        initState.slug,
        "--summary",
        summaryPayload(),
        "--json",
      ],
      { cwd: targetRepo },
    ),
  );
  assert.equal(crystallized.status, "completed");
  assert.equal(crystallized.nextAction, "completed");
  assert.ok(fs.existsSync(crystallized.artifactPaths.state));
  assert.ok(fs.existsSync(crystallized.artifactPaths.transcript));
  assert.ok(fs.existsSync(crystallized.artifactPaths.spec));
  assert.ok(fs.existsSync(crystallized.artifactPaths.result));

  const resultJson = JSON.parse(fs.readFileSync(crystallized.artifactPaths.result, "utf8"));
  assert.equal(resultJson.intent, "Make rein-interview production-grade and resumable");
  assert.match(fs.readFileSync(crystallized.artifactPaths.spec, "utf8"), /## Desired Outcome/);

  const nextAfterCompletion = parseJson(
    runCli(cliPath, ["interview", "next", "--slug", initState.slug, "--json"], {
      cwd: targetRepo,
    }),
  );
  assert.equal(nextAfterCompletion.suggestedMode, "handoff");
  assert.equal(nextAfterCompletion.suggestedFocus, "plan");
  assert.match(nextAfterCompletion.recommendedCommand, /rein interview handoff/);

  const handoff = parseJson(
    runCli(cliPath, ["interview", "handoff", "--slug", initState.slug, "--to", "plan", "--json"], {
      cwd: targetRepo,
    }),
  );
  assert.equal(handoff.handoffTarget, "plan");
  assert.equal(handoff.recommendedSkill, "rein-plan");
  assert.equal(handoff.recommendedSkillInvocation, `rein-plan --from-interview ${initState.slug}`);
  assert.equal(handoff.sourceResult, crystallized.artifactPaths.result);
});

test("rein interview enforces round ordering and crystallization readiness", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rein-interview-guardrails-"));
  const targetRepo = path.join(tempRoot, "target");
  fs.mkdirSync(targetRepo, { recursive: true });

  const initState = parseJson(
    runCli(cliPath, ["interview", "init", "--idea", "Ordering", "--json"], {
      cwd: targetRepo,
    }),
  );

  assert.throws(
    () =>
      runCli(
        cliPath,
        [
          "interview",
          "update-round",
          "--slug",
          initState.slug,
          "--round",
          "2",
          "--target",
          "intent",
          "--question",
          "Why now?",
          "--answer",
          "Because the CLI is growing.",
          "--scores",
          '{"intent":0.6,"outcome":0.6,"scope":0.5,"constraints":0.5,"success":0.4,"context":0.5}',
        ],
        { cwd: targetRepo },
      ),
    (error) => {
      assert.match(error.stderr.toString(), /Expected round 1/);
      return true;
    },
  );

  assert.throws(
    () =>
      runCli(
        cliPath,
        [
          "interview",
          "update-round",
          "--slug",
          initState.slug,
          "--round",
          "1",
          "--target",
          "bananas",
          "--question",
          "Why now?",
          "--answer",
          "Because the CLI is growing.",
          "--scores",
          '{"intent":0.6,"outcome":0.6,"scope":0.5,"constraints":0.5,"success":0.4,"context":0.5}',
        ],
        { cwd: targetRepo },
      ),
    (error) => {
      assert.match(error.stderr.toString(), /Target dimension "bananas" is invalid/);
      return true;
    },
  );

  assert.throws(
    () =>
      runCli(
        cliPath,
        ["interview", "crystallize", "--slug", initState.slug, "--summary", summaryPayload()],
        { cwd: targetRepo },
      ),
    (error) => {
      assert.match(error.stderr.toString(), /not ready to crystallize yet/);
      return true;
    },
  );

  assert.throws(
    () =>
      runCli(
        cliPath,
        [
          "interview",
          "crystallize",
          "--slug",
          initState.slug,
          "--force",
          "--summary",
          '{"intent":"x","desiredOutcome":"y","transcriptSummary":"z"}',
        ],
        { cwd: targetRepo },
      ),
    (error) => {
      const message = error.stderr.toString().replace(/[›]/g, "").replace(/\s+/g, " ");
      assert.match(
        message,
        /must include non-empty fields: acceptanceCriteria, constraints, decisionBoundaries, executionBridge, inScope, outOfScope, technicalContext/,
      );
      return true;
    },
  );
});

test("rein interview resume can select a slug interactively when omitted", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rein-interview-resume-select-"));
  const targetRepo = path.join(tempRoot, "target");
  fs.mkdirSync(targetRepo, { recursive: true });

  const first = parseJson(
    runCli(cliPath, ["interview", "init", "--idea", "First interview", "--json"], {
      cwd: targetRepo,
    }),
  );
  const second = parseJson(
    runCli(cliPath, ["interview", "init", "--idea", "Second interview", "--json"], {
      cwd: targetRepo,
    }),
  );

  const selected = parseJson(
    runCli(cliPath, ["interview", "resume", "--json"], {
      cwd: targetRepo,
      env: {
        ...process.env,
        REIN_FORCE_INTERACTIVE: "1",
        REIN_PROMPT_FIXTURES: JSON.stringify([second.slug]),
      },
    }),
  );

  assert.equal(selected.slug, second.slug);
  assert.notEqual(selected.slug, first.slug);
});

test("rein interview JSON errors include the failure message", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rein-interview-json-error-"));
  const targetRepo = path.join(tempRoot, "target");
  fs.mkdirSync(targetRepo, { recursive: true });

  const initState = parseJson(
    runCli(cliPath, ["interview", "init", "--idea", "JSON errors", "--json"], {
      cwd: targetRepo,
    }),
  );

  assert.throws(
    () =>
      runCli(
        cliPath,
        [
          "interview",
          "crystallize",
          "--slug",
          initState.slug,
          "--force",
          "--summary",
          '{"intent":"x","desiredOutcome":"y","transcriptSummary":"z"}',
          "--json",
        ],
        { cwd: targetRepo },
      ),
    (error) => {
      const payload = parseJson(error.stdout);
      assert.match(payload.error.message, /Crystallize summary JSON must include non-empty fields/);
      assert.equal(payload.error.name, "Error");
      return true;
    },
  );
});

test("rein interview handoff normalizes non-canonical execution bridge labels", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rein-interview-handoff-aliases-"));
  const targetRepo = path.join(tempRoot, "target");
  fs.mkdirSync(targetRepo, { recursive: true });

  const initState = parseJson(
    runCli(cliPath, ["interview", "init", "--idea", "Alias bridge", "--json"], {
      cwd: targetRepo,
    }),
  );

  runCli(
    cliPath,
    [
      "interview",
      "update-round",
      "--slug",
      initState.slug,
      "--round",
      "1",
      "--target",
      "intent",
      "--question",
      "Why now?",
      "--answer",
      "We need orchestration helpers.",
      "--scores",
      '{"intent":0.95,"outcome":0.95,"scope":0.9,"constraints":0.9,"success":0.9,"context":0.9}',
      "--non-goals-explicit",
      "--decision-boundaries-explicit",
      "--pressure-pass-complete",
      "--json",
    ],
    { cwd: targetRepo },
  );

  runCli(
    cliPath,
    [
      "interview",
      "crystallize",
      "--slug",
      initState.slug,
      "--summary",
      JSON.stringify({
        acceptanceCriteria: ["A handoff target is recommended"],
        assumptions: [],
        constraints: ["Stay file-based"],
        decisionBoundaries: ["Internal command naming can evolve"],
        desiredOutcome: "A canonical handoff recommendation",
        executionBridge: ["direct implementation", "further refinement"],
        inScope: ["Interview orchestration"],
        intent: "Normalize bridge labels before handoff",
        outOfScope: ["Plugin execution"],
        pressureFindings: [],
        technicalContext: ["Execution bridge is free-form input"],
        transcriptSummary: "Alias labels should normalize cleanly.",
      }),
      "--json",
    ],
    { cwd: targetRepo },
  );

  const next = parseJson(
    runCli(cliPath, ["interview", "next", "--slug", initState.slug, "--json"], {
      cwd: targetRepo,
    }),
  );
  assert.equal(next.suggestedFocus, "implementation");
  assert.match(next.recommendedCommand, /--to implementation --json/);

  const handoff = parseJson(
    runCli(
      cliPath,
      ["interview", "handoff", "--slug", initState.slug, "--to", "direct implementation", "--json"],
      { cwd: targetRepo },
    ),
  );
  assert.equal(handoff.handoffTarget, "implementation");
  assert.equal(handoff.recommendedSkill, "implementation");
});

test("rein interview handoff rejects unknown explicit targets", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rein-interview-handoff-invalid-"));
  const targetRepo = path.join(tempRoot, "target");
  fs.mkdirSync(targetRepo, { recursive: true });

  const initState = parseJson(
    runCli(cliPath, ["interview", "init", "--idea", "Invalid handoff", "--json"], {
      cwd: targetRepo,
    }),
  );

  runCli(
    cliPath,
    [
      "interview",
      "update-round",
      "--slug",
      initState.slug,
      "--round",
      "1",
      "--target",
      "intent",
      "--question",
      "Why now?",
      "--answer",
      "We need a valid next workflow.",
      "--scores",
      '{"intent":0.95,"outcome":0.95,"scope":0.9,"constraints":0.9,"success":0.9,"context":0.9}',
      "--non-goals-explicit",
      "--decision-boundaries-explicit",
      "--pressure-pass-complete",
      "--json",
    ],
    { cwd: targetRepo },
  );

  runCli(
    cliPath,
    ["interview", "crystallize", "--slug", initState.slug, "--summary", summaryPayload(), "--json"],
    { cwd: targetRepo },
  );

  assert.throws(
    () =>
      runCli(cliPath, ["interview", "handoff", "--slug", initState.slug, "--to", "typo-workflow"], {
        cwd: targetRepo,
      }),
    (error) => {
      assert.match(error.stderr.toString(), /Unknown handoff target "typo-workflow"/);
      assert.match(error.stderr.toString(), /implementation, plan, refinement, scope/);
      return true;
    },
  );
});

test("rein interview human-readable runtime output follows the presentation contract", () => {
  const statusOutput = formatInterviewStatus({
    artifactPaths: {
      context: "/tmp/context.md",
      result: "/tmp/result.json",
      spec: "/tmp/spec.md",
      specDir: "/tmp/spec-dir",
      state: "/tmp/state.json",
      transcript: "/tmp/transcript.md",
    },
    clarityScore: 61,
    contextType: "brownfield",
    currentRound: 2,
    idea: "Interview presentation",
    maxRounds: 5,
    nextAction: "continue",
    profile: "standard",
    readinessGates: {
      decisionBoundariesExplicit: false,
      nonGoalsExplicit: false,
      pressurePassComplete: false,
    },
    slug: "interview-presentation",
    status: "in_progress",
    threshold: 80,
    weakestDimension: "scope",
  });
  assert.match(statusOutput, /^\[ Interview \]$/m);
  assert.match(statusOutput, /\| Progress: Round 2 of 5/);
  assert.match(statusOutput, /\| Phase: clarifying structure/);
  assert.match(statusOutput, /\n\n\| Current clarity: 61%\n\n/);
  assert.match(
    statusOutput,
    /\| Question\n\| What is the next question that will most improve clarity from this state\?/,
  );
  assert.doesNotMatch(statusOutput, /Readiness gates|Artifacts|Weakest dimension/);

  const reviewOutput = formatInterviewNext({
    availableHandoffTargets: [],
    clarityScore: 88,
    currentRound: 5,
    maxRounds: 5,
    questionStrategy: "summary-synthesis",
    recommendedCommand:
      "rein interview crystallize --slug interview-presentation --summary '<json>' --json",
    slug: "interview-presentation",
    status: "in_progress",
    suggestedFocus: "summary",
    suggestedMode: "crystallize",
    suggestedMove: "Prepare the structured summary JSON and crystallize the interview bundle.",
    unresolvedReadinessGates: [],
  });
  assert.match(reviewOutput, /^\[ Review \]$/m);
  assert.match(reviewOutput, /\| Progress: Round 5 of 5/);
  assert.match(reviewOutput, /\| Phase: confirming summary/);
  assert.match(reviewOutput, /\n\n\| Current clarity: 88%\n\n/);
  assert.match(
    reviewOutput,
    /\| Question\n\| Does this interview look ready to crystallize into a summary bundle\?/,
  );

  const continueOutput = formatInterviewNext({
    availableHandoffTargets: [],
    clarityScore: 57,
    currentRound: 1,
    maxRounds: 12,
    questionStrategy: "boundary-setting",
    recommendedCommand:
      "rein interview update-round --slug interview-presentation --round 2 ... --json",
    slug: "interview-presentation",
    status: "in_progress",
    suggestedFocus: "nonGoalsExplicit",
    suggestedMode: "continue",
    suggestedMove: "Make non-goals explicit so the work stops drifting outward.",
    suggestedQuestion: "What should stay out of scope so this work stops drifting outward?",
    unresolvedReadinessGates: ["nonGoalsExplicit"],
  });
  assert.match(continueOutput, /^\[ Interview \]$/m);
  assert.match(
    continueOutput,
    /\| Question\n\| What should stay out of scope so this work stops drifting outward\?/,
  );
  assert.doesNotMatch(
    continueOutput,
    /\| Question\n\| Make non-goals explicit so the work stops drifting outward\./,
  );

  const handoffOutput = formatInterviewHandoff({
    artifactPaths: {
      context: "/tmp/context.md",
      result: "/tmp/result.json",
      spec: "/tmp/spec.md",
      state: "/tmp/state.json",
      transcript: "/tmp/transcript.md",
    },
    availableHandoffTargets: ["plan", "implementation", "scope"],
    handoffTarget: "plan",
    recommendedSkill: "rein-plan",
    recommendedSkillInvocation: "rein-plan --from-interview interview-presentation",
    slug: "interview-presentation",
    sourceResult: "/tmp/result.json",
    status: "completed",
    suggestedMove: "Hand the completed interview bundle into the next workflow.",
    warning: null,
    currentRound: 5,
    maxRounds: 5,
  });
  assert.match(handoffOutput, /^\[ Handoff \]$/m);
  assert.match(handoffOutput, /\| Progress: Round 5 of 5/);
  assert.match(handoffOutput, /\| Phase: preparing handoff/);
  assert.match(handoffOutput, /\n\n\| Status: ready for handoff\n\n/);
  assert.match(
    handoffOutput,
    /\| Question\n\| Which workflow should this interview enter next\?\n\|\n\| A\. `plan` via `rein-plan --from-interview interview-presentation`\n\| B\. `implementation`\n\| C\. `scope`/,
  );
});

test("rein interview next CLI renders a real question for continue mode", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rein-interview-next-question-"));
  const targetRepo = path.join(tempRoot, "target");
  fs.mkdirSync(targetRepo, { recursive: true });

  const initState = parseJson(
    runCli(cliPath, ["interview", "init", "--idea", "Presentation drift", "--json"], {
      cwd: targetRepo,
    }),
  );

  runCli(
    cliPath,
    [
      "interview",
      "update-round",
      "--slug",
      initState.slug,
      "--round",
      "1",
      "--target",
      "intent",
      "--question",
      "Why now?",
      "--answer",
      "Need clearer scope.",
      "--scores",
      '{"intent":0.7,"outcome":0.6,"scope":0.5,"constraints":0.5,"success":0.4,"context":0.6}',
      "--json",
    ],
    { cwd: targetRepo },
  );

  const nextOutput = runCli(cliPath, ["interview", "next", "--slug", initState.slug], {
    cwd: targetRepo,
  }).toString();

  assert.match(
    nextOutput,
    /\| Question\n\| What should stay out of scope so this work stops drifting outward\?/,
  );
  assert.doesNotMatch(nextOutput, /\| Question\n\| Make non-goals explicit/);
});

test("rein-interview Claude and Codex prompt copies stay in sync", () => {
  const claude = fs.readFileSync(
    path.join(repoRoot, ".claude", "commands", "rein-interview.md"),
    "utf8",
  );
  const codex = fs.readFileSync(
    path.join(repoRoot, ".codex", "skills", "rein-interview", "SKILL.md"),
    "utf8",
  );

  assert.equal(codex, claude);
  assert.match(claude, /rein interview update-round/);
  assert.match(claude, /rein interview next --slug <slug> --json/);
  assert.match(claude, /rein interview handoff --slug <slug> --to plan --json/);
  assert.match(claude, /rein interview init .*--json/);
  assert.match(claude, /rein interview resume --slug <slug> --json/);
  assert.match(claude, /rein interview status --slug <slug> --json/);
  assert.match(claude, /rein interview crystallize --slug <slug> --summary '<json>' --json/);
  assert.match(claude, /Use canonical `executionBridge` values/);
  assert.match(claude, /<Interview_Presentation_Contract>/);
  assert.match(claude, /\[ Interview \]/);
  assert.match(claude, /\[ Review \]/);
  assert.match(claude, /\[ Handoff \]/);
  assert.match(claude, /\| Current clarity: N%/);
  assert.match(claude, /\| Status: ready for handoff/);
  assert.match(claude, /clarity is at least `65%`/);
  assert.match(claude, /clarity is at least `85%`/);
  assert.match(claude, /- `completed`/);
  assert.match(claude, /Recommended next step: <command or step>/);
  assert.match(claude, /ask the user whether the agent should do that next step now/);
  assert.match(claude, /recommendedSkillInvocation/);
  assert.match(claude, /Task: \{\{ARGUMENTS\}\}/);
});

test("rein Cursor rule bodies stay in sync with Claude command bodies", () => {
  const skills = [
    "rein-interview",
    "rein-inspect",
    "rein-cleanup",
    "rein-triage",
    "rein-plan",
    "rein-scope",
    "rein-diff-review",
    "rein-verify",
    "rein-retro",
  ];

  const stripFrontmatter = (text) => {
    const match = text.match(/^---\n[\s\S]*?\n---\n?/);
    return match ? text.slice(match[0].length) : text;
  };

  for (const skill of skills) {
    const claudeBody = stripFrontmatter(
      fs.readFileSync(path.join(repoRoot, ".claude", "commands", `${skill}.md`), "utf8"),
    );
    const cursorRaw = fs.readFileSync(
      path.join(repoRoot, ".cursor", "rules", `${skill}.mdc`),
      "utf8",
    );
    const cursorFrontmatter = cursorRaw.match(/^---\n[\s\S]*?\n---\n?/);
    assert.ok(cursorFrontmatter, `cursor rule ${skill} must have frontmatter`);
    assert.match(
      cursorFrontmatter[0],
      /alwaysApply: false/,
      `cursor rule ${skill} must use alwaysApply: false`,
    );
    assert.match(
      cursorFrontmatter[0],
      /description:/,
      `cursor rule ${skill} must have description`,
    );

    const cursorBody = stripFrontmatter(cursorRaw);
    assert.equal(cursorBody, claudeBody, `cursor rule ${skill} body drifted from claude command`);
  }
});

test("rein status supports machine-readable JSON output", () => {
  const targetRepo = fs.mkdtempSync(path.join(os.tmpdir(), "rein-status-json-"));
  const output = parseJson(
    runCli(cliPath, ["status", "--repo", targetRepo, "--json"], {
      cwd: repoRoot,
    }),
  );

  assert.equal(output.installed, false);
  assert.equal(output.scope, "repo");
  assert.equal(output.target, targetRepo);
});
