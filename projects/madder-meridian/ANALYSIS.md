# Madder Meridian — pipeline read and variation study

`madder-meridian`, operator `crossover`, model `stealth/ox-alpha`.
Reference render: [`../../out/madder-meridian/render.png`](../../out/madder-meridian/render.png).

Fifth pass of the method in [`handover_skills.md`](../../docs/handover_skills.md).
18 cells, 44 s wall clock including both sheets. **14 of 17 variants read at
300 px** — the best rate so far, and it came from the same place as pass 3's:
the families were derived from the code rather than chosen from a list.

![families](families.png)

Regenerate:

```bash
node tools/variations.mjs --project projects/madder-meridian/artgarten \
  --variants projects/madder-meridian/variants.mjs \
  --px 620 --sheet-px 300 --cols 6 --rows 3 --out out2
```

---

## 1. The pipeline (§3)

| layer | in this sketch | varying it |
|---|---|---|
| **structure/field** | `rowY(x, i)`: a triangle wave per row (`period`, `amp`, `phase`) + two noise bends + a 2D-Gaussian pull toward `EYE` + a smoothstep shear at `SEAM_X` | the composition |
| **gate/mask** | `BAND` — rows `i0..i1` are skipped by the normal draw, covered by a black rect, and re-stamped in paper ink | the silhouette, and the ink logic |
| **ink model** | five `*_SET` triples (`base`/`hi`/`skip`) assigned per row, plus two short madder segments | the palette and the scarcity |
| **ornament** | the knot eye, basted seam, repairs, french knots, thread ends, strays, accent ticks, pools, slubs, registration crosses | the furniture |
| **finish** | ghost pass, mottle, fibres, specks, frame, grain + vignette | the print condition |

### §5a, answered by reading

1. **What is the scalar field?** `rowY(x, i)` — every thread, every bead and
   every ghost mark is placed by it. A second field sizes and tones each bead:
   `field = 0.58 * noise(x, y) + 0.42 * grad`, where `grad` is a diagonal ramp.
2. **What discretizes it?** *Two* lattices, at right angles. `spacing` (~58 px
   of **arc length** between beads) along each row, and `ROWS_N` / `STEP_Y`
   across the sheet. Both are free, and both read.
3. **What gates it?** `BAND`. It is unusual: not a mask on the marks but a gate
   on the *sheet*, which inverts the ink for the rows it covers. It is the
   loudest single thing in the file, and both directions of it read.
4. **What paints the ground?** `background(PAPER[0], PAPER[1], PAPER[2])`,
   glazed by `mottlePaper()`'s literal tints.

### The named constant is the ground this time

Three pieces running, the invitingly named palette constant was a decoy and the
sheet was painted from literals inside a pixel loop. Pass 4 had just written that
up as a law — *"the ground is literals until proven otherwise, four for four"*.
It is not a law. `PAPER` here has 17 usages and one of them is the `background()`
call. The older, weaker form of the rule is the correct one and the strong form
should be deleted: **count the usages and look at where they land.** That is a
one-second check that answers the question either way; "PAPER is never the
ground" is a guess that happened to be right three times.

### Rejected by the coverage rule before spending a cell (§5)

`drawPools`, `frenchKnots`, `drawRepairs`, `drawStrays`, `drawThreadEnds`,
`registrationMarks`, `accentTicks`, `slubs`, the four single-bead incident
indices (`drifterIdx`, `ringIdx`, `strikeIdx`, `ghostIdx`), the fibre counts and
the frame. Twelve cells not spent.

### `Math.random` grep: one hit, and it costs the free check

Line 874, inside `grainVignette()`'s per-pixel loop — the same finishing-pass
hiding place as Oxide Fault Weave. `draw()` opens with `randomSeed(20260301)` and
`noiseSeed(53)`, so everything else is reproducible, but that one call means the
study is **not** byte-for-byte repeatable. Measured rather than assumed: two
renders of the untouched project give different MD5s. It has to be seeded before
the engine can pass §9.

---

## 2. Verdicts — predicted before rendering, scored after

| cell | predicted | actual | note |
|---|---|---|---|
| `wave-square` | strong | **strong** | rows become terraces; the beads step instead of sliding |
| `amp-flat` | strong | **strong** | the cloth is ruled, not woven — and the eye suddenly dominates |
| `amp-tall` | strong | **strong** | rows interleave into a diamond lattice |
| `period-short` | strong | **strong** | steep chevrons, ~3 beads per period |
| `rows-few` | strong | **strong** | 5 rows at 520 px — the most minimal image in the study |
| `rows-many` | strong | **strong** | 26 rows at 100 px — the sheet fills with thread |
| `beads-fine` | strong | **strong** | rows become dotted rules |
| `beads-coarse` | strong | **strong** | boulders on a string; the band turns into a cobble field |
| `bead-lock` | surprising | **strong** | see §5b below — it locks, unlike pass 4's attempt |
| `band-none` | strong | **strong** | eleven uninterrupted rows |
| `band-wide` | strong | **strong** | rows 2–8 inverted; the sheet is mostly night |
| `eye-strong` | strong | **strong** | the whole cloth funnels into the knot |
| `red-all` | strong | **strong** | madder from accent to whole cloth |
| `ground-dark` | strong | **strongest cell** | and unusually cheap — see below |
| `tone-grad` | bold-ish | **does not read** | the noise term was carrying less than it looked |
| `ghost-x8` | **reads** | **does not read** | I bet against the handover and lost — see below |
| `specks-x7` (control) | does not read | **does not read** | control calibrated |

