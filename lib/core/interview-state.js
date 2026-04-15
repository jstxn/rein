import fs from "node:fs";
import path from "node:path";
import { findGitRoot } from "./installer.js";

const PROFILE_CONFIG = {
  deep: { label: "Deep", maxRounds: 20, thresholdPercent: 90 },
  quick: { label: "Quick", maxRounds: 5, thresholdPercent: 70 },
  standard: { label: "Standard", maxRounds: 12, thresholdPercent: 80 },
};

const WEIGHTS = {
  brownfield: {
    constraints: 0.15,
    context: 0.1,
    intent: 0.25,
    outcome: 0.2,
    scope: 0.2,
    success: 0.1,
  },
  greenfield: {
    constraints: 0.15,
    intent: 0.3,
    outcome: 0.25,
    scope: 0.2,
    success: 0.1,
  },
};

const READINESS_KEYS = ["decisionBoundariesExplicit", "nonGoalsExplicit", "pressurePassComplete"];

function allowedDimensions(contextType) {
  return Object.keys(WEIGHTS[contextType]);
}

function workspaceRoot(cwd = process.cwd()) {
  return findGitRoot(cwd) || cwd;
}

function ensureDir(target) {
  fs.mkdirSync(target, { recursive: true });
}

function timestampForFilename(date = new Date()) {
  return date
    .toISOString()
    .replace(/[:-]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function parseJsonFlag(raw, label) {
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Invalid ${label} JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function normalizeProfile(profile) {
  const normalized = String(profile || "standard").toLowerCase();
  if (!PROFILE_CONFIG[normalized]) {
    throw new Error(`Unknown profile: ${profile}`);
  }

  return normalized;
}

function normalizeContextType(contextType) {
  const normalized = String(contextType || "brownfield").toLowerCase();
  if (!WEIGHTS[normalized]) {
    throw new Error(`Unknown context type: ${contextType}`);
  }

  return normalized;
}

function artifactPaths(root, slug, timestamp) {
  const reinRoot = path.join(root, ".rein");
  const specDir = path.join(reinRoot, "specs", `rein-interview-${slug}`);
  return {
    context: path.join(reinRoot, "context", `${slug}-${timestamp}.md`),
    result: path.join(specDir, "result.json"),
    spec: path.join(specDir, "spec.md"),
    specDir,
    state: path.join(reinRoot, "state", `interview-${slug}.json`),
    transcript: path.join(reinRoot, "interviews", `${slug}-${timestamp}.md`),
  };
}

function ensureArtifactDirs(paths) {
  ensureDir(path.dirname(paths.state));
  ensureDir(path.dirname(paths.context));
  ensureDir(path.dirname(paths.transcript));
  ensureDir(paths.specDir);
}

function scorePercent(dimensionScores, contextType) {
  const weights = WEIGHTS[contextType];
  const clarity = Object.entries(weights).reduce((total, [dimension, weight]) => {
    return total + Number(dimensionScores[dimension] || 0) * weight;
  }, 0);

  return Math.round(clarity * 100);
}

function weakestDimension(dimensionScores, contextType) {
  const dimensions = Object.keys(WEIGHTS[contextType]);
  return dimensions.reduce((weakest, dimension) => {
    if (!weakest) {
      return dimension;
    }

    return Number(dimensionScores[dimension] || 0) < Number(dimensionScores[weakest] || 0)
      ? dimension
      : weakest;
  }, null);
}

function computeNextAction(state) {
  if (state.status === "completed") {
    return "completed";
  }

  if (
    state.currentRound >= state.maxRounds &&
    (state.clarityScore < state.thresholdPercent || !allReadinessGates(state))
  ) {
    return "blocked";
  }

  if (state.clarityScore >= state.thresholdPercent && allReadinessGates(state)) {
    return "crystallize";
  }

  return "continue";
}

function allReadinessGates(state) {
  return READINESS_KEYS.every((key) => Boolean(state.readinessGates[key]));
}

function buildContextSnapshot(state) {
  return [
    `# Context Snapshot: ${state.slug}`,
    "",
    `- Timestamp: ${state.createdAt}`,
    `- Task statement: "${state.idea}"`,
    `- Desired outcome: Pending interview crystallization`,
    `- Stated solution: Runtime-backed rein-interview workflow`,
    `- Probable intent hypothesis: Clarify requirements before planning or implementation.`,
    "",
    "## Known Facts And Evidence",
    "",
    "- State is persisted under `.rein/state/`.",
    `- Profile: ${PROFILE_CONFIG[state.profile].label}`,
    `- Context type: ${state.contextType}`,
    "",
    "## Constraints",
    "",
    "- Interview runtime owns state, scoring, validation, and artifact persistence.",
    "- The LLM handles question generation and answer collection.",
    "",
    "## Unknowns And Open Questions",
    "",
    "- Outcome details still need to be crystallized from the interview rounds.",
    "- Scope boundaries still need to be refined by the user and interviewer.",
    "",
    "## Decision-Boundary Unknowns",
    "",
    "- Which follow-on path should be taken after crystallization (`rein-plan`, implementation, or refinement).",
    "",
    "## Likely Codebase Touchpoints",
    "",
    "- `.codex/skills/rein-interview/SKILL.md`",
    "- `.claude/commands/rein-interview.md`",
    "",
  ].join("\n");
}

function normalizeDimensionScores(rawScores, contextType) {
  const weights = WEIGHTS[contextType];
  const dimensionScores = {};

  for (const dimension of Object.keys(weights)) {
    const value = rawScores[dimension];
    if (typeof value !== "number" || Number.isNaN(value) || value < 0 || value > 1) {
      throw new Error(`Score for "${dimension}" must be a number between 0 and 1.`);
    }

    dimensionScores[dimension] = value;
  }

  return dimensionScores;
}

function normalizeTargetDimension(target, contextType) {
  const normalized = String(target || "").trim();
  if (!normalized) {
    throw new Error("Interview rounds require a target dimension.");
  }

  if (!allowedDimensions(contextType).includes(normalized)) {
    throw new Error(
      `Target dimension "${normalized}" is invalid for ${contextType}. Expected one of: ${allowedDimensions(
        contextType,
      ).join(", ")}.`,
    );
  }

  return normalized;
}

function loadStateFile(statePath) {
  if (!fs.existsSync(statePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(statePath, "utf8"));
}

function writeJson(targetPath, value) {
  fs.writeFileSync(targetPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(targetPath, value) {
  fs.writeFileSync(targetPath, value, "utf8");
}

function serializableStateView(state) {
  return {
    artifactPaths: state.artifactPaths,
    clarityScore: state.clarityScore,
    contextType: state.contextType,
    currentRound: state.currentRound,
    dimensionBreakdown: state.dimensionScores,
    idea: state.idea,
    maxRounds: state.maxRounds,
    nextAction: computeNextAction(state),
    profile: state.profile,
    readinessGates: state.readinessGates,
    slug: state.slug,
    status: state.status,
    threshold: state.thresholdPercent,
    weakestDimension: weakestDimension(state.dimensionScores, state.contextType),
  };
}

function writeState(root, state) {
  const paths = artifactPaths(root, state.slug, state.timestamp);
  ensureArtifactDirs(paths);
  state.artifactPaths = paths;
  writeJson(paths.state, state);
  return state;
}

export function initInterviewState(options = {}) {
  const root = workspaceRoot(options.cwd);
  const profile = normalizeProfile(options.profile);
  const contextType = normalizeContextType(options.contextType);
  const idea = String(options.idea || "").trim();
  if (!idea) {
    throw new Error("Interview init requires an idea.");
  }

  const slug = options.slug ? slugify(options.slug) : slugify(idea);
  if (!slug) {
    throw new Error("Unable to derive a slug from the provided idea.");
  }

  const timestamp = timestampForFilename();
  const paths = artifactPaths(root, slug, timestamp);
  if (fs.existsSync(paths.state) && !options.force) {
    throw new Error(`Interview state already exists for slug "${slug}". Use --slug or --force.`);
  }

  const weights = WEIGHTS[contextType];
  const dimensionScores = Object.fromEntries(
    Object.keys(weights).map((dimension) => [dimension, 0]),
  );

  const state = {
    artifactPaths: paths,
    contextType,
    createdAt: new Date().toISOString(),
    currentRound: 0,
    dimensionScores,
    idea,
    maxRounds: PROFILE_CONFIG[profile].maxRounds,
    profile,
    readinessGates: {
      decisionBoundariesExplicit: false,
      nonGoalsExplicit: false,
      pressurePassComplete: false,
    },
    rounds: [],
    slug,
    status: "in_progress",
    thresholdPercent: PROFILE_CONFIG[profile].thresholdPercent,
    timestamp,
    version: 1,
  };
  state.clarityScore = scorePercent(state.dimensionScores, contextType);
  state.updatedAt = state.createdAt;

  ensureArtifactDirs(paths);
  writeText(paths.context, buildContextSnapshot(state));
  writeState(root, state);

  return serializableStateView(state);
}

export function listInterviewStates(options = {}) {
  const root = workspaceRoot(options.cwd);
  const stateDir = path.join(root, ".rein", "state");
  if (!fs.existsSync(stateDir)) {
    return [];
  }

  return fs
    .readdirSync(stateDir)
    .filter((entry) => entry.startsWith("interview-") && entry.endsWith(".json"))
    .map((entry) => loadStateFile(path.join(stateDir, entry)))
    .filter(Boolean)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map((state) => serializableStateView(state));
}

export function loadInterviewState(slug, options = {}) {
  const root = workspaceRoot(options.cwd);
  const statePath = path.join(root, ".rein", "state", `interview-${slug}.json`);
  const state = loadStateFile(statePath);
  if (!state) {
    throw new Error(`No interview state found for slug "${slug}".`);
  }

  return state;
}

export function getInterviewStatus(slug, options = {}) {
  return serializableStateView(loadInterviewState(slug, options));
}

export function resumeInterview(slug, options = {}) {
  return serializableStateView(loadInterviewState(slug, options));
}

export function updateInterviewRound(options = {}) {
  const root = workspaceRoot(options.cwd);
  const state = loadInterviewState(options.slug, { cwd: root });
  if (state.status === "completed") {
    throw new Error(`Interview "${state.slug}" is already completed.`);
  }

  const expectedRound = state.currentRound + 1;
  if (options.round && Number(options.round) !== expectedRound) {
    throw new Error(`Expected round ${expectedRound}, received ${options.round}.`);
  }

  const target = normalizeTargetDimension(options.target, state.contextType);
  const question = String(options.question || "").trim();
  const answer = String(options.answer || "").trim();
  if (!question || !answer) {
    throw new Error("Interview rounds require target, question, and answer values.");
  }

  const dimensionScores = normalizeDimensionScores(
    parseJsonFlag(options.scores, "scores"),
    state.contextType,
  );
  const readinessOverrides = {
    decisionBoundariesExplicit:
      options.decisionBoundariesExplicit ?? state.readinessGates.decisionBoundariesExplicit,
    nonGoalsExplicit: options.nonGoalsExplicit ?? state.readinessGates.nonGoalsExplicit,
    pressurePassComplete: options.pressurePassComplete ?? state.readinessGates.pressurePassComplete,
  };

  state.currentRound = expectedRound;
  state.dimensionScores = dimensionScores;
  state.readinessGates = readinessOverrides;
  state.clarityScore = scorePercent(dimensionScores, state.contextType);
  state.updatedAt = new Date().toISOString();
  state.rounds.push({
    answer,
    challengeMode: options.challengeMode || null,
    clarityScore: state.clarityScore,
    decisionSummary: options.decisionSummary || null,
    dimensionScores,
    question,
    readinessGates: readinessOverrides,
    refinement: options.refinement || null,
    round: expectedRound,
    target,
  });

  writeState(root, state);
  return serializableStateView(state);
}

function buildTranscript(state, summary) {
  const lines = [
    `# Interview Transcript: ${state.slug}`,
    "",
    `- Date: ${state.updatedAt.slice(0, 10)}`,
    `- Profile: ${PROFILE_CONFIG[state.profile].label}`,
    `- Final clarity: ${state.clarityScore}%`,
    `- Threshold: ${state.thresholdPercent}%`,
    `- Rounds: ${state.currentRound}`,
    `- Context type: ${state.contextType}`,
    "",
  ];

  for (const round of state.rounds) {
    lines.push(`## Round ${round.round} — ${round.target} (Clarity: ${round.clarityScore}%)`);
    lines.push(`**Q:** ${round.question}`);
    lines.push(`**A:** ${round.answer}`);
    if (round.refinement) {
      lines.push(`**Refinement:** ${round.refinement}`);
    }
    lines.push("");
  }

  if (summary?.transcriptSummary) {
    lines.push("## Transcript Summary");
    lines.push(summary.transcriptSummary);
    lines.push("");
  }

  return lines.join("\n");
}

function buildClarityBreakdown(state) {
  return Object.entries(state.dimensionScores).map(([dimension, score]) => ({
    dimension,
    gapPercent: Math.round((1 - score) * 100),
    score,
  }));
}

function buildSpecMarkdown(state, summary) {
  const lines = [
    `# Spec: rein-interview ${summary.title || state.slug}`,
    "",
    "## Metadata",
    `- Profile: ${PROFILE_CONFIG[state.profile].label}`,
    `- Rounds: ${state.currentRound}`,
    `- Final clarity: ${state.clarityScore}%`,
    `- Threshold: ${state.thresholdPercent}%`,
    `- Context type: ${state.contextType}`,
    `- Context snapshot: \`${path.relative(workspaceRoot(), state.artifactPaths.context)}\``,
    `- Transcript: \`${path.relative(workspaceRoot(), state.artifactPaths.transcript)}\``,
    "",
    "## Clarity Breakdown",
    "",
    "| Dimension | Score | Gap |",
    "|---|---|---|",
    ...buildClarityBreakdown(state).map(
      (entry) =>
        `| ${entry.dimension} | ${Math.round(entry.score * 100)}% | ${entry.gapPercent}% |`,
    ),
    "",
    "## Intent",
    "",
    summary.intent || "Pending",
    "",
    "## Desired Outcome",
    "",
    summary.desiredOutcome || "Pending",
    "",
    "## In-Scope",
    "",
    ...(summary.inScope || []).map((item) => `- ${item}`),
    "",
    "## Out-of-Scope / Non-goals",
    "",
    ...(summary.outOfScope || []).map((item) => `- ${item}`),
    "",
    "## Decision Boundaries",
    "",
    ...(summary.decisionBoundaries || []).map((item) => `- ${item}`),
    "",
    "## Constraints",
    "",
    ...(summary.constraints || []).map((item) => `- ${item}`),
    "",
    "## Testable Acceptance Criteria",
    "",
    ...(summary.acceptanceCriteria || []).map((item) => `- ${item}`),
    "",
    "## Assumptions Exposed + Resolutions",
    "",
    ...(summary.assumptions || []).map((item) => `- ${item}`),
    "",
    "## Pressure-Pass Findings",
    "",
    ...(summary.pressureFindings || []).map((item) => `- ${item}`),
    "",
    "## Technical Context Findings",
    "",
    ...(summary.technicalContext || []).map((item) => `- ${item}`),
    "",
    "## Execution Bridge",
    "",
    ...(summary.executionBridge || []).map((item) => `- ${item}`),
    "",
    "## Transcript Summary",
    "",
    summary.transcriptSummary || "Pending",
    "",
  ];

  return lines.join("\n");
}

export function crystallizeInterview(options = {}) {
  const root = workspaceRoot(options.cwd);
  const state = loadInterviewState(options.slug, { cwd: root });
  if (state.status === "completed" && !options.force) {
    throw new Error(`Interview "${state.slug}" is already completed.`);
  }

  const summary = parseJsonFlag(options.summary, "summary");
  if (!summary.intent || !summary.desiredOutcome) {
    throw new Error("Crystallize summary JSON must include at least intent and desiredOutcome.");
  }

  if (computeNextAction(state) !== "crystallize" && !options.force) {
    throw new Error(
      `Interview "${state.slug}" is not ready to crystallize yet. Complete the remaining rounds or pass --force.`,
    );
  }

  state.status = "completed";
  state.updatedAt = new Date().toISOString();
  writeText(state.artifactPaths.transcript, buildTranscript(state, summary));
  writeText(state.artifactPaths.spec, buildSpecMarkdown(state, summary));

  const result = {
    ...serializableStateView(state),
    acceptanceCriteria: summary.acceptanceCriteria || [],
    assumptions: summary.assumptions || [],
    constraints: summary.constraints || [],
    decisionBoundaries: summary.decisionBoundaries || [],
    desiredOutcome: summary.desiredOutcome,
    executionBridge: summary.executionBridge || [],
    inScope: summary.inScope || [],
    intent: summary.intent,
    outOfScope: summary.outOfScope || [],
    pressureFindings: summary.pressureFindings || [],
    technicalContext: summary.technicalContext || [],
    transcriptSummary: summary.transcriptSummary || "",
  };
  writeJson(state.artifactPaths.result, result);
  writeState(root, state);
  return result;
}

export function formatInterviewStatus(view) {
  const lines = [
    `Interview ${view.slug}`,
    `  Profile: ${PROFILE_CONFIG[view.profile].label}`,
    `  Status: ${view.status}`,
    `  Clarity: ${view.clarityScore}% / ${view.threshold}%`,
    `  Round: ${view.currentRound} / ${view.maxRounds}`,
    `  Weakest dimension: ${view.weakestDimension || "n/a"}`,
    `  Next action: ${view.nextAction}`,
    "",
    "  Readiness gates:",
    ...Object.entries(view.readinessGates).map(
      ([key, value]) => `    - ${key}: ${value ? "yes" : "no"}`,
    ),
    "",
    "  Artifacts:",
    ...Object.entries(view.artifactPaths).map(([key, value]) => `    - ${key}: ${value}`),
    "",
  ];

  return lines.join("\n");
}
