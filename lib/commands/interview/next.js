import { Command, Flags } from "@oclif/core";
import {
  formatInterviewNext,
  getInterviewNext,
} from "../../core/interview-orchestration.js";
import { resolveInterviewSlug } from "../../core/interview-command-support.js";

export default class InterviewNextCommand extends Command {
  static summary = "Suggest the next structural move for an interview";

  static enableJsonFlag = true;

  static flags = {
    slug: Flags.string({
      description: "Interview slug",
    }),
  };

  async run() {
    const { flags } = await this.parse(InterviewNextCommand);
    const slug = await resolveInterviewSlug(flags.slug, "next", process.cwd());
    const view = getInterviewNext(slug);
    if (!this.jsonEnabled()) {
      this.log(formatInterviewNext(view));
    }

    return view;
  }
}
