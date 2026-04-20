import { Command, Flags } from "@oclif/core";
import { formatInterviewStatus, getInterviewStatus } from "../../core/interview-state.js";
import { resolveInterviewSlug } from "../../core/interview-command-support.js";

export default class InterviewStatusCommand extends Command {
  static summary = "Show live interview state";

  static enableJsonFlag = true;

  static flags = {
    slug: Flags.string({
      description: "Interview slug",
    }),
  };

  async run() {
    const { flags } = await this.parse(InterviewStatusCommand);
    const slug = await resolveInterviewSlug(flags.slug, "status", process.cwd());
    const view = getInterviewStatus(slug);
    if (!this.jsonEnabled()) {
      this.log(formatInterviewStatus(view));
    }

    return view;
  }
}
