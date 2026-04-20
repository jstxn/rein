function clampQuestionLines(lines = []) {
  return lines
    .map((line) => String(line || "").trim())
    .filter(Boolean)
    .slice(0, 2);
}

function renderOptionLabel(index) {
  return String.fromCharCode("A".charCodeAt(0) + index);
}

function formatFrame({
  header,
  metricLabel,
  metricValue,
  options = [],
  phase,
  progress,
  questionLines,
}) {
  const lines = [
    `[ ${header} ]`,
    `| Progress: ${progress}`,
    `| Phase: ${phase}`,
    "",
    `| ${metricLabel}: ${metricValue}`,
    "",
    "| Question",
    ...clampQuestionLines(questionLines).map((line) => `| ${line}`),
  ];

  if (options.length > 0) {
    lines.push("|");
    for (const [index, option] of options.entries()) {
      lines.push(`| ${renderOptionLabel(index)}. ${option}`);
    }
  }

  return lines.join("\n");
}

function resolveProgress(view) {
  return `Round ${view.currentRound} of ${view.maxRounds}`;
}

function resolvePhase(view, mode = "status") {
  if (mode === "handoff" || view.suggestedMode === "handoff" || view.handoffTarget) {
    return "preparing handoff";
  }

  if (
    view.suggestedMode === "crystallize" ||
    view.nextAction === "crystallize" ||
    (view.status === "completed" && mode === "status")
  ) {
    return "confirming summary";
  }

  if (view.suggestedMode === "blocked" || view.nextAction === "blocked") {
    return "resolving tension";
  }

  return Number(view.clarityScore || 0) >= 65 ? "narrowing scope" : "clarifying structure";
}

function resolveHeader(view, mode = "status") {
  const phase = resolvePhase(view, mode);
  if (phase === "preparing handoff") {
    return "Handoff";
  }

  if (phase === "confirming summary") {
    return "Review";
  }

  return "Interview";
}

function resolveMetric(view, mode = "status") {
  if (resolveHeader(view, mode) === "Handoff") {
    return {
      label: "Status",
      value: "ready for handoff",
    };
  }

  return {
    label: "Current clarity",
    value: `${view.clarityScore}%`,
  };
}

export function formatInterviewStatusFrame(view) {
  const header = resolveHeader(view, "status");
  const question =
    view.nextAction === "blocked"
      ? "What blocker must be resolved before this interview can safely continue?"
      : view.nextAction === "crystallize"
        ? "Does this interview look ready to crystallize into a summary bundle?"
        : view.status === "completed"
          ? "Does the completed summary still need a material correction before handoff?"
          : "What is the next question that will most improve clarity from this state?";
  const metric = resolveMetric(view, "status");

  return formatFrame({
    header,
    metricLabel: metric.label,
    metricValue: metric.value,
    phase: resolvePhase(view, "status"),
    progress: resolveProgress(view),
    questionLines: [question],
  });
}

export function formatInterviewNextFrame(view) {
  const metric = resolveMetric(view, "next");
  const header = resolveHeader(view, "next");
  const question =
    view.suggestedQuestion ||
    (view.suggestedMode === "crystallize"
      ? "Does this interview look ready to crystallize into a summary bundle?"
      : view.suggestedMode === "handoff"
        ? "Which workflow should this interview enter next?"
        : view.suggestedMode === "blocked"
          ? "What blocker must be resolved before this interview can safely continue?"
          : view.suggestedMove);

  return formatFrame({
    header,
    metricLabel: metric.label,
    metricValue: metric.value,
    phase: resolvePhase(view, "next"),
    progress: resolveProgress(view),
    questionLines: [question],
    options:
      view.suggestedMode === "handoff"
        ? (view.availableHandoffTargets || []).map((target) =>
            target === "plan" && view.slug
              ? `\`${target}\` via \`rein-plan --from-interview ${view.slug}\``
              : `\`${target}\``,
          )
        : [],
  });
}

export function formatInterviewHandoffFrame(view) {
  return formatFrame({
    header: "Handoff",
    metricLabel: "Status",
    metricValue: "ready for handoff",
    phase: "preparing handoff",
    progress: resolveProgress(view),
    questionLines: ["Which workflow should this interview enter next?"],
    options: (view.availableHandoffTargets || []).map((target) =>
      target === "plan" && view.slug
        ? `\`${target}\` via \`rein-plan --from-interview ${view.slug}\``
        : `\`${target}\``,
    ),
  });
}
