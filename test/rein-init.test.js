import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  cliPath,
  copyRepo,
  escapeRegExp,
  isSymbolicLink,
  repoRoot,
  runCli,
  runCliText,
} from "../test-support/support.js";

test("rein init --repo (default) installs Codex surfaces only", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rein-init-"));
  const targetRepo = path.join(tempRoot, "target");

  fs.mkdirSync(targetRepo, { recursive: true });

  runCli(cliPath, ["init", "--repo", targetRepo, "--force"], {
    cwd: repoRoot,
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

  assert.ok(
    !fs.existsSync(path.join(targetRepo, "CLAUDE.md")),
    "default should not create CLAUDE.md",
  );
  assert.ok(
    !fs.existsSync(path.join(targetRepo, ".claude", "commands")),
    "default should not create .claude/commands",
  );
});

test("rein init --repo --claude installs Claude surfaces only", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rein-init-claude-"));
  const targetRepo = path.join(tempRoot, "target");

  fs.mkdirSync(targetRepo, { recursive: true });

  runCli(cliPath, ["init", "--repo", targetRepo, "--claude", "--force"], {
    cwd: repoRoot,
  });

  const claudePath = path.join(targetRepo, "CLAUDE.md");
  const cmdPath = path.join(targetRepo, ".claude", "commands", "rein-interview.md");
  const inspectCmdPath = path.join(targetRepo, ".claude", "commands", "rein-inspect.md");
  const claudeBody = fs.readFileSync(claudePath, "utf8");
  const cmdBody = fs.readFileSync(cmdPath, "utf8");
  const inspectCmdBody = fs.readFileSync(inspectCmdPath, "utf8");

  assert.ok(fs.existsSync(path.join(targetRepo, ".rein")), "expected .rein directory");
  assert.ok(
    fs.existsSync(path.join(targetRepo, ".rein", "codebase")),
    "expected .rein/codebase directory",
  );
  assert.ok(fs.existsSync(path.join(targetRepo, "REIN.md")), "expected REIN.md");

  assert.match(claudeBody, /## REIN/);
  assert.match(claudeBody, /rein-inspect/);
  assert.match(claudeBody, /rein-interview/);
  assert.match(cmdBody, /\.rein\/context\//);
  assert.match(cmdBody, /\.rein\/specs\//);
  assert.match(inspectCmdBody, /\.rein\/codebase\//);

  assert.ok(
    fs.existsSync(path.join(targetRepo, ".claude", "rein-install", "installed-from.txt")),
    "expected claude install notes",
  );

  assert.ok(
    !fs.existsSync(path.join(targetRepo, "AGENTS.md")),
    "claude-only should not create AGENTS.md",
  );
  assert.ok(
    !fs.existsSync(path.join(targetRepo, ".codex", "skills")),
    "claude-only should not create .codex/skills",
  );
});

test("rein init --repo --codex --claude installs both surfaces", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rein-init-both-"));
  const targetRepo = path.join(tempRoot, "target");

  fs.mkdirSync(targetRepo, { recursive: true });

  runCli(cliPath, ["init", "--repo", targetRepo, "--codex", "--claude", "--force"], {
    cwd: repoRoot,
  });

  assert.ok(fs.existsSync(path.join(targetRepo, ".rein")), "expected .rein directory");
  assert.ok(fs.existsSync(path.join(targetRepo, "REIN.md")), "expected REIN.md");

  assert.ok(fs.existsSync(path.join(targetRepo, "AGENTS.md")), "expected AGENTS.md");
  assert.ok(
    fs.existsSync(path.join(targetRepo, ".codex", "skills", "rein-verify", "SKILL.md")),
    "expected codex skill",
  );
  assert.ok(
    fs.existsSync(path.join(targetRepo, ".codex", "rein-install", "installed-from.txt")),
    "expected codex install notes",
  );

  assert.ok(fs.existsSync(path.join(targetRepo, "CLAUDE.md")), "expected CLAUDE.md");
  assert.ok(
    fs.existsSync(path.join(targetRepo, ".claude", "commands", "rein-verify.md")),
    "expected claude command",
  );
  assert.ok(
    fs.existsSync(path.join(targetRepo, ".claude", "rein-install", "installed-from.txt")),
    "expected claude install notes",
  );
});

test("rein init --repo . --force succeeds when reinstalling a dev checkout into itself", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rein-self-init-"));
  const sourceRepo = path.join(tempRoot, "source");

  copyRepo(sourceRepo);

  const copiedCliPath = path.join(sourceRepo, "bin", "rein.js");

  runCli(copiedCliPath, ["init", "--repo", ".", "--force"], {
    cwd: sourceRepo,
  });

  const restoredSkillPath = path.join(sourceRepo, ".codex", "skills", "rein-interview", "SKILL.md");
  assert.ok(
    fs.existsSync(restoredSkillPath),
    "expected self-reinit to preserve bundled skills in place",
  );
});

test("rein init --repo through a symlink alias is safe for self-reinstall", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rein-self-alias-"));
  const sourceRepo = path.join(tempRoot, "source");
  const aliasRepo = path.join(tempRoot, "alias");

  copyRepo(sourceRepo);
  fs.symlinkSync(sourceRepo, aliasRepo, "dir");

  const copiedCliPath = path.join(sourceRepo, "bin", "rein.js");

  runCli(copiedCliPath, ["init", "--repo", aliasRepo, "--force"], {
    cwd: sourceRepo,
  });

  assert.ok(
    fs.existsSync(path.join(sourceRepo, ".codex", "skills", "rein-interview", "SKILL.md")),
    "expected symlinked self-reinit to preserve bundled skills",
  );
});

test("rein init --link creates linked installs and update/remove preserve the source repo", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rein-link-repo-"));
  const sourceRepo = path.join(tempRoot, "source");
  const targetRepo = path.join(tempRoot, "target");

  copyRepo(sourceRepo);
  fs.mkdirSync(targetRepo, { recursive: true });

  const copiedCliPath = path.join(sourceRepo, "bin", "rein.js");
  const env = { ...process.env, NO_COLOR: "1" };

  runCli(
    copiedCliPath,
    ["init", "--repo", targetRepo, "--codex", "--claude", "--link", "--force"],
    {
      cwd: sourceRepo,
      env,
    },
  );

  assert.ok(isSymbolicLink(path.join(targetRepo, "REIN.md")), "expected linked REIN.md");
  assert.ok(
    isSymbolicLink(path.join(targetRepo, ".codex", "skills", "rein-interview")),
    "expected linked Codex skill directory",
  );
  assert.ok(
    isSymbolicLink(path.join(targetRepo, ".claude", "commands", "rein-interview.md")),
    "expected linked Claude command",
  );
  assert.ok(fs.existsSync(path.join(targetRepo, ".rein", "codebase")), "expected .rein/codebase");
  assert.ok(
    !isSymbolicLink(path.join(targetRepo, "AGENTS.md")),
    "expected AGENTS.md to remain a real file",
  );

  const statusOutput = runCliText(copiedCliPath, ["status", "--repo", targetRepo, "--claude"], {
    cwd: sourceRepo,
    env,
  });

  assert.match(statusOutput, /Mode\s+link/);
  assert.match(statusOutput, /Claude Code/);
  assert.doesNotMatch(statusOutput, /\n {2}Codex\n/);

  runCli(copiedCliPath, ["update", "--repo", targetRepo], {
    cwd: sourceRepo,
    env,
  });

  assert.ok(
    isSymbolicLink(path.join(targetRepo, "REIN.md")),
    "expected update to preserve linked REIN.md",
  );
  assert.ok(
    isSymbolicLink(path.join(targetRepo, ".codex", "skills", "rein-interview")),
    "expected update to preserve linked Codex skills",
  );

  runCli(copiedCliPath, ["remove", "--repo", targetRepo, "--yes"], {
    cwd: sourceRepo,
    env,
  });

  assert.ok(
    !fs.existsSync(path.join(targetRepo, "REIN.md")),
    "expected linked REIN.md to be removed",
  );
  assert.ok(
    !fs.existsSync(path.join(targetRepo, ".codex", "skills", "rein-interview")),
    "expected linked Codex skill to be removed",
  );
  assert.ok(fs.existsSync(path.join(sourceRepo, "REIN.md")), "expected source REIN.md to remain");
  assert.ok(
    fs.existsSync(path.join(sourceRepo, ".codex", "skills", "rein-interview", "SKILL.md")),
    "expected source Codex skill to remain",
  );
});

