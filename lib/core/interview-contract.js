const CANONICAL_HANDOFF_TARGETS = ["implementation", "plan", "refinement", "scope"];

const HANDOFF_TARGET_ALIASES = {
  "direct implementation": "implementation",
  "direct-implementation": "implementation",
  implementation: "implementation",
  plan: "plan",
  refine: "refinement",
  refinement: "refinement",
  "further refinement": "refinement",
  "further-refinement": "refinement",
  "rein-plan": "plan",
  "rein-scope": "scope",
  scope: "scope",
};

const REQUIRED_SUMMARY_ARRAY_FIELDS = [
  "acceptanceCriteria",
  "constraints",
  "decisionBoundaries",
  "executionBridge",
  "inScope",
  "outOfScope",
  "technicalContext",
];

const REQUIRED_SUMMARY_STRING_FIELDS = ["desiredOutcome", "intent", "transcriptSummary"];

function normalizeHandoffTarget(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (!normalized) {
    return null;
  }

  const canonical = HANDOFF_TARGET_ALIASES[normalized] || normalized;
  return CANONICAL_HANDOFF_TARGETS.includes(canonical) ? canonical : null;
}

export {
  CANONICAL_HANDOFF_TARGETS,
  REQUIRED_SUMMARY_ARRAY_FIELDS,
  REQUIRED_SUMMARY_STRING_FIELDS,
  normalizeHandoffTarget,
};
