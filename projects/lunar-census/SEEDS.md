# Lunar Census, Plate IV — 100 seeds

100 pieces from [`projects/lunar-census/generative/`](../projects/lunar-census/generative), rendered at
500×500. Every one is a different configuration of the same engine; none is a
hand-picked favourite.

![sheet 1](sheet-1.png)
![sheet 2](sheet-2.png)

Regenerate the whole batch, exactly:

```bash
node tools/sample.mjs --project projects/lunar-census/generative --master lunar --count 100 \
  --px 500 --out out/lunar-census/seeds --sheet --cols 5 --rows 10 --sheet-px 300
```

The seeds are derived from the master seed `lunar` rather than from
`Math.random`, so that command reproduces these same 100 pieces byte for byte —
checked, not assumed:

```bash
node tools/sample.mjs --project projects/lunar-census/generative --seeds jicj4p --out out/lunar-census/detA
node tools/sample.mjs --project projects/lunar-census/generative --seeds jicj4p --out out/lunar-census/detB
md5sum out/lunar-census/detA/*.png out/lunar-census/detB/*.png    # matches
```

Any single one comes back on its own with `--seeds <seed>`, or in the browser at
`projects/lunar-census/generative/index.html?seed=<seed>` (`r` rerolls, `s` saves).

`recipes.json` records what each seed sampled:

```json
{ "index": 2, "seed": "jicj4p", "file": "002_jicj4p.png",
  "ink": "lunar", "dist": "flat", "rungs": "7", "scale": "normal",
  "gap": "17", "ratio": "1.55", "jitter": "0.77", "gate": "annulus",
  "seam": "woven", "orient": "around", "ground": "bone", "sats": "2" }
```

## Reading the recipe

`ink` and `dist` are the two halves of the ladder, and together they are the
biggest thing separating one seed from another. `pickInk()` reads a tick's
**rank** in the census, and the census is built outer-to-inner, so the ladder's
quantiles are the plate's radial geography, not just its palette: `steep` is the
delivered scarcity ladder (a slate sea, a gold coin at the heart), `flat` gives
every ink a seventh of the radius, `reverse` puts the gold on the outside,
`sea` pushes the outer ink to 86 %, `banded` spreads it into even rings.

`gap` is the radial ring pitch in pixels and `ratio` is the tangential step
divided by it — the delivered plate sits at gap 19, ratio 1.84. `jitter` is the
per-tick angular jitter as a fraction of a cell. It is a first-class parameter
because of a negative result: the variation study's `phase-lock` cell failed to
read, and the reason was that the delivered jitter of 0.7 is ±35 % of a cell —
a pre-emptive anti-aliasing filter sitting in front of any lattice structure.
Seeds sampled near `jit 0.05` (`iipwbz`, `5ghfwy`, `zdy3iz`, `g5h8ph`, `slmdnb`)
are the ones where the rings can actually phase-lock, and they comb and spiral
in a way the delivered plate cannot.

## Known duds — roughly 1 in 6, and they are all the same seed

**16 of the 100 are weak, and every one of them has a dark ground** (12 `night`,
4 `slate`): `gkc94w`, `d0h3ky`, `rptffq`, `r7fw0a`, `nl0dvv`, `0lbfgc`,
`tvtics`, `b2fzet`, `r7jzz9`, `pprxio`, `l9cbj9`, `aacgs8`, `srpxlw`, `q59t9j`,
`idw67g`, `awmb4o`. Not one light-ground seed is in the list, and 16 of the 32
dark-ground seeds are — so this is one fault, not a scattering of bad luck.

Two causes, both identified and neither fixed here:

1. **The census sinks into the sheet.** `drawCensus()` mixes every tick on the
   unlit half toward `CHARC` at up to 0.85. On bone paper that keeps the tick
   legible; on a ground of 50 it erases half the census into fog. The ladder
   colours are already lifted 42 % toward white on dark grounds, which is not
   enough on its own — the fix is a per-ground *shading profile* (mix cap,
   coefficients and alpha floor) so the dark sheets shade toward the ground
   rather than through it.
2. **The heavy dry ring becomes a hoop.** `GROUND.ring` on the dark palettes is
   a saturated vermilion at alpha 130–168. With the census faded behind it, it
   stops being an overprint and becomes the loudest object on the plate — which
   is why the dark seeds also look like each other. The fix is to take the heavy
   ring's ink from the ladder's own underprint rung rather than from the ground.

Both are recorded rather than quietly re-rolled. The dud rate is the number that
says whether the sampler is finished, and hiding it makes a half-tuned sampler
look done.

## What is not sampled

Everything the variation study measured as invisible at 300 px: the dust, the
spatter, the paper fibres, the speck and per-pixel grain, the misregistration
ghost, the legend, the seal, the registration marks. They vary just enough that
two seeds are not identically printed, and no further — see
[`projects/lunar-census/ANALYSIS.md`](../projects/lunar-census/ANALYSIS.md).
