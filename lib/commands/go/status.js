import { Command, Flags } from "@oclif/core";
import { formatGoView, getGoStatus } from "../../core/go-workflow.js";

export default class GoStatusCommand extends Command {
  static summary = "Show the current runtime-backed rein go state";

  static enableJsonFlag = true;

  static flags = {
    slug: Flags.string({
      description: "rein go flow slug",
      required: true,
    }),
  };

  async run() {
    const { flags } = await this.parse(GoStatusCommand);
    const view = getGoStatus(flags.slug, { cwd: process.cwd() });
    if (!this.jsonEnabled()) {
      this.log(formatGoView(view));
    }

    return view;
  }
}
