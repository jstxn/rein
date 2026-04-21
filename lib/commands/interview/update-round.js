import { Command, Flags } from "@oclif/core";
import { formatInterviewStatus, updateInterviewRound } from "../../core/interview-state.js";
import { resolveInterviewSlug } from "../../core/interview-command-support.js";
import { isInteractive, promptInput } from "../../core/prompting.js";
import { ReinError } from "../../core/rein-error.js";

async function requireValue(value, label) {
  if (value) {
    return value;
  }

  if (!isInteractive()) {
    throw new ReinError(`Missing required value: ${label}.`);
  }

  return promptInput(label);
}

export default class InterviewUpdateRoundCommand extends Command {
  static summary = "Persist an interview round and recompute clarity";

  static enableJsonFlag = true;

  static flags = {
    answer: Flags.string({
      description: "Answer text for the round",
    }),
    "challenge-mode": Flags.string({
      description: "Challenge mode used for the round",
    }),
    "decision-boundaries-explicit": Flags.boolean({
      allowNo: true,
      description: "Whether decision boundaries are now explicit",
    }),
    "decision-summary": Flags.string({
      description: "Short decision summary for the round",
    }),
    "non-goals-explicit": Flags.boolean({
      allowNo: true,
      description: "Whether non-goals are now explicit",
    }),
    "pressure-pass-complete": Flags.boolean({
      allowNo: true,
      description: "Whether a pressure pass is complete",
    }),
    question: Flags.string({
      description: "Question text for the round",
    }),
    refinement: Flags.string({
      description: "Refinement summary for the round",
    }),
    round: Flags.integer({
      description: "Expected round number",
    }),
    scores: Flags.string({
      description: "JSON object of dimension scores",
    }),
    slug: Flags.string({
      description: "Interview slug",
    }),
    target: Flags.string({
      description: "Primary clarity dimension targeted this round",
    }),
  };

  async run() {
    const { flags } = await this.parse(InterviewUpdateRoundCommand);
    const slug = await resolveInterviewSlug(flags.slug, "update-round", process.cwd());
    const target = await requireValue(flags.target, "Target dimension");
    const question = await requireValue(flags.question, "Question");
    const answer = await requireValue(flags.answer, "Answer");
    const scores = await requireValue(flags.scores, "Scores JSON");

    const view = updateInterviewRound({
      answer,
      challengeMode: flags["challenge-mode"],
      decisionBoundariesExplicit: flags["decision-boundaries-explicit"],
      decisionSummary: flags["decision-summary"],
      nonGoalsExplicit: flags["non-goals-explicit"],
      pressurePassComplete: flags["pressure-pass-complete"],
      question,
      refinement: flags.refinement,
      round: flags.round,
      scores,
      slug,
      target,
    });
    if (!this.jsonEnabled()) {
      this.log(formatInterviewStatus(view));
    }

    return view;
  }
}
