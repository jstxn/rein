import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const REIN_BLOCK_START = "<!-- REIN harness start -->";
const REIN_BLOCK_END = "<!-- REIN harness end -->";

const REPO_SKILLS = [
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

// ANSI styling — zero dependencies, respects NO_COLOR
const colorOk = process.env.NO_COLOR == null && process.env.TERM !== "dumb";
const fmt = (code, text) => (colorOk ? `\x1b[${code}m${text}\x1b[0m` : text);
const dim = (t) => fmt("2", t);
const bold = (t) => fmt("1", t);
const green = (t) => fmt("32", t);
const yellow = (t) => fmt("33", t);
const cyan = (t) => fmt("36", t);
const red = (t) => fmt("31", t);

const icons = {
  ok: green("✓"),
  skip: yellow("→"),
  fail: red("✗"),
  arrow: cyan("▸"),
};

function banner() {
  const version = dim(`v${getPackageVersion()}`);
  console.log("");
  console.log(`  ${bold("REIN")} ${version}`);
  console.log(`  ${dim("Regulated Execution and Inference Navigation")}`);
  console.log("");
}

function getPackageVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"));
  return pkg.version || "unknown";
}

function usage() {
  return [
    "",
    `  ${bold("REIN")} ${dim(`v${getPackageVersion()}`)}`,
    `  ${dim("Regulated Execution and Inference Navigation")}`,
    "",
    `  ${bold("Usage")}`,
    `    ${dim("$")} rein init`,
    `    ${dim("$")} rein init --repo [path] [--codex] [--claude]`,
    `    ${dim("$")} rein init --user [--codex] [--claude]`,
    `    ${dim("$")} rein status [--repo path]`,
    `    ${dim("$")} rein update [--repo path] [--codex] [--claude]`,
    `    ${dim("$")} rein remove [--repo path] [--yes] [--codex] [--claude]`,
    "",
    `  ${bold("Commands")}`,
    `    ${bold("init")}     Install REIN into a repository or user-level setup`,
    `    ${bold("status")}   Show what REIN surfaces are installed and their version`,
    `    ${bold("update")}   Re-install REIN surfaces, replacing existing files`,
    `    ${bold("remove")}   Uninstall REIN from a repository`,
    "",
    `  ${bold("Tool Flags")}`,
    `    ${bold("--codex")}   Target Codex (.codex/skills/, AGENTS.md)`,
    `    ${bold("--claude")}  Target Claude Code (.claude/commands/, CLAUDE.md)`,
    `    ${dim("If neither flag is given, interactive init asks; other commands auto-detect.")}`,
    "",
  ].join("\n");
}

function exists(target) {
  return fs.existsSync(target);
}

function ensureDir(target) {
  fs.mkdirSync(target, { recursive: true });
}

function samePath(a, b) {
  return path.resolve(a) === path.resolve(b);
}

function copyFileSafe(src, dest, force) {
  const name = path.basename(dest);
  if (samePath(src, dest)) {
    return `${icons.skip} ${name} ${dim("(in place)")}`;
  }
  if (exists(dest) && !force) {
    return `${icons.skip} ${name} ${dim("(exists)")}`;
  }
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  return `${icons.ok} ${name}`;
}

