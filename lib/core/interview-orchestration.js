import fs from "node:fs";
import { CANONICAL_HANDOFF_TARGETS, normalizeHandoffTarget } from "./interview-contract.js";
import { formatInterviewHandoffFrame, formatInterviewNextFrame } from "./interview-presentation.js";
import { getInterviewStatus, loadInterviewState } from "./interview-state.js";

const GATE_GUIDANCE = {
  decisionBoundariesExplicit: {
    focus: "decisionBoundariesExplicit",
    move: "Force a decision boundary or tradeoff before broadening implementation detail.",
    question:
      "Which decision boundary or tradeoff needs to be made before implementation detail expands?",
    strategy: "tradeoff",
  },
  nonGoalsExplicit: {
    focus: "nonGoalsExplicit",
    move: "Make non-goals explicit so the work stops drifting outward.",
    question: "What should stay out of scope so this work stops drifting outward?",
    strategy: "boundary-setting",
  },
  pressurePassComplete: {
    focus: "pressurePassComplete",
    move: "Revisit an earlier answer with a deeper follow-up or contradiction test.",
    question:
      "What earlier answer needs a deeper follow-up or contradiction check before moving on?",
    strategy: "pressure-pass",
  },
};

const GATE_PRIORITY = ["nonGoalsExplicit", "decisionBoundariesExplicit", "pressurePassComplete"];

const DIMENSION_GUIDANCE = {
  constraints: {
    move: "Surface the external constraints, compatibility requirements, or hard limits.",
    question: "What external constraints or hard limits need to shape this work?",
    strategy: "constraint-probe",
  },
  context: {
    move: "Ground the request in current codebase facts, existing behavior, or workflow reality.",
    question: "What current codebase facts or existing behavior should ground this work?",
    strategy: "brownfield-grounding",
  },
  intent: {
    move: "Probe why this matters now and what concrete pain it resolves.",
    question: "Why does this matter now, and what concrete pain should it resolve?",
    strategy: "concrete-example",
  },
  outcome: {
    move: "Clarify the desired end state and what good looks like.",
    question: "What concrete end state should this work produce?",
    strategy: "end-state",
  },
  scope: {
    move: "Pin down what should change and what must stay untouched.",
    question: "What should change, and what must stay untouched?",
    strategy: "scope-boundary",
  },
  success: {
    move: "Define the acceptance signal that proves the work is done.",
    question: "What observable signal will prove this work is done?",
    strategy: "acceptance-criteria",
  },
};

