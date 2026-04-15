import os from "node:os";
import path from "node:path";
import { promptConfirm } from "./prompting.js";
import {
  REPO_SKILLS,
  detectInstalledTools,
  dim,
  exists,
  icons,
  removeGuidanceBlock,
  removePathSafe,
} from "./installer-core.js";

async function removeRepo(targetRepo, skipConfirm, tools) {
  const resolved = path.resolve(targetRepo);
  if (!exists(resolved)) {
    throw new Error(`Target directory does not exist: ${resolved}`);
  }

  const messages = [];
  const installed = detectInstalledTools(resolved);
  const remaining = installed.filter((tool) => !tools.includes(tool));

  if (remaining.length === 0) {
    for (const file of ["REIN.md"]) {
      const filePath = path.join(resolved, file);
      if (exists(filePath)) {
        removePathSafe(filePath);
        messages.push(`${icons.ok} ${file}`);
      }
    }
  }

  if (tools.includes("codex")) {
    for (const skill of REPO_SKILLS) {
      const skillDir = path.join(resolved, ".codex", "skills", skill);
      if (exists(skillDir)) {
        removePathSafe(skillDir);
        messages.push(`${icons.ok} ${skill} ${dim("(codex)")}`);
      }
    }

    const installNotesDir = path.join(resolved, ".codex", "rein-install");
    if (exists(installNotesDir)) {
      removePathSafe(installNotesDir);
      messages.push(`${icons.ok} codex install notes`);
    }

    messages.push(removeGuidanceBlock(path.join(resolved, "AGENTS.md")));
  }

  if (tools.includes("claude")) {
    for (const skill of REPO_SKILLS) {
      const cmdFile = path.join(resolved, ".claude", "commands", `${skill}.md`);
      if (exists(cmdFile)) {
        removePathSafe(cmdFile);
        messages.push(`${icons.ok} ${skill} ${dim("(claude)")}`);
      }
    }

    const installNotesDir = path.join(resolved, ".claude", "rein-install");
    if (exists(installNotesDir)) {
      removePathSafe(installNotesDir);
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
        removeArtifacts = await promptConfirm(
          ".rein/ contains work artifacts (specs, interviews, codebase maps). Remove .rein/ as well?",
          { defaultValue: false },
        );
      }

      if (removeArtifacts) {
        removePathSafe(reinDir);
        messages.push(`${icons.ok} .rein/`);
      } else {
        messages.push(`${icons.skip} .rein/ ${dim("(preserved)")}`);
      }
    }
  }

  return messages;
}

function removeUser(tools) {
  const home = os.homedir();
  const messages = [];

  if (tools.includes("codex")) {
    for (const file of ["REIN.md"]) {
      const filePath = path.join(home, ".codex", "rein", file);
      if (exists(filePath)) {
        removePathSafe(filePath);
        messages.push(`${icons.ok} ${file} ${dim("(codex)")}`);
      }
    }

    for (const skill of REPO_SKILLS) {
      const skillDir = path.join(home, ".codex", "skills", skill);
      if (exists(skillDir)) {
        removePathSafe(skillDir);
        messages.push(`${icons.ok} ${skill} ${dim("(codex)")}`);
      }
    }

    const installNotesDir = path.join(home, ".codex", "rein-install");
    if (exists(installNotesDir)) {
      removePathSafe(installNotesDir);
      messages.push(`${icons.ok} codex install notes`);
    }

    messages.push(removeGuidanceBlock(path.join(home, "AGENTS.md")));
  }

  if (tools.includes("claude")) {
    for (const file of ["REIN.md"]) {
      const filePath = path.join(home, ".claude", "rein", file);
      if (exists(filePath)) {
        removePathSafe(filePath);
        messages.push(`${icons.ok} ${file} ${dim("(claude)")}`);
      }
    }

    for (const skill of REPO_SKILLS) {
      const cmdFile = path.join(home, ".claude", "commands", `${skill}.md`);
      if (exists(cmdFile)) {
        removePathSafe(cmdFile);
        messages.push(`${icons.ok} ${skill} ${dim("(claude)")}`);
      }
    }

    const installNotesDir = path.join(home, ".claude", "rein-install");
    if (exists(installNotesDir)) {
      removePathSafe(installNotesDir);
      messages.push(`${icons.ok} claude install notes`);
    }

    messages.push(removeGuidanceBlock(path.join(home, "CLAUDE.md")));
  }

  return messages;
}

export { removeRepo, removeUser };
