---
name: ticket
description: Works on a GitHub issue of this repo from start to pull request - reads the ticket with its comments and acceptance criteria, checks it against the code, asks back when something is unclear, creates the branch <issue>-<slug>, implements with tests, runs the checks, updates changelog and docs, commits and opens the pull request with "Closes #<issue>". Use when someone says "/ticket 42", "arbeite Ticket 42 ab", "work on issue 42", "mach #42" or names an issue URL of ruumble-server.
---

# Work on a ticket

The team flow is `docs/workflow.md`; this skill follows it step by step. Ask only when a decision is really the
person's (see "Stop and ask"); otherwise work through to the pull request.

## 1. Read the ticket

```sh
gh issue view <n> --comments
```

- If `gh` is missing or not logged in: say so (`sudo apt install gh`, `gh auth login`) and stop.
- The ticket is closed, labelled `needs-decision` or `blocked`, or assigned to someone else: say so and stop.
- Note the acceptance criteria. If a feature or task has none, write a proposal and ask before implementing.
- Linked tickets (also in ruumble-client) and the ADRs it touches: read them.

## 2. Check it against the code

- Find where the change belongs (`CLAUDE.md`: architecture, where things live). Check that the ticket's assumptions
  hold; if the code says otherwise, or the ticket contradicts an ADR, explain it and ask.
- A change that Ruumble Client needs as well (`web/src/lib/desk/`, `web/src/lib/ui/desk/`, `plugin/src/` core, the
  `desk` QWebChannel contract): the server side must keep working with released clients; name the follow-up for
  ruumble-client.
- Give a short plan (files, tests, open points) before writing code when the change is bigger than a few lines.

## 3. Branch

```sh
git switch main && git pull --ff-only
git switch -c <n>-<short-slug>          # e.g. 42-board-export
gh issue edit <n> --add-assignee @me
```

The working tree must be clean first; if not, show it and ask.

## 4. Implement

- Follow `CLAUDE.md` (conventions, i18n in German and English, building derived only in `web/src/lib/model/`, access
  checks through `access.ts`, no em or en dashes).
- Tests first where it fits (bug: a failing test that reproduces it). Keep coverage thresholds.
- `CHANGELOG.md`: a line under `## [Unreleased]` for anything a user or operator notices, in the existing style.
- Docs: user guide, operations or development guide when behaviour or setup changes; an ADR (status "proposed") for a
  wider decision.

## 5. Checks

```sh
pnpm lint && pnpm test && pnpm build
pnpm -F @ruumble/web e2e                                     # web UI touched
cmake -S plugin -B plugin/build -DCMAKE_BUILD_TYPE=Release && cmake --build plugin/build -j && plugin/build/ruumble_tests   # plugin touched
```

All must pass; a failing check is fixed, not skipped. Check every acceptance criterion and say how it is met.

## 6. Commit, push, pull request

- Commits: English, one line, ending with `(#<n>)`.
- Personal settings that forbid pushing win: then stop here and name the commands below.

```sh
git push -u origin HEAD
gh pr create --title "<what it does>" --body-file <file>      # no number: GitHub adds the PR number on squash
```

The body follows `.github/pull_request_template.md`: `Closes #<n>`, what and why, how it was tested, the checks ticked.
UI change: mention that screenshots are needed if you cannot take them (`desk/test/cdp.mjs` in ruumble-client,
or a Playwright screenshot).

## 7. Report

Short, in the person's language: the PR link, what was done per acceptance criterion, the checks, what a reviewer
should look at, follow-ups (e.g. a ticket for ruumble-client).

## Stop and ask

- The ticket is unclear, has no acceptance criteria, or the code contradicts it.
- The change would break released Ruumble Clients or the plugin protocol (`{v: 1}` messages).
- A new dependency, a new env var or a change to the Docker image would be needed.
- It grows well beyond the ticket: propose a follow-up ticket instead.
