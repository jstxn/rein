import { formatInterviewNext, getInterviewNext } from "./interview-orchestration.js";
import { initInterviewState, loadInterviewState } from "./interview-state.js";
import {
  createGoState,
  goStateExists,
  loadGoState,
  nextStageName,
  normalizeStage,
  normalizeStageStatus,
  parseJsonFlag,
  probeDiffTooling,
  readInterviewBundle,
  recordStageArtifact,
  serializeGoStateView,
  setStageStatus,
  writeGoState,
} from "./go-state.js";
import { ReinError } from "./rein-error.js";

function normalizeTask(task, interviewBundle) {
  const directTask = String(task || "").trim();
  if (directTask) {
    return directTask;
  }

  if (!interviewBundle) {
    return "";
  }

  return (
    String(interviewBundle.result.idea || "").trim() ||
    String(interviewBundle.result.intent || "").trim() ||
    String(interviewBundle.slug || "").trim()
  );
}

function sourceInterviewFromView(view) {
  return {
    artifactPath: view.artifactPaths.result,
    slug: view.slug,
    specPath: view.artifactPaths.spec,
    statePath: view.artifactPaths.state,
    transcriptPath: view.artifactPaths.transcript,
  };
}

function sourceInterviewFromBundle(bundle) {
  return {
    acceptanceCriteria: bundle.result.acceptanceCriteria || [],
    artifactPath: bundle.artifactPath,
    constraints: bundle.result.constraints || [],
    desiredOutcome: bundle.result.desiredOutcome || null,
    executionBridge: bundle.result.executionBridge || [],
    intent: bundle.result.intent || null,
    slug: bundle.slug,
    specPath: bundle.result.artifactPaths?.spec || null,
    statePath: bundle.result.artifactPaths?.state || null,
    technicalContext: bundle.result.technicalContext || [],
    transcriptPath: bundle.result.artifactPaths?.transcript || null,
  };
}

function flowStatus(state) {
  if (state.status === "completed") {
    return "completed";
  }

  if (state.status === "failed") {
    return "failed";
  }

  if (state.status === "blocked") {
    return "blocked";
  }

  return "in_progress";
}

function buildPlanPayload(state, interviewBundle) {
  const result = interviewBundle.result;
  return {
    acceptanceCriteria: result.acceptanceCriteria || [],
    constraints: result.constraints || [],
    desiredOutcome: result.desiredOutcome,
    executionBridge: result.executionBridge || [],
    generatedAt: new Date().toISOString(),
    implementation: {
      acceptanceCriteria: result.acceptanceCriteria || [],
      constraints: result.constraints || [],
      inScope: result.inScope || [],
      intent: result.intent,
      outOfScope: result.outOfScope || [],
      task: state.task,
      technicalContext: result.technicalContext || [],
    },
    sourceInterview: {
      artifactPath: interviewBundle.artifactPath,
      slug: interviewBundle.slug,
    },
    stages: [
      {
        objective: "Implement the requested task from the interview bundle and plan artifact.",
        stage: "implementation",
        verify: "Run targeted tests or checks before completing the stage result.",
      },
      {
        objective: "Run bounded cleanup against files changed by implementation.",
        stage: "cleanup",
        verify: "Cleanup must stay scoped to the implementation diff.",
      },
      {
        objective: "Review the resulting diff for scope drift, leftovers, and test integrity.",
        stage: "review",
        verify: "Stop if review finds unresolved issues.",
      },
      {
        objective: "Run final verification before declaring the flow complete.",
        stage: "verify",
        verify: "All required checks must pass before completion.",
      },
    ],
    summary: {
      intent: result.intent,
      task: state.task,
      transcriptSummary: result.transcriptSummary || "",
    },
  };
}

