# Tidepress Plate — 100 seeds

100 pieces from [`generative/`](generative), rendered at 500×500. Every one is a different
configuration of the same engine; none is a hand-picked favourite.

![sheet 1](sheet-1.png)
![sheet 2](sheet-2.png)

Regenerate the whole batch, exactly:

```bash
node tools/sample.mjs --project projects/tidepress-plate/generative \
  --master tidepress --count 100 --px 500 --out out/tidepress-plate/seeds --sheet --cols 5 --rows 10 --sheet-px 300
```

The seeds are derived from the master seed `tidepress` rather than from
`Math.random`, so that command reproduces these same 100 pieces byte for byte.
Any single one comes back on its own with
`--seeds <seed>`, or in the browser at `projects/tidepress-plate/generative/index.html?seed=<seed>`.

`recipes.json` records what each seed sampled:

```json
{ "index": 11, "seed": "132uli", "file": "011_132uli.png",
  "lattice": "51²", "sources": "solo", "ratio": "1.33",
  "gate": "disc", "ink": "negative-bone" }
```

## Reading the recipe

`λ/pitch` is the ratio of the wave's wavelength to the halftone lattice's cell
pitch, and it is the parameter that most changes what a seed looks like. Above
about 3 the dots resolve the wave and you get rings. Approaching 1 the lattice
starts aliasing against the field and the plate breaks into stars and rosettes —
`132uli`, `2i4yda`, `pzkl82`, `0bseip` and `xm2wy0` are all in that band. This is
the finding from `projects/tidepress-plate/ANALYSIS.md` §4, and it is sampled
deliberately rather than clamped away.

## Known duds

Roughly one seed in ten is weak, which is about what an unguarded sampler is
expected to produce before a second round of weight tuning:

- **coarse lattice behind an open gate** — `gbikx6`, `bz6qz7`, `7kzaq5`,
  `p8v8wh` put too few marks in each tile, so they read as scattered blocks
  rather than as a print. The guardrail in `params.js` sets a tile floor
  relative to cell pitch but no cap on how coarse the lattice may be when the
  gate is open. That is the fix, and it is not applied here.
- **tight ratio at full plate coverage** — `j8m410`, `zcu4cc` flatten toward
  uniform noise: the aliasing band needs either a gate or a coarser lattice to
  stay legible.

Both were predicted in the variation study's guardrail notes and neither was
guarded against; they are recorded rather than quietly re-rolled, because the
dud rate is the number that tells you whether the sampler is finished.
