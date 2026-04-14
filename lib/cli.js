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
  "deep-interview",
  "deep-inspect",
  "ai-slop-cleaner",
  "rein-triage",
  "rein-verify",
  "rein-retro",
];

const REPO_HOOK_FILES = [
  "rein_hook_utils.py",
  "session_start_presence.py",
  "user_prompt_submit.py",
  "pre_bash_guard.py",
  "post_bash_review.py",
  "stop_require_evidence.py",
];

function usage() {
  return `Usage:
  rein init
  rein init --repo [path]
  rein init --user
  rein init --repo [path] --force --yes

Commands:
  init     Interactive REIN installer for a repository or user-level Codex setup
`;
}

function exists(target) {
  return fs.existsSync(target);
}

function ensureDir(target) {
  fs.mkdirSync(target, { recursive: true });
}

function copyFileSafe(src, dest, force) {
  if (exists(dest) && !force) {
    return `Skipping existing file: ${dest}`;
  }
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  return `Copied file: ${dest}`;
}

function copyDirSafe(src, dest, force) {
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
For code modifications in this repo:

- follow \`${reinPathReference}\`
- use \`deep-interview\` when requirements are vague, broad, or missing boundaries
- use \`rein-triage\` before ambiguous or multi-file work
- use \`ai-slop-cleaner\` for cleanup, deslop, or refactor work after behavior is locked
- use \`rein-verify\` before declaring completion
- visible test passes are not sufficient
- do not modify evaluators or tests to hide defects
- if constraints conflict, stop and report the conflict
${REIN_BLOCK_END}
`;
}

function appendAgentsGuidance(dest, reinPathReference) {
  if (!exists(dest)) {
    ensureDir(path.dirname(dest));
    fs.writeFileSync(dest, `${reinBlock(reinPathReference)}\n`, "utf8");
    return `Created AGENTS.md: ${dest}`;
  }

  const existing = fs.readFileSync(dest, "utf8");
  if (
    existing.includes(REIN_BLOCK_START) ||
    existing.includes(`follow \`${reinPathReference}\``) ||
    existing.includes("follow `REIN.md`")
  ) {
    return `Existing AGENTS.md already contains REIN guidance: ${dest}`;
  }

  const separator = existing.endsWith("\n") ? "\n" : "\n\n";
  fs.writeFileSync(dest, `${existing}${separator}${reinBlock(reinPathReference)}\n`, "utf8");
  return `Appended REIN guidance to existing AGENTS.md: ${dest}`;
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
    `Installed from: ${installedFrom}\nInstalled into: ${installedInto}\nForce mode: ${force ? 1 : 0}\n`,
    "utf8",
  );
}

function installRepo(targetRepo, force) {
  const resolved = path.resolve(targetRepo);
  if (!exists(resolved)) {
    throw new Error(`Target repository does not exist: ${resolved}`);
  }

  const installNotesDir = path.join(resolved, ".codex", "rein-install");
  const messages = [];

  ensureDir(path.join(resolved, ".codex", "skills"));
  ensureDir(path.join(resolved, ".codex", "hooks"));
  ensureDir(path.join(resolved, ".rein"));
  ensureDir(path.join(resolved, ".rein", "codebase"));
  ensureDir(path.join(resolved, "rein-evals"));
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

  for (const hookFile of REPO_HOOK_FILES) {
    messages.push(
      copyFileSafe(
        path.join(REPO_ROOT, ".codex", "hooks", hookFile),
        path.join(resolved, ".codex", "hooks", hookFile),
        force,
      ),
    );
  }

  const hooksDest = path.join(resolved, ".codex", "hooks.json");
  if (exists(hooksDest) && !force) {
    fs.copyFileSync(path.join(REPO_ROOT, ".codex", "hooks.json"), path.join(installNotesDir, "hooks.rein.json"));
    messages.push(`Existing hooks.json detected; wrote merge snippet to ${path.join(installNotesDir, "hooks.rein.json")}`);
  } else {
    messages.push(copyFileSafe(path.join(REPO_ROOT, ".codex", "hooks.json"), hooksDest, force));
  }

  messages.push(appendAgentsGuidance(path.join(resolved, "AGENTS.md"), "REIN.md"));

  messages.push(
    copyDirSafe(path.join(REPO_ROOT, "rein-evals", "tasks"), path.join(resolved, "rein-evals", "tasks"), force),
  );
  messages.push(
    copyDirSafe(path.join(REPO_ROOT, "rein-evals", "prompts"), path.join(resolved, "rein-evals", "prompts"), force),
  );
  messages.push(
    copyDirSafe(path.join(REPO_ROOT, "rein-evals", "reports"), path.join(resolved, "rein-evals", "reports"), force),
  );
  messages.push(
    copyFileSafe(path.join(REPO_ROOT, "rein-evals", "run.py"), path.join(resolved, "rein-evals", "run.py"), force),
  );
  messages.push(
    copyFileSafe(path.join(REPO_ROOT, "rein-evals", "score.py"), path.join(resolved, "rein-evals", "score.py"), force),
  );

  writeInstallNotes(installNotesDir, REPO_ROOT, resolved, force);

  return {
    scope: "repo",
    target: resolved,
    messages,
    nextSteps: [
      `Review ${path.join(resolved, "REIN.md")} and ${path.join(resolved, "VERIFY.md")}`,
      `Confirm installed skills under ${path.join(resolved, ".codex", "skills")} include deep-interview, deep-inspect, ai-slop-cleaner, and rein-*`,
      `Use ${path.join(resolved, ".rein")} for repo-local REIN artifacts created by packaged skills, including ${path.join(resolved, ".rein", "codebase")}`,
      `If hooks.json already existed, merge ${path.join(installNotesDir, "hooks.rein.json")} if needed`,
      `Run: python3 "${path.join(resolved, "rein-evals", "run.py")}" --demo`,
      `Run: python3 "${path.join(resolved, "rein-evals", "score.py")}"`,
    ],
  };
}

function installUser(force) {
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
  messages.push(appendAgentsGuidance(path.join(home, "AGENTS.md"), reinPathReference));

  writeInstallNotes(installNotesDir, REPO_ROOT, home, force);

  return {
    scope: "user",
    target: home,
    messages,
    nextSteps: [
      `Review ${path.join(reinDir, "REIN.md")} and ${path.join(reinDir, "VERIFY.md")}`,
      `Confirm installed skills under ${skillsDir} include deep-interview, deep-inspect, ai-slop-cleaner, and rein-*`,
      `Review ${path.join(home, "AGENTS.md")} and verify the REIN block was appended once`,
      "Start a new Codex session anywhere under your home directory",
    ],
  };
}

function parseArgs(args) {
  const result = {
    command: args[0],
    force: false,
    yes: false,
    repoPath: null,
    user: false,
  };

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

export async function main(rawArgs) {
  const parsed = parseArgs(rawArgs.length > 0 ? rawArgs : ["help"]);
  if (!parsed.command || parsed.command === "help") {
    console.log(usage());
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