function loadInterviewResult(state) {
  const resultPath = state.artifactPaths?.result;
  if (!resultPath || !fs.existsSync(resultPath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(resultPath, "utf8"));
}

function unresolvedReadinessGates(view) {
  return GATE_PRIORITY.filter((key) => !view.readinessGates[key]);
}

function availableHandoffTargets(result) {
  const seen = new Set();
  const targets = [];
  for (const item of result?.executionBridge || []) {
    const normalized = normalizeHandoffTarget(item);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    targets.push(normalized);
  }

  return targets;
}

function handoffRecommendation(target, slug) {
  switch (target) {
    case "plan":
      return {
        invocation: `rein-plan --from-interview ${slug}`,
        move: "Hand the completed interview bundle into rein-plan and build the implementation sequence.",
        skill: "rein-plan",
      };
    case "scope":
      return {
        invocation: null,
        move: "Use the completed interview bundle to negotiate or narrow scope before planning.",
        skill: "rein-scope",
      };
    case "implementation":
      return {
        invocation: null,
        move: "Proceed to implementation using the completed interview result bundle as the brief.",
        skill: "implementation",
      };
    case "refinement":
      return {
        invocation: null,
        move: "Start a focused follow-up clarification pass using the completed interview bundle as context.",
        skill: "rein-interview",
      };
    default:
      return {
        invocation: null,
        move: `Use the completed interview bundle to continue with the ${target} workflow.`,
        skill: target,
      };
  }
}

function continueGuidance(view) {
  const unresolved = unresolvedReadinessGates(view);
  if (unresolved.length > 0) {
    const gate = unresolved[0];
    const guidance = GATE_GUIDANCE[gate];
    return {
      questionStrategy: guidance.strategy,
      suggestedQuestion: guidance.question,
      recommendedCommand: `rein interview update-round --slug ${view.slug} --round ${view.currentRound + 1} ... --json`,
      suggestedFocus: guidance.focus,
      suggestedMode: "continue",
      suggestedMove: guidance.move,
      unresolvedReadinessGates: unresolved,
    };
  }

  const weakest = view.weakestDimension;
  const guidance = DIMENSION_GUIDANCE[weakest] || {
    move: "Probe the weakest dimension with a sharper, more concrete follow-up.",
    strategy: "targeted-follow-up",
  };
  return {
    questionStrategy: guidance.strategy,
    suggestedQuestion: guidance.question,
    recommendedCommand: `rein interview update-round --slug ${view.slug} --round ${view.currentRound + 1} ... --json`,
    suggestedFocus: weakest,
    suggestedMode: "continue",
    suggestedMove: guidance.move,
    unresolvedReadinessGates: unresolved,
  };
}

export function getInterviewNext(slug, options = {}) {
  const view = getInterviewStatus(slug, options);
  const state = loadInterviewState(slug, options);
  const result = loadInterviewResult(state);

  if (view.nextAction === "completed") {
    const targets = availableHandoffTargets(result);
    const primaryTarget = targets[0] || "plan";
    return {
      ...view,
      availableHandoffTargets: targets,
      questionStrategy: null,
      recommendedCommand: `rein interview handoff --slug ${view.slug} --to ${primaryTarget} --json`,
      suggestedFocus: primaryTarget,
      suggestedQuestion: "Which workflow should this interview enter next?",
      suggestedMode: "handoff",
      suggestedMove: "Hand the completed interview bundle into the next workflow.",
      unresolvedReadinessGates: unresolvedReadinessGates(view),
    };
  }

  if (view.nextAction === "crystallize") {
    return {
      ...view,
      availableHandoffTargets: [],
      questionStrategy: "summary-synthesis",
      recommendedCommand: `rein interview crystallize --slug ${view.slug} --summary '<json>' --json`,
      suggestedFocus: "summary",
      suggestedQuestion: "Does this interview look ready to crystallize into a summary bundle?",
      suggestedMode: "crystallize",
      suggestedMove: "Prepare the structured summary JSON and crystallize the interview bundle.",
      unresolvedReadinessGates: unresolvedReadinessGates(view),
    };
  }

  if (view.nextAction === "blocked") {
    const unresolved = unresolvedReadinessGates(view);
    const gate = unresolved[0];
    const guidance = gate ? GATE_GUIDANCE[gate] : null;
    return {
      ...view,
      availableHandoffTargets: [],
      questionStrategy: guidance?.strategy || "risk-review",
      recommendedCommand: `rein interview status --slug ${view.slug} --json`,
      suggestedFocus: guidance?.focus || view.weakestDimension,
      suggestedQuestion: "What blocker must be resolved before this interview can safely continue?",
      suggestedMode: "blocked",
      suggestedMove:
        guidance?.move ||
        "The interview hit its limits; resolve the remaining blockers or explicitly accept the risk of stopping early.",
      unresolvedReadinessGates: unresolved,
    };
  }

  return {
    ...view,
    availableHandoffTargets: [],
    ...continueGuidance(view),
  };
}

export function getInterviewHandoff(slug, options = {}) {
  const state = loadInterviewState(slug, options);
  if (state.status !== "completed") {
    throw new Error(
      `Interview "${state.slug}" is not completed yet. Crystallize it before requesting a handoff.`,
    );
  }

  const result = loadInterviewResult(state);
  if (!result) {
    throw new Error(
      `Interview "${state.slug}" has no result bundle yet. Re-run crystallize before requesting a handoff.`,
    );
  }

  const targets = availableHandoffTargets(result);
  const requestedTargetRaw = String(options.to || "").trim();
  const requestedTarget = normalizeHandoffTarget(requestedTargetRaw);
  if (requestedTargetRaw && !requestedTarget) {
    throw new Error(
      `Unknown handoff target "${options.to}". Expected one of: ${CANONICAL_HANDOFF_TARGETS.join(", ")}.`,
    );
  }

  const handoffTarget = requestedTarget || targets[0] || "plan";
  const recommendation = handoffRecommendation(handoffTarget, state.slug);

  return {
    acceptanceCriteria: result.acceptanceCriteria || [],
    artifactPaths: state.artifactPaths,
    assumptions: result.assumptions || [],
    availableHandoffTargets: targets,
    clarityScore: state.clarityScore,
    constraints: result.constraints || [],
    currentRound: state.currentRound,
    desiredOutcome: result.desiredOutcome,
    executionBridge: result.executionBridge || [],
    handoffTarget,
    inScope: result.inScope || [],
    intent: result.intent,
    maxRounds: state.maxRounds,
    outOfScope: result.outOfScope || [],
    recommendedSkill: recommendation.skill,
    recommendedSkillInvocation: recommendation.invocation,
    slug: state.slug,
    sourceResult: state.artifactPaths.result,
    status: state.status,
    suggestedMove: recommendation.move,
    technicalContext: result.technicalContext || [],
    transcriptSummary: result.transcriptSummary || "",
    warning:
      targets.length > 0 && !targets.includes(handoffTarget)
        ? `Requested handoff target "${handoffTarget}" is not listed in executionBridge.`
        : null,
  };
}

export function formatInterviewNext(view) {
  return formatInterviewNextFrame(view);
}

export function formatInterviewHandoff(view) {
  return formatInterviewHandoffFrame(view);
}
