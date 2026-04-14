#!/usr/bin/env python3

from rein_hook_utils import (
    emit,
    increment_count,
    is_broad_prompt,
    is_cleanup_prompt,
    load_state,
    read_payload,
    save_state,
)


def main():
    payload = read_payload()
    prompt = payload.get("prompt")
    if not isinstance(prompt, str) or not prompt.strip():
        return

    state = load_state(payload)
    messages = []
    contexts = []

    if is_broad_prompt(prompt):
        count = increment_count(state, "broad_prompt")
        if count == 1:
            messages.append(
                "REIN: broad or under-specified request detected. Use deep-interview before planning and rein-triage before broad edits."
            )
        else:
            messages.append(
                "REIN: repeated broad request without tighter bounds. State the missing scope, assumptions, and success criteria before broad edits."
            )
        contexts.append(
            "If the task is still broad or ambiguous, run deep-interview to clarify intent and non-goals before planning. If execution is already clear but likely multi-file, emit a rein-triage note before editing."
        )

    if is_cleanup_prompt(prompt):
        count = increment_count(state, "cleanup_prompt")
        if count == 1:
            messages.append(
                "REIN: cleanup or deslop request detected. Use ai-slop-cleaner with a regression-tests-first cleanup plan."
            )
        else:
            messages.append(
                "REIN: repeated cleanup request. Keep the pass bounded, lock behavior first, and avoid speculative rewrites."
            )
        contexts.append(
            "For cleanup, refactor, or deslop work, prefer ai-slop-cleaner. Create a cleanup plan before edits, preserve behavior, and keep the diff minimal."
        )

    if not messages and not contexts:
        return

    save_state(payload, state)
    emit(
        {
            "continue": True,
            "systemMessage": " ".join(messages),
            "hookSpecificOutput": {
                "hookEventName": "UserPromptSubmit",
                "additionalContext": " ".join(contexts),
            },
        }
    )


if __name__ == "__main__":
    main()
