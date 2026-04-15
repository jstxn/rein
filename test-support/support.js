import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const cliPath = path.join(repoRoot, "bin", "rein.js");

const packagedReinArtifacts = [
  `${path.sep}.rein${path.sep}context${path.sep}`,
  `${path.sep}.rein${path.sep}interviews${path.sep}`,
  `${path.sep}.rein${path.sep}specs${path.sep}`,
  `${path.sep}.rein${path.sep}state${path.sep}`,
];

const copyFilter = (src) => {
  if (src.includes(`${path.sep}.git${path.sep}`) || src.endsWith(`${path.sep}.git`)) {
    return false;
  }

  if (
    src.includes(`${path.sep}node_modules${path.sep}`) ||
    src.endsWith(`${path.sep}node_modules`)
  ) {
    return false;
  }

  return !packagedReinArtifacts.some((segment) => src.includes(segment));
};

export function copyRepo(destination) {
  fs.cpSync(repoRoot, destination, {
    recursive: true,
    filter: copyFilter,
  });

  const sourceModules = path.join(repoRoot, "node_modules");
  if (fs.existsSync(sourceModules)) {
    fs.symlinkSync(sourceModules, path.join(destination, "node_modules"), "dir");
  }
}

export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isSymbolicLink(target) {
  return fs.lstatSync(target).isSymbolicLink();
}

export function runCli(cli, args, options = {}) {
  return execFileSync(process.execPath, [cli, ...args], {
    stdio: "pipe",
    ...options,
  });
}

export function runCliText(cli, args, options = {}) {
  return runCli(cli, args, options).toString();
}
