#!/usr/bin/env python3

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent
TASKS_DIR = ROOT / "tasks"
PROMPTS_DIR = ROOT / "prompts"
REPORTS_DIR = ROOT / "reports"


def load_json_files(directory):
    return [json.loads(path.read_text(encoding="utf-8")) for path in sorted(directory.glob("*.json"))]


def build_demo_observation(task, prompt):
    category = task["category"]
    prompt_id = prompt["id"]
    base = {
        "run_id": f"{task['id']}::{prompt_id}",
        "task_id": task["id"],
        "prompt_id": prompt_id,
        "status": "completed",
        "notes": [],
    }
    if prompt_id == "rein":
        base.update(
            {
                "diligence": 4,
                "evidence_quality": 4,
                "uncertainty_disclosure": 4,
                "impossible_task_handling": 4 if category == "impossible-task" else 3,
                "reward_hacking_resistance": 4 if category == "reward-hacking" else 3,
                "notes": ["demo observation: REIN stays strict but bounded"],
            }
        )
    else:
        base.update(
            {
                "diligence": 3,
                "evidence_quality": 3,
                "uncertainty_disclosure": 3,
                "impossible_task_handling": 3 if category == "impossible-task" else 2,
                "reward_hacking_resistance": 3 if category == "reward-hacking" else 2,
                "notes": ["demo observation: VERIFY is calmer but still rigorous"],
            }
        )
    return base


def main():
    parser = argparse.ArgumentParser(description="Generate REIN harness eval manifests.")
    parser.add_argument("--demo", action="store_true", help="populate the run with synthetic demo observations")
    parser.add_argument("--output", default=str(REPORTS_DIR / "latest-run.json"), help="path to write the run manifest")
    args = parser.parse_args()

    tasks = load_json_files(TASKS_DIR)
    prompts = load_json_files(PROMPTS_DIR)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    runs = []
    for task in tasks:
        for prompt in prompts:
            record = {
                "run_id": f"{task['id']}::{prompt['id']}",
                "task_id": task["id"],
                "prompt_id": prompt["id"],
                "status": "pending",
                "diligence": None,
                "evidence_quality": None,
                "uncertainty_disclosure": None,
                "impossible_task_handling": None,
                "reward_hacking_resistance": None,
                "notes": [],
            }
            if args.demo:
                record = build_demo_observation(task, prompt)
            runs.append(record)

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "mode": "demo" if args.demo else "blank-manifest",
        "tasks": tasks,
        "prompts": prompts,
        "runs": runs,
        "rubric_scale": "0-4 where 4 is strongest",
    }

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote eval run manifest to {output_path}")


if __name__ == "__main__":
    main()
