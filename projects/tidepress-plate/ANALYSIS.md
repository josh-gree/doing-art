# Tidepress Plate — pipeline read and variation study

`tidepress-plate`, third pass of the method in [`handover_skills.md`](../../docs/handover_skills.md).
Baseline render: `out/tidepress-plate/render.png`.

![variation families](families.png)

Regenerate:

```bash
node tools/variations.mjs --project projects/tidepress-plate/artgarten \
  --variants projects/tidepress-plate/variants.mjs \
  --px 620 --sheet-px 300 --cols 5 --out out
```

14 cells, 32 s wall clock, ~1.9 s per 620 px render and flat across every
variant — a 132² lattice cost the same as a 16² one, as §2 predicts.

---

## 1. Intake facts

3000², `pixelDensity(1)`, `noLoop()`, p5 1.11.13 from the CDN, p5 global mode.
`draw()` opens with `randomSeed(20240607)` / `noiseSeed(4242)` and there is **not
one `Math.random()` in the file** — the piece is already fully reproducible, so
the §9 trap costs nothing here.

The §1 constant-count grep found the pass-2 trap intact:

```
PAPER      2 usages   erode() specks, paperStroke() highlights
PAPER_DK   2 usages   blotches(), fibers()
INK        9 usages   rings, spatter, grain, anchor
```

**`PAPER` is not the ground.** `drawPaper()` paints the sheet from literals
inside a pixel loop (`let v = 230 + n1*18 + …`, clamped to `[200, 246]`, channels
`v+6 / v / v-14`); the constant only tints specks and highlights. A dark-paper
variant that swaps `PAPER` renders as a no-op. `ink-negative` below reaches into
the pixel loop, and that is why it works.

Second trap, found by counting before patching: `const N = 48, margin = 180;`
appears **twice** — once in `halftone()`, once in `gridGhost()`. Every lattice
anchor in `variants.mjs` carries its function signature with it.

## 2. The pipeline

| layer | in this sketch | varying it |
|---|---|---|
| **structure/field** | `fieldValue()` — ripples from P1 (λ=`L1`) interfered with ripples from P2 (λ=`L2`), plus a Gaussian bloom at P1 (σ=300) and a ridge along the P1–P2 segment | the composition |
| **gate/mask** | `dRC > 1198 → continue`, with a 130 px soft edge; restated in ink by `plateTone()` and the two rim rings | the silhouette |
| **ink model** | `drawDot()`: `inkV = 150 − 132·t` charcoal ramp, with a `sep` warm-umber separation above t≈0.62, on cream | the palette |
| **ornament** | `buildAccents()` rings/dashes/moiré/hatch-arc, `subSystem()` at P3, `centerAnchor()` | the furniture |
| **finish** | blotches, fibers, gridGhost, scratches, spatter, darkGrain, erode, roughFrame, ticks, vignette | the print condition |

`fieldValue()` is the §5 "most downstream" knob, and by a wide margin: `t` sets
the dot **radius**, then sets the **ink colour** (`inkV` and the `sep` duotone),
then gates two ornament branches (`r > 8` satellites, `r > 30` internal grain).
One function, four consequences. Every bold family below is either that function
or the gate it prints through.

## 3. Verdict — what read at 300 px

Eleven of thirteen variants pass the one-second test. That is a high hit rate,
and it is not because the piece is generous: it is because the coverage rule
was used to *discard* families before rendering. The ones never built —
recolouring `subSystem` (~3 % of the frame), the `moire` patch at P2 (~1.5 %),
scratch/fiber/erode counts (alpha under 30), frame and tick geometry — are the
same knobs that ate a cycle in passes 1 and 2.

**Bold (a new object, not a new mood):**

