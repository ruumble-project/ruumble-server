# Working together: tickets, branches, pull requests

How the team works on Ruumble, the same way for everyone and for Claude Code. The rules are short on purpose; the
details of building, testing and releasing are in [development.md](development.md) and [releasing.md](releasing.md).
Decision: [ADR-0026](decisions/0026-team-workflow.md).

## The two repositories

| Repo | What | Where a ticket goes |
|---|---|---|
| [ruumble-server](https://github.com/ruumble-project/ruumble-server) | service, web UI (also the part shown inside Ruumble Client), plugin, protocol, deployment, docs, ADRs | everything a browser user, an operator or the plugin sees |
| [ruumble-client](https://github.com/ruumble-project/ruumble-client) | Ruumble Client: Mumble with Ruumble built in, its packages for Linux and Windows | the desktop program itself, its installation, Mumble updates |

A change that needs both (e.g. a new function on the `desk` QWebChannel object, used by `web/src/lib/desk/`) gets a
ticket in each repo, linked to each other ("needs ruumble-server#12"). The server side is merged first and must keep
working with released clients; the client then moves its `server/` submodule.

## Flow

1. **Ticket for the overview.** Work that takes more than a few minutes starts with an issue: *Feature*, *Bug* or
   *Task* (templates under *New issue*), with what and why and, for features and tasks, the acceptance criteria.
   Typos and small fixes need none.
2. **Assign yourself** before starting, so nobody works on the same thing twice. Questions go into the ticket, not
   into chat, so the next person finds them.
3. **Work on `main`**: `git pull --ff-only`, change, commit. Commits are English, one line, present tense, what the
   change does, ending with the ticket: `Board export includes attachments (#42)`; the commit that completes the
   ticket ends with `(fixes #42)`, so GitHub closes it.
4. **Keep it complete**: tests for new behaviour, UI texts in German and English, docs, and a line under
   `## [Unreleased]` in `CHANGELOG.md` for anything a user or operator notices. Bigger decisions get an ADR in
   `docs/decisions/` (status "proposed").
5. **Run the checks**, then **push to `main`** (see the table below). CI runs on every push; a red `main` is fixed
   first, before anything else.
6. **A pull request when you want one**: for a bigger or risky change that someone should look at first, or when
   several people work on the same ticket, use a branch `<issue>-<slug>` and a pull request (template, `Closes #42`).
   The author merges with *Squash and merge* once CI is green; no approval is needed. The title, one line without a
   number, becomes the commit; GitHub adds the PR number.
7. **Outside contributors** (no write access) always come through a fork and a pull request; a team member reviews
   it (acceptance criteria, tests, the conventions in `CLAUDE.md`) and merges it.
8. **Releases** are made only by the maintainer, as described in [releasing.md](releasing.md).

## Checks before pushing

| Changed | Run |
|---|---|
| anything | `pnpm lint && pnpm test && pnpm build` |
| web UI | plus `pnpm -F @ruumble/web e2e` |
| plugin | plus the plugin build and `plugin/build/ruumble_tests` (and the Windows cross build when touching platform code) |
| something Ruumble Client uses (`web/src/lib/desk/`, `web/src/lib/ui/desk/`, `plugin/src/` core) | plus a check in Ruumble Client, see its `docs/workflow.md` |

CI runs the same on every push to `main` and on every pull request.

## Labels

| Label | Meaning |
|---|---|
| `bug`, `enhancement`, `task` | kind of ticket (set by the templates) |
| `needs-decision` | waits for a decision by the maintainer, do not start |
| `blocked` | waits for something else (another ticket, a Mumble release) |
| `good first issue` | small and well described, good to get to know the code |
| `client`, `web`, `service`, `plugin`, `ops` | the part concerned (several are fine) |

## Working with Claude Code

Claude Code reads `CLAUDE.md` (commands, architecture, conventions) and follows this flow. Two skills make it one
sentence:

- **`/ticket 42`**: reads issue #42, checks it against the code, asks back if something is unclear, implements with
  tests, runs the checks, updates changelog and docs, and commits and pushes to `main` (`... (fixes #42)`); with a pull
  request instead when you ask for one.
- **`/new-ticket <description>`**: writes a well-formed issue (feature, bug or task with acceptance criteria) from a
  description, a screenshot or a finding in the code, shows it, and files it after confirmation.

Both need the GitHub CLI: `sudo apt install gh` (or see https://cli.github.com), then `gh auth login`.
For a review, Claude's built-in `/code-review <PR number>` works on any pull request.

What every Claude instance gets from the repo, so all colleagues work the same way:

- `CLAUDE.md`, section "Team and GitHub": the rules of this flow and what GitHub enforces (protected `main`, required
  checks, who works on `main` directly, labels).
- `.claude/settings.json`: shared permissions. Reading git history, tickets, pull requests and workflow runs works
  without asking; force pushes and approving pull requests are denied. Personal additions go into
  `.claude/settings.local.json` (not committed) or `~/.claude/settings.json`.
- `.claude/skills/`: `/ticket`, `/new-ticket`, `/update-all`.

Personal settings (`~/.claude/CLAUDE.md`) may be stricter, e.g. "never push": then Claude stops before pushing and
names the commands instead.

## Setup for a new colleague

1. Access to the organization `ruumble-project` (the maintainer invites you).
2. `git clone git@github.com:ruumble-project/ruumble-server.git`, then the steps in [development.md](development.md).
3. For the client: `git clone --recurse-submodules git@github.com:ruumble-project/ruumble-client.git`, then its
   `README.md`.
4. GitHub CLI and Claude Code installed; `gh auth login`.
5. Pick a ticket labelled `good first issue`.
