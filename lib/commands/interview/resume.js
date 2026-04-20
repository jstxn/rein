import { Command, Flags } from "@oclif/core";
import { formatInterviewStatus, resumeInterview } from "../../core/interview-state.js";
import { resolveInterviewSlug } from "../../core/interview-command-support.js";

export default class InterviewResumeCommand extends Command {
  static summary = "Resume a prior interview state";

  static enableJsonFlag = true;

  static flags = {
    slug: Flags.string({
      description: "Interview slug",
    }),
  };

  async run() {
    const { flags } = await this.parse(InterviewResumeCommand);
    const slug = await resolveInterviewSlug(flags.slug, "resume", process.cwd());
    const view = resumeInterview(slug);
    if (!this.jsonEnabled()) {
      this.log(formatInterviewStatus(view));
    }

    return view;
  }
}
