#!/usr/bin/env python3

from rein_hook_utils import (
    BUILD_COMMAND_PATTERNS,
    LINT_COMMAND_PATTERNS,
    TEST_COMMAND_PATTERNS,
    command_matches,
    emit,
    first_command,
    increment_count,
    load_state,
    parse_tool_response,
    read_payload,
    save_state,
    summarize_failures,
)


FAILURE_MARKERS = [
    "failed",
    "error",
    "traceback",
    "not found",
    "exception",
    "exit code",
]


def main():
    payload = read_payload()
    command = first_command(payload)
    if not command:
        return

    if not (
        command_matches(command, TEST_COMMAND_PATTERNS)
        or command_matches(command, BUILD_COMMAND_PATTERNS)
        or command_matches(command, LINT_COMMAND_PATTERNS)
    ):
        return

    tool_response = parse_tool_response(payload)
    failure_text = summarize_failures(tool_response)
    if not failure_text or not any(marker in failure_text for marker in FAILURE_MARKERS):
        return

    state = load_state(payload)
    count = increment_count(state, "verification_failure")
    save_state(payload, state)

    if count == 1:
        message = "REIN: verification surfaced a failure. Explain it plainly, fix it, and rerun the relevant checks."
    else:
        message = "REIN: repeated verification failure. Do not hand-wave the breakage; state what failed, what you verified, and what remains uncertain."

    emit({"systemMessage": message})


if __name__ == "__main__":
    main()
