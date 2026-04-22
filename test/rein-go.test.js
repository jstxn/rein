import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { cliPath, runCli } from "../test-support/support.js";

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

test("rein go builds a fresh flow manifest from a task description", () => {
  const targetRepo = fs.mkdtempSync(path.join(os.tmpdir(), "rein-go-fresh-"));
  const output = parseJson(runCli(cliPath, ["go", "Build rein go", "--json"], { cwd: targetRepo }));

  assert.equal(output.mode, "fresh");
  assert.equal(output.publicCommand, "rein go");
  assert.deepEqual(output.wrappers, ["$rein-go", "/rein-go"]);
  assert.equal(output.failurePolicy, "stop-on-any-stage-failure");
  assert.equal(output.stages[0].id, "interview");
  assert.equal(output.stages[0].status, "pending");
  assert.match(output.stages[0].commandHint, /rein interview init --idea/);
  assert.equal(output.stages[1].id, "plan");
  assert.equal(output.stages[1].status, "blocked");
});

test("rein go consumes a completed interview bundle and readies the plan stage", () => {
  const targetRepo = fs.mkdtempSync(path.join(os.tmpdir(), "rein-go-interview-"));

  const initState = parseJson(
    runCli(cliPath, ["interview", "init", "--idea", "rein go bundle", "--json"], {
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

  const output = parseJson(
    runCli(cliPath, ["go", "--from-interview", initState.slug, "--json"], { cwd: targetRepo }),
  );

  assert.equal(output.mode, "from-interview");
  assert.equal(output.sourceInterview.slug, initState.slug);
  assert.match(output.sourceInterview.desiredOutcome, /unified flow command/);
  assert.equal(output.stages[0].id, "interview");
  assert.equal(output.stages[0].status, "completed");
  assert.equal(output.stages[1].id, "plan");
  assert.equal(output.stages[1].status, "ready");
  assert.equal(output.stages[1].commandHint, `rein-plan --from-interview ${initState.slug}`);
  assert.equal(output.stages[2].id, "implementation");
  assert.equal(output.stages[2].status, "pending");
});
