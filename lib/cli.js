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

function getPackageVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"));
  return pkg.version || "unknown";
}

function usage() {
  return `Usage:
  rein init
  rein init --repo [path]
  rein init --user
  rein init --repo [path] --force --yes
  rein status [--repo path]
  rein update [--repo path]
  rein eject [--repo path]

Commands:
  init     Install REIN into a repository or user-level Codex setup
  status   Show what REIN surfaces are installed and their version
  update   Re-install REIN surfaces, replacing existing files
  eject    Remove all REIN surfaces from a repository
`;
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
  if (samePath(src, dest)) {
    return `Source and destination are the same file; keeping in place: ${dest}`;
  }
  if (exists(dest) && !force) {
    return `Skipping existing file: ${dest}`;
  }
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  return `Copied file: ${dest}`;
}

function copyDirSafe(src, dest, force) {
  if (samePath(src, dest)) {
    return `Source and destination are the same directory; keeping in place: ${dest}`;
  }
  if (exists(dest) && !force) {
    return `Skipping existing directory: ${dest}`;
  }
  if (exists(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
  ensureDir(path.dirname(dest));
  fs.cpSync(src, dest, { recursive: true });
  return `Copied directory: ${dest}`;
}

function missingPackagedAssets() {
  const requiredPaths = [
    "REIN.md",
    "VERIFY.md",
    ...REPO_SKILLS.map((skill) => path.join(".codex", "skills", skill, "SKILL.md")),
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

function upsertAgentsGuidance(dest, reinPathReference) {
  if (!exists(dest)) {
    ensureDir(path.dirname(dest));
    fs.writeFileSync(dest, `${reinBlock(reinPathReference)}\n`, "utf8");
    return `Created AGENTS.md: ${dest}`;
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
    return `Replaced existing REIN block in AGENTS.md: ${dest}`;
  }

  if (
    existing.includes(`follow \`${reinPathReference}\``) ||
    existing.includes("follow `REIN.md`")
  ) {
    return `Existing AGENTS.md already contains REIN guidance (no markers found to replace): ${dest}`;
  }

  const separator = existing.endsWith("\n") ? "\n" : "\n\n";
  fs.writeFileSync(dest, `${existing}${separator}${reinBlock(reinPathReference)}\n`, "utf8");
  return `Appended REIN guidance to existing AGENTS.md: ${dest}`;
}

function removeAgentsBlock(dest) {
  if (!exists(dest)) {
    return `No AGENTS.md found: ${dest}`;
  }

  const existing = fs.readFileSync(dest, "utf8");

  if (!existing.includes(REIN_BLOCK_START) || !existing.includes(REIN_BLOCK_END)) {
    return `No REIN block found in AGENTS.md: ${dest}`;
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
    return `Removed AGENTS.md (only contained REIN block): ${dest}`;
  }

  fs.writeFileSync(dest, `${result}\n`, "utf8");
  return `Removed REIN block from AGENTS.md: ${dest}`;
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

function readInstalledVersion(targetDir) {
  const notesFile = path.join(targetDir, ".codex", "rein-install", "installed-from.txt");
  if (!exists(notesFile)) {
    return null;
  }
  const content = fs.readFileSync(notesFile, "utf8");
  const match = content.match(/^Version:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

function installRepo(targetRepo, force) {
  validatePackagedAssets();
  const resolved = path.resolve(targetRepo);
  if (!exists(resolved)) {
    throw new Error(`Target repository does not exist: ${resolved}`);
  }

  const installNotesDir = path.join(resolved, ".codex", "rein-install");
  const messages = [];

  ensureDir(path.join(resolved, ".codex", "skills"));
  ensureDir(path.join(resolved, ".rein"));
  ensureDir(path.join(resolved, ".rein", "codebase"));
  ensureDir(installNotesDir);

  messages.push(copyFileSafe(path.join(REPO_ROOT, "REIN.md"), path.join(resolved, "REIN.md"), force));
  messages.push(copyFileSafe(path.join(REPO_ROOT, "VERIFY.md"), path.join(resolved, "VERIFY.md"), force));

  for (const skill of REPO_SKILLS) {
    messages.push(
      copyDirSafe(
        path.join(REPO_ROOT, ".codex", "skills", skill),
        path.join(resolved, ".codex", "skills", skill),
        force,
      ),
    );
  }

  messages.push(upsertAgentsGuidance(path.join(resolved, "AGENTS.md"), "REIN.md"));

  writeInstallNotes(installNotesDir, REPO_ROOT, resolved, force);

  return {
    scope: "repo",
    target: resolved,
    messages,
    nextSteps: [
      `Review ${path.join(resolved, "REIN.md")} and ${path.join(resolved, "VERIFY.md")}`,
      `Confirm installed skills under ${path.join(resolved, ".codex", "skills")}`,
      `Use ${path.join(resolved, ".rein")} for repo-local REIN artifacts created by packaged skills, including ${path.join(resolved, ".rein", "codebase")}`,
    ],
  };
}

function installUser(force) {
  validatePackagedAssets();
  const home = os.homedir();
  const codexDir = path.join(home, ".codex");
  const reinDir = path.join(codexDir, "rein");
  const skillsDir = path.join(codexDir, "skills");
  const installNotesDir = path.join(codexDir, "rein-install");
  const messages = [];

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
  messages.push(upsertAgentsGuidance(path.join(home, "AGENTS.md"), reinPathReference));

  writeInstallNotes(installNotesDir, REPO_ROOT, home, force);

  return {
    scope: "user",
    target: home,
    messages,
    nextSteps: [
      `Review ${path.join(reinDir, "REIN.md")} and ${path.join(reinDir, "VERIFY.md")}`,
      `Confirm installed skills under ${skillsDir}`,
      `Review ${path.join(home, "AGENTS.md")} and verify the REIN block is present`,
      "Start a new Codex session anywhere under your home directory",
    ],
  };
}

function statusRepo(targetRepo) {
  const resolved = path.resolve(targetRepo);
  if (!exists(resolved)) {
    throw new Error(`Target directory does not exist: ${resolved}`);
  }

  const packageVersion = getPackageVersion();
  const installedVersion = readInstalledVersion(resolved);
  const lines = [];

  lines.push(`REIN status for: ${resolved}`);
  lines.push(`Package version: ${packageVersion}`);
  lines.push(`Installed version: ${installedVersion || "not found"}`);

  if (installedVersion && installedVersion !== packageVersion) {
    lines.push(`  (outdated — run \`rein update\` to upgrade)`);
  }

  lines.push("");

  const reinMd = exists(path.join(resolved, "REIN.md"));
  const verifyMd = exists(path.join(resolved, "VERIFY.md"));
  const reinDir = exists(path.join(resolved, ".rein"));
  lines.push(`REIN.md: ${reinMd ? "installed" : "missing"}`);
  lines.push(`VERIFY.md: ${verifyMd ? "installed" : "missing"}`);
  lines.push(`.rein/: ${reinDir ? "present" : "missing"}`);

  const agentsPath = path.join(resolved, "AGENTS.md");
  if (exists(agentsPath)) {
    const content = fs.readFileSync(agentsPath, "utf8");
    const hasBlock = content.includes(REIN_BLOCK_START);
    lines.push(`AGENTS.md: ${hasBlock ? "REIN block present" : "exists but no REIN block"}`);
  } else {
    lines.push("AGENTS.md: missing");
  }

  lines.push("");
  lines.push("Skills:");

  const installed = [];
  const missing = [];
  for (const skill of REPO_SKILLS) {
    if (exists(path.join(resolved, ".codex", "skills", skill, "SKILL.md"))) {
      installed.push(skill);
    } else {
      missing.push(skill);
    }
  }

  if (installed.length > 0) {
    for (const skill of installed) {
      lines.push(`  + ${skill}`);
    }
  }
  if (missing.length > 0) {
    for (const skill of missing) {
      lines.push(`  - ${skill} (missing)`);
    }
  }

  return lines.join("\n");
}

function ejectRepo(targetRepo) {
  const resolved = path.resolve(targetRepo);
  if (!exists(resolved)) {
    throw new Error(`Target directory does not exist: ${resolved}`);
  }

  const messages = [];

  for (const file of ["REIN.md", "VERIFY.md"]) {
    const filePath = path.join(resolved, file);
    if (exists(filePath)) {
      fs.unlinkSync(filePath);
      messages.push(`Removed: ${filePath}`);
    }
  }

  for (const skill of REPO_SKILLS) {
    const skillDir = path.join(resolved, ".codex", "skills", skill);
    if (exists(skillDir)) {
      fs.rmSync(skillDir, { recursive: true, force: true });
      messages.push(`Removed skill: ${skill}`);
    }
  }

  const installNotesDir = path.join(resolved, ".codex", "rein-install");
  if (exists(installNotesDir)) {
    fs.rmSync(installNotesDir, { recursive: true, force: true });
    messages.push(`Removed install notes: ${installNotesDir}`);
  }

  messages.push(removeAgentsBlock(path.join(resolved, "AGENTS.md")));

  const reinDir = path.join(resolved, ".rein");
  if (exists(reinDir)) {
    messages.push(`Note: .rein/ directory preserved (may contain work artifacts). Remove manually if desired.`);
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
    } else if (arg === "--repo") {
      const next = args[index + 1];
      if (next && !next.startsWith("--")) {
        result.repoPath = next;
        index += 1;
      } else {
        result.repoPath = process.cwd();
      }
    } else if (arg === "--path") {
      const next = args[index + 1];
      if (!next) {
        throw new Error("--path requires a value");
      }
      result.repoPath = next;
      index += 1;
    } else if (arg === "-h" || arg === "--help") {
      result.command = "help";
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return result;
}

async function askChoice(rl, prompt, choices) {
  const rendered = choices.map((choice, index) => `  ${index + 1}. ${choice.label}`).join("\n");
  const answer = await rl.question(`${prompt}\n${rendered}\n> `);
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

async function interactiveInit() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const currentRepo = findGitRoot(process.cwd());
    const choices = [];
    if (currentRepo) {
      choices.push({ label: `This repository (${currentRepo})`, value: { mode: "repo", path: currentRepo } });
    }
    choices.push({ label: "Another repository", value: { mode: "other" } });
    choices.push({ label: `User/global level (${os.homedir()})`, value: { mode: "user" } });

    const target = await askChoice(rl, "Where do you want to install REIN?", choices);

    let resolvedTarget = target;
    if (target.mode === "other") {
      const answer = await rl.question("Path to the target repository: ");
      resolvedTarget = { mode: "repo", path: path.resolve(answer.trim()) };
    }

    const forceAnswer = await rl.question("Overwrite existing REIN files when present? [y/N] ");
    const force = /^y(es)?$/i.test(forceAnswer.trim());

    const summary =
      resolvedTarget.mode === "user"
        ? `Install REIN into ${os.homedir()} and ~/.codex?`
        : `Install REIN into ${resolvedTarget.path}?`;
    const confirm = await rl.question(`${summary} [Y/n] `);
    if (/^n(o)?$/i.test(confirm.trim())) {
      throw new Error("Cancelled");
    }

    return {
      mode: resolvedTarget.mode === "user" ? "user" : "repo",
      path: resolvedTarget.path,
      force,
    };
  } finally {
    rl.close();
  }
}

function printResult(result) {
  for (const message of result.messages) {
    if (message) {
      console.log(message);
    }
  }
  console.log("");
  console.log(`REIN initialized for ${result.scope === "user" ? "user/global scope" : "repository"}:`);
  console.log(`  ${result.target}`);
  console.log("");
  console.log("Next steps:");
  result.nextSteps.forEach((step, index) => {
    console.log(`${index + 1}. ${step}`);
  });
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
    const target = resolveRepoPath(parsed);
    console.log(statusRepo(target));
    return;
  }

  if (parsed.command === "update") {
    const target = resolveRepoPath(parsed);
    const result = installRepo(target, true);
    printResult(result);
    return;
  }

  if (parsed.command === "eject") {
    const target = resolveRepoPath(parsed);
    const messages = ejectRepo(target);
    for (const message of messages) {
      console.log(message);
    }
    console.log("");
    console.log("REIN ejected.");
    return;
  }

  if (parsed.command !== "init") {
    throw new Error(`Unknown command: ${parsed.command}`);
  }

  let mode;
  let targetPath = parsed.repoPath;
  let force = parsed.force;

  if (parsed.user) {
    mode = "user";
  } else if (targetPath) {
    mode = "repo";
  } else if (parsed.yes) {
    const currentRepo = findGitRoot(process.cwd()) || process.cwd();
    mode = "repo";
    targetPath = currentRepo;
  } else {
    const selection = await interactiveInit();
    mode = selection.mode;
    targetPath = selection.path;
    force = selection.force;
  }

  const result = mode === "user" ? installUser(force) : installRepo(targetPath, force);
  printResult(result);
}
