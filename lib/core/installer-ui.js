import os from "node:os";
import path from "node:path";
import { promptConfirm, promptInput, promptSelect } from "./prompting.js";
import { bold, dim, findGitRoot, green, icons } from "./installer-core.js";
import { ReinError } from "./rein-error.js";

async function interactiveInit(parsedTools, linkMode = false) {
  let tools = parsedTools;
  if (!tools) {
    const toolChoice = await promptSelect("Which tool(s) should REIN target?", [
      { label: "Codex", value: "codex" },
      { label: "Claude Code", value: "claude" },
      { label: "Cursor", value: "cursor" },
      { label: "All", value: "all" },
    ]);
    tools = toolChoice === "all" ? ["codex", "claude", "cursor"] : [toolChoice];
  }

  const currentRepo = findGitRoot(process.cwd());
  const choices = [
    {
      label: `User/global level (${os.homedir()})`,
      value: { mode: "user" },
    },
  ];
  if (currentRepo) {
    choices.push({
      label: `This repository (${currentRepo})`,
      value: { mode: "repo", path: currentRepo },
    });
  }
  choices.push({ label: "Another repository", value: { mode: "other" } });

  const target = await promptSelect("Where do you want to install REIN?", choices);

  let resolvedTarget = target;
  if (target.mode === "other") {
    const answer = await promptInput("Path to the target repository");
    resolvedTarget = { mode: "repo", path: path.resolve(answer.trim()) };
  }

  const force = await promptConfirm("Overwrite existing REIN files?", {
    defaultValue: false,
  });

  const toolLabel = tools.join(" + ");
  const destLabel = resolvedTarget.mode === "user" ? os.homedir() : resolvedTarget.path;
  const shouldContinue = await promptConfirm(`Install REIN (${toolLabel}) into ${destLabel}?`, {
    defaultValue: true,
  });
  if (!shouldContinue) {
    throw new ReinError("Cancelled");
  }

  return {
    mode: resolvedTarget.mode === "user" ? "user" : "repo",
    path: resolvedTarget.path,
    force,
    link: linkMode,
    tools,
  };
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
  console.log(`  ${dim(`Install mode: ${result.installMode}`)}`);
  console.log("");
  console.log(`  ${bold("Next steps")}`);
  for (const step of result.nextSteps) {
    console.log(`    ${icons.arrow} ${step}`);
  }
  console.log("");
}

export { interactiveInit, printResult };
