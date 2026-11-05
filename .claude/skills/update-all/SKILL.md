---
name: update-all
description: Brings the whole repo up to date in one go - takes over a new Mumble release (Ruumble's interface files in third_party/mumble, fixing what the change breaks), then runs every check (web, e2e, plugin) and reports. Use when someone says "Update alles", "alles aktualisieren", "update everything", "Mumble aktualisieren", "neues Mumble übernehmen", or after an issue "Mumble ... available".
---

# Update everything

Goal: the person says one sentence, you do the rest and come back with a short report. Work through the steps in
order, fix what breaks on the way, and only stop to ask when a decision is really theirs (see "Stop and ask").

Ruumble Desk (Mumble tag, patch, Desk build, AppImage) lives in `ruumble-project/ruumble-client` and has its own
`update-all` skill there. This one covers the service, the web UI and the plugin.

## 0. Starting point

- `git status --short` must be clean; if not, show what is there and ask whether to continue on top of it.
- Be on `main`; `git pull --ff-only` if a remote is set and the person usually pulls (ask once if unsure).
- Note the current state: `cat third_party/mumble/VERSION`, latest Mumble release:
  `curl -fsSL https://api.github.com/repos/mumble-voip/mumble/releases/latest | grep tag_name`.
- pnpm: `corepack pnpm ...` (set `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`). If nested `pnpm` calls fail with
  "pnpm: not found", run `corepack enable --install-directory <scratch>/bin` and put that dir on `PATH`.

## 1. Mumble

If the latest release is newer than `third_party/mumble/VERSION` (compare with `sort -V`; ignore pre-releases and
older branches):

```sh
tools/update-mumble-interfaces.sh <tag> > <scratch>/interfaces.diff
```

- Read the diff: if `MumblePlugin.h` or `MumbleServer.ice` changed, check `docs/mumble-interfaces.md` and the code that
  uses the changed parts (`plugin/src`, `bridge/src`), and add a short note to `docs/mumble-interfaces.md`.
- Add a line under `## [Unreleased]` in `CHANGELOG.md` ("Interface files from Mumble <tag>").
- Ruumble Desk compiles `plugin/src` from this repo: if the plugin core had to change, say so in the report, because
  the client repo then needs its submodule moved.

If Mumble is already current, say so and go on with the checks (they still prove the tree is healthy).

## 2. Checks (all must pass)

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm lint && corepack pnpm test && corepack pnpm build
corepack pnpm -F @ruumble/web exec playwright install chromium && corepack pnpm -F @ruumble/web e2e
cmake -S plugin -B plugin/build -DCMAKE_BUILD_TYPE=Release && cmake --build plugin/build -j && plugin/build/ruumble_tests
tools/update-mumble-interfaces.sh                 # checksums of third_party/mumble
```

A check that fails is fixed, not skipped. If a fix would change behaviour (not just follow Mumble), stop and ask.

## 3. Report

Short, in the person's language:
- Mumble: old tag, new tag (or "already current").
- Interface changes and their consequences, if any.
- Each check with its result.
- A one-line commit message. Do not commit or push unless the person asks; then commit to `main` and push only when
  told to.

## Stop and ask

- The new Mumble release is a new major or minor line (e.g. 1.6 to 1.7): confirm before taking it over.
- An interface change removes something Ruumble uses and there is more than one sensible replacement.
- Something outside this procedure would have to change (Ruumble features, CI, release process).
