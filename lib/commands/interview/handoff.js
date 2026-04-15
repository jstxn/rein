import { Command, Flags } from "@oclif/core";
import { CANONICAL_HANDOFF_TARGETS } from "../../core/interview-contract.js";
import {
  formatInterviewHandoff,
  getInterviewHandoff,
} from "../../core/interview-orchestration.js";
import { resolveInterviewSlug } from "../../core/interview-command-support.js";

export default class InterviewHandoffCommand extends Command {
  static summary = "Summarize and recommend the next workflow after crystallization";

  static enableJsonFlag = true;

  static flags = {
    slug: Flags.string({
      description: "Interview slug",
    }),
    to: Flags.string({
      description: `Preferred handoff target (canonical values: ${CANONICAL_HANDOFF_TARGETS.join(", ")})`,
    }),
  };

  async run() {
    const { flags } = await this.parse(InterviewHandoffCommand);
    const slug = await resolveInterviewSlug(flags.slug, "handoff", process.cwd(), {
      emptyMessage: "No completed interview bundles were found under .rein/state.",
      predicate: (item) => item.status === "completed",
    });
    const view = getInterviewHandoff(slug, { to: flags.to });
    if (!this.jsonEnabled()) {
      this.log(formatInterviewHandoff(view));
    }

    return view;
  }
}