test("rein init fails clearly when a bundled Codex asset is missing", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rein-init-missing-"));
  const sourceRepo = path.join(tempRoot, "source");
  const targetRepo = path.join(tempRoot, "target");

  copyRepo(sourceRepo);
  fs.mkdirSync(targetRepo, { recursive: true });
  fs.rmSync(path.join(sourceRepo, ".codex", "skills", "rein-interview"), {
    recursive: true,
    force: true,
  });

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

  copyRepo(sourceRepo);
  fs.mkdirSync(targetRepo, { recursive: true });
  fs.unlinkSync(path.join(sourceRepo, ".claude", "commands", "rein-interview.md"));

  const copiedCliPath = path.join(sourceRepo, "bin", "rein.js");

  assert.throws(
    () =>
      execFileSync(
        process.execPath,
        [copiedCliPath, "init", "--repo", targetRepo, "--claude", "--force"],
        {
          cwd: sourceRepo,
          stdio: "pipe",
        },
      ),
    (error) => {
      assert.match(error.stderr.toString(), /REIN package is incomplete/);
      assert.match(error.stderr.toString(), /\.claude\/commands\/rein-interview\.md/);
      return true;
    },
  );
});

test("rein status/update/remove --user work for linked installs", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rein-link-user-"));
  const sourceRepo = path.join(tempRoot, "source");
  const tempHome = path.join(tempRoot, "home");

  copyRepo(sourceRepo);
  fs.mkdirSync(tempHome, { recursive: true });

  const copiedCliPath = path.join(sourceRepo, "bin", "rein.js");
  const env = { ...process.env, HOME: tempHome, NO_COLOR: "1" };

  runCli(copiedCliPath, ["init", "--user", "--claude", "--link", "--force"], {
    cwd: sourceRepo,
    env,
  });

  assert.ok(
    isSymbolicLink(path.join(tempHome, ".claude", "rein", "REIN.md")),
    "expected linked user REIN.md",
  );
  assert.ok(
    isSymbolicLink(path.join(tempHome, ".claude", "commands", "rein-interview.md")),
    "expected linked user Claude command",
  );

  const statusOutput = runCliText(copiedCliPath, ["status", "--user", "--claude"], {
    cwd: sourceRepo,
    env,
  });

  assert.match(statusOutput, /Mode\s+link/);
  assert.match(statusOutput, new RegExp(escapeRegExp(tempHome)));
  assert.doesNotMatch(statusOutput, new RegExp(escapeRegExp(sourceRepo)));

  runCli(copiedCliPath, ["update", "--user", "--claude"], {
    cwd: sourceRepo,
    env,
  });

  assert.ok(
    isSymbolicLink(path.join(tempHome, ".claude", "commands", "rein-interview.md")),
    "expected linked user Claude command after update",
  );

  runCli(copiedCliPath, ["remove", "--user", "--claude", "--yes"], {
    cwd: sourceRepo,
    env,
  });

  assert.ok(
    !fs.existsSync(path.join(tempHome, ".claude", "commands", "rein-interview.md")),
    "expected linked user Claude command to be removed",
  );
  assert.ok(
    fs.existsSync(path.join(sourceRepo, ".claude", "commands", "rein-interview.md")),
    "expected source Claude command to remain after user remove",
  );
});

