import path from "node:path";
import { Args, Command, Flags } from "@oclif/core";
import {
  banner,
  findGitRoot,
  installRepo,
  installUser,
  interactiveInit,
  printResult,
} from "../core/installer.js";
import { getSelectedTools, normalizeScopeFlags } from "../core/command-support.js";
import { isInteractive } from "../core/prompting.js";

export default class InitCommand extends Command {
  static summary = "Install REIN into a repository or user-level setup";

  static args = {
    repoPath: Args.string({
      description: "Repository path when used with --repo",
      required: false,
    }),
  };

  static flags = {
    claude: Flags.boolean({
      description: "Target Claude Code (.claude/commands/, CLAUDE.md)",
    }),
    codex: Flags.boolean({
      description: "Target Codex (.codex/skills/, AGENTS.md)",
    }),
    force: Flags.boolean({
      description: "Overwrite existing REIN files",
    }),
    link: Flags.boolean({
      description: "Symlink packaged assets instead of copying them",
    }),
    repo: Flags.boolean({
      description: "Install into a repository. Optional repo path may follow.",
    }),
    user: Flags.boolean({
      description: "Install into the user/global setup",
    }),
    yes: Flags.boolean({
      description: "Skip the guided prompt and install into the current repository",
    }),
  };

  async run() {
    const { args, flags } = await this.parse(InitCommand);
    const scope = normalizeScopeFlags(flags, args.repoPath);
    let mode = null;
    let targetPath = scope.repoPath;
    let force = flags.force;
    let installMode = flags.link ? "link" : "copy";
    let tools = getSelectedTools(flags);

    if (scope.user) {
      mode = "user";
    } else if (targetPath) {
      mode = "repo";
    } else if (flags.yes) {
      mode = "repo";
      targetPath = findGitRoot(process.cwd()) || process.cwd();
    } else if (isInteractive()) {
      const selection = await interactiveInit(tools, flags.link);
      mode = selection.mode;
      targetPath = selection.path;
      force = selection.force;
      installMode = selection.link ? "link" : "copy";
      tools = selection.tools;
    } else {
      throw new Error(
        "Non-interactive init needs --repo, --user, or --yes. Use `rein init --repo [path]`, `rein init --user`, or run in a TTY.",
      );
    }

    if (!tools) {
      tools = ["codex"];
    }

    banner();
    const result =
      mode === "user"
        ? installUser(force, tools, installMode)
        : installRepo(path.resolve(targetPath), force, tools, installMode);
    printResult(result);
  }
}
