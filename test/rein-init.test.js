import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(repoRoot, "bin", "rein.js");

test("rein init --repo creates .rein surfaces and installs .rein-based packaged skills", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rein-init-"));
  const targetRepo = path.join(tempRoot, "target");

  fs.mkdirSync(targetRepo, { recursive: true });

  execFileSync(process.execPath, [cliPath, "init", "--repo", targetRepo, "--force"], {
    cwd: repoRoot,
    stdio: "pipe",
  });

  const reinDir = path.join(targetRepo, ".rein");
  const reinCodebaseDir = path.join(targetRepo, ".rein", "codebase");
  const skillPath = path.join(targetRepo, ".codex", "skills", "deep-interview", "SKILL.md");
  const inspectSkillPath = path.join(targetRepo, ".codex", "skills", "deep-inspect", "SKILL.md");
  const skillBody = fs.readFileSync(skillPath, "utf8");
  const inspectSkillBody = fs.readFileSync(inspectSkillPath, "utf8");

  assert.ok(fs.existsSync(reinDir), "expected rein init to create a .rein directory");
  assert.ok(fs.existsSync(reinCodebaseDir), "expected rein init to create a .rein/codebase directory");
  assert.match(skillBody, /\.rein\/context\//);
  assert.match(skillBody, /\.rein\/specs\//);
  assert.doesNotMatch(skillBody, /\.omx\//);
  assert.match(inspectSkillBody, /\.rein\/codebase\//);
  assert.doesNotMatch(inspectSkillBody, /docs\/codebase\//);
});
