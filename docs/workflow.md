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

1. **Ticket first.** Every change starts with an issue: *Feature*, *Bug* or *Task* (templates under *New issue*). It
   says what and why, and for features and tasks the acceptance criteria: what must be true when it is done. Small
   typo fixes may skip this.
2. **Assign yourself** before starting, so nobody works on the same thing twice. Questions go into the ticket, not
   into chat, so the next person finds them.
3. **Branch from `main`**, named `<issue number>-<short-slug>`, e.g. `42-board-export`. One ticket, one branch.
4. **Commit** in English, one line, present tense, what the change does, ending with the ticket:
   `Board export includes attachments (#42)`. As many commits as useful; they are squashed on merge.
5. **Keep it complete**: tests for new behaviour, UI texts in German and English, docs, and a line under
   `## [Unreleased]` in `CHANGELOG.md` for anything a user or operator notices. Bigger decisions get an ADR in
   `docs/decisions/` (status "proposed").
6. **Run the checks** before pushing (see the table below).
7. **Open a pull request** against `main` with the template: `Closes #42`, what and why, how it was tested,
   screenshots for UI changes. Draft PRs are fine for early feedback.
8. **Review** is optional inside the team: ask a colleague when you want a second look (in Claude Code
   `/code-review <PR number>` helps as well). Pull requests from outside the team (forks) are reviewed and merged by a
   team member, who checks the acceptance criteria, the tests and the conventions in `CLAUDE.md`.
9. **Merge** with *Squash and merge* once CI is green; team members merge their own pull requests. The squash commit
   message is the PR title: one line, without a number, GitHub adds the pull request number when squashing ("... (#43)"); the ticket is linked through `Closes #<issue>`. The branch is deleted, the ticket closes itself. Small, obvious
   changes (a typo, a line of docs) may also go to `main` directly.
10. **Releases** are made only by the maintainer, as described in [releasing.md](releasing.md).

## Checks before a pull request

| Changed | Run |
|---|---|
| anything | `pnpm lint && pnpm test && pnpm build` |
| web UI | plus `pnpm -F @ruumble/web e2e` |
| plugin | plus the plugin build and `plugin/build/ruumble_tests` (and the Windows cross build when touching platform code) |
| something Ruumble Client uses (`web/src/lib/desk/`, `web/src/lib/ui/desk/`, `plugin/src/` core) | plus a check in Ruumble Client, see its `docs/workflow.md` |

CI runs the same on every pull request; a red CI is never merged.

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

- **`/ticket 42`**: reads issue #42, checks it against the code, asks back if something is unclear, creates the branch
  `42-…`, implements with tests, runs the checks, updates changelog and docs, and opens the pull request with
  `Closes #42`.
- **`/new-ticket <description>`**: writes a well-formed issue (feature, bug or task with acceptance criteria) from a
  description, a screenshot or a finding in the code, shows it, and files it after confirmation.

Both need the GitHub CLI: `sudo apt install gh` (or see https://cli.github.com), then `gh auth login`.
For a review, Claude's built-in `/code-review <PR number>` works on any pull request.

What every Claude instance gets from the repo, so all colleagues work the same way:

- `CLAUDE.md`, section "Team and GitHub": the rules of this flow and what GitHub enforces (protected `main`, required
  checks, squash merge, labels, who may skip the rules, Claude never does).
- `.claude/settings.json`: shared permissions. Reading git history, tickets, pull requests and workflow runs works
  without asking; force pushes, pushing to `main`, merging and approving are left to people (denied for Claude). Personal additions
  go into `.claude/settings.local.json` (not committed) or `~/.claude/settings.json`.
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
