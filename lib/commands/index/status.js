import { Command } from "@oclif/core";
import { formatEvidenceIndexStatus } from "../../core/evidence-index-format.js";
import { getEvidenceIndexStatus } from "../../core/evidence-index.js";

export default class IndexStatusCommand extends Command {
  static summary = "Show local REIN evidence vector index status";

  static enableJsonFlag = true;

  async run() {
    await this.parse(IndexStatusCommand);
    const view = getEvidenceIndexStatus({ cwd: process.cwd() });
    if (!this.jsonEnabled()) {
      this.log(formatEvidenceIndexStatus(view));
    }

    return view;
  }
}
