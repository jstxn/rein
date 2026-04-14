#!/usr/bin/env python3

from rein_hook_utils import emit, load_state, mark_warning, read_payload, save_state


def main():
    payload = read_payload()
    state = load_state(payload)
    source = payload.get("source", "startup")
    key = f"session_start:{source}"
    if not mark_warning(state, key):
        return
    save_state(payload, state)
    emit(
        {
            "continue": True,
            "systemMessage": "REIN active: regulated execution and inference protocol loaded for this repo.",
            "hookSpecificOutput": {
                "hookEventName": "SessionStart",
                "additionalContext": (
                    "Follow REIN.md. Be explicit about assumptions, uncertainty, success criteria, "
                    "and cheating boundaries. Use deep-interview for vague requirements, rein-triage "
                    "before ambiguous or multi-file work, ai-slop-cleaner for cleanup or deslop work, "
                    "and rein-verify before declaring completion."
                ),
            },
        }
    )


if __name__ == "__main__":
    main()
