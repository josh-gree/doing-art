# Madder Meridian — 100 seeds

100 pieces from [`projects/madder-meridian/generative/`](../projects/madder-meridian/generative), rendered at
500×500. Every one is a different configuration of the same engine; none is a
hand-picked favourite.

![sheet 1](sheet-1.png)
![sheet 2](sheet-2.png)

Regenerate the whole batch, exactly:

```bash
node tools/sample.mjs --project projects/madder-meridian/generative --master madder --count 100 \
  --px 500 --out out/madder-meridian/seeds --sheet --cols 5 --rows 10 --sheet-px 300
```

**The delivered sketch was not reproducible and this engine is.** `sketch.js`
seeds p5's `random()` and `noise()` at the top of `draw()`, but leaves one
`Math.random()` in `grainVignette()`'s per-pixel loop — enough to change every
byte. Two renders of the original give different MD5s; two renders of any seed
here give the same one. Checked, not assumed:

```bash
node tools/sample.mjs --project projects/madder-meridian/generative --seeds gvi350 --out out/madder-meridian/dA
node tools/sample.mjs --project projects/madder-meridian/generative --seeds gvi350 --out out/madder-meridian/dB
md5sum out/madder-meridian/dA/*.png out/madder-meridian/dB/*.png    # matches
```

Any single one comes back with `--seeds <seed>`, or in the browser at
`projects/madder-meridian/generative/index.html?seed=<seed>` (`r` rerolls, `s` saves).

## Reading the recipe

```json
{ "index": 0, "seed": "gvi350", "file": "000_gvi350.png",
  "ground": "bone", "accent": "madder", "rows": "26", "rowScale": "dense",
  "wave": "triangle", "amp": "0.85", "period": "444", "bpp": "8.4",
  "bands": "1", "eye": "eye", "seam": "seam" }
```

`amp` is the wave amplitude **as a fraction of the row pitch**, not in pixels —
which is the only way it means the same thing at 5 rows and at 30. Below about
0.15 the rows are ruled lines; around 0.3 they weave; above 0.7 they interleave
into a lattice and the sheet stops reading as rows at all.

`bpp` is beads per wave period, and it is the §5b parameter: the study found
that driving it toward 2–3 pulls beads onto the wave's vertices and the rows
lock into a regular alternation. `33rjf9`, `1m4vyi`, `iikbvx` and `2mmqwc` are
in that band. It is sampled deliberately rather than clamped away.

`bands` counts the charcoal bands that invert a slice of the sheet — the
loudest parameter in the piece, and the reason 25 seeds with `bands: 0` read as
a different kind of object from the 67 with one.

## Known duds — about 12 in 100, one cause

The weak seeds are all the same failure: **a low-amplitude wave with a low row
count leaves the sheet empty.** `7jzcp2`, `1vizdg`, `iyxxlg`, `bn6fbp`,
`3bc7go`, `o93187`, `ro7lvv`, `8j9kjj`, `zbmjl1`, `xc59yy`, `a1i439`, `q53sj8`.

The measurement is clean: 28 seeds sampled an amplitude under 0.13 of the row
pitch, and the ones that read badly are exactly those that also have 13 rows or
fewer. At 20+ rows the same flat wave is fine — it reads as a finely ruled
cloth. Amplitude and row count are not independent, and the sampler treats them
as if they were.

The fix is one clamp in `params.js`, at the marked NOTE:

```js
if (rowsN <= 13) ampFrac = Math.max(ampFrac, 0.18);
```

It is deliberately **not** applied, so that this file's regenerate command
reproduces these exact images. Applying it means re-rendering the batch, since
any change to the sampler shifts the whole stream.

## What is not sampled

Everything the variation study measured as invisible at 300 px: the ghost
misregistration (which failed to read here for the fourth piece running, against
an explicit prediction that it would), the bead tone field's noise term, and
every scattered ornament — repairs, knots, thread ends, strays, registration
crosses. See
[`projects/madder-meridian/ANALYSIS.md`](../projects/madder-meridian/ANALYSIS.md).
