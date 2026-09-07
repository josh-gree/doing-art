# Every image in this repo is generated. Nothing rendered is committed; these
# recipes draw it all again, into out/. Run `just` to see them.

projects := "tidepress-plate lunar-census madder-meridian"
out      := "out"

# List the recipes.
default:
    @just --list --unsorted

# Install the renderer's one dependency (Chromium via Playwright).
setup:
    npm install playwright
    npx playwright install chromium

# Everything, for every project. Slow — it is ~330 renders.
all:
    #!/usr/bin/env bash
    set -euo pipefail
    for p in {{projects}}; do just project "$p"; done

# Everything for one project: reference render, variation study, seed batch.
project slug: (render slug) (study slug) (seeds slug)

# The original artgarten sketch, rendered once.
render slug:
    node tools/render.mjs projects/{{slug}}/artgarten \
      --out {{out}}/{{slug}}/render.png

# The variation study: patched families as labelled contact sheets.
study slug cols="5" rows="0":
    node tools/variations.mjs \
      --project projects/{{slug}}/artgarten \
      --variants projects/{{slug}}/variants.mjs \
      --px 620 --sheet-px 300 --cols {{cols}} --rows {{rows}} \
      --out {{out}}/{{slug}}/study

# The seed batch, reproducing the project's committed recipes.json exactly.
seeds slug count="100" px="500":
    #!/usr/bin/env bash
    set -euo pipefail
    # The master seed comes from recipes.json, so the batch that comes back is
    # the one the SEEDS.md write-up describes, not a fresh sample.
    master=$(node -p "require('./projects/{{slug}}/recipes.json').master")
    node tools/sample.mjs \
      --project projects/{{slug}}/generative \
      --master "$master" --count {{count}} --px {{px}} \
      --out {{out}}/{{slug}}/seeds \
      --sheet --cols 5 --rows 10 --sheet-px 300

# One seed on its own, at full size.
seed slug id px="0":
    node tools/sample.mjs --project projects/{{slug}}/generative \
      --seeds {{id}} --px {{px}} --out {{out}}/{{slug}}/single

# Rebuild contact sheets from frames already on disk — no re-rendering.
resheet slug px="300" cols="5" rows="10":
    node tools/resheet.mjs --dir {{out}}/{{slug}}/seeds \
      --recipes projects/{{slug}}/recipes.json \
      --px {{px}} --cols {{cols}} --rows {{rows}}

# Open a project's seeded engine in a browser to play with it.
open slug:
    open projects/{{slug}}/generative/index.html

# Delete every generated image.
clean:
    rm -rf {{out}}
