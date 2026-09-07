# doing-art

Generative pieces grown in [artgarten](https://www.artgarten.xyz), each taken
apart and rebuilt as a seeded engine you can sample from.

**No images are committed.** Every picture in this repo is reproducible from a
seeded command, so the command is what's stored and the image is a cache. That
keeps a clone at a couple of megabytes instead of several hundred.

## Run it

```bash
just setup              # once: installs Playwright + Chromium
just all                # redraw everything, into out/
just project lunar-census   # or just one piece
```

`just` on its own lists every recipe. Everything lands in `out/`, which is
gitignored.

```bash
just render lunar-census    # the original artgarten sketch, once
just study  lunar-census    # the variation study's contact sheets
just seeds  lunar-census    # the 100-seed batch from its recipes.json
just seed   lunar-census jicj4p   # one seed, full size
just open   lunar-census    # play with the engine in a browser
```

The batches are derived from a master seed recorded in each piece's
`recipes.json`, not from `Math.random`, so `just seeds` brings back the same
100 pieces the write-up discusses.

## The pieces

| | piece | artgarten individual | worked through |
|---|---|---|---|
| [`projects/tidepress-plate`](projects/tidepress-plate) | Tidepress Plate | `e08f1353` | analysis + engine + batch |
| [`projects/lunar-census`](projects/lunar-census) | Lunar Census, Plate IV | `13c3bf4f` | analysis + engine + batch |
| [`projects/madder-meridian`](projects/madder-meridian) | Madder Meridian | `25389e0e` | analysis + engine + batch |
| [`projects/corona-truss`](projects/corona-truss) | Corona Truss | `06ec2d14` | just imported — sketch only |

A fully worked piece is laid out like this; a freshly imported one has only
`README.md` and `artgarten/` until the method in
[`docs/handover_skills.md`](docs/handover_skills.md) has been run on it.

```
projects/<slug>/
  README.md      the piece, and where it came from
  artgarten/     the original sketch, untouched
  generative/    the same piece rebuilt as a seeded engine
  ANALYSIS.md    what the sketch actually does, and what varying it proved
  variants.mjs   the patch families the study renders
  SEEDS.md       how to regenerate the batch — and its known duds
  recipes.json   what each seed sampled
```

`artgarten/` is the reference and never changes. `generative/` is the piece
made tunable: `params.js` is the judgement, `engine.js` is the capability.

## Adding a piece

```bash
tools/import-project.sh --name <slug> --project-url <project.zip URL>
```

Then work through the method in
[`docs/handover_skills.md`](docs/handover_skills.md) — read the sketch, write
`variants.mjs`, run the study, then build the engine.