function buildInstructionPayload(state, stage, extra = {}) {
  if (stage === "implementation") {
    return {
      acceptanceCriteria: extra.acceptanceCriteria || [],
      constraints: extra.constraints || [],
      objective: "Implement the current plan artifact and report changed files back into rein go.",
      planArtifactPath: extra.planArtifactPath || null,
      stage,
      task: state.task,
      technicalContext: extra.technicalContext || [],
    };
  }

  if (stage === "cleanup") {
    return {
      changedFiles: state.changedFiles,
      objective: "Run rein-cleanup on the changed-file scope produced by implementation.",
      stage,
      task: state.task,
    };
  }

  if (stage === "review") {
    return {
      changedFiles: state.changedFiles,
      objective: "Run rein-review on the current diff and stop on any unresolved findings.",
      stage,
      task: state.task,
    };
  }

  if (stage === "verify") {
    return {
      changedFiles: state.changedFiles,
      objective: "Run rein-verify and record the final evidence for this flow.",
      stage,
      task: state.task,
    };
  }

  return {
    stage,
    task: state.task,
  };
}

function blockStage(state, stage, reason) {
  setStageStatus(state, stage, "blocked", {
    failureReason: reason,
    summary: `${stage} is blocked.`,
  });
  state.currentStage = stage;
  state.failedStage = null;
  state.resumeFrom = stage;
  state.status = "blocked";
  state.stopReason = reason;
}

function prepareStage(state, stage, extra = {}) {
  if (state.environment.blockers.length > 0) {
    blockStage(state, stage, state.environment.blockers[0].message);
    return state;
  }

  if (stage === "review" || stage === "verify") {
    state.environment.diffTooling = probeDiffTooling(state.environment.cwd);
    if (state.environment.diffTooling.status === "blocked") {
      blockStage(state, stage, state.environment.diffTooling.message);
      return state;
    }
  }

  const payload = buildInstructionPayload(state, stage, extra);
  const artifactPath = recordStageArtifact(state, stage, payload);
  setStageStatus(state, stage, "ready", {
    artifacts: artifactPath ? { instruction: artifactPath } : {},
    summary: `${stage} is ready.`,
  });
  state.currentStage = stage;
  state.failedStage = null;
  state.resumeFrom = stage;
  state.status = "in_progress";
  state.stopReason = null;
  return state;
}

function completeInterviewStage(state, interviewBundle) {
  state.sourceInterview = sourceInterviewFromBundle(interviewBundle);
  setStageStatus(state, "interview", "completed", {
    artifacts: {
      result: interviewBundle.artifactPath,
      spec: interviewBundle.result.artifactPaths?.spec || null,
      transcript: interviewBundle.result.artifactPaths?.transcript || null,
    },
    summary: "Interview bundle completed and registered in rein go.",
  });
}

function completePlanStage(state, interviewBundle) {
  const payload = buildPlanPayload(state, interviewBundle);
  const artifactPath = recordStageArtifact(state, "plan", payload);
  setStageStatus(state, "plan", "completed", {
    artifacts: {
      interview: interviewBundle.artifactPath,
      plan: artifactPath,
    },
    summary: "Plan artifact generated from the completed interview bundle.",
  });

  prepareStage(state, "implementation", {
    acceptanceCriteria: payload.acceptanceCriteria,
    constraints: payload.constraints,
    planArtifactPath: artifactPath,
    technicalContext: payload.implementation.technicalContext,
  });
}

function buildRecommendedCommand(state) {
  if (state.status === "completed") {
    return null;
  }

  if (state.currentStage === "interview") {
    if (state.sourceInterview?.slug) {
      return `rein interview next --slug ${state.sourceInterview.slug} --json`;
    }

    return null;
  }

  if (state.currentStage) {
    return `rein go advance --slug ${state.slug} --stage ${state.currentStage} --status completed ... --json`;
  }

  if (state.resumeFrom) {
    return `rein go resume --slug ${state.slug} --json`;
  }

  return null;
}

function buildView(state, extra = {}) {
  const view = serializeGoStateView(state);
  view.automationPolicy = "mostly-automatic";
  view.failurePolicy = "stop-on-any-stage-failure";
  view.flowStatus = flowStatus(state);
  view.nextAction =
    extra.nextAction ||
    (state.status === "completed"
      ? "completed"
      : state.currentStage === "interview"
        ? "continue-interview"
        : state.currentStage || state.status);
  view.recommendedCommand = extra.recommendedCommand || buildRecommendedCommand(state);
  if (extra.interviewGuidance) {
    view.interviewGuidance = extra.interviewGuidance;
  }

  return view;
}