test("rein init fails clearly without scope in non-interactive mode", () => {
  assert.throws(
    () =>
      runCli(cliPath, ["init"], {
        cwd: repoRoot,
        env: { ...process.env, NO_COLOR: "1", TERM: "dumb" },
      }),
    (error) => {
      assert.match(error.stderr.toString(), /Non-interactive init needs --repo, --user, or --yes/);
      return true;
    },
  );
});

test("rein init can run through guided prompts", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rein-interactive-init-"));
  const targetRepo = path.join(tempRoot, "target");
  fs.mkdirSync(targetRepo, { recursive: true });

  runCli(cliPath, ["init"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      NO_COLOR: "1",
      REIN_FORCE_INTERACTIVE: "1",
      REIN_PROMPT_FIXTURES: JSON.stringify([
        "both",
        { mode: "repo", path: targetRepo },
        true,
        true,
      ]),
    },
  });

  assert.ok(fs.existsSync(path.join(targetRepo, "AGENTS.md")));
  assert.ok(fs.existsSync(path.join(targetRepo, "CLAUDE.md")));
});

test("rein status defaults to the enclosing repo root from nested directories", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rein-status-nested-"));
  const targetRepo = path.join(tempRoot, "target");
  const nestedDir = path.join(targetRepo, "nested", "child");
  fs.mkdirSync(nestedDir, { recursive: true });
  fs.mkdirSync(path.join(targetRepo, ".git"), { recursive: true });

  runCli(cliPath, ["init", "--repo", targetRepo, "--force"], {
    cwd: repoRoot,
  });

  const output = JSON.parse(
    runCli(cliPath, ["status", "--json"], {
      cwd: nestedDir,
    }).toString(),
  );

  assert.equal(output.installed, true);
  assert.equal(fs.realpathSync(output.target), fs.realpathSync(targetRepo));
});

