import os from "node:os";
import path from "node:path";
import {
  LEGACY_SKILL_RENAMES,
  REPO_ROOT,
  REPO_SKILLS,
  addLinkModeNextStep,
  copyDirSafe,
  copyFileSafe,
  ensureDir,
  exists,
  linkDirSafe,
  linkFileSafe,
  removePathSafe,
  upsertGuidance,
  validatePackagedAssets,
  writeInstallNotes,
} from "./installer-core.js";
import { ReinError } from "./rein-error.js";

function removeLegacySkillSurface(targetPath) {
  if (exists(targetPath)) {
    removePathSafe(targetPath);
  }
}

function removeLegacySkillSurfaces(baseDir, tool, skill) {
  for (const legacySkill of LEGACY_SKILL_RENAMES[skill] || []) {
    if (tool === "codex") {
      removeLegacySkillSurface(path.join(baseDir, ".codex", "skills", legacySkill));
      continue;
    }

    if (tool === "claude") {
      removeLegacySkillSurface(path.join(baseDir, ".claude", "commands", `${legacySkill}.md`));
      continue;
    }

    removeLegacySkillSurface(path.join(baseDir, ".cursor", "rules", `${legacySkill}.mdc`));
  }
}

function installRepo(targetRepo, force, tools, installMode = "copy") {
  validatePackagedAssets();
  const resolved = path.resolve(targetRepo);
  if (!exists(resolved)) {
    throw new ReinError(`Target repository does not exist: ${resolved}`);
  }

  const messages = [];
  const installFile = installMode === "link" ? linkFileSafe : copyFileSafe;
  const installDir = installMode === "link" ? linkDirSafe : copyDirSafe;

  ensureDir(path.join(resolved, ".rein"));
  ensureDir(path.join(resolved, ".rein", "codebase"));

  messages.push(
    installFile(path.join(REPO_ROOT, "REIN.md"), path.join(resolved, "REIN.md"), force),
  );

  const nextSteps = [
    `Review ${path.join(resolved, "REIN.md")}`,
    `Use ${path.join(resolved, ".rein")} for repo-local REIN artifacts created by packaged skills, including ${path.join(resolved, ".rein", "codebase")}`,
  ];

  if (tools.includes("codex")) {
    const codexInstallNotes = path.join(resolved, ".codex", "rein-install");
    ensureDir(path.join(resolved, ".codex", "skills"));
    ensureDir(codexInstallNotes);

    for (const skill of REPO_SKILLS) {
      removeLegacySkillSurfaces(resolved, "codex", skill);
      messages.push(
        installDir(
          path.join(REPO_ROOT, ".codex", "skills", skill),
          path.join(resolved, ".codex", "skills", skill),
          force,
        ),
      );
    }

    messages.push(upsertGuidance(path.join(resolved, "AGENTS.md"), "REIN.md"));
    writeInstallNotes(codexInstallNotes, REPO_ROOT, resolved, force, installMode);
    nextSteps.push(
      `Confirm installed Codex skills under ${path.join(resolved, ".codex", "skills")}`,
    );
  }

  if (tools.includes("claude")) {
    const claudeInstallNotes = path.join(resolved, ".claude", "rein-install");
    ensureDir(path.join(resolved, ".claude", "commands"));
    ensureDir(claudeInstallNotes);

    for (const skill of REPO_SKILLS) {
      removeLegacySkillSurfaces(resolved, "claude", skill);
      messages.push(
        installFile(
          path.join(REPO_ROOT, ".claude", "commands", `${skill}.md`),
          path.join(resolved, ".claude", "commands", `${skill}.md`),
          force,
        ),
      );
    }

    messages.push(upsertGuidance(path.join(resolved, "CLAUDE.md"), "REIN.md"));
    writeInstallNotes(claudeInstallNotes, REPO_ROOT, resolved, force, installMode);
    nextSteps.push(
      `Confirm installed Claude commands under ${path.join(resolved, ".claude", "commands")}`,
    );
  }

  if (tools.includes("cursor")) {
    const cursorInstallNotes = path.join(resolved, ".cursor", "rein-install");
    ensureDir(path.join(resolved, ".cursor", "rules"));
    ensureDir(cursorInstallNotes);

    for (const skill of REPO_SKILLS) {
      removeLegacySkillSurfaces(resolved, "cursor", skill);
      messages.push(
        installFile(
          path.join(REPO_ROOT, ".cursor", "rules", `${skill}.mdc`),
          path.join(resolved, ".cursor", "rules", `${skill}.mdc`),
          force,
        ),
      );
    }

    messages.push(upsertGuidance(path.join(resolved, "AGENTS.md"), "REIN.md"));
    writeInstallNotes(cursorInstallNotes, REPO_ROOT, resolved, force, installMode);
    nextSteps.push(
      `Confirm installed Cursor rules under ${path.join(resolved, ".cursor", "rules")}`,
    );
  }

  addLinkModeNextStep(nextSteps, installMode);

  return {
    scope: "repo",
    target: resolved,
    tools,
    installMode,
    messages,
    nextSteps,
  };
}

