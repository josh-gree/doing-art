# Lunar Census, Plate IV — pipeline read and variation study

`lunar-census`, operator `crossover`, model `z-ai/glm-5.3-flash`.
Reference render: [`../../out/lunar-census/render.png`](../../out/lunar-census/render.png).

Fourth pass of the method in [`handover_skills.md`](../../docs/handover_skills.md).
16 cells, 48 s wall clock including both sheets. **12 of 15 variants read at
300 px**, one is medium, one fails, and the control behaved.

![families](families.png)

Regenerate:

```bash
node tools/variations.mjs --project projects/lunar-census/artgarten \
  --variants projects/lunar-census/variants.mjs \
  --px 620 --sheet-px 300 --cols 4 --rows 4 --out out
```

---

## 1. The pipeline (§3)

| layer | in this sketch | varying it |
|---|---|---|
| **structure/field** | `buildCensus()` walks rings from `RMAX = 1330` inward to `RMIN = 26`, `gap` px apart, laying short ticks `step` px apart along each ring | the composition |
| **gate/mask** | one `continue`: `vnoise(...) < wth` culls ticks outside `M.r * 1.06` | the silhouette of the outer cloud |
| **ink model** | `pickInk(u)`, `u = i / N` — the tick's **rank** in the census — read against `LADDER`'s seven quantiles; then `shadeAt()` mixes toward `CHARC`/`PAPER` inside the moon | the colour geography |
| **ornament** | 4 dry-brush rings, 2 zigzag rows, stitches, construction geometry, orbit ridges, 2 satellite censuses, halftone shadow, dust, legend, seal | the furniture |
| **finish** | spatter, speck grain, per-pixel grain, vignette, plate frame, registration marks | the print condition |

### The one thing to understand about this piece

`u = i / N` is a **rank**, and because `buildCensus()` pushes rings outer-to-inner,
rank *is* radius. So `LADDER` is not a palette — it is the radial geography of the
entire plate. Slate's `q: 0.500` is not "half the ink", it is "the outer half of
the sheet"; gold's `q: 0.045` is the last 4.5 % of the census, which is why the
heart is a coin. Every one of the ~14 000 ticks consults it, at alpha 175–246,
over most of the frame. Nothing else in the file has that reach.

The header comment calls the ladder a *scarcity ladder*. That sentence is the
design constraint: whatever else moves, the inks must stay ranked, or the piece
stops being a census and becomes a colour wheel.

### §5a, answered by reading

1. **What is the scalar field?** Two, and they compose. `u` (rank ≈ radius) picks
   the ink; `shadeAt(px, py, cx, cy, r)` — the only `(x,y) → one number` function
   in the file — decides, for every tick inside `M.r`, how far it mixes toward
   `CHARC`, its alpha, its length and its weight. The ladder is the composition
   field; `shadeAt` is the tone field laid over the middle 17 %.
2. **What discretizes it?** `gap` (radial, 19 outer / 12 inner) and `step`
   (tangential, `28 + 14 * vnoise(...)` outer / 16 inner). Their **ratio** is the
   §5b candidate — see below.
3. **What gates it?** The `wth` erosion test, and only outside `M.r * 1.06`. It
   is the sole source of silhouette in the outer cloud: turn it off and the
   census is a plain disc.
4. **What paints the ground?** **Not `PAPER`.** Six usages, every one of them
   tinting a mark: census highlights, `striateRing`, `erodeRing`. `drawPaper()`
   paints the sheet from literals inside a pixel loop —
   `var v = 228 + n1 * 26 + n2 * 11 + …`, clamped to `204..248`. Third piece in a
   row with this exact trap, third different model. Assume it every time.

### Rejected by the coverage rule before spending a cell (§5)

`dust()` (2200 dots at ~4 px), `spatterAll()` (~470 specks), `speckGrain()`,
`grainPass()`, the 1000-fibre paper pass, `legend()`, `seal()`, `registration()`,
`ghostDial()`, zigzag amplitude, stitch spacing, `showThrough()`, `tonalWashes()`.
Each is under a couple of per cent of the frame, or under alpha 30, or both. That
is thirteen cells not spent — the same trade that got pass 3 to 11-of-13.

### `Math.random` grep: zero hits

`rnd()` is a seeded mulberry32 (`rndS = 13579246`), `vnoise()` hashes off
`noiseK = 246813`, and both are set at the top of `draw()`. The piece is fully
reproducible as delivered, including the per-pixel `grainPass()` — so §9's
determinism work costs nothing, and the study itself is a byte-for-byte
regression test. Re-running it reproduces `families-thumb.png` exactly; that was
checked, not assumed.

---

## 2. Verdicts — predicted before rendering, scored after

