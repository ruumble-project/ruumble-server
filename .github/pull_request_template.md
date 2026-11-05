<!-- Title: one line in English, what the change does, without a number, e.g. "Board export includes attachments". It becomes the squash commit on main; GitHub adds the pull request number, "Closes #" below links the ticket. -->

Closes #

## What and why

<!-- What does this change and why; anything the reviewer should look at first. -->

## How it was tested

<!-- Tests added or changed, manual checks; screenshots for UI changes. -->

## Checks

- [ ] `pnpm lint && pnpm test && pnpm build` pass
- [ ] e2e (`pnpm -F @ruumble/web e2e`) or plugin tests run, if touched
- [ ] UI texts added in German and English
- [ ] `CHANGELOG.md` has a line under `## [Unreleased]` (if users or operators notice it)
- [ ] Docs updated (user, operations or development guide), ADR if a wider decision was made
- [ ] Ruumble Client still works, if `web/src/lib/desk/`, `web/src/lib/ui/desk/` or the plugin core changed (ticket in ruumble-client linked)
