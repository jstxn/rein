# Evals And Artifacts

## What This Area Does
- Covers the local eval layer, generated report artifacts, research asset, and the repo-local planning/state directories that sit beside the shipped harness.

## Key Paths
- `rein-evals/run.py`
- `rein-evals/score.py`
- `rein-evals/tasks/`
- `rein-evals/prompts/`
- `rein-evals/reports/`
- `resources/fear_regulated_pressure_report.pdf`
- `docs/codebase/`
- `.rein/`
- `.omc/`

## How It Works
- `rein-evals/run.py` builds a run manifest across every task/prompt combination and can populate it with synthetic demo observations.
- `rein-evals/score.py` aggregates integer metric values from the run manifest and writes a summary report.
- The eval tasks focus on bug-fix diligence, ambiguous requirements, impossible constraints, and reward-hacking temptation.
- The prompt set is currently only `rein` and `verify`, directly referencing `REIN.md` and `VERIFY.md`.
- `rein-evals/reports/` stores generated artifacts such as `latest-run.json` and `latest-score.json`.
- `resources/fear_regulated_pressure_report.pdf` is the research asset the README points to as a conceptual input into the project.
- `.rein/` is the intended root for planning and specification artifacts created by REIN-packaged skills during repo work, especially around deep-interview and deep-inspect.
- `docs/codebase/` is this repository's checked-in reference-doc tree, not the packaged output destination for `deep-inspect`.
- `.omc/` contains local project memory, mission state, and session artifacts.

## Patterns And Conventions
- The eval layer is intentionally narrow and local rather than a full benchmark harness.
- Generated reports are JSON snapshots, not live dashboards.
- The repo distinguishes public-facing harness code from working-state artifacts, but both currently live side by side.
- Research lineage is still visible through the FEAR-named research PDF referenced by the README.

## Dependencies And Touchpoints
- The eval layer depends on Python 3 and local JSON files only.
- `README.md` explicitly describes the eval results as directional v1 evidence, not scientific proof.
- The installer copies the entire `rein-evals/` directory into target repos.
- `.rein/` is tied most directly to `deep-interview` and `deep-inspect`.
- `docs/codebase/` is tied to this repo's self-documentation workflow rather than installed target-repo artifact output.
- `.omc/` appears to be local memory/state rather than a shipped harness surface.

## Findings
- Observed: `rein-evals/run.py --demo` produces synthetic “completed” observations that favor REIN over VERIFY in the sample artifacts.
- Observed: `rein-evals/score.py` aggregates only integer metric values and emits a claim-boundary string that explicitly denies scientific proof.
- Observed: `.rein/` is the intended destination for deep-interview specs, interviews, context snapshots, and deep-inspect codebase maps.
- Observed: `docs/codebase/` remains a checked-in documentation tree for this repository itself.
- Observed: The repo still contains legacy `.omx/` artifacts from earlier runs.
- Observed: `.omc/` contains local memory and mission-state snapshots for the working environment.
- Inferred risk: Because demo eval outputs are checked into the repo and already populated, a reader can mistake them for fresh measured results unless they notice that the manifest mode is `demo` and the notes are explicitly synthetic.
- Inferred risk: `.rein/`, legacy `.omx/`, and `.omc/` sit alongside shipped harness files, so readers need to distinguish working artifacts from package surfaces.