| cell | predicted | actual | note |
|---|---|---|---|
| `ladder-flat` | strong | **strong** | seven equal rungs: the slate sea shrinks to a band and crimson/jade own the middle third |
| `ladder-slate` | strong | **strong** | slate at 0.90 — a near-monochrome plate with a jewelled core. The scarcity idea taken to its limit |
| `ladder-reverse` | strong | **strong** | gold sea, slate heart. The loudest colour cell, and it still reads as a census |
| `lattice-coarse` | strong | **strong** | 3.5× coarser: a few hundred heavy dashes, the plate becomes a diagram |
| `lattice-fine` | strong | **strong, but weak as an image** | 2.7× finer, ~100 k ticks. It reads — and it reads *pale*. Hairlines across the full sheet average to grey, exactly as the handover's hairline guardrail predicts |
| `ratio-one` | medium | **medium** | `step` driven down to `gap`: denser, more continuous colour bands. Real, but a two-second call, not a one-second one |
| `phase-lock` | surprising | **does not read** | see below — the only prediction I got badly wrong |
| `gate-open` | strong | **strong** | erosion off: the cloud fills its disc, full bleed |
| `gate-wedges` | strong | **strong** | twelve wedges: the outer cloud becomes a rosette. Loudest silhouette change available |
| `seam-flat` | strong | **strong** | unwoven, and (§5c) the stitches and seating smudge removed with it — the plate goes fully concentric |
| `seam-wide` | strong | **strongest cell in the sheet** | `T_PINCH` 245 → 900 at pin 1.0: the whole census collapses into a lens |
| `tick-radial` | strong | **strong** | ticks turned 90°: the census combs outward, the whole surface texture changes |
| `ground-dark` | strong | **strong** | night plate. Also the muddiest — see the caveat below |
| `light-flip` | medium | **medium-strong** | the moon's dark side moves corner to corner; the halftone shadow follows it |
| `misreg-x8` (control) | does not read | **does not read** | control calibrated. Fourth piece, fourth failure to read — reuse it again |

### Where I was wrong: `phase-lock`

Predicted as the §5b aliasing cell — kill the `ring * 0.37` phase increment, get
the rings to phase-lock into radial spokes. At 620 px it does something (a
smoother, swept outer cloud with a visible alignment seam at θ = 0). At 300 px I
cannot name the difference in one second, so by the only test that counts it is
not a family.

The reason was in the code and I did not read it carefully enough. Two things
destroy the lock: `n = floor(TWO_PI * r / step)` differs from ring to ring, so
zero phase only aligns rings near θ = 0 and they drift apart everywhere else; and
each tick already carries `rndr(-0.5, 0.5) * (TWO_PI / n) * 0.7` of angular
jitter — ±35 % of a cell, which is most of a lock's worth of blur before the
phase term is even consulted. **A jitter comparable to the cell pitch is a
pre-emptive anti-aliasing filter; look for it before you build an aliasing
family.** That is the §5b lesson this piece adds.

`ratio-one` is the other half of the same story. Driving the tangential step down
to the radial gap does make the sampling isotropic, and the colour bands do get
more continuous — but the same jitter keeps it from ever becoming structure. On
this piece, ratio is a texture knob, not a hidden family.

### Where the ground-dark cell is honest but incomplete

Inverting the pixel-loop literals gives a night plate, and it reads across the
room. It also silently drops two layers: `halftoneShadow()` fills `52, 47, 42`
blobs, and `plateFrame()` strokes `50, 48, 44` — both now painting dark on dark.
The cell is a true report of "invert the ground and nothing else", and it is the
right cell to have rendered. In the engine, ground and mark-darkness have to be
sampled as a pair, not independently.

---

## 3. What this means for an engine (§6)

Ordered by how much of the frame the knob owns:

1. **The ladder is the piece.** `LADDER` should be sampled as a *set*: a curated
   palette plus a quantile distribution drawn from a small family (steep scarcity
   / flat / reversed / two-tone). Sampling seven independent colours would throw
   away the ranking that makes it a census. Guardrail: keep the rungs ordered and
   keep at least one rung under 0.06 so there is always a heart.
2. **Ground and shadow ink are one choice.** Light ground → dark `CHARC`, halftone
   at `52, 47, 42`, frame at `50, 48, 44`. Dark ground → those three lift
   together or the plate loses its shadow and its border.
3. **Lattice scale wants a floor.** `gap ≤ 7` over a full-bleed gate is the pale
   mush this study rendered. Same guardrail shape as the handover's hairline rule:
   fine lattice only inside a gate, or with the tick length scaled down with it.
4. **Gate is a free parameter and should be one.** `none` / `noise` (the
   original) / `wedges` / `annulus` / `half`, as a predicate over `(th, r, ring)`.
   §5c applies: the stitches, the seating smudge and the 4 dry rings restate the
   composition in ink and must move with it.
5. **The seam is the second field.** `T_PINCH`, `TILT`, `MID_S` and the pin
   strength are four numbers that deform every mark in the file. `seam-wide` shows
   the range is far wider than the delivered value uses.
6. **Tick orientation is a mode**, not a number: tangential (`+ HALF_PI`), radial,
   or a blend. One term, and it repaints the whole surface.
