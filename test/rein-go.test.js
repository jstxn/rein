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
    acceptanceCriteria: ["A single flow can start from a vague task"],
    assumptions: ["Interview output drives the rest of the flow"],
    constraints: ["Stop on failed stages", "Keep installer philosophy stable"],
    decisionBoundaries: ["Use rein go as the top-level public entrypoint"],
    desiredOutcome: "A unified flow command",
    executionBridge: ["plan", "implementation"],
    inScope: ["Top-level command", "Interview handoff", "Later stage orchestration"],
    intent: "Unify the REIN flow under one public entrypoint",
    outOfScope: ["Installer rewrite"],
    pressureFindings: ["The command should fail closed on stage failure"],
    technicalContext: ["rein-interview already has a runtime", "later stages are still skills"],
    title: "rein go",
    transcriptSummary: "Use one flow command with interview artifact handoff.",
  });
}

function createCompletedInterview(targetRepo, idea = "rein go bundle") {
  const initState = parseJson(
    runCli(cliPath, ["interview", "init", "--idea", idea, "--json"], {
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
      "Need one flow command.",
      "--scores",
      '{"intent":0.95,"outcome":0.9,"scope":0.9,"constraints":0.9,"success":0.9,"context":0.9}',
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

  return initState.slug;
}

test("rein go starts a fresh flow and initializes interview state", () => {
  const targetRepo = fs.mkdtempSync(path.join(os.tmpdir(), "rein-go-fresh-"));
  const output = parseJson(runCli(cliPath, ["go", "Build rein go", "--json"], { cwd: targetRepo }));

  assert.equal(output.mode, "fresh");
  assert.equal(output.publicCommand, "rein go");
  assert.deepEqual(output.wrappers, ["$rein-go", "/rein-go"]);
  assert.equal(output.failurePolicy, "stop-on-any-stage-failure");
  assert.equal(output.currentStage, "interview");
  assert.equal(output.resumeFrom, "interview");
  assert.equal(output.status, "in_progress");
  assert.equal(output.nextAction, "continue-interview");
  assert.equal(output.stageResults.interview.status, "ready");
  assert.equal(output.stageSummary.ready, 1);
  assert.equal(output.stageSummary.pending, 5);
  assert.ok(fs.existsSync(output.artifactPaths.state));
  assert.ok(fs.existsSync(output.sourceInterview.statePath));
  assert.match(output.recommendedCommand, /rein interview next --slug build-rein-go --json/);
});

test("rein go from an interview bundle completes planning and readies implementation", () => {
  const targetRepo = fs.mkdtempSync(path.join(os.tmpdir(), "rein-go-interview-"));
  const interviewSlug = createCompletedInterview(targetRepo);

  const output = parseJson(
    runCli(cliPath, ["go", "--from-interview", interviewSlug, "--json"], { cwd: targetRepo }),
  );

  assert.equal(output.mode, "from-interview");
  assert.equal(output.currentStage, "implementation");
  assert.equal(output.stageResults.interview.status, "completed");
  assert.equal(output.stageResults.plan.status, "completed");
  assert.equal(output.stageResults.implementation.status, "ready");
  assert.equal(output.stageSummary.completed, 2);
  assert.equal(output.stageSummary.ready, 1);
  assert.equal(output.stageSummary.pending, 3);
  assert.match(output.sourceInterview.desiredOutcome, /unified flow command/);
  assert.ok(fs.existsSync(output.artifactPaths.plan));

  const planPayload = JSON.parse(fs.readFileSync(output.artifactPaths.plan, "utf8"));
  assert.equal(planPayload.sourceInterview.slug, interviewSlug);
  assert.equal(planPayload.stages[0].stage, "implementation");
});

test("rein go resume advances a completed interview into planning and implementation", () => {
  const targetRepo = fs.mkdtempSync(path.join(os.tmpdir(), "rein-go-resume-"));
  const started = parseJson(
    runCli(cliPath, ["go", "Build rein go resume", "--json"], { cwd: targetRepo }),
  );

  runCli(
    cliPath,
    [
      "interview",
      "update-round",
      "--slug",
      started.slug,
      "--round",
      "1",
      "--target",
      "intent",
      "--question",
      "Why now?",
      "--answer",
      "Need one flow command.",
      "--scores",
      '{"intent":0.95,"outcome":0.9,"scope":0.9,"constraints":0.9,"success":0.9,"context":0.9}',
      "--non-goals-explicit",
      "--decision-boundaries-explicit",
      "--pressure-pass-complete",
      "--json",
    ],
    { cwd: targetRepo },
  );

  runCli(
    cliPath,
    ["interview", "crystallize", "--slug", started.slug, "--summary", summaryPayload(), "--json"],
    { cwd: targetRepo },
  );

  const resumed = parseJson(
    runCli(cliPath, ["go", "resume", "--slug", started.slug, "--json"], { cwd: targetRepo }),
  );

  assert.equal(resumed.currentStage, "implementation");
  assert.equal(resumed.stageResults.interview.status, "completed");
  assert.equal(resumed.stageResults.plan.status, "completed");
  assert.equal(resumed.stageResults.implementation.status, "ready");
  assert.ok(fs.existsSync(resumed.artifactPaths.plan));
});

test("rein go status reads the persisted flow state", () => {
  const targetRepo = fs.mkdtempSync(path.join(os.tmpdir(), "rein-go-status-"));
  const started = parseJson(
    runCli(cliPath, ["go", "Build rein go status", "--json"], { cwd: targetRepo }),
  );

  const status = parseJson(
    runCli(cliPath, ["go", "status", "--slug", started.slug, "--json"], { cwd: targetRepo }),
  );

  assert.equal(status.slug, started.slug);
  assert.equal(status.currentStage, "interview");
  assert.equal(status.stageResults.interview.status, "ready");
});

test("rein go refuses to overwrite an existing flow slug without force", () => {
  const targetRepo = fs.mkdtempSync(path.join(os.tmpdir(), "rein-go-duplicate-"));

  runCli(cliPath, ["go", "--slug", "same-flow", "Build rein go duplicate", "--json"], {
    cwd: targetRepo,
  });

  assert.throws(
    () =>
      runCli(cliPath, ["go", "--slug", "same-flow", "Build rein go duplicate", "--json"], {
        cwd: targetRepo,
      }),
    (error) => {
      const payload = parseJson(error.stdout);
      assert.match(payload.error.message, /rein go state already exists for slug "same-flow"/);
      return true;
    },
  );
});

test("rein go advance carries changed files through downstream stages to completion", () => {
  const targetRepo = fs.mkdtempSync(path.join(os.tmpdir(), "rein-go-advance-"));
  const interviewSlug = createCompletedInterview(targetRepo);
  const started = parseJson(
    runCli(cliPath, ["go", "--from-interview", interviewSlug, "--json"], { cwd: targetRepo }),
  );

  const changedFiles = JSON.stringify(["lib/core/go-workflow.js", "test/rein-go.test.js"]);
  const implementationDone = parseJson(
    runCli(
      cliPath,
      [
        "go",
        "advance",
        "--slug",
        started.slug,
        "--stage",
        "implementation",
        "--status",
        "completed",
        "--summary",
        "Implemented the requested runtime output changes.",
        "--changed-files",
        changedFiles,
        "--json",
      ],
      { cwd: targetRepo },
    ),
  );
  assert.equal(implementationDone.currentStage, "cleanup");
  assert.deepEqual(implementationDone.changedFiles, JSON.parse(changedFiles));
  assert.equal(implementationDone.stageResults.cleanup.status, "ready");

  const cleanupDone = parseJson(
    runCli(
      cliPath,
      [
        "go",
        "advance",
        "--slug",
        started.slug,
        "--stage",
        "cleanup",
        "--status",
        "completed",
        "--summary",
        "Cleanup stayed bounded to the implementation diff.",
        "--json",
      ],
      { cwd: targetRepo },
    ),
  );
  assert.equal(cleanupDone.currentStage, "review");
  assert.equal(cleanupDone.stageResults.review.status, "ready");

  const reviewDone = parseJson(
    runCli(
      cliPath,
      [
        "go",
        "advance",
        "--slug",
        started.slug,
        "--stage",
        "review",
        "--status",
        "completed",
        "--summary",
        "Review found no remaining issues.",
        "--json",
      ],
      { cwd: targetRepo },
    ),
  );
  assert.equal(reviewDone.currentStage, "verify");
  assert.equal(reviewDone.stageResults.verify.status, "ready");

  const verifyDone = parseJson(
    runCli(
      cliPath,
      [
        "go",
        "advance",
        "--slug",
        started.slug,
        "--stage",
        "verify",
        "--status",
        "completed",
        "--summary",
        "Verification passed.",
        "--json",
      ],
      { cwd: targetRepo },
    ),
  );
  assert.equal(verifyDone.status, "completed");
  assert.equal(verifyDone.currentStage, null);
  assert.equal(verifyDone.stageResults.verify.status, "completed");
});

test("rein go blocks the review stage when diff tooling is unavailable", () => {
  const targetRepo = fs.mkdtempSync(path.join(os.tmpdir(), "rein-go-review-blocked-"));
  const interviewSlug = createCompletedInterview(targetRepo);
  const started = parseJson(
    runCli(cliPath, ["go", "--from-interview", interviewSlug, "--json"], { cwd: targetRepo }),
  );

  runCli(
    cliPath,
    [
      "go",
      "advance",
      "--slug",
      started.slug,
      "--stage",
      "implementation",
      "--status",
      "completed",
      "--summary",
      "Implementation done.",
      "--changed-files",
      '["lib/core/go-workflow.js"]',
      "--json",
    ],
    { cwd: targetRepo },
  );

  const cleanupBlocked = parseJson(
    runCli(
      cliPath,
      [
        "go",
        "advance",
        "--slug",
        started.slug,
        "--stage",
        "cleanup",
        "--status",
        "completed",
        "--summary",
        "Cleanup done.",
        "--json",
      ],
      {
        cwd: targetRepo,
        env: {
          ...process.env,
          REIN_GO_FORCE_DIFF_BLOCKER: "Simulated diff tooling failure",
        },
      },
    ),
  );

  assert.equal(cleanupBlocked.currentStage, "review");
  assert.equal(cleanupBlocked.status, "blocked");
  assert.match(cleanupBlocked.stopReason, /Simulated diff tooling failure/);
  assert.equal(cleanupBlocked.stageResults.review.status, "blocked");
});

test("rein go blocks implementation when repo dependencies are missing", () => {
  const targetRepo = fs.mkdtempSync(path.join(os.tmpdir(), "rein-go-missing-deps-"));
  fs.writeFileSync(
    path.join(targetRepo, "package.json"),
    JSON.stringify({ name: "rein-go-missing-deps", private: true }),
    "utf8",
  );

  const interviewSlug = createCompletedInterview(targetRepo, "missing deps bundle");
  const output = parseJson(
    runCli(cliPath, ["go", "--from-interview", interviewSlug, "--json"], { cwd: targetRepo }),
  );

  assert.equal(output.currentStage, "implementation");
  assert.equal(output.status, "blocked");
  assert.equal(output.stageResults.implementation.status, "blocked");
  assert.match(output.stopReason, /No node_modules directory was found/);
});

test("rein-go prompt copies stay aligned across Codex, Claude, and Cursor", () => {
  const codex = fs.readFileSync(
    path.join(repoRoot, ".codex", "skills", "rein-go", "SKILL.md"),
    "utf8",
  );
  const claude = fs.readFileSync(path.join(repoRoot, ".claude", "commands", "rein-go.md"), "utf8");
  const cursorRaw = fs.readFileSync(
    path.join(repoRoot, ".cursor", "rules", "rein-go.mdc"),
    "utf8",
  );
  const cursorBody = cursorRaw.replace(/^---\n[\s\S]*?\n---\n?/, "");

  assert.equal(codex, claude);
  assert.equal(cursorBody, claude.replace(/^---\n[\s\S]*?\n---\n?/, ""));
  assert.match(codex, /Public entrypoint: `rein go`/);
  assert.match(codex, /Wrapper triggers: `\$rein-go` and `\/rein-go`/);
  assert.match(codex, /rein go --from-interview <slug\|path> --json/);
  assert.match(codex, /rein go status --slug <slug> --json/);
  assert.match(codex, /rein go resume --slug <slug> --json/);
  assert.match(codex, /rein go advance --slug <slug> --stage <stage> --status <completed\|failed\|blocked> \.\.\. --json/);
  assert.match(codex, /rein-cleanup/);
  assert.match(codex, /rein-review/);
  assert.match(codex, /rein-verify/);
  assert.doesNotMatch(codex, /diff review/);
  assert.doesNotMatch(codex, /rein-diff-review/);
});
