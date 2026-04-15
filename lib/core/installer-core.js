import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

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
const dim = (text) => fmt("2", text);
const bold = (text) => fmt("1", text);
const green = (text) => fmt("32", text);
const yellow = (text) => fmt("33", text);
const cyan = (text) => fmt("36", text);
const red = (text) => fmt("31", text);

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
  const pkg = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"),
  );
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
    `    ${dim("$")} rein init --repo [path] [--codex] [--claude] [--link]`,
    `    ${dim("$")} rein init --user [--codex] [--claude] [--link]`,
    `    ${dim("$")} rein status [--repo path] [--user] [--codex] [--claude]`,
    `    ${dim("$")} rein update [--repo path] [--user] [--codex] [--claude] [--link]`,
    `    ${dim("$")} rein remove [--repo path] [--user] [--yes] [--codex] [--claude]`,
    "",
    `  ${bold("Commands")}`,
    `    ${bold("init")}     Install REIN into a repository or user-level setup`,
    `    ${bold("status")}   Show what REIN surfaces are installed and their version`,
    `    ${bold("update")}   Re-install REIN surfaces, replacing existing files`,
    `    ${bold("remove")}   Uninstall REIN from a repository or user-level setup`,
    "",
    `  ${bold("Flags")}`,
    `    ${bold("--codex")}   Target Codex (.codex/skills/, AGENTS.md)`,
    `    ${bold("--claude")}  Target Claude Code (.claude/commands/, CLAUDE.md)`,
    `    ${bold("--link")}    Symlink packaged assets instead of copying them`,
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

function tryRealpath(target) {
  try {
    return fs.realpathSync.native(target);
  } catch {
    return null;
  }
}

function samePath(a, b) {
  const realA = tryRealpath(a);
  const realB = tryRealpath(b);
  if (realA && realB) {
    return realA === realB;
  }

  return path.resolve(a) === path.resolve(b);
}

function statPath(target) {
  try {
    return fs.lstatSync(target);
  } catch {
    return null;
  }
}

function removePathSafe(target) {
  const stats = statPath(target);
  if (!stats) {
    return;
  }

  if (stats.isDirectory() && !stats.isSymbolicLink()) {
    fs.rmSync(target, { recursive: true, force: true });
    return;
  }

  fs.unlinkSync(target);
}

function installResult(name, detail = null) {
  return `${icons.ok} ${name}${detail ? ` ${dim(`(${detail})`)}` : ""}`;
}

function prepareInstallDestination(src, dest, force) {
  const name = path.basename(dest);
  if (samePath(src, dest)) {
    return `${icons.skip} ${name} ${dim("(in place)")}`;
  }

  if (exists(dest) && !force) {
    return `${icons.skip} ${name} ${dim("(exists)")}`;
  }

  if (exists(dest)) {
    removePathSafe(dest);
  }

  ensureDir(path.dirname(dest));
  return null;
}

function createSymlink(src, dest, kind) {
  const linkTarget = tryRealpath(src) || path.resolve(src);
  const linkType =
    process.platform === "win32" && kind === "dir" ? "junction" : kind;
  fs.symlinkSync(linkTarget, dest, linkType);
}

function copyFileSafe(src, dest, force) {
  const name = path.basename(dest);
  const skipMessage = prepareInstallDestination(src, dest, force);
  if (skipMessage) return skipMessage;
  fs.copyFileSync(src, dest);
  return installResult(name);
}

function copyDirSafe(src, dest, force) {
  const name = path.basename(dest);
  const skipMessage = prepareInstallDestination(src, dest, force);
  if (skipMessage) return skipMessage;
  fs.cpSync(src, dest, { recursive: true, verbatimSymlinks: true });
  return installResult(name);
}

function linkFileSafe(src, dest, force) {
  const name = path.basename(dest);
  const skipMessage = prepareInstallDestination(src, dest, force);
  if (skipMessage) return skipMessage;
  createSymlink(src, dest, "file");
  return installResult(name, "linked");
}

function linkDirSafe(src, dest, force) {
  const name = path.basename(dest);
  const skipMessage = prepareInstallDestination(src, dest, force);
  if (skipMessage) return skipMessage;
  createSymlink(src, dest, "dir");
  return installResult(name, "linked");
}

function missingPackagedAssets() {
  const requiredPaths = [
    "REIN.md",
    ...REPO_SKILLS.map((skill) =>
      path.join(".codex", "skills", skill, "SKILL.md"),
    ),
    ...REPO_SKILLS.map((skill) =>
      path.join(".claude", "commands", `${skill}.md`),
    ),
  ];

  return requiredPaths.filter(
    (relativePath) => !exists(path.join(REPO_ROOT, relativePath)),
  );
}

