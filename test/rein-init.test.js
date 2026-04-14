import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(repoRoot, "bin", "rein.js");

test("rein init --repo (default) installs Codex surfaces only", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rein-init-"));
  const targetRepo = path.join(tempRoot, "target");

  fs.mkdirSync(targetRepo, { recursive: true });

  execFileSync(process.execPath, [cliPath, "init", "--repo", targetRepo, "--force"], {
    cwd: repoRoot,
    stdio: "pipe",
  });

  const reinDir = path.join(targetRepo, ".rein");
  const reinCodebaseDir = path.join(targetRepo, ".rein", "codebase");
  const skillPath = path.join(targetRepo, ".codex", "skills", "rein-interview", "SKILL.md");
  const inspectSkillPath = path.join(targetRepo, ".codex", "skills", "rein-inspect", "SKILL.md");
  const agentsPath = path.join(targetRepo, "AGENTS.md");
  const skillBody = fs.readFileSync(skillPath, "utf8");
  const inspectSkillBody = fs.readFileSync(inspectSkillPath, "utf8");
  const agentsBody = fs.readFileSync(agentsPath, "utf8");

  assert.ok(fs.existsSync(reinDir), "expected .rein directory");
  assert.ok(fs.existsSync(reinCodebaseDir), "expected .rein/codebase directory");
  assert.match(skillBody, /\.rein\/context\//);
  assert.match(skillBody, /\.rein\/specs\//);
  assert.doesNotMatch(skillBody, /\.omx\//);
  assert.match(inspectSkillBody, /\.rein\/codebase\//);
  assert.doesNotMatch(inspectSkillBody, /docs\/codebase\//);
  assert.match(agentsBody, /## REIN/);
  assert.match(agentsBody, /rein-inspect/);
  assert.match(agentsBody, /rein-interview/);
  assert.match(agentsBody, /\.rein\/codebase\//);
  assert.match(agentsBody, /\.rein\/context\//);
  assert.match(agentsBody, /\.rein\/interviews\//);
  assert.match(agentsBody, /\.rein\/specs\//);

  assert.ok(!fs.existsSync(path.join(targetRepo, "CLAUDE.md")), "default should not create CLAUDE.md");
  assert.ok(!fs.existsSync(path.join(targetRepo, ".claude", "commands")), "default should not create .claude/commands");
});

test("rein init --repo --claude installs Claude surfaces only", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rein-init-claude-"));
  const targetRepo = path.join(tempRoot, "target");

  fs.mkdirSync(targetRepo, { recursive: true });

  execFileSync(process.execPath, [cliPath, "init", "--repo", targetRepo, "--claude", "--force"], {
    cwd: repoRoot,
    stdio: "pipe",
  });

  const claudePath = path.join(targetRepo, "CLAUDE.md");
  const cmdPath = path.join(targetRepo, ".claude", "commands", "rein-interview.md");
  const inspectCmdPath = path.join(targetRepo, ".claude", "commands", "rein-inspect.md");
  const claudeBody = fs.readFileSync(claudePath, "utf8");
  const cmdBody = fs.readFileSync(cmdPath, "utf8");
  const inspectCmdBody = fs.readFileSync(inspectCmdPath, "utf8");

  assert.ok(fs.existsSync(path.join(targetRepo, ".rein")), "expected .rein directory");
  assert.ok(fs.existsSync(path.join(targetRepo, ".rein", "codebase")), "expected .rein/codebase directory");
  assert.ok(fs.existsSync(path.join(targetRepo, "REIN.md")), "expected REIN.md");
  assert.ok(fs.existsSync(path.join(targetRepo, "VERIFY.md")), "expected VERIFY.md");

  assert.match(claudeBody, /## REIN/);
  assert.match(claudeBody, /rein-inspect/);
  assert.match(claudeBody, /rein-interview/);
  assert.match(cmdBody, /\.rein\/context\//);
  assert.match(cmdBody, /\.rein\/specs\//);
  assert.match(inspectCmdBody, /\.rein\/codebase\//);

  assert.ok(fs.existsSync(path.join(targetRepo, ".claude", "rein-install", "installed-from.txt")), "expected claude install notes");

  assert.ok(!fs.existsSync(path.join(targetRepo, "AGENTS.md")), "claude-only should not create AGENTS.md");
  assert.ok(!fs.existsSync(path.join(targetRepo, ".codex", "skills")), "claude-only should not create .codex/skills");
});

test("rein init --repo --codex --claude installs both surfaces", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rein-init-both-"));
  const targetRepo = path.join(tempRoot, "target");

  fs.mkdirSync(targetRepo, { recursive: true });

  execFileSync(process.execPath, [cliPath, "init", "--repo", targetRepo, "--codex", "--claude", "--force"], {
    cwd: repoRoot,
    stdio: "pipe",
  });

  assert.ok(fs.existsSync(path.join(targetRepo, ".rein")), "expected .rein directory");
  assert.ok(fs.existsSync(path.join(targetRepo, "REIN.md")), "expected REIN.md");
  assert.ok(fs.existsSync(path.join(targetRepo, "VERIFY.md")), "expected VERIFY.md");

  assert.ok(fs.existsSync(path.join(targetRepo, "AGENTS.md")), "expected AGENTS.md");
  assert.ok(fs.existsSync(path.join(targetRepo, ".codex", "skills", "rein-verify", "SKILL.md")), "expected codex skill");
  assert.ok(fs.existsSync(path.join(targetRepo, ".codex", "rein-install", "installed-from.txt")), "expected codex install notes");

  assert.ok(fs.existsSync(path.join(targetRepo, "CLAUDE.md")), "expected CLAUDE.md");
  assert.ok(fs.existsSync(path.join(targetRepo, ".claude", "commands", "rein-verify.md")), "expected claude command");
  assert.ok(fs.existsSync(path.join(targetRepo, ".claude", "rein-install", "installed-from.txt")), "expected claude install notes");
});

test("rein init --repo . --force succeeds when reinstalling a dev checkout into itself", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rein-self-init-"));
  const sourceRepo = path.join(tempRoot, "source");

  fs.cpSync(repoRoot, sourceRepo, {
    recursive: true,
    filter: (src) => !src.includes(`${path.sep}.git${path.sep}`) && !src.endsWith(`${path.sep}.git`),
  });

  const copiedCliPath = path.join(sourceRepo, "bin", "rein.js");

  execFileSync(process.execPath, [copiedCliPath, "init", "--repo", ".", "--force"], {
    cwd: sourceRepo,
    stdio: "pipe",
  });

  const restoredSkillPath = path.join(sourceRepo, ".codex", "skills", "rein-interview", "SKILL.md");
  assert.ok(fs.existsSync(restoredSkillPath), "expected self-reinit to preserve bundled skills in place");
});

test("rein init fails clearly when a bundled Codex asset is missing", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rein-init-missing-"));
  const sourceRepo = path.join(tempRoot, "source");
  const targetRepo = path.join(tempRoot, "target");

  fs.cpSync(repoRoot, sourceRepo, {
    recursive: true,
    filter: (src) => !src.includes(`${path.sep}.git${path.sep}`) && !src.endsWith(`${path.sep}.git`),
  });
  fs.mkdirSync(targetRepo, { recursive: true });
  fs.rmSync(path.join(sourceRepo, ".codex", "skills", "rein-interview"), { recursive: true, force: true });

  const copiedCliPath = path.join(sourceRepo, "bin", "rein.js");

  assert.throws(
    () =>
      execFileSync(process.execPath, [copiedCliPath, "init", "--repo", targetRepo, "--force"], {
        cwd: sourceRepo,
        stdio: "pipe",
      }),
    (error) => {
      assert.match(error.stderr.toString(), /REIN package is incomplete/);
      assert.match(error.stderr.toString(), /\.codex\/skills\/rein-interview\/SKILL\.md/);
      return true;
    },
  );
});

test("rein init fails clearly when a bundled Claude asset is missing", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rein-init-missing-claude-"));
  const sourceRepo = path.join(tempRoot, "source");
  const targetRepo = path.join(tempRoot, "target");

  fs.cpSync(repoRoot, sourceRepo, {
    recursive: true,
    filter: (src) => !src.includes(`${path.sep}.git${path.sep}`) && !src.endsWith(`${path.sep}.git`),
  });
  fs.mkdirSync(targetRepo, { recursive: true });
  fs.unlinkSync(path.join(sourceRepo, ".claude", "commands", "rein-interview.md"));

  const copiedCliPath = path.join(sourceRepo, "bin", "rein.js");

  assert.throws(
    () =>
      execFileSync(process.execPath, [copiedCliPath, "init", "--repo", targetRepo, "--claude", "--force"], {
        cwd: sourceRepo,
        stdio: "pipe",
      }),
    (error) => {
      assert.match(error.stderr.toString(), /REIN package is incomplete/);
      assert.match(error.stderr.toString(), /\.claude\/commands\/rein-interview\.md/);
      return true;
    },
  );
});
