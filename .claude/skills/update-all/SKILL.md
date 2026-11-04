---
name: update-all
description: Brings the whole repo up to date in one go - takes over a new Mumble release (Ruumble's interface files, Ruumble Desk's Mumble tag and patch, fixing conflicts and build errors), then runs every check (web, plugin, Desk build, headless run, AppImage) and reports. Use when someone says "Update alles", "alles aktualisieren", "update everything", "Mumble aktualisieren", "neues Mumble übernehmen", or after an issue "Mumble ... available".
---

# Update everything

Goal: the person says one sentence, you do the rest and come back with a short report. Work through the steps in
order, fix what breaks on the way, and only stop to ask when a decision is really theirs (see "Stop and ask").

## 0. Starting point

- `git status --short` must be clean; if not, show what is there and ask whether to continue on top of it.
- Be on `main`; `git pull --ff-only` if a remote is set and the person usually pulls (ask once if unsure).
- Note the current state: `cat third_party/mumble/VERSION`, `grep MUMBLE_REF desk/pins.env`, latest Mumble release:
  `curl -fsSL https://api.github.com/repos/mumble-voip/mumble/releases/latest | grep tag_name`.
- pnpm: `corepack pnpm ...` (set `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`). If nested `pnpm` calls fail with
  "pnpm: not found", run `corepack enable --install-directory <scratch>/bin` and put that dir on `PATH`.

## 1. Mumble

If the latest release is newer than `MUMBLE_REF` (compare with `sort -V`; ignore pre-releases and older branches):

```sh
desk/tools/update-mumble.sh <tag>      # ~10 to 20 min: clone, 3-way apply, build; run it in the background
```

- Exit 0: done, the patch was refreshed by `desk/tools/export-patches.sh`.
- Exit 3 (patch conflicts): resolve the conflict markers in `desk/work/mumble` (`git -C desk/work/mumble status`) so
  every touch point does what it did before. Then `desk/tools/build.sh`.
- Exit 4 (build failed, log `desk/work/build.log`): fix the cause in `desk/work/mumble` (touch points) or in
  `desk/client` (follow renamed or changed Mumble APIs). Repeat `desk/tools/build.sh` until it passes.
- After 3 or 4: `desk/tools/export-patches.sh`.
- Rules (from `desk/CLAUDE.md`): Mumble touch points stay minimal and under `#ifdef USE_RUUMBLE`; never change Mumble's
  behaviour beyond that; `desk/work/` is scratch, only `desk/patches/mumble` and `desk/client` are kept.
- Read `desk/work/interfaces.diff`: if `MumblePlugin.h` or `MumbleServer.ice` changed, check `docs/mumble-interfaces.md`
  and the code that uses the changed parts (`plugin/src`, `bridge/src`, `desk/client/QtMumbleApi.*`), and add a
  short note to `docs/mumble-interfaces.md`.
- Add a line under `## [Unreleased]` in `CHANGELOG.md` ("Ruumble Desk is built on Mumble <tag>") and tick a line in
  `desk/ROADMAP.md`.

If Mumble is already current, say so and go on with the checks (they still prove the tree is healthy).

## 2. Checks (all must pass)

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm lint && corepack pnpm test && corepack pnpm build
corepack pnpm -F @ruumble/web exec playwright install chromium && corepack pnpm -F @ruumble/web e2e
cmake -S plugin -B plugin/build -DCMAKE_BUILD_TYPE=Release && cmake --build plugin/build -j && plugin/build/ruumble_tests
tools/update-mumble-interfaces.sh                 # checksums of third_party/mumble
desk/build.sh                                    # Desk into desk/dist (skip if step 1 just built it)
```

Headless run of the Desk against the local stack (see `desk/test/README.md`):

```sh
desk/test/local-stack.sh up
desk/test/run-desk.sh Anna fresh
# wait until curl -s http://127.0.0.1:64080/api/version shows a plugin version, then:
node desk/test/cdp.mjs eval "document.title"   # expect "... · Ruumble"
node desk/test/cdp.mjs shot <scratch>/desk.png  # look at it: building, top bar, Desk panel button
kill $(cat desk/test/.work/desk-Anna.pid); desk/test/local-stack.sh down
```

AppImage (only Docker needed, ~6 min, background): `desk/package.sh appimage`, then check
`desk/dist/Ruumble_Desk-x86_64.AppImage` exists.

A check that fails is fixed, not skipped. If a fix would change behaviour (not just follow Mumble), stop and ask.

## 3. Report

Short, in the person's language:
- Mumble: old tag, new tag (or "already current"), whether the patch needed work and what was changed.
- Interface changes and their consequences, if any.
- Each check with its result.
- What only a person can do: start the Desk once on the desktop (`desk/tools/run.sh`, speak, quit through the menu).
- A one-line commit message. Do not commit or push unless the person asks; then commit to `main` and push only when
  told to.

## Stop and ask

- The new Mumble release is a new major or minor line (e.g. 1.6 to 1.7): confirm before moving the pin.
- A touch point cannot be kept without changing what the user sees or how Mumble behaves.
- Something outside this procedure would have to change (Ruumble features, CI, release process).
