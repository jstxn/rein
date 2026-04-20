import os from "node:os";
import path from "node:path";
import { findGitRoot, resolveTools } from "./installer.js";
import { isInteractive, promptInput, promptSelect } from "./prompting.js";

export function defaultRepoTarget() {
  return findGitRoot(process.cwd()) || process.cwd();
}

export function getSelectedTools(flags) {
  return resolveTools({
    claude: flags.claude,
    codex: flags.codex,
  });
}

export function normalizeScopeFlags(flags, repoArgPath) {
  if (flags.user && flags.repo) {
    throw new Error("Choose either --repo or --user, not both.");
  }

  if (repoArgPath && !flags.repo) {
    throw new Error("Repository paths must be provided as `rein <command> --repo [path]`.");
  }

  return {
    repoPath: flags.repo ? path.resolve(repoArgPath || defaultRepoTarget()) : null,
    user: flags.user,
  };
}

export async function promptForOperationTarget(actionLabel) {
  const currentRepo = findGitRoot(process.cwd());
  const choices = [];

  if (currentRepo) {
    choices.push({
      label: `This repository (${currentRepo})`,
      value: { mode: "repo", path: currentRepo },
    });
  }

  choices.push({
    label: `User/global level (${os.homedir()})`,
    value: { mode: "user", path: os.homedir() },
  });
  choices.push({ label: "Another repository", value: { mode: "other" } });

  const selected = await promptSelect(`Where should REIN ${actionLabel}?`, choices);
  if (selected.mode !== "other") {
    return selected;
  }

  const customPath = await promptInput("Path to the target repository");
  return { mode: "repo", path: path.resolve(customPath.trim()) };
}

export function requireInteractive(message) {
  if (!isInteractive()) {
    throw new Error(message);
  }
}
