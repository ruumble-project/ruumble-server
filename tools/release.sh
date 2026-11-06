#!/usr/bin/env bash
# Prepare a release (docs/releasing.md): tools/release.sh <version>
#
# On a clean main: moves "## [Unreleased]" of CHANGELOG.md into a dated section "## [<version>]" with its link
# reference, turns docs/whats-new/next.md into the version's "What's new" page (tools/whats-new-release.mjs), sets the version in bridge/package.json and web/package.json, sets the image tag everywhere the docs
# and templates name it, runs lint, tests and build, and commits "Release <version>". Tagging stays a separate step,
# after CI on main is green:  git push && git tag v<version> && git push origin v<version>
set -euo pipefail

die() { echo "release: $*" >&2; exit 1; }

version="${1:-}"
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "usage: tools/release.sh <major.minor.patch>"
cd "$(git rev-parse --show-toplevel)"
[[ "$(git branch --show-current)" == "main" ]] || die "not on main"
[[ -z "$(git status --porcelain)" ]] || die "working tree not clean"
git rev-parse -q --verify "refs/tags/v$version" >/dev/null && die "tag v$version exists already"
grep -q "^## \[$version\]" CHANGELOG.md && die "CHANGELOG.md has a section for $version already"

# the Unreleased section must say something
unreleased="$(awk '/^## \[Unreleased\]/{on=1; next} /^## \[/{on=0} on' CHANGELOG.md | grep -v '^[[:space:]]*$' || true)"
[[ -n "$unreleased" ]] || die "CHANGELOG.md: nothing under ## [Unreleased]"

# versions: only the "version" line, the files keep their formatting
for f in bridge/package.json web/package.json; do
  sed -i -E "0,/\"version\": \"[^\"]+\"/s//\"version\": \"$version\"/" "$f"
done

# image tag in the templates and docs (release.yml checks the same list)
IMAGE=ghcr.io/ruumble-project/ruumble
IMAGE_FILES=(deploy/compose/ruumble.docker-compose.yml deploy/compose/mumble-with-ruumble.docker-compose.yml docs/operations.md docs/operations/maintenance.md)
for f in "${IMAGE_FILES[@]}"; do
  sed -i -E "s#ghcr\.io/[a-z0-9-]+/ruumble:[0-9]+\.[0-9]+\.[0-9]+#$IMAGE:$version#g" "$f"
  grep -q "$IMAGE:$version" "$f" || die "$f names no image tag"
done

# changelog: a dated section below an empty Unreleased, and the link reference on top of the others
today="$(date +%Y-%m-%d)"
awk -v v="$version" -v d="$today" '
  /^## \[Unreleased\]/ { print; print ""; print "## [" v "] - " d; next }
  /^\[[0-9]+\.[0-9]+\.[0-9]+\]: / && !linked { print "[" v "]: https://github.com/ruumble-project/ruumble-server/releases/tag/v" v; linked = 1 }
  { print }
'' CHANGELOG.md > CHANGELOG.md.tmp && mv CHANGELOG.md.tmp CHANGELOG.md

# the users' "What's new" page of this version (#17); none when next.md holds no user-visible change
node tools/whats-new-release.mjs "$version" "$today"

pnpm lint && pnpm test && pnpm build

git add bridge/package.json web/package.json CHANGELOG.md docs/whats-new "${IMAGE_FILES[@]}"
git commit -q -m "Release $version"
echo "Committed \"Release $version\". Next, once CI on main is green:"
echo "  git push && git tag v$version && git push origin v$version"