### Where I was wrong: `ghost-x8`

The handover says misregistration ×8 is a reliable non-reading control and to
reuse it. I argued in the variants file that this piece would break the streak,
because `ghostPass()` re-draws every thread and every bead of the whole sheet at
alpha 60–80 — high coverage, not a detail. So I promoted it to a family and gave
the control slot to a finish-texture cell instead.

It does not read. Coverage was the right question and I got the answer wrong by
looking at the wrong number: the ghost's *area* is the whole sheet, but its
*contrast against what it sits next to* is nearly nil — it is `GHOST`
`[201, 193, 179]` on `PAPER` `[243, 238, 228]`, a difference of about 40 levels,
under a black-on-paper image. Moving a mark that is barely visible does not
become visible by moving it further.

> The coverage rule needs its second half stated: **coverage × contrast**. A
> knob painting 100 % of the frame at 15 % contrast is seasoning exactly like a
> knob painting 3 % at full contrast.

Misregistration ×8 is now 4 for 4 as a non-reader. Reuse it, and stop arguing
with it.

### `tone-grad`, the other miss

Dropping the noise from the bead field leaves a pure corner-to-corner ramp. It
changes every bead's radius, so I expected it to read. It does not: the term it
replaced was already 58 % of a field whose whole output range only moves bead
radius between about 0.55× and 1.4×. Same lesson — a knob every mark consults,
whose *output range* is narrow, is still seasoning.

### `bead-lock` — §5b works here, where it failed last time

Pass 4's aliasing cell (`phase-lock`) failed because the piece carried ±35 % of a
cell of per-mark angular jitter, which pre-filters lattice structure away. Pass
5 checked for that jitter first: beads carry `random(-5, 5)` of position jitter
against a pitch of 136, about ±4 %. Far too small to defend, so the lock should
work — and it does. Driving the arc pitch to roughly a quarter of the arc per
period pulls beads onto the wave's vertices and the rows resolve into a regular
alternation that the delivered pitch never shows.

That is the §5d check paying off in the positive direction on its first use:
**measure the jitter against the pitch before you spend the cell, and you know
which way the answer will go.**

### The cheap dark ground

Inverting this piece cost six patches and produced the strongest cell, with none
of the collateral damage pass 4 hit. The reason is structural and worth carrying
forward: this sketch routes ink through five named `{base, hi, skip}` sets, so
swapping `PAPER` and `INK` swaps most of the plate automatically — only the
three literal `hi`/`skip` triples and `mottlePaper()`'s tint table had to be
touched by hand. Lunar Census had the same idea spread across a dozen bare
literals, which is why its dark ground quietly dropped the halftone shadow and
the frame.

> Where a sketch has already named its ink *roles*, the ground is a cheap
> parameter. Where it has not, budget for finding every grey by hand.

---

## 3. What this means for an engine (§6)

1. **The band is the piece's loudest parameter** and should be a list, not a
   pair: `[{i0, i1, pad, invert}]`, so zero, one or two bands are reachable.
2. **Both lattices are free**, and the along-row one should be expressed as a
   *ratio* to the arc length per period rather than as a raw pitch, so the
   locking band found in `bead-lock` is reachable on purpose rather than by
   accident.
3. **The waveform is a mode**: triangle / square / sine, with `amp` and `period`
   as free numbers spanning both extremes the study rendered.
4. **The ink sets are the palette**, and swapping `PAPER`/`INK` is nearly the
   whole dark-ground story. Keep the `{base, hi, skip}` shape.
5. **The furniture must follow the row count** — see below. This is not
   optional; it is what makes `ROWS_N` a parameter at all.

### The trap this piece added

`rows-few` first rendered as a striking minimal composition: three rows and a
clean black band. It was broken. `drawBand()` re-stamps the covered rows by
hardcoded index — `rows[4]`, `rows[6]`, `rows[5]` — and with five rows `rows[5]`
is `undefined`, so `draw()` threw where it stood and every later pass (the eye,
the seam, the repairs, the frame, the grain) never ran. Four more functions
carry their own row-index tables: `drawRepairs` (up to row 9), `frenchKnots`,
`drawStrays`. Five functions pin the furniture to a row count of eleven.

What makes it worth writing down is how well it hides:

- the **match-count assert** passes — every anchor matched exactly once;
- the **distinct-hash check** passes — a partial frame is certainly distinct;
- the image **looks deliberate**, because these sketches draw structure early
  and furniture late, so what survives an exception is the clean composition;
- and `render.mjs` **does** catch it — `page.on("pageerror")` records it and
  `variations.mjs` prints it beside the cell. I piped the run through `tail -8`
  and never saw the line.

Two rules out of that: **grep the study output for errors rather than reading
its tail**, and treat a bold structural variant as guilty until you have checked
what indexes off it.