function installUser(force, tools, installMode = "copy") {
  validatePackagedAssets();
  const home = os.homedir();
  const messages = [];
  const nextSteps = [];
  const installFile = installMode === "link" ? linkFileSafe : copyFileSafe;
  const installDir = installMode === "link" ? linkDirSafe : copyDirSafe;

  if (tools.includes("codex")) {
    const codexDir = path.join(home, ".codex");
    const reinDir = path.join(codexDir, "rein");
    const skillsDir = path.join(codexDir, "skills");
    const installNotesDir = path.join(codexDir, "rein-install");

    ensureDir(reinDir);
    ensureDir(skillsDir);
    ensureDir(installNotesDir);

    messages.push(
      installFile(path.join(REPO_ROOT, "REIN.md"), path.join(reinDir, "REIN.md"), force),
    );

    for (const skill of REPO_SKILLS) {
      removeLegacySkillSurfaces(home, "codex", skill);
      messages.push(
        installDir(
          path.join(REPO_ROOT, ".codex", "skills", skill),
          path.join(skillsDir, skill),
          force,
        ),
      );
    }

    const reinPathReference = path.join(reinDir, "REIN.md");
    messages.push(upsertGuidance(path.join(home, "AGENTS.md"), reinPathReference));
    writeInstallNotes(installNotesDir, REPO_ROOT, home, force, installMode);

    nextSteps.push(`Review ${path.join(reinDir, "REIN.md")}`);
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

    messages.push(
      installFile(path.join(REPO_ROOT, "REIN.md"), path.join(reinDir, "REIN.md"), force),
    );

    for (const skill of REPO_SKILLS) {
      removeLegacySkillSurfaces(home, "claude", skill);
      messages.push(
        installFile(
          path.join(REPO_ROOT, ".claude", "commands", `${skill}.md`),
          path.join(commandsDir, `${skill}.md`),
          force,
        ),
      );
    }

    const reinPathReference = path.join(reinDir, "REIN.md");
    messages.push(upsertGuidance(path.join(home, "CLAUDE.md"), reinPathReference));
    writeInstallNotes(installNotesDir, REPO_ROOT, home, force, installMode);

    nextSteps.push(`Review ${path.join(reinDir, "REIN.md")}`);
    nextSteps.push(`Confirm installed Claude commands under ${commandsDir}`);
    nextSteps.push(`Review ${path.join(home, "CLAUDE.md")} and verify the REIN block is present`);
  }

  if (tools.includes("cursor")) {
    const cursorDir = path.join(home, ".cursor");
    const reinDir = path.join(cursorDir, "rein");
    const rulesDir = path.join(cursorDir, "rules");
    const installNotesDir = path.join(cursorDir, "rein-install");

    ensureDir(reinDir);
    ensureDir(rulesDir);
    ensureDir(installNotesDir);

    messages.push(
      installFile(path.join(REPO_ROOT, "REIN.md"), path.join(reinDir, "REIN.md"), force),
    );

    for (const skill of REPO_SKILLS) {
      removeLegacySkillSurfaces(home, "cursor", skill);
      messages.push(
        installFile(
          path.join(REPO_ROOT, ".cursor", "rules", `${skill}.mdc`),
          path.join(rulesDir, `${skill}.mdc`),
          force,
        ),
      );
    }

    const reinPathReference = path.join(reinDir, "REIN.md");
    messages.push(upsertGuidance(path.join(home, "AGENTS.md"), reinPathReference));
    writeInstallNotes(installNotesDir, REPO_ROOT, home, force, installMode);

    nextSteps.push(`Review ${path.join(reinDir, "REIN.md")}`);
    nextSteps.push(`Confirm installed Cursor rules under ${rulesDir}`);
    nextSteps.push(`Review ${path.join(home, "AGENTS.md")} and verify the REIN block is present`);
  }

  const toolLabel = tools.join(" and ");
  nextSteps.push(`Start a new ${toolLabel} session anywhere under your home directory`);
  addLinkModeNextStep(nextSteps, installMode);

  return {
    scope: "user",
    target: home,
    tools,
    installMode,
    messages,
    nextSteps,
  };
}

export { installRepo, installUser };
