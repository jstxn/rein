#!/usr/bin/env python3

import json
import os
import re
import sys
import tempfile
from pathlib import Path


EVIDENCE_MARKERS = [
    "files read",
    "assumptions verified",
    "commands run",
    "tests added or changed",
    "remaining uncertainties",
    "reward hacking",
]

TRIAGE_MARKERS = [
    "relevant files",
    "verified assumptions",
    "assumptions verified",
    "success definition",
    "cheating boundary",
]

ASSUMPTION_MARKERS = [
    "top assumptions",
    "assumption",
    "assumptions verified",
    "verified assumptions",
]

TEST_COMMAND_PATTERNS = [
    re.compile(r"\bpytest\b"),
    re.compile(r"\bnpm\s+test\b"),
    re.compile(r"\byarn\s+test\b"),
    re.compile(r"\bpnpm\s+test\b"),
    re.compile(r"\bcargo\s+test\b"),
    re.compile(r"\bgo\s+test\b"),
    re.compile(r"\bpython3?\s+-m\s+pytest\b"),
]

BUILD_COMMAND_PATTERNS = [
    re.compile(r"\bnpm\s+run\s+build\b"),
    re.compile(r"\byarn\s+build\b"),
    re.compile(r"\bpnpm\s+build\b"),
    re.compile(r"\bcargo\s+build\b"),
]

LINT_COMMAND_PATTERNS = [
    re.compile(r"\bnpm\s+run\s+lint\b"),
    re.compile(r"\byarn\s+lint\b"),
    re.compile(r"\bpnpm\s+lint\b"),
    re.compile(r"\bruff\b"),
    re.compile(r"\beslint\b"),
]

MUTATION_PATTERNS = [
    re.compile(r"\bsed\b"),
    re.compile(r"\bperl\b"),
    re.compile(r"\bpython3?\b"),
    re.compile(r"\bnode\b"),
    re.compile(r"\bmv\b"),
    re.compile(r"\bcp\b"),
    re.compile(r"\btee\b"),
    re.compile(r"\bpatch\b"),
]

DESTRUCTIVE_PATTERNS = [
    re.compile(r"\brm\s+-rf\b"),
    re.compile(r"\bgit\s+reset\s+--hard\b"),
    re.compile(r"\bgit\s+checkout\s+--\b"),
]

TEST_EVAL_PATTERNS = [
    re.compile(r"\brein-evals/(?:tasks|prompts|reports|run\.py|score\.py)\b"),
    re.compile(r"\b(?:tests?|fixtures?|evaluators?)\b"),
]

CLEANUP_PATTERNS = [
    re.compile(r"\bcleanup\b"),
    re.compile(r"\bclean\s+up\b"),
    re.compile(r"\bdeslop\b"),
    re.compile(r"\bslop\b"),
    re.compile(r"\brefactor\b"),
]

BROAD_ACTION_PATTERNS = [
    re.compile(r"\badd\b"),
    re.compile(r"\bbuild\b"),
    re.compile(r"\bcreate\b"),
    re.compile(r"\bfix\b"),
    re.compile(r"\bimplement\b"),
    re.compile(r"\bimprove\b"),
    re.compile(r"\bmake\b"),
    re.compile(r"\bplan\b"),
    re.compile(r"\brefactor\b"),
    re.compile(r"\bset\s+up\b"),
]


def read_payload():
    raw = sys.stdin.read().strip()
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


def emit(data):
    sys.stdout.write(json.dumps(data))


def find_text(payload, keys):
    for key in keys:
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value
    return ""


def transcript_tail(payload, max_chars=16000):
    transcript = payload.get("transcript_path") or payload.get("transcriptPath")
    if not isinstance(transcript, str) or not transcript.strip():
        return ""
    path = Path(transcript)
    if not path.exists():
        return ""
    try:
        return path.read_text(encoding="utf-8")[-max_chars:]
    except OSError:
        return ""


def last_assistant_text(payload):
    direct = find_text(
        payload,
        [
            "last_assistant_message",
            "lastAssistantMessage",
            "assistant_message",
            "response",
            "text",
        ],
    )
    if direct:
        return direct
    return transcript_tail(payload)


def lower_text(value):
    if not isinstance(value, str):
        return ""
    return value.lower()


def text_contains_any(text, markers):
    haystack = lower_text(text)
    return any(marker in haystack for marker in markers)


def transcript_contains_any(payload, markers):
    return text_contains_any(transcript_tail(payload), markers)


def session_state_path(payload):
    session_id = payload.get("session_id") or "default"
    safe_session = re.sub(r"[^A-Za-z0-9_.-]", "_", str(session_id))
    state_dir = Path(tempfile.gettempdir()) / "rein-hooks"
    state_dir.mkdir(parents=True, exist_ok=True)
    return state_dir / f"{safe_session}.json"


def load_state(payload):
    path = session_state_path(payload)
    if not path.exists():
        return {"warned": {}, "counts": {}}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"warned": {}, "counts": {}}


def save_state(payload, state):
    path = session_state_path(payload)
    path.write_text(json.dumps(state), encoding="utf-8")


def mark_warning(state, key):
    warned = state.setdefault("warned", {})
    if warned.get(key):
        return False
    warned[key] = True
    return True


def increment_count(state, key):
    counts = state.setdefault("counts", {})
    counts[key] = counts.get(key, 0) + 1
    return counts[key]


def first_command(payload):
    tool_input = payload.get("tool_input")
    if isinstance(tool_input, dict):
        command = tool_input.get("command")
        if isinstance(command, str) and command.strip():
            return command.strip()
    return find_text(payload, ["command", "cmd", "input"])


def parse_tool_response(payload):
    response = payload.get("tool_response")
    if isinstance(response, dict):
        return response
    if isinstance(response, str):
        try:
            parsed = json.loads(response)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            return {"raw": response}
    return {}


def command_matches(command, patterns):
    return any(pattern.search(command) for pattern in patterns)


def has_concrete_anchor(prompt):
    anchors = [
        re.search(r"(?:^|[\s`])(?:\.{0,2}/)?[\w./-]+\.[A-Za-z0-9]+", prompt),
        re.search(r"#\d+", prompt),
        re.search(r"\n\s*\d+\.", prompt),
        re.search(r"\b[A-Za-z_][A-Za-z0-9_]*\(", prompt),
        re.search(r"\b[a-z]+[A-Z][A-Za-z0-9]+\b", prompt),
        re.search(r"\bacceptance criteria\b", prompt, re.IGNORECASE),
    ]
    return any(match is not None for match in anchors)


def is_broad_prompt(prompt):
    prompt = prompt.strip()
    if not prompt:
        return False
    if has_concrete_anchor(prompt):
        return False
    token_count = len(prompt.split())
    if token_count > 24:
        return False
    return command_matches(prompt.lower(), BROAD_ACTION_PATTERNS)


def is_cleanup_prompt(prompt):
    return command_matches(prompt.lower(), CLEANUP_PATTERNS)


def summarize_failures(tool_response):
    pieces = []
    for key in ["stderr", "stdout", "aggregated_output", "raw"]:
        value = tool_response.get(key)
        if isinstance(value, str) and value.strip():
            pieces.append(value)
    exit_code = tool_response.get("exit_code")
    if isinstance(exit_code, int) and exit_code != 0:
        pieces.append(f"exit code {exit_code}")
    return "\n".join(pieces).lower()


def repo_dirty(cwd):
    git_dir = Path(cwd) / ".git"
    if not git_dir.exists():
        return False
    return True
