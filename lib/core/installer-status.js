import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  REIN_BLOCK_START,
  REPO_SKILLS,
  bold,
  detectInstalledTools,
  detectInstalledToolsUser,
  dim,
  exists,
  getPackageVersion,
  green,
  icons,
  readInstalledVersion,
  red,
  summarizeInstallMode,
  yellow,
} from "./installer-core.js";

function buildStatusText(status) {
  const lines = [];
  lines.push(`  ${bold("Status")} ${dim(status.target)}`);
  lines.push("");

  if (!status.installed) {
    lines.push(`    ${red("REIN is not installed in this directory")}`);
    lines.push("");
    return lines.join("\n");
  }

  const check = (label, found) => `    ${found ? icons.ok : icons.fail} ${label}`;

  if (!status.version.installed) {
    lines.push(`    Package   ${dim(status.version.package)}`);
    lines.push(`    Installed ${red("not found")}`);
  } else if (status.version.installed !== status.version.package) {
    lines.push(`    Package   ${dim(status.version.package)}`);
    lines.push(
      `    Installed ${yellow(status.version.installed)} ${dim("→ run")} ${bold(status.version.updateHint)}`,
    );
  } else {
    lines.push(`    Version   ${green(status.version.package)}`);
  }

  lines.push(`    Mode      ${dim(status.installMode)}`);
  lines.push("");
  lines.push(`  ${bold("Surfaces")}`);
  for (const surface of status.sharedSurfaces) {
    lines.push(check(surface.label, surface.found));
  }

  for (const section of status.sections) {
    lines.push("");
    lines.push(`  ${bold(section.label)}`);
    for (const item of section.items) {
      if (item.kind === "warn") {
        lines.push(`    ${yellow("~")} ${item.label} ${dim(item.detail)}`);
      } else {
        lines.push(`    ${item.found ? icons.ok : icons.fail} ${item.label}`);
      }
    }
  }

  lines.push("");
  return lines.join("\n");
}

function getRepoStatusData(targetRepo, selectedTools = null) {
  const resolved = path.resolve(targetRepo);
  if (!exists(resolved)) {
    throw new Error(`Target directory does not exist: ${resolved}`);
  }

  const packageVersion = getPackageVersion();
  const detected = detectInstalledTools(resolved);
  const tools = selectedTools || detected;
  if (detected.length === 0) {
    return {
      installed: false,
      installMode: null,
      scope: "repo",
      sections: [],
      sharedSurfaces: [],
      target: resolved,
      tools: [],
      version: {
        installed: null,
        package: packageVersion,
        updateHint: "rein update",
      },
    };
  }

  const sections = [];
  const sharedSurfaces = [
    { found: exists(path.join(resolved, "REIN.md")), label: "REIN.md" },
    { found: exists(path.join(resolved, ".rein")), label: ".rein/" },
  ];

  if (tools.includes("codex")) {
    const agentsPath = path.join(resolved, "AGENTS.md");
    const items = [];
    if (exists(agentsPath)) {
      const content = fs.readFileSync(agentsPath, "utf8");
      const hasBlock = content.includes(REIN_BLOCK_START);
      items.push(
        hasBlock
          ? { found: true, kind: "check", label: "AGENTS.md" }
          : {
              detail: "(no REIN block)",
              kind: "warn",
              label: "AGENTS.md",
            },
      );
    } else {
      items.push({ found: false, kind: "check", label: "AGENTS.md" });
    }

    for (const skill of REPO_SKILLS) {
      const found = exists(path.join(resolved, ".codex", "skills", skill, "SKILL.md"));
      items.push({ found, kind: "check", label: skill });
    }

    sections.push({ items, label: "Codex" });
  }

  if (tools.includes("claude")) {
    const claudePath = path.join(resolved, "CLAUDE.md");
    const items = [];
    if (exists(claudePath)) {
      const content = fs.readFileSync(claudePath, "utf8");
      const hasBlock = content.includes(REIN_BLOCK_START);
      items.push(
        hasBlock
          ? { found: true, kind: "check", label: "CLAUDE.md" }
          : {
              detail: "(no REIN block)",
              kind: "warn",
              label: "CLAUDE.md",
            },
      );
    } else {
      items.push({ found: false, kind: "check", label: "CLAUDE.md" });
    }

    for (const skill of REPO_SKILLS) {
      const found = exists(path.join(resolved, ".claude", "commands", `${skill}.md`));
      items.push({ found, kind: "check", label: skill });
    }

    sections.push({ items, label: "Claude Code" });
  }

  return {
    installed: true,
    installMode: summarizeInstallMode(resolved, tools),
    scope: "repo",
    sections,
    sharedSurfaces,
    target: resolved,
    tools,
    version: {
      installed: readInstalledVersion(resolved, tools[0]),
      package: packageVersion,
      updateHint: "rein update",
    },
  };
}