function validatePackagedAssets() {
  const missing = missingPackagedAssets();
  if (missing.length === 0) {
    return;
  }

  const formatted = missing
    .map((relativePath) => `- ${relativePath}`)
    .join("\n");
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

  if (
    existing.includes(REIN_BLOCK_START) &&
    existing.includes(REIN_BLOCK_END)
  ) {
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
  fs.writeFileSync(
    dest,
    `${existing}${separator}${reinBlock(reinPathReference)}\n`,
    "utf8",
  );
  return `${icons.ok} ${label} ${dim("(appended)")}`;
}

function removeGuidanceBlock(dest) {
  const label = path.basename(dest);
  if (!exists(dest)) {
    return `${icons.skip} ${label} ${dim("(not found)")}`;
  }

  const existing = fs.readFileSync(dest, "utf8");

  if (
    !existing.includes(REIN_BLOCK_START) ||
    !existing.includes(REIN_BLOCK_END)
  ) {
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

function writeInstallNotes(
  installNotesDir,
  installedFrom,
  installedInto,
  force,
  installMode,
) {
  ensureDir(installNotesDir);
  fs.writeFileSync(
    path.join(installNotesDir, "AGENTS.snippet.md"),
    `${reinBlock("REIN.md")}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(installNotesDir, "installed-from.txt"),
    `Installed from: ${installedFrom}\nInstalled into: ${installedInto}\nForce mode: ${force ? 1 : 0}\nMode: ${installMode}\nVersion: ${getPackageVersion()}\n`,
    "utf8",
  );
}

function readInstallMetadata(targetDir, tool) {
  const dir = tool === "claude" ? ".claude" : ".codex";
  const notesFile = path.join(
    targetDir,
    dir,
    "rein-install",
    "installed-from.txt",
  );
  if (!exists(notesFile)) {
    return null;
  }

  const content = fs.readFileSync(notesFile, "utf8");
  const version = content.match(/^Version:\s*(.+)$/m)?.[1]?.trim() || null;
  const mode = content.match(/^Mode:\s*(.+)$/m)?.[1]?.trim() || "copy";
  return { version, mode };
}

function readInstalledVersion(targetDir, tool) {
  return readInstallMetadata(targetDir, tool)?.version || null;
}

function readInstalledMode(targetDir, tool) {
  return readInstallMetadata(targetDir, tool)?.mode || null;
}

function summarizeInstallMode(targetDir, tools) {
  const modes = tools.map(
    (tool) => readInstalledMode(targetDir, tool) || "copy",
  );
  const uniqueModes = [...new Set(modes)];
  if (uniqueModes.length === 1) {
    return uniqueModes[0];
  }

  return `mixed (${tools.map((tool, index) => `${tool}: ${modes[index]}`).join(", ")})`;
}

function resolveInstalledMode(targetDir, tools) {
  const modes = tools.map(
    (tool) => readInstalledMode(targetDir, tool) || "copy",
  );
  const uniqueModes = [...new Set(modes)];
  if (uniqueModes.length > 1) {
    throw new Error(
      "Detected mixed REIN install modes. Re-run with --codex or --claude, or pass --link to normalize the install.",
    );
  }

  return uniqueModes[0] || "copy";
}

function addLinkModeNextStep(nextSteps, installMode) {
  if (installMode !== "link") {
    return;
  }

  nextSteps.push(
    `Linked installs depend on ${REPO_ROOT} remaining available at the same path`,
  );
}

function detectInstalledToolsUser(home = os.homedir()) {
  const tools = [];
  if (exists(path.join(home, ".codex", "rein-install"))) tools.push("codex");
  if (exists(path.join(home, ".claude", "rein-install"))) tools.push("claude");
  return tools;
}

function detectInstalledTools(targetDir) {
  const tools = [];
  if (exists(path.join(targetDir, ".codex", "rein-install"))) {
    tools.push("codex");
  }
  if (exists(path.join(targetDir, ".claude", "rein-install"))) {
    tools.push("claude");
  }
  return tools;
}

function resolveTools(parsed) {
  if (parsed.codex && parsed.claude) return ["codex", "claude"];
  if (parsed.codex) return ["codex"];
  if (parsed.claude) return ["claude"];
  return null;
}

function resolveRepoPath(parsed) {
  if (parsed.user) {
    return os.homedir();
  }
  if (parsed.repoPath) {
    return path.resolve(parsed.repoPath);
  }
  return findGitRoot(process.cwd()) || process.cwd();
}

export {
  REIN_BLOCK_END,
  REIN_BLOCK_START,
  REPO_ROOT,
  REPO_SKILLS,
  addLinkModeNextStep,
  banner,
  bold,
  copyDirSafe,
  copyFileSafe,
  createSymlink,
  cyan,
  detectInstalledTools,
  detectInstalledToolsUser,
  dim,
  ensureDir,
  exists,
  findGitRoot,
  getPackageVersion,
  green,
  icons,
  installResult,
  linkDirSafe,
  linkFileSafe,
  missingPackagedAssets,
  prepareInstallDestination,
  readInstallMetadata,
  readInstalledMode,
  readInstalledVersion,
  red,
  removeGuidanceBlock,
  removePathSafe,
  reinBlock,
  resolveInstalledMode,
  resolveRepoPath,
  resolveTools,
  samePath,
  statPath,
  summarizeInstallMode,
  tryRealpath,
  upsertGuidance,
  usage,
  validatePackagedAssets,
  writeInstallNotes,
  yellow,
};
