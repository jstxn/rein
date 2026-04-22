import { Command, Flags } from "@oclif/core";
import { formatGoView, resumeGoFlow } from "../../core/go-workflow.js";

export default class GoResumeCommand extends Command {
  static summary = "Resume or refresh the current rein go stage from durable state";

  static enableJsonFlag = true;

  static flags = {
    slug: Flags.string({
      description: "rein go flow slug",
      required: true,
    }),
  };

  async run() {
    const { flags } = await this.parse(GoResumeCommand);
    const view = resumeGoFlow(flags.slug, { cwd: process.cwd() });
    if (!this.jsonEnabled()) {
      this.log(formatGoView(view));
    }

    return view;
  }
}