function statusRepo(targetRepo, selectedTools = null) {
  return buildStatusText(getRepoStatusData(targetRepo, selectedTools));
}

function getUserStatusData(selectedTools = null) {
  const home = os.homedir();
  const packageVersion = getPackageVersion();
  const detected = detectInstalledToolsUser(home);
  const tools = selectedTools || detected;

  if (detected.length === 0) {
    return {
      installed: false,
      installMode: null,
      scope: "user",
      sections: [],
      sharedSurfaces: [],
      target: home,
      tools: [],
      version: {
        installed: null,
        package: packageVersion,
        updateHint: "rein update --user",
      },
    };
  }

  const scopePath = (tool, ...parts) =>
    path.join(home, tool === "claude" ? ".claude" : ".codex", ...parts);
  const sharedFound = (file) => tools.some((tool) => exists(scopePath(tool, "rein", file)));
  const sections = [];
  const sharedSurfaces = [{ found: sharedFound("REIN.md"), label: "REIN.md" }];

  if (tools.includes("codex")) {
    const agentsPath = path.join(home, "AGENTS.md");
    const items = [];
    if (exists(agentsPath)) {
      const content = fs.readFileSync(agentsPath, "utf8");
      const hasBlock = content.includes(REIN_BLOCK_START);
      items.push(
        hasBlock
          ? { found: true, kind: "check", label: "AGENTS.md" }
          : {
              detail: "(no REIN block)",
              kind: "warn",
              label: "AGENTS.md",
            },
      );
    } else {
      items.push({ found: false, kind: "check", label: "AGENTS.md" });
    }

    for (const skill of REPO_SKILLS) {
      const found = exists(scopePath("codex", "skills", skill, "SKILL.md"));
      items.push({ found, kind: "check", label: skill });
    }

    sections.push({ items, label: "Codex" });
  }

  if (tools.includes("claude")) {
    const claudePath = path.join(home, "CLAUDE.md");
    const items = [];
    if (exists(claudePath)) {
      const content = fs.readFileSync(claudePath, "utf8");
      const hasBlock = content.includes(REIN_BLOCK_START);
      items.push(
        hasBlock
          ? { found: true, kind: "check", label: "CLAUDE.md" }
          : {
              detail: "(no REIN block)",
              kind: "warn",
              label: "CLAUDE.md",
            },
      );
    } else {
      items.push({ found: false, kind: "check", label: "CLAUDE.md" });
    }

    for (const skill of REPO_SKILLS) {
      const found = exists(scopePath("claude", "commands", `${skill}.md`));
      items.push({ found, kind: "check", label: skill });
    }

    sections.push({ items, label: "Claude Code" });
  }

  return {
    installed: true,
    installMode: summarizeInstallMode(home, tools),
    scope: "user",
    sections,
    sharedSurfaces,
    target: home,
    tools,
    version: {
      installed: readInstalledVersion(home, tools[0]),
      package: packageVersion,
      updateHint: "rein update --user",
    },
  };
}

function statusUser(selectedTools = null) {
  return buildStatusText(getUserStatusData(selectedTools));
}

export { buildStatusText, getRepoStatusData, getUserStatusData, statusRepo, statusUser };
