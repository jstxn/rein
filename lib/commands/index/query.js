import { Args, Command, Flags } from "@oclif/core";
import { formatEvidenceIndexQuery } from "../../core/evidence-index-format.js";
import { queryEvidenceIndex } from "../../core/evidence-index.js";
import { ReinError } from "../../core/rein-error.js";

function parseLimit(rawLimit) {
  const limit = Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 25) {
    throw new ReinError("--limit must be an integer between 1 and 25.");
  }
  return limit;
}

export default class IndexQueryCommand extends Command {
  static summary = "Query the local REIN evidence vector index";

  static enableJsonFlag = true;

  static args = {
    query: Args.string({
      description: "Question or retrieval query",
      required: true,
    }),
  };

  static flags = {
    limit: Flags.string({
      default: "5",
      description: "Maximum results to return, from 1 to 25",
    }),
  };

  async run() {
    const { args, flags } = await this.parse(IndexQueryCommand);
    const view = queryEvidenceIndex(args.query, {
      cwd: process.cwd(),
      limit: parseLimit(flags.limit),
    });
    if (!this.jsonEnabled()) {
      this.log(formatEvidenceIndexQuery(view));
    }

    return view;
  }
}
