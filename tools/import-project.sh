#!/usr/bin/env bash
# Import an artgarten project into projects/<slug>/artgarten/ and commit it.
#
#   tools/import-project.sh --project-url <project.zip URL> [--name SLUG]
#
# Options:
#   --project-url URL   the artgarten project.zip to import (required)
#   --name SLUG         directory name under projects/ (default: the zip's id)
#   --width PX          width of the render used to check the import; renders are
#                       not committed — see the Makefile
#   --timeout MS        how long to wait for the sketch to load and settle
#   -h, --help          show this
#
# Example:
#   tools/import-project.sh --name harbour-glass --project-url \
#     https://www.artgarten.xyz/api/gartens/<garten>/individuals/<individual>/project.zip

set -euo pipefail

usage() { sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//'; }

url=""
name=""
render_args=()
while [ $# -gt 0 ]; do
  case $1 in
    --project-url) url=${2:-}; shift 2 || true ;;
    --project-url=*) url=${1#*=}; shift ;;
    --name) name=${2:-}; shift 2 || true ;;
    --name=*) name=${1#*=}; shift ;;
    --width|--timeout) render_args+=("$1" "${2:-}"); shift 2 || true ;;
    --width=*|--timeout=*) render_args+=("${1%%=*}" "${1#*=}"); shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown argument: $1" >&2; echo >&2; usage >&2; exit 64 ;;
  esac
done

if [ -z "$url" ]; then
  echo "missing --project-url" >&2
  echo >&2
  usage >&2
  exit 64
fi

repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"

if [ -n "$(git status --porcelain)" ]; then
  echo "working tree is dirty; commit or stash first" >&2
  exit 1
fi

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
zip="$work/project.zip"

echo "==> downloading $url"
curl -fsSL --max-time 120 -o "$zip" "$url"
file "$zip" | grep -qi zip || { echo "downloaded file is not a zip archive" >&2; exit 1; }

# Every entry must sit under a single top-level directory, with no absolute or
# parent-relative paths — an archive from the network does not get to write
# wherever it likes.
mapfile -t entries < <(unzip -Z1 "$zip")
top=""
for entry in "${entries[@]}"; do
  case "$entry" in
    /*|*..*) echo "refusing archive: unsafe path '$entry'" >&2; exit 1 ;;
  esac
  dir=${entry%%/*}
  if [ "$dir" = "$entry" ]; then
    echo "refusing archive: '$entry' is not inside a directory" >&2
    exit 1
  fi
  if [ -z "$top" ]; then
    top=$dir
  elif [ "$dir" != "$top" ]; then
    echo "refusing archive: more than one top-level directory ($top, $dir)" >&2
    exit 1
  fi
done
[ -n "$top" ] || { echo "refusing archive: it is empty" >&2; exit 1; }

# artgarten names its top-level directory artgarten-<id>; --name overrides the
# slug so a project can be filed under a readable name instead.
slug=${name:-${top#artgarten-}}
case "$slug" in
  ""|*/*|.*) echo "bad --name '$slug'" >&2; exit 64 ;;
esac
dest="projects/$slug"

if [ -e "$dest" ]; then
  echo "$dest already exists" >&2
  exit 1
fi

echo "==> unzipping $top -> $dest/artgarten"
mkdir -p "$dest"
unzip -q "$zip" -d "$work/unpacked"
mv "$work/unpacked/$top" "$dest/artgarten"
# The project's own README is the piece's README; it carries the provenance.
[ -f "$dest/artgarten/README.md" ] && mv "$dest/artgarten/README.md" "$dest/README.md"

git add -- "$dest"
git commit -q -m "Add $slug from artgarten

Unzipped from $url"
echo "==> committed $(git rev-parse --short HEAD): $dest"

# Render once as an import check. Renders are generated output and are not
# committed — `make $slug` redraws them into out/ on demand.
echo "==> test render (not committed)"
node "$repo_root/tools/render.mjs" "$dest/artgarten" \
  --out "$work/render.png" ${render_args[@]+"${render_args[@]}"}
echo "==> import OK; run 'make $slug' to render into out/"
