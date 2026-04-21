import { Args, Command, Flags } from "@oclif/core";
import {
  banner,
  getRepoStatusData,
  getUserStatusData,
  statusRepo,
  statusUser,
} from "../core/installer.js";
import {
  defaultRepoTarget,
  getSelectedTools,
  normalizeScopeFlags,
} from "../core/command-support.js";

export default class StatusCommand extends Command {
  static summary = "Show what REIN surfaces are installed and their version";

  static enableJsonFlag = true;

  static args = {
    repoPath: Args.string({
      description: "Repository path when used with --repo",
      required: false,
    }),
  };

  static flags = {
    claude: Flags.boolean({
      description: "Only inspect Claude Code surfaces",
    }),
    codex: Flags.boolean({
      description: "Only inspect Codex surfaces",
    }),
    cursor: Flags.boolean({
      description: "Only inspect Cursor surfaces",
    }),
    repo: Flags.boolean({
      description: "Inspect a repository. Optional repo path may follow.",
    }),
    user: Flags.boolean({
      description: "Inspect the user/global setup",
    }),
  };

  async run() {
    const { args, flags } = await this.parse(StatusCommand);
    const scope = normalizeScopeFlags(flags, args.repoPath);
    const tools = getSelectedTools(flags);

    if (scope.user) {
      const data = getUserStatusData(tools);
      if (!this.jsonEnabled()) {
        banner();
        this.log(statusUser(tools));
      }
      return data;
    }

    const repoTarget = scope.repoPath || defaultRepoTarget();
    const data = getRepoStatusData(repoTarget, tools);
    if (!this.jsonEnabled()) {
      banner();
      this.log(statusRepo(repoTarget, tools));
    }
    return data;
  }
}
