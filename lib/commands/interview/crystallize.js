import { Command, Flags } from "@oclif/core";
import { crystallizeInterview, formatInterviewStatus } from "../../core/interview-state.js";
import { resolveInterviewSlug } from "../../core/interview-command-support.js";
import { isInteractive, promptInput } from "../../core/prompting.js";

export default class InterviewCrystallizeCommand extends Command {
  static summary = "Write transcript and spec bundle from interview state";

  static enableJsonFlag = true;

  static flags = {
    force: Flags.boolean({
      description: "Rewrite transcript/spec output even if already completed",
    }),
    slug: Flags.string({
      description: "Interview slug",
    }),
    summary: Flags.string({
      description: "JSON summary payload for the crystallized spec",
    }),
  };

  async run() {
    const { flags } = await this.parse(InterviewCrystallizeCommand);
    const slug = await resolveInterviewSlug(flags.slug, "crystallize", process.cwd());
    let summary = flags.summary;
    if (!summary) {
      if (!isInteractive()) {
        throw new Error("Crystallize requires --summary with the structured spec payload.");
      }

      summary = await promptInput("Structured summary JSON");
    }

    const result = crystallizeInterview({
      force: flags.force,
      slug,
      summary,
    });
    if (!this.jsonEnabled()) {
      this.log(formatInterviewStatus(result));
    }

    return result;
  }
}
