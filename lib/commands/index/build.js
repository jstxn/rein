import { Command } from "@oclif/core";
import { formatEvidenceIndexBuild } from "../../core/evidence-index-format.js";
import { buildEvidenceIndex } from "../../core/evidence-index.js";

export default class IndexBuildCommand extends Command {
  static summary = "Build the local REIN evidence vector index";

  static enableJsonFlag = true;

  async run() {
    await this.parse(IndexBuildCommand);
    const view = buildEvidenceIndex({ cwd: process.cwd() });
    if (!this.jsonEnabled()) {
      this.log(formatEvidenceIndexBuild(view));
    }

    return view;
  }
}
