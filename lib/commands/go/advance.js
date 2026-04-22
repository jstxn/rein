import { Command, Flags } from "@oclif/core";
import { advanceGoFlow, formatGoView } from "../../core/go-workflow.js";

export default class GoAdvanceCommand extends Command {
  static summary = "Record a rein go stage result and advance the flow";

  static enableJsonFlag = true;

  static flags = {
    artifacts: Flags.string({
      description: "JSON object of stage artifact metadata",
    }),
    "changed-files": Flags.string({
      description: "JSON array of changed files for the stage result",
    }),
    "failure-reason": Flags.string({
      description: "Failure or blocker reason when the stage is not completed",
    }),
    slug: Flags.string({
      description: "rein go flow slug",
      required: true,
    }),
    stage: Flags.string({
      description: "Stage to advance",
      options: ["interview", "plan", "implementation", "cleanup", "review", "verify"],
      required: true,
    }),
    status: Flags.string({
      description: "Stage result status",
      options: ["completed", "failed", "blocked"],
      required: true,
    }),
    summary: Flags.string({
      description: "Short summary of the stage result",
    }),
  };

  async run() {
    const { flags } = await this.parse(GoAdvanceCommand);
    const view = advanceGoFlow({
      artifacts: flags.artifacts,
      changedFiles: flags["changed-files"],
      cwd: process.cwd(),
      failureReason: flags["failure-reason"],
      slug: flags.slug,
      stage: flags.stage,
      status: flags.status,
      summary: flags.summary,
    });
    if (!this.jsonEnabled()) {
      this.log(formatGoView(view));
    }

    return view;
  }
}
