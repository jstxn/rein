import { listInterviewStates } from "./interview-state.js";
import { isInteractive, promptSelect } from "./prompting.js";

export async function resolveInterviewSlug(slug, actionLabel, cwd, options = {}) {
  if (slug) {
    return slug;
  }

  const predicate = options.predicate || (() => true);
  const interviews = listInterviewStates({ cwd }).filter(predicate);
  if (interviews.length === 0) {
    throw new Error(
      options.emptyMessage || "No interview state files were found under .rein/state.",
    );
  }

  if (interviews.length === 1) {
    return interviews[0].slug;
  }

  if (!isInteractive()) {
    throw new Error(
      `Specify --slug for \`rein interview ${actionLabel}\` in non-interactive mode.`,
    );
  }

  return promptSelect(
    `Which interview should REIN ${actionLabel}?`,
    interviews.map((item) => ({
      description: `${item.clarityScore}% clarity, round ${item.currentRound}/${item.maxRounds}`,
      label: item.slug,
      value: item.slug,
    })),
  );
}
