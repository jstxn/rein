import { Args, Command, Flags } from "@oclif/core";
import {
  banner,
  detectInstalledTools,
  detectInstalledToolsUser,
  installRepo,
  installUser,
  printResult,
  resolveInstalledMode,
} from "../core/installer.js";
import {
  defaultRepoTarget,
  getSelectedTools,
  normalizeScopeFlags,
  promptForOperationTarget,
} from "../core/command-support.js";
import { isInteractive } from "../core/prompting.js";

export default class UpdateCommand extends Command {
  static summary = "Re-install REIN surfaces, replacing existing files";

  static args = {
    repoPath: Args.string({
      description: "Repository path when used with --repo",
      required: false,
    }),
  };

  static flags = {
    claude: Flags.boolean({
      description: "Only update Claude Code surfaces",
    }),
    codex: Flags.boolean({
      description: "Only update Codex surfaces",
    }),
    link: Flags.boolean({
      description: "Force linked install mode for this update",
    }),
    repo: Flags.boolean({
      description: "Update a repository. Optional repo path may follow.",
    }),
    user: Flags.boolean({
      description: "Update the user/global setup",
    }),
  };

  async run() {
    const { args, flags } = await this.parse(UpdateCommand);
    const scope = normalizeScopeFlags(flags, args.repoPath);
    let mode = scope.user ? "user" : "repo";
    let target = scope.user ? process.env.HOME || "" : scope.repoPath || defaultRepoTarget();
    const tools = getSelectedTools(flags);

    if (!scope.user && !scope.repoPath) {
      const detected = detectInstalledTools(target);
      if (detected.length === 0 && isInteractive()) {
        const selected = await promptForOperationTarget("update");
        mode = selected.mode;
        target = selected.path;
      }
    }

    const installedTools =
      tools || (mode === "user" ? detectInstalledToolsUser(target) : detectInstalledTools(target));

    if (installedTools.length === 0) {
      throw new Error(
        "No REIN installation detected. Run `rein init` first, or specify --codex / --claude.",
      );
    }

    const installMode = flags.link ? "link" : resolveInstalledMode(target, installedTools);

    banner();
    const result =
      mode === "user"
        ? installUser(true, installedTools, installMode)
        : installRepo(target, true, installedTools, installMode);
    printResult(result);
  }
}