function interviewStageNextAction(interviewGuidance) {
  return interviewGuidance.nextAction === "crystallize"
    ? "awaiting-crystallize"
    : "continue-interview";
}

function viewForInterviewStage(state, options = {}) {
  const interviewGuidance = getInterviewNext(state.sourceInterview.slug, options);
  return buildView(state, {
    interviewGuidance,
    nextAction: interviewStageNextAction(interviewGuidance),
    recommendedCommand: interviewGuidance.recommendedCommand,
  });
}

function startFreshFlow(options = {}) {
  const task = String(options.task || "").trim();
  if (!task) {
    throw new ReinError("rein go needs a task or --from-interview <slug|path>.");
  }

  const slug = options.slug || task;
  if (goStateExists(slug, options) && !options.force) {
    throw new ReinError(
      `rein go state already exists for slug "${slug}". Use --slug to choose another flow slug or --force to overwrite.`,
    );
  }

  const state = createGoState({
    cwd: options.cwd,
    mode: "fresh",
    slug,
    task,
  });

  const interviewView = initInterviewState({
    cwd: options.cwd,
    force: options.force,
    idea: task,
    slug: state.slug,
  });

  state.sourceInterview = sourceInterviewFromView(interviewView);
  setStageStatus(state, "interview", "ready", {
    artifacts: {
      context: interviewView.artifactPaths.context,
      state: interviewView.artifactPaths.state,
    },
    summary: "Interview initialized and awaiting clarification.",
  });
  state.currentStage = "interview";
  state.resumeFrom = "interview";

  writeGoState(state.environment.workspaceRoot, state);
  return state;
}

function startFromInterviewFlow(options = {}) {
  const interviewBundle = readInterviewBundle(options.fromInterview, options.cwd);
  const task = normalizeTask(options.task, interviewBundle);
  if (!task) {
    throw new ReinError("rein go needs a task or --from-interview <slug|path>.");
  }

  const slug = options.slug || interviewBundle.slug;
  if (goStateExists(slug, options) && !options.force) {
    throw new ReinError(
      `rein go state already exists for slug "${slug}". Use --slug to choose another flow slug or --force to overwrite.`,
    );
  }

  const state = createGoState({
    cwd: options.cwd,
    mode: "from-interview",
    slug,
    sourceInterview: sourceInterviewFromBundle(interviewBundle),
    task,
  });

  completeInterviewStage(state, interviewBundle);
  completePlanStage(state, interviewBundle);

  return writeGoState(state.environment.workspaceRoot, state);
}

function startGoFlow(options = {}) {
  const state = options.fromInterview ? startFromInterviewFlow(options) : startFreshFlow(options);
  if (state.currentStage === "interview") {
    return viewForInterviewStage(state, options);
  }

  return buildView(state);
}

function refreshInterviewStage(state, options = {}) {
  if (!state.sourceInterview?.slug) {
    throw new ReinError("rein go interview stage has no linked interview slug.");
  }

  const interviewState = loadInterviewState(state.sourceInterview.slug, options);
  if (interviewState.status !== "completed" || !interviewState.artifactPaths?.result) {
    return viewForInterviewStage(state, options);
  }

  const interviewBundle = readInterviewBundle(interviewState.artifactPaths.result, options.cwd);
  completeInterviewStage(state, interviewBundle);
  completePlanStage(state, interviewBundle);
  writeGoState(state.environment.workspaceRoot, state);
  return buildView(state);
}

function resumeGoFlow(slug, options = {}) {
  const state = loadGoState(slug, options);
  if (state.currentStage === "interview") {
    return refreshInterviewStage(state, options);
  }

  if (
    state.status === "blocked" &&
    (state.currentStage === "review" || state.currentStage === "verify")
  ) {
    return buildView(prepareStage(state, state.currentStage));
  }

  return buildView(state);
}

