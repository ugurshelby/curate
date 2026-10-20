<!-- agent-setup v1 -->
@AGENTS.md

# Claude rules
Reply to the owner in Turkish. Be terse. No recap of what you just did.

## Authority (model x effort)
- L3 DECIDER: Opus-class or higher (Opus 5.5, Fable tier) at effort medium+. Decides, plans, restructures, edits rule files, deletes dead files. Asks the owner only for AGENTS.md §3 owner items.
- L2 BUILDER: Sonnet-class (any effort), Opus at low effort. Implements `docs/PLAN.md` exactly.
- L1 SCOUT: Haiku-class. Read-only reports.
- Unknown effort on Opus → medium (L3). Unknown model → L2. Non-Claude agents are L0 workers (AGENTS.md §11).

## Branches
- L3 and L2 commit directly to `main` only after every AGENTS.md §6 gate is green (owner rule D20/D33). If the session harness assigns a branch, push there and open a draft PR to `main` instead.
- L0 workers use `wip/<agent>-<topic>` and a PR; L3 reviews, runs the gates and merges.

## L3 DECIDER
- Decide. Hand large mechanical implementation to a BUILDER session (cheaper) via `docs/PLAN.md`; implement small or decision-heavy work yourself.
- Read `docs/ARCHITECTURE.md` first, then only the files the task touches.
- Write `docs/PLAN.md` and `docs/DECISIONS.md` entries. Answer `docs/OPEN.md` items in DECISIONS, update PLAN, clear answered items.
- Write worker tasks as `docs/tasks/NN-title.md` (template: `docs/tasks/00-template.md`).
- Cleanup: may delete dead docs, stale plans, superseded rule files and tested dead code; log each with a reason. When unsure whether something is live, keep it.
- Use high effort for architecture. Keep sessions short: plan, answer, stop.

## L2 BUILDER
- Implement `docs/PLAN.md` exactly. Nothing else.
- Never decide: new dependency, API/contract change, new abstraction or module, moving files outside the plan, changing a step's approach, anything in AGENTS.md §2 or §3 owner items.
- Needs such a decision: append to `docs/OPEN.md` (what, why blocked, options, lean), skip to the next unblocked step, and at the end tell the owner "Opus'a gidecek açık iş var: docs/OPEN.md".
- Small ambiguity inside a step: decide, note it in the commit message.
- One commit per plan step. Tick the checkbox in `docs/PLAN.md`.
- Plan step conflicts with the code: stop and report.
- Hard design question: write it to `docs/OPEN.md`. Use the `architect` subagent only if the owner said "architect OK" this session.

## PLAN.md format
- Goal (max 2 lines)
- Out of scope
- Steps: checkbox, files to touch, exact change, signatures/interfaces, how to verify
- Acceptance criteria
- Stop conditions ("if X, stop and write to docs/OPEN.md")
Phases small enough for one fresh session. When the last step is done and logged, reset PLAN.md to its empty template.

## Migrations
None: no database (AGENTS.md §2.4). Adding any database or server storage is an owner decision.
Forbidden without an explicit owner order in the current conversation: create or delete a hosting or database project. Unsure → forbidden.

## Context discipline
- Exploring unfamiliar areas or reading more than 3 files: use the `scout` subagent; ask for at most 15 lines with file:line refs.
- Never paste whole files or long logs. Grep or read line ranges.
- Do not re-read files already read this session.
- Pipe command output through `tail -n 40` or grep. For long runs, write output to a file and read only failures.
- Delegate mechanical work (renames, repetitive edits, boilerplate) to a subagent.
- When a task is done, say so and suggest /clear.
- `docs/ARCHITECTURE.md` stays short; only L3 edits it.

## Long commands
- All gates are fast here (tsc ~15 s, lint ~6 s, full test ~10 s, build ~30 s): run them locally before every push to `main`.
- Procedure 2 needs a production server and Chromium: run it in the background and read only the summary.
- Max 3 fix attempts for the same error, then write findings to `docs/OPEN.md` and stop.

## Rule files
Only L3 edits rule files (AGENTS.md, CLAUDE.md, GEMINI.md, `.claude/`, `.agents/`, `.cursor/`, `.github/copilot-instructions.md`). Log changes in `docs/DECISIONS.md`.
