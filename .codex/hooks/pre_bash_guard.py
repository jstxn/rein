#!/usr/bin/env python3

from rein_hook_utils import (
    ASSUMPTION_MARKERS,
    DESTRUCTIVE_PATTERNS,
    MUTATION_PATTERNS,
    TEST_EVAL_PATTERNS,
    TRIAGE_MARKERS,
    command_matches,
    emit,
    first_command,
    increment_count,
    load_state,
    read_payload,
    save_state,
    transcript_contains_any,
)


def main():
    payload = read_payload()
    command = first_command(payload)
    if not command:
        return

    state = load_state(payload)
    warnings = []

    if command_matches(command, DESTRUCTIVE_PATTERNS):
        count = increment_count(state, "destructive_bash")
        if count == 1:
            warnings.append(
                "REIN: destructive Bash command detected. Re-evaluate the safer path and explain the necessity before continuing."
            )
        else:
            warnings.append(
                "REIN: repeated destructive Bash command. State the risk, the safer alternative you rejected, and why this path is still necessary."
            )

    is_mutation = command_matches(command, MUTATION_PATTERNS)
    touches_tests_or_evals = command_matches(command, TEST_EVAL_PATTERNS)

    if is_mutation and touches_tests_or_evals:
        count = increment_count(state, "test_or_eval_mutation")
        if count == 1:
            warnings.append(
                "REIN: test or eval mutation detected. Do not hide defects; explain the maintenance intent explicitly."
            )
        else:
            warnings.append(
                "REIN: repeated test or eval mutation. Write a brief self-critique note before continuing if this is not genuine maintenance."
            )

    if is_mutation and not transcript_contains_any(payload, TRIAGE_MARKERS):
        count = increment_count(state, "missing_triage_before_bash_mutation")
        if count == 1:
            warnings.append(
                "REIN: mutation-by-Bash before visible triage. State relevant files, verified assumptions, success definition, and cheating boundary."
            )
        else:
            warnings.append(
                "REIN: repeated mutation without visible triage. In your next update, emit the missing triage note before more edits."
            )

    if is_mutation and not transcript_contains_any(payload, ASSUMPTION_MARKERS):
        count = increment_count(state, "missing_assumption_note")
        if count == 1:
            warnings.append(
                "REIN: Bash mutation is running on unverified assumptions. State the assumption you are testing before continuing."
            )
        else:
            warnings.append(
                "REIN: repeated Bash mutation on unverified assumptions. Be explicit about the assumption and how you will verify it."
            )

    if not warnings:
        return

    save_state(payload, state)
    emit({"systemMessage": " ".join(warnings)})


if __name__ == "__main__":
    main()