function copyDirSafe(src, dest, force) {
  const name = path.basename(dest);
  if (samePath(src, dest)) {
    return `${icons.skip} ${name} ${dim("(in place)")}`;
  }
  if (exists(dest) && !force) {
    return `${icons.skip} ${name} ${dim("(exists)")}`;
  }
  if (exists(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
  ensureDir(path.dirname(dest));
  fs.cpSync(src, dest, { recursive: true });
  return `${icons.ok} ${name}`;
}

function missingPackagedAssets() {
  const requiredPaths = [
    "REIN.md",
    "VERIFY.md",
    ...REPO_SKILLS.map((skill) => path.join(".codex", "skills", skill, "SKILL.md")),
    ...REPO_SKILLS.map((skill) => path.join(".claude", "commands", `${skill}.md`)),
  ];

  return requiredPaths.filter((relativePath) => !exists(path.join(REPO_ROOT, relativePath)));
}

function validatePackagedAssets() {
  const missing = missingPackagedAssets();
  if (missing.length === 0) {
    return;
  }

  const formatted = missing.map((relativePath) => `- ${relativePath}`).join("\n");
  throw new Error(
    `REIN package is incomplete. Missing bundled assets:\n${formatted}\nRestore or reinstall REIN before running \`rein init\`.`,
  );
}

function findGitRoot(startDir) {
  let current = path.resolve(startDir);
  while (true) {
    if (exists(path.join(current, ".git"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function reinBlock(reinPathReference) {
  return `${REIN_BLOCK_START}
## REIN

Follow \`${reinPathReference}\` for code modifications in this repo.

### REIN Artifacts
- Codebase inspection docs from \`rein-inspect\`: \`.rein/codebase/\`
- Interview artifacts from \`rein-interview\`: \`.rein/context/\`, \`.rein/interviews/\`, \`.rein/specs/\`

### Workflow
- use \`rein-interview\` when requirements are vague, broad, or missing boundaries
- use \`rein-inspect\` when you need a durable map of the repo or subsystem before implementation
- use \`rein-triage\` before ambiguous or multi-file work
- use \`rein-plan\` to break complex work into sequenced steps with checkpoints
- use \`rein-scope\` when requirements are too large, conflicting, or need negotiation
- use \`rein-diff-review\` to self-review your diff before committing
- use \`rein-cleanup\` for cleanup, deslop, or refactor work after behavior is locked
- use \`rein-verify\` before declaring completion

### Guardrails
- visible test passes are not sufficient
- do not modify tests to hide defects
- if constraints conflict, stop and report the conflict
${REIN_BLOCK_END}
`;
}

function upsertGuidance(dest, reinPathReference) {
  const label = path.basename(dest);
  if (!exists(dest)) {
    ensureDir(path.dirname(dest));
    fs.writeFileSync(dest, `${reinBlock(reinPathReference)}\n`, "utf8");
    return `${icons.ok} ${label} ${dim("(created)")}`;
  }

  const existing = fs.readFileSync(dest, "utf8");

  if (existing.includes(REIN_BLOCK_START) && existing.includes(REIN_BLOCK_END)) {
    const startIndex = existing.indexOf(REIN_BLOCK_START);
    const endIndex = existing.indexOf(REIN_BLOCK_END) + REIN_BLOCK_END.length;
    const before = existing.slice(0, startIndex);
    let after = existing.slice(endIndex);
    if (after.startsWith("\n")) {
      after = after.slice(1);
    }
    const updated = `${before}${reinBlock(reinPathReference)}\n${after}`;
    fs.writeFileSync(dest, updated, "utf8");
    return `${icons.ok} ${label} ${dim("(updated)")}`;
  }

  if (
    existing.includes(`follow \`${reinPathReference}\``) ||
    existing.includes("follow `REIN.md`")
  ) {
    return `${icons.skip} ${label} ${dim("(already present)")}`;
  }

  const separator = existing.endsWith("\n") ? "\n" : "\n\n";
  fs.writeFileSync(dest, `${existing}${separator}${reinBlock(reinPathReference)}\n`, "utf8");
  return `${icons.ok} ${label} ${dim("(appended)")}`;
}

function removeGuidanceBlock(dest) {
  const label = path.basename(dest);
  if (!exists(dest)) {
    return `${icons.skip} ${label} ${dim("(not found)")}`;
  }

  const existing = fs.readFileSync(dest, "utf8");

  if (!existing.includes(REIN_BLOCK_START) || !existing.includes(REIN_BLOCK_END)) {
    return `${icons.skip} ${label} ${dim("(no REIN block)")}`;
  }

  const startIndex = existing.indexOf(REIN_BLOCK_START);
  const endIndex = existing.indexOf(REIN_BLOCK_END) + REIN_BLOCK_END.length;
  const before = existing.slice(0, startIndex);
  let after = existing.slice(endIndex);
  while (after.startsWith("\n")) {
    after = after.slice(1);
  }

  const result = `${before}${after}`.trim();
  if (result.length === 0) {
    fs.unlinkSync(dest);
    return `${icons.ok} ${label} ${dim("(removed)")}`;
  }

  fs.writeFileSync(dest, `${result}\n`, "utf8");
  return `${icons.ok} ${label} ${dim("(REIN block removed)")}`;
}

function writeInstallNotes(installNotesDir, installedFrom, installedInto, force) {
  ensureDir(installNotesDir);
  fs.writeFileSync(
    path.join(installNotesDir, "AGENTS.snippet.md"),
    `${reinBlock("REIN.md")}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(installNotesDir, "installed-from.txt"),
    `Installed from: ${installedFrom}\nInstalled into: ${installedInto}\nForce mode: ${force ? 1 : 0}\nVersion: ${getPackageVersion()}\n`,
    "utf8",
  );
}

function readInstalledVersion(targetDir, tool) {
  const dir = tool === "claude" ? ".claude" : ".codex";
  const notesFile = path.join(targetDir, dir, "rein-install", "installed-from.txt");
  if (!exists(notesFile)) {
    return null;
  }
  const content = fs.readFileSync(notesFile, "utf8");
  const match = content.match(/^Version:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

function installRepo(targetRepo, force, tools) {
  validatePackagedAssets();
  const resolved = path.resolve(targetRepo);
  if (!exists(resolved)) {
    throw new Error(`Target repository does not exist: ${resolved}`);
  }

  const messages = [];

  ensureDir(path.join(resolved, ".rein"));
  ensureDir(path.join(resolved, ".rein", "codebase"));

  messages.push(copyFileSafe(path.join(REPO_ROOT, "REIN.md"), path.join(resolved, "REIN.md"), force));
  messages.push(copyFileSafe(path.join(REPO_ROOT, "VERIFY.md"), path.join(resolved, "VERIFY.md"), force));

  const nextSteps = [
    `Review ${path.join(resolved, "REIN.md")} and ${path.join(resolved, "VERIFY.md")}`,
    `Use ${path.join(resolved, ".rein")} for repo-local REIN artifacts created by packaged skills, including ${path.join(resolved, ".rein", "codebase")}`,
  ];

  if (tools.includes("codex")) {
    const codexInstallNotes = path.join(resolved, ".codex", "rein-install");
    ensureDir(path.join(resolved, ".codex", "skills"));
    ensureDir(codexInstallNotes);

    for (const skill of REPO_SKILLS) {
      messages.push(
        copyDirSafe(
          path.join(REPO_ROOT, ".codex", "skills", skill),
          path.join(resolved, ".codex", "skills", skill),
          force,
        ),
      );
    }

    messages.push(upsertGuidance(path.join(resolved, "AGENTS.md"), "REIN.md"));
    writeInstallNotes(codexInstallNotes, REPO_ROOT, resolved, force);
    nextSteps.push(`Confirm installed Codex skills under ${path.join(resolved, ".codex", "skills")}`);
  }

  if (tools.includes("claude")) {
    const claudeInstallNotes = path.join(resolved, ".claude", "rein-install");
    ensureDir(path.join(resolved, ".claude", "commands"));
    ensureDir(claudeInstallNotes);

    for (const skill of REPO_SKILLS) {
      messages.push(
        copyFileSafe(
          path.join(REPO_ROOT, ".claude", "commands", `${skill}.md`),
          path.join(resolved, ".claude", "commands", `${skill}.md`),
          force,
        ),
      );
    }

    messages.push(upsertGuidance(path.join(resolved, "CLAUDE.md"), "REIN.md"));
    writeInstallNotes(claudeInstallNotes, REPO_ROOT, resolved, force);
    nextSteps.push(`Confirm installed Claude commands under ${path.join(resolved, ".claude", "commands")}`);
  }

  return {
    scope: "repo",
    target: resolved,
    tools,
    messages,
    nextSteps,
  };
}

function installUser(force, tools) {
  validatePackagedAssets();
  const home = os.homedir();
  const messages = [];
  const nextSteps = [];

  if (tools.includes("codex")) {
    const codexDir = path.join(home, ".codex");
    const reinDir = path.join(codexDir, "rein");
    const skillsDir = path.join(codexDir, "skills");
    const installNotesDir = path.join(codexDir, "rein-install");

    ensureDir(reinDir);
    ensureDir(skillsDir);
    ensureDir(installNotesDir);

    messages.push(copyFileSafe(path.join(REPO_ROOT, "REIN.md"), path.join(reinDir, "REIN.md"), force));
    messages.push(copyFileSafe(path.join(REPO_ROOT, "VERIFY.md"), path.join(reinDir, "VERIFY.md"), force));

    for (const skill of REPO_SKILLS) {
      messages.push(
        copyDirSafe(
          path.join(REPO_ROOT, ".codex", "skills", skill),
          path.join(skillsDir, skill),
          force,
        ),
      );
    }

    const reinPathReference = path.join(reinDir, "REIN.md");
    messages.push(upsertGuidance(path.join(home, "AGENTS.md"), reinPathReference));
    writeInstallNotes(installNotesDir, REPO_ROOT, home, force);

    nextSteps.push(`Review ${path.join(reinDir, "REIN.md")} and ${path.join(reinDir, "VERIFY.md")}`);
    nextSteps.push(`Confirm installed Codex skills under ${skillsDir}`);
    nextSteps.push(`Review ${path.join(home, "AGENTS.md")} and verify the REIN block is present`);
  }

  if (tools.includes("claude")) {
    const claudeDir = path.join(home, ".claude");
    const reinDir = path.join(claudeDir, "rein");
    const commandsDir = path.join(claudeDir, "commands");
    const installNotesDir = path.join(claudeDir, "rein-install");

    ensureDir(reinDir);
    ensureDir(commandsDir);
    ensureDir(installNotesDir);

    messages.push(copyFileSafe(path.join(REPO_ROOT, "REIN.md"), path.join(reinDir, "REIN.md"), force));
    messages.push(copyFileSafe(path.join(REPO_ROOT, "VERIFY.md"), path.join(reinDir, "VERIFY.md"), force));

    for (const skill of REPO_SKILLS) {
      messages.push(
        copyFileSafe(
          path.join(REPO_ROOT, ".claude", "commands", `${skill}.md`),
          path.join(commandsDir, `${skill}.md`),
          force,
        ),
      );
    }

    const reinPathReference = path.join(reinDir, "REIN.md");
    messages.push(upsertGuidance(path.join(home, "CLAUDE.md"), reinPathReference));
    writeInstallNotes(installNotesDir, REPO_ROOT, home, force);

    nextSteps.push(`Review ${path.join(reinDir, "REIN.md")} and ${path.join(reinDir, "VERIFY.md")}`);
    nextSteps.push(`Confirm installed Claude commands under ${commandsDir}`);
    nextSteps.push(`Review ${path.join(home, "CLAUDE.md")} and verify the REIN block is present`);
  }

  const toolLabel = tools.join(" and ");
  nextSteps.push(`Start a new ${toolLabel} session anywhere under your home directory`);

  return {
    scope: "user",
    target: home,
    tools,
    messages,
    nextSteps,
  };
}

function statusRepo(targetRepo) {
  const resolved = path.resolve(targetRepo);
  if (!exists(resolved)) {
    throw new Error(`Target directory does not exist: ${resolved}`);
  }

  const packageVersion = getPackageVersion();
  const detected = detectInstalledTools(resolved);
  const lines = [];

  lines.push(`  ${bold("Status")} ${dim(resolved)}`);
  lines.push("");

  if (detected.length === 0) {
    lines.push(`    ${red("REIN is not installed in this directory")}`);
    lines.push("");
    return lines.join("\n");
  }

  const check = (label, found) => `    ${found ? icons.ok : icons.fail} ${label}`;

  function showVersion(tool) {
    const installedVersion = readInstalledVersion(resolved, tool);
    const versionLabel = installedVersion || "not found";
    if (!installedVersion) {
      lines.push(`    Package   ${dim(packageVersion)}`);
      lines.push(`    Installed ${red(versionLabel)}`);
    } else if (installedVersion !== packageVersion) {
      lines.push(`    Package   ${dim(packageVersion)}`);
      lines.push(`    Installed ${yellow(installedVersion)} ${dim("→ run")} ${bold("rein update")}`);
    } else {
      lines.push(`    Version   ${green(packageVersion)}`);
    }
  }

  showVersion(detected[0]);

  lines.push("");
  lines.push(`  ${bold("Surfaces")}`);

  lines.push(check("REIN.md", exists(path.join(resolved, "REIN.md"))));
  lines.push(check("VERIFY.md", exists(path.join(resolved, "VERIFY.md"))));
  lines.push(check(".rein/", exists(path.join(resolved, ".rein"))));

  if (detected.includes("codex")) {
    lines.push("");
    lines.push(`  ${bold("Codex")}`);

    const agentsPath = path.join(resolved, "AGENTS.md");
    if (exists(agentsPath)) {
      const content = fs.readFileSync(agentsPath, "utf8");
      const hasBlock = content.includes(REIN_BLOCK_START);
      lines.push(hasBlock
        ? `    ${icons.ok} AGENTS.md`
        : `    ${yellow("~")} AGENTS.md ${dim("(no REIN block)")}`);
    } else {
      lines.push(check("AGENTS.md", false));
    }

    for (const skill of REPO_SKILLS) {
      const found = exists(path.join(resolved, ".codex", "skills", skill, "SKILL.md"));
      lines.push(`    ${found ? icons.ok : icons.fail} ${skill}`);
    }
  }

  if (detected.includes("claude")) {
    lines.push("");
    lines.push(`  ${bold("Claude Code")}`);

    const claudePath = path.join(resolved, "CLAUDE.md");
    if (exists(claudePath)) {
      const content = fs.readFileSync(claudePath, "utf8");
      const hasBlock = content.includes(REIN_BLOCK_START);
      lines.push(hasBlock
        ? `    ${icons.ok} CLAUDE.md`
        : `    ${yellow("~")} CLAUDE.md ${dim("(no REIN block)")}`);
    } else {
      lines.push(check("CLAUDE.md", false));
    }

    for (const skill of REPO_SKILLS) {
      const found = exists(path.join(resolved, ".claude", "commands", `${skill}.md`));
      lines.push(`    ${found ? icons.ok : icons.fail} ${skill}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

async function removeRepo(targetRepo, skipConfirm, tools) {
  const resolved = path.resolve(targetRepo);
  if (!exists(resolved)) {
    throw new Error(`Target directory does not exist: ${resolved}`);
  }

  const messages = [];
  const installed = detectInstalledTools(resolved);
  const remaining = installed.filter((t) => !tools.includes(t));

  if (remaining.length === 0) {
    for (const file of ["REIN.md", "VERIFY.md"]) {
      const filePath = path.join(resolved, file);
      if (exists(filePath)) {
        fs.unlinkSync(filePath);
        messages.push(`${icons.ok} ${file}`);
      }
    }
  }

  if (tools.includes("codex")) {
    for (const skill of REPO_SKILLS) {
      const skillDir = path.join(resolved, ".codex", "skills", skill);
      if (exists(skillDir)) {
        fs.rmSync(skillDir, { recursive: true, force: true });
        messages.push(`${icons.ok} ${skill} ${dim("(codex)")}`);
      }
    }

    const installNotesDir = path.join(resolved, ".codex", "rein-install");
    if (exists(installNotesDir)) {
      fs.rmSync(installNotesDir, { recursive: true, force: true });
      messages.push(`${icons.ok} codex install notes`);
    }

    messages.push(removeGuidanceBlock(path.join(resolved, "AGENTS.md")));
  }

  if (tools.includes("claude")) {
    for (const skill of REPO_SKILLS) {
      const cmdFile = path.join(resolved, ".claude", "commands", `${skill}.md`);
      if (exists(cmdFile)) {
        fs.unlinkSync(cmdFile);
        messages.push(`${icons.ok} ${skill} ${dim("(claude)")}`);
      }
    }

    const installNotesDir = path.join(resolved, ".claude", "rein-install");
    if (exists(installNotesDir)) {
      fs.rmSync(installNotesDir, { recursive: true, force: true });
      messages.push(`${icons.ok} claude install notes`);
    }

    messages.push(removeGuidanceBlock(path.join(resolved, "CLAUDE.md")));
  }

  if (remaining.length === 0) {
    const reinDir = path.join(resolved, ".rein");
    if (exists(reinDir)) {
      let removeArtifacts = false;

      if (skipConfirm) {
        removeArtifacts = false;
      } else {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        try {
          const answer = await rl.question(
            `\n  ${dim(".rein/ contains work artifacts (specs, interviews, codebase maps).")}\n  Remove .rein/ as well? ${dim("[y/N]")} `,
          );
          removeArtifacts = /^y(es)?$/i.test(answer.trim());
        } finally {
          rl.close();
        }
      }

      if (removeArtifacts) {
        fs.rmSync(reinDir, { recursive: true, force: true });
        messages.push(`${icons.ok} .rein/`);
      } else {
        messages.push(`${icons.skip} .rein/ ${dim("(preserved)")}`);
      }
    }
  }

  return messages;
}

function parseArgs(args) {
  const result = {
    command: args[0],
    force: false,
    yes: false,
    repoPath: null,
    user: false,
    codex: false,
    claude: false,
  };

  if (result.command === "-h" || result.command === "--help") {
    result.command = "help";
    return result;
  }

  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--force") {
      result.force = true;
    } else if (arg === "--yes") {
      result.yes = true;
    } else if (arg === "--user") {
      result.user = true;
    } else if (arg === "--codex") {
      result.codex = true;
    } else if (arg === "--claude") {
      result.claude = true;
    } else if (arg === "--repo") {
      const next = args[index + 1];
      if (next && !next.startsWith("--")) {
        result.repoPath = next;
        index += 1;
      } else {
        result.repoPath = process.cwd();
      }
    } else if (arg === "-h" || arg === "--help") {
      result.command = "help";
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return result;
}

function resolveTools(parsed) {
  if (parsed.codex && parsed.claude) return ["codex", "claude"];
  if (parsed.codex) return ["codex"];
  if (parsed.claude) return ["claude"];
  return null;
}

function detectInstalledTools(targetDir) {
  const tools = [];
  if (exists(path.join(targetDir, ".codex", "rein-install"))) tools.push("codex");
  if (exists(path.join(targetDir, ".claude", "rein-install"))) tools.push("claude");
  return tools;
}

async function askChoice(rl, prompt, choices) {
  const rendered = choices.map((choice, index) => `    ${bold(`${index + 1}.`)} ${choice.label}`).join("\n");
  const answer = await rl.question(`  ${prompt}\n${rendered}\n  ${cyan(">")} `);
  const numeric = Number.parseInt(answer.trim(), 10);
  if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= choices.length) {
    return choices[numeric - 1].value;
  }
  const direct = choices.find((choice) => choice.value === answer.trim());
  if (direct) {
    return direct.value;
  }
  throw new Error("Invalid selection");
}

async function interactiveInit(parsedTools) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    let tools = parsedTools;
    if (!tools) {
      const toolChoice = await askChoice(rl, "Which tool(s) should REIN target?", [
        { label: "Codex", value: "codex" },
        { label: "Claude Code", value: "claude" },
        { label: "Both", value: "both" },
      ]);
      tools = toolChoice === "both" ? ["codex", "claude"] : [toolChoice];
    }

    const currentRepo = findGitRoot(process.cwd());
    const choices = [];
    choices.push({ label: `User/global level (${os.homedir()})`, value: { mode: "user" } });
    if (currentRepo) {
      choices.push({ label: `This repository (${currentRepo})`, value: { mode: "repo", path: currentRepo } });
    }
    choices.push({ label: "Another repository", value: { mode: "other" } });

    const target = await askChoice(rl, "Where do you want to install REIN?", choices);

    let resolvedTarget = target;
    if (target.mode === "other") {
      const answer = await rl.question(`  Path to the target repository: `);
      resolvedTarget = { mode: "repo", path: path.resolve(answer.trim()) };
    }

    const forceAnswer = await rl.question(`  Overwrite existing REIN files? ${dim("[y/N]")} `);
    const force = /^y(es)?$/i.test(forceAnswer.trim());

    const toolLabel = tools.join(" + ");
    const destLabel = resolvedTarget.mode === "user" ? os.homedir() : resolvedTarget.path;
    const confirm = await rl.question(`  Install REIN (${bold(toolLabel)}) into ${bold(destLabel)}? ${dim("[Y/n]")} `);
    if (/^n(o)?$/i.test(confirm.trim())) {
      throw new Error("Cancelled");
    }

    return {
      mode: resolvedTarget.mode === "user" ? "user" : "repo",
      path: resolvedTarget.path,
      force,
      tools,
    };
  } finally {
    rl.close();
  }
}

function printResult(result) {
  console.log(`  ${bold("Files")}`);
  for (const message of result.messages) {
    if (message) {
      console.log(`    ${message}`);
    }
  }
  console.log("");
  const scope = result.scope === "user" ? "user/global scope" : "repository";
  const toolLabel = result.tools ? ` (${result.tools.join(" + ")})` : "";
  console.log(`  ${green("Done.")} REIN initialized for ${scope}${toolLabel}.`);
  console.log(`  ${dim(result.target)}`);
  console.log("");
  console.log(`  ${bold("Next steps")}`);
  for (const step of result.nextSteps) {
    console.log(`    ${icons.arrow} ${step}`);
  }
  console.log("");
}

function resolveRepoPath(parsed) {
  if (parsed.repoPath) {
    return path.resolve(parsed.repoPath);
  }
  return findGitRoot(process.cwd()) || process.cwd();
}

export async function main(rawArgs) {
  const parsed = parseArgs(rawArgs.length > 0 ? rawArgs : ["help"]);
  if (!parsed.command || parsed.command === "help") {
    console.log(usage());
    return;
  }

  if (parsed.command === "status") {
    banner();
    const target = resolveRepoPath(parsed);
    console.log(statusRepo(target));
    return;
  }

  if (parsed.command === "update") {
    banner();
    const target = resolveRepoPath(parsed);
    const tools = resolveTools(parsed) || detectInstalledTools(target);
    if (tools.length === 0) {
      throw new Error("No REIN installation detected. Run `rein init` first, or specify --codex / --claude.");
    }
    const result = installRepo(target, true, tools);
    printResult(result);
    return;
  }

  if (parsed.command === "remove") {
    banner();
    const target = resolveRepoPath(parsed);
    const tools = resolveTools(parsed) || detectInstalledTools(target);
    if (tools.length === 0) {
      throw new Error("No REIN installation detected. Nothing to remove.");
    }
    console.log(`  ${bold("Removing")} ${dim(`(${tools.join(" + ")})`)}`);
    const messages = await removeRepo(target, parsed.yes, tools);
    for (const message of messages) {
      console.log(`    ${message}`);
    }
    console.log("");
    console.log(`  ${green("Done.")} REIN removed from ${dim(target)}`);
    console.log("");
    return;
  }

  if (parsed.command !== "init") {
    throw new Error(`Unknown command: ${parsed.command}`);
  }

  banner();

  let mode;
  let targetPath = parsed.repoPath;
  let force = parsed.force;
  let tools = resolveTools(parsed);

  if (parsed.user) {
    mode = "user";
  } else if (targetPath) {
    mode = "repo";
  } else if (parsed.yes) {
    const currentRepo = findGitRoot(process.cwd()) || process.cwd();
    mode = "repo";
    targetPath = currentRepo;
  } else {
    const selection = await interactiveInit(tools);
    mode = selection.mode;
    targetPath = selection.path;
    force = selection.force;
    tools = selection.tools;
  }

  if (!tools) {
    tools = ["codex"];
  }

  const result = mode === "user" ? installUser(force, tools) : installRepo(targetPath, force, tools);
  printResult(result);
}
