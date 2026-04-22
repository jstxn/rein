import fs from "node:fs";
import path from "node:path";
import { findGitRoot } from "./installer.js";
import { ReinError } from "./rein-error.js";

const GO_WRAPPERS = ["$rein-go", "/rein-go"];

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

function workspaceRoot(cwd = process.cwd()) {
  return findGitRoot(cwd) || cwd;
}

function quoteShellArg(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

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

function inferSlugFromArtifact(artifactPath, result) {
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
    slug: inferSlugFromArtifact(artifactPath, result),
  };
}

function buildStages(task, interviewBundle) {
  const interviewCompleted = Boolean(interviewBundle);
  const interviewCommand = interviewCompleted
    ? null
    : `rein interview init --idea ${quoteShellArg(task)} --json`;
  const interviewReference = interviewBundle
    ? interviewBundle.slug || interviewBundle.artifactPath
    : null;
  const planCommand = interviewReference
    ? `rein-plan --from-interview ${interviewReference}`
    : null;

  return [
    {
      commandHint: interviewCommand,
      id: "interview",
      status: interviewCompleted ? "completed" : "pending",
      surface: "runtime",
    },
    {
      commandHint: planCommand,
      id: "plan",
      status: interviewCompleted ? "ready" : "blocked",
      surface: "skill",
    },
    {
      commandHint: "implementation owned by rein-go",
      id: "implementation",
      status: interviewCompleted ? "pending" : "blocked",
      surface: "agent-stage",
    },
    {
      commandHint: "rein-cleanup <changed-files-or-scope>",
      id: "cleanup",
      status: interviewCompleted ? "pending" : "blocked",
      surface: "skill",
    },
    {
      commandHint: "rein-diff-review",
      id: "diff-review",
      status: interviewCompleted ? "pending" : "blocked",
      surface: "skill",
    },
    {
      commandHint: "rein-verify",
      id: "verify",
      status: interviewCompleted ? "pending" : "blocked",
      surface: "skill",
    },
  ];
}

function interviewSummary(interviewBundle) {
  if (!interviewBundle) {
    return null;
  }

  const { artifactPath, result, slug } = interviewBundle;
  return {
    acceptanceCriteria: result.acceptanceCriteria,
    artifactPath,
    constraints: result.constraints,
    desiredOutcome: result.desiredOutcome,
    executionBridge: result.executionBridge,
    intent: result.intent,
    slug,
    technicalContext: result.technicalContext,
  };
}

function buildGoManifest(options = {}) {
  const interviewBundle = options.fromInterview
    ? readInterviewBundle(options.fromInterview, options.cwd)
    : null;
  const task = normalizeTask(options.task, interviewBundle);

  if (!task) {
    throw new ReinError("rein go needs a task or --from-interview <slug|path>.");
  }

  const mode = interviewBundle ? "from-interview" : "fresh";

  return {
    automationPolicy: "mostly-automatic",
    failurePolicy: "stop-on-any-stage-failure",
    mode,
    publicCommand: "rein go",
    sourceInterview: interviewSummary(interviewBundle),
    stages: buildStages(task, interviewBundle),
    stopConditions: [
      "dangerous or destructive action needs approval",
      "missing permissions or blocked tool access",
      "any failed stage: plan, implementation, cleanup, diff-review, or verify",
    ],
    task,
    wrappers: GO_WRAPPERS,
  };
}

function formatGoManifest(manifest) {
  const lines = [
    "[ Go ]",
    `| Mode: ${manifest.mode}`,
    `| Entry: ${manifest.publicCommand}`,
    `| Automation: ${manifest.automationPolicy}`,
    `| Failure policy: ${manifest.failurePolicy}`,
    "",
    "| Task",
    `| ${manifest.task}`,
    "",
    "| Wrappers",
    `| ${manifest.wrappers.join(", ")}`,
    "",
    "| Stages",
  ];

  for (const [index, stage] of manifest.stages.entries()) {
    const suffix = stage.commandHint ? ` -> ${stage.commandHint}` : "";
    lines.push(`| ${index + 1}. ${stage.id} (${stage.status})${suffix}`);
  }

  if (manifest.sourceInterview) {
    lines.push("");
    lines.push("| Interview bundle");
    lines.push(`| ${manifest.sourceInterview.artifactPath}`);
  }

  return lines.join("\n");
}

export { buildGoManifest, formatGoManifest, readInterviewBundle, resolveInterviewArtifactPath };
