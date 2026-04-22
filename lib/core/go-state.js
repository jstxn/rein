import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { findGitRoot } from "./installer.js";
import { ReinError } from "./rein-error.js";

const GO_STAGE_ORDER = ["interview", "plan", "implementation", "cleanup", "review", "verify"];
const GO_WRAPPERS = ["$rein-go", "/rein-go"];
const GO_STOP_CONDITIONS = [
  "dangerous or destructive action needs approval",
  "missing permissions or blocked tool access",
  "any failed stage: plan, implementation, cleanup, review, or verify",
];

const REQUIRED_INTERVIEW_FIELDS = [
  "acceptanceCriteria",
  "constraints",
  "desiredOutcome",
  "executionBridge",
  "inScope",
  "intent",
  "outOfScope",
  "technicalContext",
];

const VALID_STAGE_STATUSES = new Set(["pending", "ready", "completed", "failed", "blocked"]);
const DIFF_TOOLING_BLOCKER = /lfs|external filter|operation not permitted|broken pipe|clean filter/i;

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

function writeJson(targetPath, value) {
  fs.writeFileSync(targetPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(targetPath, value) {
  fs.writeFileSync(targetPath, value, "utf8");
}

function parseJsonFlag(raw, label) {
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new ReinError(
      `Invalid ${label} JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function nextStageName(stage) {
  const index = GO_STAGE_ORDER.indexOf(stage);
  if (index === -1 || index === GO_STAGE_ORDER.length - 1) {
    return null;
  }

  return GO_STAGE_ORDER[index + 1];
}

function normalizeStage(stage) {
  const normalized = String(stage || "")
    .trim()
    .toLowerCase();
  if (!GO_STAGE_ORDER.includes(normalized)) {
    throw new ReinError(
      `Unknown rein go stage "${stage}". Expected one of: ${GO_STAGE_ORDER.join(", ")}.`,
    );
  }

  return normalized;
}

function normalizeStageStatus(status) {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();
  if (!VALID_STAGE_STATUSES.has(normalized)) {
    throw new ReinError(
      `Unknown rein go stage status "${status}". Expected one of: ${[...VALID_STAGE_STATUSES].join(", ")}.`,
    );
  }

  return normalized;
}

function stageArtifactsDir(root, slug) {
  return path.join(root, ".rein", "go", `rein-go-${slug}`);
}

function goArtifactPaths(root, slug) {
  const dir = stageArtifactsDir(root, slug);
  return {
    cleanup: path.join(dir, "cleanup.json"),
    implementation: path.join(dir, "implementation.json"),
    plan: path.join(dir, "plan.json"),
    review: path.join(dir, "review.json"),
    state: path.join(root, ".rein", "state", `go-${slug}.json`),
    verify: path.join(dir, "verify.json"),
  };
}

function goStatePath(root, slug) {
  return goArtifactPaths(root, slug).state;
}

function ensureGoDirs(paths) {
  ensureDir(path.dirname(paths.state));
  ensureDir(path.dirname(paths.plan));
}

function toolStageFile(paths, stage) {
  if (stage === "plan") {
    return paths.plan;
  }

  if (stage === "implementation") {
    return paths.implementation;
  }

  if (stage === "cleanup") {
    return paths.cleanup;
  }

  if (stage === "review") {
    return paths.review;
  }

  if (stage === "verify") {
    return paths.verify;
  }

  return null;
}

function buildEnvironment(cwd = process.cwd()) {
  const resolvedCwd = path.resolve(cwd);
  const root = workspaceRoot(resolvedCwd);
  const localNodeModules = path.join(resolvedCwd, "node_modules");
  const workspaceNodeModules = path.join(root, "node_modules");
  const packageJsonPath = path.join(root, "package.json");
  const nodeModulesPath = fs.existsSync(localNodeModules)
    ? localNodeModules
    : fs.existsSync(workspaceNodeModules)
      ? workspaceNodeModules
      : null;
  const blockers = [];

  if (fs.existsSync(packageJsonPath) && !nodeModulesPath) {
    blockers.push({
      code: "missing_node_modules",
      message:
        "No node_modules directory was found for this repo. Prepare the environment before continuing rein go.",
    });
  }

  return {
    blockers,
    cwd: resolvedCwd,
    diffTooling: {
      message: null,
      status: "unknown",
    },
    nodeModulesPath,
    packageJsonPresent: fs.existsSync(packageJsonPath),
    workspaceRoot: root,
  };
}

function probeDiffTooling(cwd = process.cwd()) {
  if (process.env.REIN_GO_FORCE_DIFF_BLOCKER) {
    return {
      message: process.env.REIN_GO_FORCE_DIFF_BLOCKER,
      status: "blocked",
    };
  }

  const result = spawnSync("git", ["diff", "--check"], {
    cwd,
    encoding: "utf8",
  });

  if (result.status === 0) {
    return {
      message: null,
      status: "ready",
    };
  }

  const combined = `${result.stderr || ""}\n${result.stdout || ""}`.trim();
  if (DIFF_TOOLING_BLOCKER.test(combined)) {
    return {
      message: combined,
      status: "blocked",
    };
  }

  return {
    message: null,
    status: "ready",
  };
}

function resolveInterviewArtifactPath(raw, cwd = process.cwd()) {
  const input = String(raw || "").trim();
  if (!input) {
    return null;
  }

  const explicitPath = path.resolve(cwd, input);
  if (fs.existsSync(explicitPath)) {
    return fs.statSync(explicitPath).isDirectory()
      ? path.join(explicitPath, "result.json")
      : explicitPath;
  }

  if (input.endsWith(".json")) {
    return explicitPath;
  }

  return path.join(workspaceRoot(cwd), ".rein", "specs", `rein-interview-${input}`, "result.json");
}

function validateInterviewArtifact(result, artifactPath) {
  const missing = REQUIRED_INTERVIEW_FIELDS.filter((field) => {
    const value = result[field];
    if (Array.isArray(value)) {
      return value.length === 0;
    }

    return typeof value !== "string" || value.trim().length === 0;
  });

  if (missing.length > 0) {
    throw new ReinError(
      `Interview artifact is missing required planning fields: ${missing.join(", ")}. (${artifactPath})`,
    );
  }
}

function inferInterviewSlug(artifactPath, result) {
  const explicitSlug = String(result.slug || "").trim();
  if (explicitSlug) {
    return explicitSlug;
  }

  const dirname = path.basename(path.dirname(artifactPath));
  if (!dirname.startsWith("rein-interview-")) {
    return null;
  }

  return dirname.slice("rein-interview-".length) || null;
}

function readInterviewBundle(raw, cwd = process.cwd()) {
  const artifactPath = resolveInterviewArtifactPath(raw, cwd);
  if (!artifactPath || !fs.existsSync(artifactPath)) {
    throw new ReinError(`No rein-interview result bundle found for: ${raw}`);
  }

  const result = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  validateInterviewArtifact(result, artifactPath);

  return {
    artifactPath,
    result,
    slug: inferInterviewSlug(artifactPath, result),
  };
}

function createStageResult(stage, overrides = {}) {
  return {
    artifacts: overrides.artifacts || {},
    changedFiles: overrides.changedFiles || [],
    failureReason: overrides.failureReason || null,
    nextStage: overrides.nextStage ?? nextStageName(stage),
    stage,
    status: overrides.status || "pending",
    summary: overrides.summary || null,
    updatedAt: overrides.updatedAt || null,
  };
}

function initialStageResults() {
  return Object.fromEntries(GO_STAGE_ORDER.map((stage) => [stage, createStageResult(stage)]));
}

function buildStageSummary(stageResults) {
  const summary = {
    blocked: 0,
    completed: 0,
    pending: 0,
    ready: 0,
    total: GO_STAGE_ORDER.length,
  };

  for (const stage of GO_STAGE_ORDER) {
    const status = stageResults[stage]?.status || "pending";
    if (Object.hasOwn(summary, status)) {
      summary[status] += 1;
    }
  }

  return summary;
}

function createGoState(options = {}) {
  const root = workspaceRoot(options.cwd);
  const sourceInterview = options.sourceInterview || null;
  const task = String(options.task || "").trim();
  const slug = options.slug
    ? slugify(options.slug)
    : sourceInterview?.slug
      ? slugify(sourceInterview.slug)
      : slugify(task);

  if (!slug) {
    throw new ReinError("Unable to derive a rein go slug from the provided input.");
  }

  const artifactPaths = goArtifactPaths(root, slug);
  ensureGoDirs(artifactPaths);
  const environment = buildEnvironment(options.cwd);
  const createdAt = new Date().toISOString();

  return {
    artifactPaths,
    createdAt,
    currentStage: null,
    environment,
    failedStage: null,
    mode: options.mode || "fresh",
    resumeFrom: null,
    sourceInterview,
    stageOrder: GO_STAGE_ORDER,
    stageResults: initialStageResults(),
    status: "in_progress",
    stopReason: null,
    task,
    updatedAt: createdAt,
    slug,
    version: 1,
  };
}

function writeGoState(_root, state) {
  ensureGoDirs(state.artifactPaths);
  state.updatedAt = new Date().toISOString();
  writeJson(state.artifactPaths.state, state);
  return state;
}

function loadGoState(slug, options = {}) {
  const root = workspaceRoot(options.cwd);
  const statePath = goStatePath(root, slugify(slug));
  if (!fs.existsSync(statePath)) {
    throw new ReinError(`No rein go state found for slug "${slug}".`);
  }

  return JSON.parse(fs.readFileSync(statePath, "utf8"));
}

function goStateExists(slug, options = {}) {
  const root = workspaceRoot(options.cwd);
  return fs.existsSync(goStatePath(root, slugify(slug)));
}

function stageArtifactPath(state, stage) {
  return toolStageFile(state.artifactPaths, stage);
}

function recordStageArtifact(state, stage, payload) {
  const targetPath = stageArtifactPath(state, stage);
  if (!targetPath) {
    return null;
  }

  writeJson(targetPath, payload);
  return targetPath;
}

function setStageStatus(state, stage, status, overrides = {}) {
  const normalizedStage = normalizeStage(stage);
  const normalizedStatus = normalizeStageStatus(status);
  const current = state.stageResults[normalizedStage] || createStageResult(normalizedStage);

  state.stageResults[normalizedStage] = {
    ...current,
    artifacts: overrides.artifacts ?? current.artifacts,
    changedFiles: overrides.changedFiles ?? current.changedFiles,
    failureReason: overrides.failureReason ?? current.failureReason,
    nextStage: overrides.nextStage ?? current.nextStage,
    status: normalizedStatus,
    summary: overrides.summary ?? current.summary,
    updatedAt: new Date().toISOString(),
  };
}

function serializeGoStateView(state) {
  return {
    artifactPaths: state.artifactPaths,
    changedFiles: state.changedFiles,
    currentStage: state.currentStage,
    environment: state.environment,
    failedStage: state.failedStage,
    mode: state.mode,
    publicCommand: "rein go",
    resumeFrom: state.resumeFrom,
    slug: state.slug,
    sourceInterview: state.sourceInterview,
    stageOrder: state.stageOrder,
    stageResults: state.stageResults,
    stageSummary: buildStageSummary(state.stageResults),
    status: state.status,
    stopConditions: GO_STOP_CONDITIONS,
    stopReason: state.stopReason,
    task: state.task,
    wrappers: GO_WRAPPERS,
  };
}

export {
  GO_STAGE_ORDER,
  GO_STOP_CONDITIONS,
  GO_WRAPPERS,
  buildEnvironment,
  buildStageSummary,
  createGoState,
  createStageResult,
  ensureGoDirs,
  goStateExists,
  loadGoState,
  nextStageName,
  normalizeStage,
  normalizeStageStatus,
  parseJsonFlag,
  probeDiffTooling,
  readInterviewBundle,
  recordStageArtifact,
  resolveInterviewArtifactPath,
  serializeGoStateView,
  setStageStatus,
  slugify,
  stageArtifactPath,
  timestampForFilename,
  workspaceRoot,
  writeGoState,
  writeJson,
  writeText,
};
