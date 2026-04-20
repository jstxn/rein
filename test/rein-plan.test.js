import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { repoRoot } from "../test-support/support.js";

test("rein-plan Claude and Codex prompt copies stay in sync and consume interview result bundles", () => {
  const claude = fs.readFileSync(
    path.join(repoRoot, ".claude", "commands", "rein-plan.md"),
    "utf8",
  );
  const codex = fs.readFileSync(
    path.join(repoRoot, ".codex", "skills", "rein-plan", "SKILL.md"),
    "utf8",
  );

  assert.equal(codex, claude);
  assert.match(claude, /--from-interview <slug\|path>/);
  assert.match(claude, /rein interview handoff --to plan/);
  assert.match(claude, /recommendedSkillInvocation/);
  assert.match(claude, /rein-interview-\*\/result\.json/);
  assert.match(claude, /treat it as the primary source of truth/);
  assert.match(claude, /Task: \{\{ARGUMENTS\}\}/);
});
