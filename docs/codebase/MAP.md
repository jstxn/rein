# Codebase Map

This directory is the entrypoint for navigating the REIN harness codebase.

## Sections

- [Architecture](./architecture.md)
  Overall repo shape, shipped surfaces, hidden working artifacts, and how the major parts relate.

- [Protocols](./protocols.md)
  The behavior contracts in `REIN.md`, `VERIFY.md`, and `AGENTS.md`.

- [Installer And CLI](./installer-and-cli.md)
  The publishable Node entrypoint, installer logic, and legacy shell wrapper.

- [Skills](./skills.md)
  The repo-local Codex skills and the workflow they are meant to support.

- [Hooks](./hooks.md)
  The Python hook helpers and the currently present hook configuration.

- [Evals And Artifacts](./evals-and-artifacts.md)
  The local eval layer, generated reports, research asset, and non-package working artifacts.

## Reading Order

1. Start with [Architecture](./architecture.md) for the repo shape.
2. Read [Protocols](./protocols.md) to understand what the harness is trying to enforce.
3. Read [Installer And CLI](./installer-and-cli.md) to see how those surfaces are installed into another repo.
4. Use [Skills](./skills.md) and [Hooks](./hooks.md) for runtime behavior.
5. Use [Evals And Artifacts](./evals-and-artifacts.md) for the comparison layer and repo-local working residue.

## Current Scope

This map reflects the repository as inspected on April 14, 2026. It focuses on the shipped harness, its installer, its repo-local Codex surfaces, and the working artifacts currently present alongside them.
