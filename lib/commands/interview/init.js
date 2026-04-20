import { Args, Command, Flags } from "@oclif/core";
import { formatInterviewStatus, initInterviewState } from "../../core/interview-state.js";
import { isInteractive, promptInput } from "../../core/prompting.js";

function resolveProfile(flags) {
  const selected = [
    flags.quick && "quick",
    flags.standard && "standard",
    flags.deep && "deep",
  ].filter(Boolean);
  if (selected.length > 1) {
    throw new Error("Choose only one of --quick, --standard, or --deep.");
  }

  return selected[0] || flags.profile || "standard";
}

export default class InterviewInitCommand extends Command {
  static summary = "Initialize durable rein-interview state";

  static enableJsonFlag = true;

  static args = {
    idea: Args.string({
      description: "Interview topic or idea",
      required: false,
    }),
  };

  static flags = {
    "context-type": Flags.string({
      default: "brownfield",
      description: "Interview context type",
      options: ["brownfield", "greenfield"],
    }),
    deep: Flags.boolean({
      description: "Use the deep profile",
    }),
    force: Flags.boolean({
      description: "Overwrite an existing state file for the slug",
    }),
    idea: Flags.string({
      description: "Interview topic or idea",
    }),
    profile: Flags.string({
      description: "Interview profile",
      options: ["quick", "standard", "deep"],
    }),
    quick: Flags.boolean({
      description: "Use the quick profile",
    }),
    slug: Flags.string({
      description: "Stable slug for the interview state",
    }),
    standard: Flags.boolean({
      description: "Use the standard profile",
    }),
  };

  async run() {
    const { args, flags } = await this.parse(InterviewInitCommand);
    let idea = flags.idea || args.idea;
    if (!idea) {
      if (!isInteractive()) {
        throw new Error("Interview init needs an idea. Pass it as an argument or with --idea.");
      }

      idea = await promptInput("What idea should REIN interview?");
    }

    const view = initInterviewState({
      contextType: flags["context-type"],
      force: flags.force,
      idea,
      profile: resolveProfile(flags),
      slug: flags.slug,
    });
    if (!this.jsonEnabled()) {
      this.log(formatInterviewStatus(view));
    }

    return view;
  }
}