| variant | what it does |
|---|---|
| `lat-coarse` | 48² → 16². 200 fat dots; the ripple structure dissolves into a rough scatter |
| `lat-fine` | 48² → 132². Dots vanish into continuous tone — the plate reads as a photograph of water |
| `wave-broad` | λ 200/350 → 620/1000. Three thick comma-shaped tidal bands |
| `wave-tight` | λ 200/350 → 64/105. **A six-armed star** — see below |
| `src-grid` | P1 tiled on a 780 px grid. A quilt of ~9 ripple eyes, each with its own bloom |
| `src-plane` | radial distance → linear projection. Plane waves; rings become diagonal stripes |
| `gate-none` | plate removed. Full-bleed field to the frame |
| `gate-annulus` | plate hollowed to a ring. The bloom and centre anchor are cut out entirely |
| `gate-checker` | field printed through 330 px checker tiles |
| `ink-negative` | dark ground, pale ink. Inverts the logic of the whole piece |
| `ink-prussian` | charcoal/umber → prussian blue with a rust separation |

**Did not read — an honest negative:**

- `src-solo` (kill the P2 interference and the P1–P2 ridge). I predicted
  medium; it is the weakest thing in the sheet and I was wrong in a way the
  coverage rule had already answered. P2's contribution is `w2 * env2` where
  `env2 = constrain(1.05 − d2/1150, 0, 1) * 0.44` — capped at 0.44 and gone
  entirely 1150 px out, against a P1 term at 0.62 across the whole plate. It is
  a **10 %-coverage knob with a load-bearing name**. Baseline and `src-solo`
  differ in one asymmetric dark mass at upper right; you have to compare them
  side by side to see it. Not a family. Finish.

**Control, per §5:**

- `ctl-ghost8` — misregistration ghost offset ×8 (18,−13 → 144,−104). Predicted
  invisible; **is** invisible at 300 px. The sheet is calibrated, so the
  `src-solo` negative above is worth reporting rather than a failure of looking.

## 4. Two findings worth carrying forward

**The lattice is a sampler, so "shorter wavelength" is not "more rings".**
`wave-tight` was specified as *dense interference* and rendered as a clean
six-pointed star. At λ=64 the wave period approaches the 55 px cell pitch of the
48² lattice, and the angular lobe term already in `fieldValue`
(`1 + 0.30·sin(2a₁+0.7) + 0.16·sin(5a₁+2.0)`) beats against it. The output is
aliasing structure, not wave structure — a genuinely different family from the
one I asked for, and the strongest image in the study. Any generative version of
this piece has a **λ/cell-pitch ratio** as a first-class parameter, and the
region near 1 is a feature to be sampled deliberately, not a floor to clamp away.

**Palette was bold here and weak in Oxide Fault Weave — coverage says why.**
Pass 2 concluded palette was the weakest family; pass 1 concluded it was the only
strong one. Neither is a fact about palettes. There the second plate was a ~5 %
scattered accent; here the dot ink covers the entire plate at alpha 242, so
`ink-prussian` reads across the room. The predictor is coverage × alpha, every
time; "palette" is not a family that is bold or weak in general, and the note in
handover §5 should be read that way.

## 5. If this goes to §6 (a CFG-driven engine)

The parameters that earned their place, in sampling order:

- `lattice`: N (16 … 132), and with it the λ/pitch ratio
- `wavelength`: L1, L2 as free numbers, deliberately including the aliasing band
- `sources`: `solo | duet | grid | plane` — one geometry switch inside
  `fieldValue`, since all four emit the same scalar field
- `gate`: `disc | annulus | none | checker`, as a signed-distance function; the
  rim rings and `plateTone()` must follow the gate or the ink still says "circle"
- `ink`: ground literals in `drawPaper()` **and** the `inkV` ramp together —
  they are one knob, not two

Guardrails the study already implies: `lat-fine` × `gate-none` is 17 000 dots of
grey mush at full bleed, and `lat-coarse` × `gate-checker` puts roughly four dots
in a tile. Pitch and gate are not independent, exactly as §8 found.
