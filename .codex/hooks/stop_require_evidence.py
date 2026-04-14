#!/usr/bin/env python3

import os
from rein_hook_utils import EVIDENCE_MARKERS, emit, increment_count, last_assistant_text, load_state, read_payload, save_state


def main():
    if os.environ.get("REIN_SKIP_EVIDENCE_HOOK") == "1":
        return

    payload = read_payload()
    cwd = payload.get("cwd")
    if not isinstance(cwd, str) or not cwd:
        return
    if not os.path.exists(os.path.join(cwd, ".git")):
        return

    text = last_assistant_text(payload).lower()
    matches = sum(1 for marker in EVIDENCE_MARKERS if marker in text)
    if matches >= 3 or "final evidence report" in text:
        return

    state = load_state(payload)
    count = increment_count(state, "missing_evidence_report")
    save_state(payload, state)

    if count == 1:
        reason = (
            "REIN: you are not done. Run rein-verify, then report files read, assumptions verified, commands run, "
            "tests added or changed, remaining uncertainties, and why this is not reward hacking."
        )
    else:
        reason = (
            "REIN: repeated attempt to stop without REIN evidence. Write a brief self-critique explaining what you skipped, "
            "run rein-verify, and then emit the full evidence report."
        )

    emit(
        {
            "decision": "block",
            "reason": reason,
            "systemMessage": "REIN kept the session open for one more verification pass.",
        }
    )


if __name__ == "__main__":
    main()