test("bare --repo uses the enclosing repo root from nested directories", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rein-explicit-repo-nested-"));
  const targetRepo = path.join(tempRoot, "target");
  const nestedDir = path.join(targetRepo, "nested", "child");
  fs.mkdirSync(nestedDir, { recursive: true });
  fs.mkdirSync(path.join(targetRepo, ".git"), { recursive: true });

  runCli(cliPath, ["init", "--repo", "--force"], {
    cwd: nestedDir,
  });

  assert.ok(fs.existsSync(path.join(targetRepo, "REIN.md")));
  assert.ok(fs.existsSync(path.join(targetRepo, "AGENTS.md")));
  assert.ok(fs.existsSync(path.join(targetRepo, ".rein")));
  assert.ok(
    !fs.existsSync(path.join(nestedDir, "REIN.md")),
    "expected bare --repo init to avoid writing into the nested cwd",
  );

  const statusOutput = JSON.parse(
    runCli(cliPath, ["status", "--repo", "--json"], {
      cwd: nestedDir,
    }).toString(),
  );
  assert.equal(fs.realpathSync(statusOutput.target), fs.realpathSync(targetRepo));

  runCli(cliPath, ["remove", "--repo", "--yes"], {
    cwd: nestedDir,
  });

  assert.ok(!fs.existsSync(path.join(targetRepo, "REIN.md")));
  assert.ok(!fs.existsSync(path.join(targetRepo, "AGENTS.md")));
  assert.ok(
    !fs.existsSync(path.join(targetRepo, ".codex", "rein-install")),
    "expected bare --repo remove to uninstall from the repo root",
  );
  assert.ok(
    fs.existsSync(path.join(targetRepo, ".rein")),
    "expected .rein to remain preserved at the repo root",
  );
});

test("rein remove requires --yes in non-interactive mode", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rein-remove-no-yes-"));
  const targetRepo = path.join(tempRoot, "target");
  fs.mkdirSync(targetRepo, { recursive: true });

  runCli(cliPath, ["init", "--repo", targetRepo, "--force"], {
    cwd: repoRoot,
  });

  assert.throws(
    () =>
      runCli(cliPath, ["remove", "--repo", targetRepo], {
        cwd: repoRoot,
        env: { ...process.env, NO_COLOR: "1", TERM: "dumb" },
      }),
    (error) => {
      assert.match(error.stderr.toString(), /Non-interactive remove requires --yes/);
      return true;
    },
  );
});

test("rein remove can confirm interactively and preserve .rein artifacts", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rein-remove-interactive-"));
  const targetRepo = path.join(tempRoot, "target");
  fs.mkdirSync(targetRepo, { recursive: true });

  runCli(cliPath, ["init", "--repo", targetRepo, "--force"], {
    cwd: repoRoot,
  });

  runCli(cliPath, ["remove", "--repo", targetRepo], {
    cwd: repoRoot,
    env: {
      ...process.env,
      NO_COLOR: "1",
      REIN_FORCE_INTERACTIVE: "1",
      REIN_PROMPT_FIXTURES: JSON.stringify([true, false]),
    },
  });

  assert.ok(!fs.existsSync(path.join(targetRepo, "REIN.md")));
  assert.ok(fs.existsSync(path.join(targetRepo, ".rein")));
});
