# ADR-0026: Team workflow with tickets, branches and pull requests

Status: proposed (2026-11-05)

## Context
Until now one person committed directly to `main` after running the checks locally. With the move to the organization
`ruumble-project` (ADR-0025) colleagues join and want to work with tickets, often through Claude Code. Without a common
flow two people pick the same work, changes reach `main` without a second look, and Claude has no rule to follow.

## Decision
| Topic | Decision |
|---|---|
| **Tickets** | Every change starts with a GitHub issue (Feature, Bug, Task templates) in the repo where the code lives; features and tasks carry acceptance criteria. Cross-repo changes get one linked ticket per repo. |
| **Branches** | One branch per ticket from `main`, named `<issue>-<slug>`. No long-lived branches. |
| **Commits** | English, one line, ending with `(#<issue>)`. |
| **Pull requests** | Template with `Closes #<issue>`, checks and changelog line; CI must be green. |
| **Review** | One approval by someone other than the author. |
| **Merge** | Squash and merge, so `main` keeps one line per change; the branch is deleted. |
| **`main`** | Protected: no direct pushes, merges only through pull requests with green CI and an approval. |
| **Claude Code** | Follows the same flow; skills `/ticket` and `/new-ticket` in `.claude/skills/`; description in `docs/workflow.md`. |
| **Releases** | Unchanged: only the maintainer, as in `docs/releasing.md`. The "Release <version>" commit of `tools/release.sh` (which runs every check) is pushed directly by the maintainer, who may bypass the branch protection for it. |

## Rejected options
- **Direct commits to `main` for everyone.** Fast for one person, but no review and no place to discuss a change.
- **Git flow with `develop` and release branches.** More ceremony than a small team with continuous releases needs.
- **Merge commits or rebase merges.** Keep every intermediate commit on `main`; squash keeps the one-line history.

## Consequences
- `CLAUDE.md` and `CONTRIBUTING.md` describe this flow instead of direct commits.
- The maintainer sets up branch protection and the labels on GitHub once.
- The branch protection allows the maintainer to bypass it, only for release commits.
