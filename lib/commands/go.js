import { Args, Command, Flags } from "@oclif/core";
import { formatGoView, startGoFlow } from "../core/go-workflow.js";

export default class GoCommand extends Command {
  static summary =
    "Start the runtime-backed REIN go flow from a task or completed interview bundle";

  static enableJsonFlag = true;

  static args = {
    task: Args.string({
      description: "Task or idea to run through rein go",
      required: false,
    }),
  };

  static flags = {
    "from-interview": Flags.string({
      description: "Completed rein-interview slug or result.json path",
    }),
    force: Flags.boolean({
      description: "Overwrite an existing interview slug when starting from a fresh task",
    }),
    slug: Flags.string({
      description: "Stable slug for the rein go flow and linked interview state",
    }),
    task: Flags.string({
      description: "Task or idea to run through rein go",
    }),
  };

  async run() {
    const { args, flags } = await this.parse(GoCommand);
    const view = startGoFlow({
      cwd: process.cwd(),
      force: flags.force,
      fromInterview: flags["from-interview"],
      slug: flags.slug,
      task: flags.task || args.task,
    });

    if (!this.jsonEnabled()) {
      this.log(formatGoView(view));
    }

    return view;
  }
}
