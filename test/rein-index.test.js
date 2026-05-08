import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { cliPath, runCli } from "../test-support/support.js";

function parseJson(output) {
  return JSON.parse(output.toString());
}

function writeIndexFixture(targetRepo) {
  fs.writeFileSync(
    path.join(targetRepo, "REIN.md"),
    [
      "# REIN",
      "",
      "The protocol requires evidence before claims and clear source paths.",
      "Verification must prove the real requirement, not only a proxy check.",
    ].join("\n"),
    "utf8",
  );
  fs.writeFileSync(
    path.join(targetRepo, "README.md"),
    ["# Fixture", "", "This project uses rein go, rein interview, and rein verify."].join("\n"),
    "utf8",
  );

  const specDir = path.join(targetRepo, ".rein", "specs", "rein-interview-vector-canary");
  fs.mkdirSync(specDir, { recursive: true });
  fs.writeFileSync(
    path.join(specDir, "result.json"),
    `${JSON.stringify(
      {
        acceptanceCriteria: ["The evidence index returns the pressure canary constraint."],
        constraints: [
          "Never skip the pressure canary verification gate.",
          "The index must stay local and rebuildable from source artifacts.",
        ],
        decisionBoundaries: ["A stale source must not be trusted as active evidence."],
        desiredOutcome: "A local evidence vector index for REIN artifacts.",
        intent: "Index REIN decisions with pressure-aware retrieval.",
        outOfScope: ["Remote embedding calls in the default path."],
        technicalContext: ["Artifacts live under .rein/ and are the source of truth."],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const goDir = path.join(targetRepo, ".rein", "go", "rein-go-vector-canary");
  fs.mkdirSync(goDir, { recursive: true });
  fs.writeFileSync(
    path.join(goDir, "verify.json"),
    `${JSON.stringify(
      {
        objective: "Verify that stale evidence is filtered before query results are returned.",
        stage: "verify",
        task: "pressure canary evidence retrieval",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

test("rein index builds a local vector store and queries pressure-aware evidence", () => {
  const targetRepo = fs.mkdtempSync(path.join(os.tmpdir(), "rein-index-"));
  writeIndexFixture(targetRepo);

  const built = parseJson(runCli(cliPath, ["index", "build", "--json"], { cwd: targetRepo }));

  assert.equal(built.status, "ready");
  assert.equal(built.vectorDimensions, 384);
  assert.ok(built.sourceCount >= 4);
  assert.ok(built.chunkCount >= 4);
  assert.equal(built.algorithm.vectorizer, "local-feature-hash-fnv1a-signed-l2");
  assert.equal(built.algorithm.lexical, "bm25");

  const vectorPath = path.join(targetRepo, ".rein", "index", "vectors.f32");
  assert.equal(fs.statSync(vectorPath).size, built.chunkCount * 384 * 4);

  const status = parseJson(runCli(cliPath, ["index", "status", "--json"], { cwd: targetRepo }));
  assert.equal(status.status, "ready");
  assert.equal(status.staleSourceCount, 0);

  const queried = parseJson(
    runCli(
      cliPath,
      ["index", "query", "pressure canary verification constraint", "--limit", "3", "--json"],
      { cwd: targetRepo },
    ),
  );

  assert.equal(queried.status, "ready");
  assert.equal(
    queried.results[0].sourcePath,
    ".rein/specs/rein-interview-vector-canary/result.json",
  );
  assert.ok(queried.results[0].pressureSignals.includes("constraint"));
  assert.ok(queried.results[0].scores.vector > 0);
  assert.ok(queried.results[0].scores.lexical > 0);
});

test("rein index status detects stale sources and query filters stale chunks", () => {
  const targetRepo = fs.mkdtempSync(path.join(os.tmpdir(), "rein-index-stale-"));
  writeIndexFixture(targetRepo);

  runCli(cliPath, ["index", "build", "--json"], { cwd: targetRepo });
  const staleSource = path.join(
    targetRepo,
    ".rein",
    "specs",
    "rein-interview-vector-canary",
    "result.json",
  );
  fs.writeFileSync(staleSource, '{"intent":"changed after indexing"}\n', "utf8");

  const status = parseJson(runCli(cliPath, ["index", "status", "--json"], { cwd: targetRepo }));
  assert.equal(status.status, "stale");
  assert.equal(status.staleSourceCount, 1);
  assert.deepEqual(status.changedSources, [".rein/specs/rein-interview-vector-canary/result.json"]);

  const queried = parseJson(
    runCli(
      cliPath,
      ["index", "query", "pressure canary verification constraint", "--limit", "5", "--json"],
      { cwd: targetRepo },
    ),
  );

  assert.equal(queried.indexStatus, "stale");
  assert.equal(queried.staleSourceCount, 1);
  assert.ok(
    queried.results.every(
      (result) => result.sourcePath !== ".rein/specs/rein-interview-vector-canary/result.json",
    ),
  );
});

test("rein index query reports a missing index clearly", () => {
  const targetRepo = fs.mkdtempSync(path.join(os.tmpdir(), "rein-index-missing-"));

  const status = parseJson(runCli(cliPath, ["index", "status", "--json"], { cwd: targetRepo }));
  assert.equal(status.status, "missing");

  assert.throws(
    () => runCli(cliPath, ["index", "query", "anything", "--json"], { cwd: targetRepo }),
    (error) => {
      const payload = parseJson(error.stdout);
      assert.match(payload.error.message, /No REIN evidence index found/);
      assert.equal(payload.error.code, "missing_index");
      return true;
    },
  );
});