function advanceGoFlow(options = {}) {
  const state = loadGoState(options.slug, options);
  const stage = normalizeStage(options.stage);
  const status = normalizeStageStatus(options.status);

  if (state.currentStage !== stage && state.stageResults[stage]?.status !== "ready") {
    throw new ReinError(
      `rein go cannot advance stage "${stage}" because the current stage is "${state.currentStage}".`,
    );
  }

  const artifacts = parseJsonFlag(options.artifacts, "artifacts");
  const changedFiles = options.changedFiles
    ? parseJsonFlag(options.changedFiles, "changed-files")
    : [];
  if (options.changedFiles && !Array.isArray(changedFiles)) {
    throw new ReinError("changed-files must be a JSON array.");
  }

  const summary = String(options.summary || "").trim() || null;
  const failureReason = String(options.failureReason || "").trim() || null;
  const payload = {
    artifacts,
    changedFiles,
    failureReason,
    stage,
    status,
    summary,
    task: state.task,
    updatedAt: new Date().toISOString(),
  };

  const artifactPath = recordStageArtifact(state, stage, payload);
  setStageStatus(state, stage, status, {
    artifacts: artifactPath ? { result: artifactPath, ...artifacts } : artifacts,
    changedFiles,
    failureReason,
    summary,
  });

  if (status === "failed" || status === "blocked") {
    state.currentStage = stage;
    state.failedStage = status === "failed" ? stage : null;
    state.resumeFrom = stage;
    state.status = status === "failed" ? "failed" : "blocked";
    state.stopReason = failureReason || `${stage} ${status}`;
    writeGoState(state.environment.workspaceRoot, state);
    return buildView(state);
  }

  if (stage === "implementation") {
    state.changedFiles = [...new Set(changedFiles)];
  } else if (changedFiles.length > 0) {
    state.changedFiles = [...new Set([...state.changedFiles, ...changedFiles])];
  }

  const next = nextStageName(stage);
  if (!next) {
    state.currentStage = null;
    state.failedStage = null;
    state.resumeFrom = null;
    state.status = "completed";
    state.stopReason = null;
    writeGoState(state.environment.workspaceRoot, state);
    return buildView(state);
  }

  prepareStage(state, next);
  writeGoState(state.environment.workspaceRoot, state);
  return buildView(state);
}

function getGoStatus(slug, options = {}) {
  const state = loadGoState(slug, options);
  if (state.currentStage === "interview") {
    return viewForInterviewStage(state, options);
  }

  return buildView(state);
}

function formatGoView(view) {
  if (view.currentStage === "interview" && view.interviewGuidance) {
    return formatInterviewNext(view.interviewGuidance);
  }

  const lines = [
    "[ Go ]",
    `| Mode: ${view.mode}`,
    `| Status: ${view.flowStatus}`,
    `| Entry: ${view.publicCommand}`,
    "",
    "| Task",
    `| ${view.task}`,
    "",
    "| Stage summary",
    `| total: ${view.stageSummary.total}`,
    `| completed: ${view.stageSummary.completed}`,
    `| ready: ${view.stageSummary.ready}`,
    `| pending: ${view.stageSummary.pending}`,
    `| blocked: ${view.stageSummary.blocked}`,
  ];

  if (view.currentStage) {
    lines.push("");
    lines.push(`| Current stage: ${view.currentStage}`);
  }

  if (view.stopReason) {
    lines.push(`| Stop reason: ${view.stopReason}`);
  }

  if (view.recommendedCommand) {
    lines.push(`| Next: ${view.recommendedCommand}`);
  }

  lines.push("");
  lines.push("| Wrappers");
  lines.push(`| ${view.wrappers.join(", ")}`);
  lines.push("");
  lines.push("| Stages");

  for (const stage of view.stageOrder) {
    const detail = view.stageResults[stage];
    const artifactHint = detail?.artifacts?.instruction || detail?.artifacts?.result || null;
    const suffix = artifactHint ? ` -> ${artifactHint}` : "";
    lines.push(`| ${stage} (${detail?.status || "pending"})${suffix}`);
  }

  if (view.sourceInterview?.artifactPath) {
    lines.push("");
    lines.push("| Interview bundle");
    lines.push(`| ${view.sourceInterview.artifactPath}`);
  }

  return lines.join("\n");
}

export { advanceGoFlow, formatGoView, getGoStatus, resumeGoFlow, startGoFlow };
