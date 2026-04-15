import os from "node:os";
import { Args, Command, Flags } from "@oclif/core";
import {
  banner,
  detectInstalledTools,
  detectInstalledToolsUser,
  dim,
  green,
  removeRepo,
  removeUser,
} from "../core/installer.js";
import {
  defaultRepoTarget,
  getSelectedTools,
  normalizeScopeFlags,
  promptForOperationTarget,
} from "../core/command-support.js";
import { isInteractive, promptConfirm } from "../core/prompting.js";

export default class RemoveCommand extends Command {
  static summary = "Uninstall REIN from a repository or user-level setup";

  static args = {
    repoPath: Args.string({
      description: "Repository path when used with --repo",
      required: false,
    }),
  };

  static flags = {
    claude: Flags.boolean({
      description: "Only remove Claude Code surfaces",
    }),
    codex: Flags.boolean({
      description: "Only remove Codex surfaces",
    }),
    repo: Flags.boolean({
      description: "Remove from a repository. Optional repo path may follow.",
    }),
    user: Flags.boolean({
      description: "Remove from the user/global setup",
    }),
    yes: Flags.boolean({
      description: "Skip confirmation prompts",
    }),
  };

  async run() {
    const { args, flags } = await this.parse(RemoveCommand);
    const scope = normalizeScopeFlags(flags, args.repoPath);
    let mode = scope.user ? "user" : "repo";
    let target = scope.user ? os.homedir() : scope.repoPath || defaultRepoTarget();
    const tools = getSelectedTools(flags);

    if (!scope.user && !scope.repoPath) {
      const detected = detectInstalledTools(target);
      if (detected.length === 0 && isInteractive()) {
        const selected = await promptForOperationTarget("remove");
        mode = selected.mode;
        target = selected.path;
      }
    }

    const installedTools =
      tools || (mode === "user" ? detectInstalledToolsUser(target) : detectInstalledTools(target));

    if (installedTools.length === 0) {
      throw new Error("No REIN installation detected. Nothing to remove.");
    }

    if (!flags.yes) {
      if (!isInteractive()) {
        throw new Error("Non-interactive remove requires --yes. Re-run with `rein remove --yes`.");
      }

      const confirmed = await promptConfirm(
        `Remove REIN (${installedTools.join(" + ")}) from ${target}?`,
        { defaultValue: false },
      );
      if (!confirmed) {
        throw new Error("Cancelled");
      }
    }

    banner();
    this.log(`  Removing ${dim(`(${installedTools.join(" + ")})`)}`);
    const messages =
      mode === "user"
        ? removeUser(installedTools)
        : await removeRepo(target, flags.yes, installedTools);
    for (const message of messages) {
      this.log(`    ${message}`);
    }
    this.log("");
    this.log(`  ${green("Done.")} REIN removed from ${dim(target)}`);
    this.log("");
  }
}
