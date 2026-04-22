import os from "node:os";
import path from "node:path";
import { promptConfirm } from "./prompting.js";
import { ReinError } from "./rein-error.js";
import {
  LEGACY_SKILL_RENAMES,
  REPO_SKILLS,
  detectInstalledTools,
  detectInstalledToolsUser,
  dim,
  exists,
  icons,
  removeGuidanceBlock,
  removePathSafe,
  toolSkillSurfacePath,
} from "./installer-core.js";

const AGENTS_USERS = new Set(["codex", "cursor"]);
const CLAUDE_USERS = new Set(["claude"]);

function removeLegacySkillEntries(baseDir, tool, skill) {
  const messages = [];

  for (const legacySkill of LEGACY_SKILL_RENAMES[skill] || []) {
    const targetPath = toolSkillSurfacePath(baseDir, tool, legacySkill);
    if (exists(targetPath)) {
      removePathSafe(targetPath);
      messages.push(legacySkill);
    }
  }

  return messages;
}

async function removeRepo(targetRepo, skipConfirm, tools) {
  const resolved = path.resolve(targetRepo);
  if (!exists(resolved)) {
    throw new ReinError(`Target directory does not exist: ${resolved}`);
  }

  const messages = [];
  const installed = detectInstalledTools(resolved);
  const remaining = installed.filter((tool) => !tools.includes(tool));
  const agentsStillNeeded = remaining.some((tool) => AGENTS_USERS.has(tool));
  const claudeStillNeeded = remaining.some((tool) => CLAUDE_USERS.has(tool));

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
      const skillDir = toolSkillSurfacePath(resolved, "codex", skill);
      if (exists(skillDir)) {
        removePathSafe(skillDir);
        messages.push(`${icons.ok} ${skill} ${dim("(codex)")}`);
      }

      for (const legacySkill of removeLegacySkillEntries(resolved, "codex", skill)) {
        messages.push(`${icons.ok} ${legacySkill} ${dim("(codex legacy)")}`);
      }
    }

    const installNotesDir = path.join(resolved, ".codex", "rein-install");
    if (exists(installNotesDir)) {
      removePathSafe(installNotesDir);
      messages.push(`${icons.ok} codex install notes`);
    }
  }

  if (tools.includes("claude")) {
    for (const skill of REPO_SKILLS) {
      const cmdFile = toolSkillSurfacePath(resolved, "claude", skill);
      if (exists(cmdFile)) {
        removePathSafe(cmdFile);
        messages.push(`${icons.ok} ${skill} ${dim("(claude)")}`);
      }

      for (const legacySkill of removeLegacySkillEntries(resolved, "claude", skill)) {
        messages.push(`${icons.ok} ${legacySkill} ${dim("(claude legacy)")}`);
      }
    }

    const installNotesDir = path.join(resolved, ".claude", "rein-install");
    if (exists(installNotesDir)) {
      removePathSafe(installNotesDir);
      messages.push(`${icons.ok} claude install notes`);
    }
  }

  if (tools.includes("cursor")) {
    for (const skill of REPO_SKILLS) {
      const ruleFile = toolSkillSurfacePath(resolved, "cursor", skill);
      if (exists(ruleFile)) {
        removePathSafe(ruleFile);
        messages.push(`${icons.ok} ${skill} ${dim("(cursor)")}`);
      }

      for (const legacySkill of removeLegacySkillEntries(resolved, "cursor", skill)) {
        messages.push(`${icons.ok} ${legacySkill} ${dim("(cursor legacy)")}`);
      }
    }

    const installNotesDir = path.join(resolved, ".cursor", "rein-install");
    if (exists(installNotesDir)) {
      removePathSafe(installNotesDir);
      messages.push(`${icons.ok} cursor install notes`);
    }
  }

  if (tools.some((tool) => AGENTS_USERS.has(tool)) && !agentsStillNeeded) {
    messages.push(removeGuidanceBlock(path.join(resolved, "AGENTS.md")));
  }

  if (tools.some((tool) => CLAUDE_USERS.has(tool)) && !claudeStillNeeded) {
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
  const installed = detectInstalledToolsUser(home);
  const remaining = installed.filter((tool) => !tools.includes(tool));
  const agentsStillNeeded = remaining.some((tool) => AGENTS_USERS.has(tool));
  const claudeStillNeeded = remaining.some((tool) => CLAUDE_USERS.has(tool));

  if (tools.includes("codex")) {
    for (const file of ["REIN.md"]) {
      const filePath = path.join(home, ".codex", "rein", file);
      if (exists(filePath)) {
        removePathSafe(filePath);
        messages.push(`${icons.ok} ${file} ${dim("(codex)")}`);
      }
    }

    for (const skill of REPO_SKILLS) {
      const skillDir = toolSkillSurfacePath(home, "codex", skill);
      if (exists(skillDir)) {
        removePathSafe(skillDir);
        messages.push(`${icons.ok} ${skill} ${dim("(codex)")}`);
      }

      for (const legacySkill of removeLegacySkillEntries(home, "codex", skill)) {
        messages.push(`${icons.ok} ${legacySkill} ${dim("(codex legacy)")}`);
      }
    }

    const installNotesDir = path.join(home, ".codex", "rein-install");
    if (exists(installNotesDir)) {
      removePathSafe(installNotesDir);
      messages.push(`${icons.ok} codex install notes`);
    }
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
      const cmdFile = toolSkillSurfacePath(home, "claude", skill);
      if (exists(cmdFile)) {
        removePathSafe(cmdFile);
        messages.push(`${icons.ok} ${skill} ${dim("(claude)")}`);
      }

      for (const legacySkill of removeLegacySkillEntries(home, "claude", skill)) {
        messages.push(`${icons.ok} ${legacySkill} ${dim("(claude legacy)")}`);
      }
    }

    const installNotesDir = path.join(home, ".claude", "rein-install");
    if (exists(installNotesDir)) {
      removePathSafe(installNotesDir);
      messages.push(`${icons.ok} claude install notes`);
    }
  }

  if (tools.includes("cursor")) {
    for (const file of ["REIN.md"]) {
      const filePath = path.join(home, ".cursor", "rein", file);
      if (exists(filePath)) {
        removePathSafe(filePath);
        messages.push(`${icons.ok} ${file} ${dim("(cursor)")}`);
      }
    }

    for (const skill of REPO_SKILLS) {
      const ruleFile = toolSkillSurfacePath(home, "cursor", skill);
      if (exists(ruleFile)) {
        removePathSafe(ruleFile);
        messages.push(`${icons.ok} ${skill} ${dim("(cursor)")}`);
      }

      for (const legacySkill of removeLegacySkillEntries(home, "cursor", skill)) {
        messages.push(`${icons.ok} ${legacySkill} ${dim("(cursor legacy)")}`);
      }
    }

    const installNotesDir = path.join(home, ".cursor", "rein-install");
    if (exists(installNotesDir)) {
      removePathSafe(installNotesDir);
      messages.push(`${icons.ok} cursor install notes`);
    }
  }

  if (tools.some((tool) => AGENTS_USERS.has(tool)) && !agentsStillNeeded) {
    messages.push(removeGuidanceBlock(path.join(home, "AGENTS.md")));
  }

  if (tools.some((tool) => CLAUDE_USERS.has(tool)) && !claudeStillNeeded) {
    messages.push(removeGuidanceBlock(path.join(home, "CLAUDE.md")));
  }

  return messages;
}

export { removeRepo, removeUser };
