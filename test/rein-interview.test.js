import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
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
  assert.match(claude, /rein interview init .*--json/);
  assert.match(claude, /rein interview resume --slug <slug> --json/);
  assert.match(claude, /rein interview status --slug <slug> --json/);
  assert.match(claude, /rein interview crystallize --slug <slug> --summary '<json>' --json/);
  assert.match(claude, /- `completed`/);
  assert.match(claude, /Task: \{\{ARGUMENTS\}\}/);
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
