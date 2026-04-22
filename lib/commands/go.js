import { Args, Command, Flags } from "@oclif/core";
import { buildGoManifest, formatGoManifest } from "../core/go-workflow.js";

export default class GoCommand extends Command {
  static summary = "Describe the end-to-end REIN go flow from task input or an interview bundle";

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
    task: Flags.string({
      description: "Task or idea to run through rein go",
    }),
  };

  async run() {
    const { args, flags } = await this.parse(GoCommand);
    const manifest = buildGoManifest({
      cwd: process.cwd(),
      fromInterview: flags["from-interview"],
      task: flags.task || args.task,
    });

    if (!this.jsonEnabled()) {
      this.log(formatGoManifest(manifest));
    }

    return manifest;
  }
}
