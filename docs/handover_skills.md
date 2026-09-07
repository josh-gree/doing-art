# Handover: turning a one-off art zip into a seeded generative program

Notes for the next agent. Written after doing it once, end to end, on an
artgarten `project.zip` (p5.js, one fixed 3000×3000 piece → a system where any
seed yields a new piece). Read this before you start; most of it is things I
got wrong first.

Second pass (Oxide Fault Weave) took it through §5 and folded the corrections
back in. Third pass (Tidepress Plate, `projects/tidepress-plate/`) got 11 of
13 variants to read at thumbnail size and sharpened §5 into something you can
derive rather than guess. Fourth pass (Lunar Census, Plate IV,
`projects/lunar-census/`) got 12 of 15, went the whole way to a committed
batch, and contributed three things: §4a (build the engine BY patching, do not
retype it), §5d (the jitter that eats your aliasing family), and the finding
that ground and mark-darkness are one choice rather than two (§8). Corrections
Fifth pass (Madder Meridian, `projects/madder-meridian/`) got **14 of 17**,
the best rate so far, went to a committed batch, and **retracted one of pass 4's
rules** — see §1. Corrections are marked **[pass 2]** / **[pass 3]** /
**[pass 4]** / **[pass 5]** where they contradict or sharpen the original.

The shape of the job is always the same:

```
zip → render loop → read the sketch as a pipeline → cheap variation study
    → judge what actually reads → re-cut as CFG-driven engine → seeded sampler
    → guardrails → contact-sheet verification
```

**If you read nothing else** — the four things that decide whether this goes well,
all of them established the hard way:

1. §0 — the tools exist. Intake and rendering are solved; do not rebuild them.
2. §5a — derive the families from the code (field / sampler / gate / ground),
   never from a menu. This is the difference between 1-of-5 and 11-of-13 reading.
3. §5 — a knob under ~10 % frame coverage is seasoning, however important its
   name sounds. Reject those before they cost a render.
4. §4 — assert that every patch matches exactly once, then `md5sum` the cells.
   A study that silently rendered the baseline fourteen times looks exactly like
   a study that worked.

---

## 0. Quickstart — zip to contact sheet **[pass 3]**

Four commands and one act of reading. If you are more than ten minutes from the
first sheet, you have gone off the path — and the reading is the only step that
should take any of those minutes.

```bash
npm install playwright-core --no-save          # not vendored; render.mjs needs it
tools/import-project.sh --project-url "<zip>"  # unzip + commit + render + commit
cd <project> && grep -n 'Math.random' sketch.js && grep -n '^function ' sketch.js
# read sketch.js, write projects/<slug>/variants.mjs  ← the only real thinking
node tools/variations.mjs --project projects/<slug>/artgarten --variants projects/<slug>/variants.mjs \
  --px 620 --sheet-px 300 --cols 5 --out out
```

The tools are done. Do not rebuild them:

| you need | use | notes |
|---|---|---|
| intake | `tools/import-project.sh --project-url <zip>` | downloads, unzips, commits the files, renders, commits the PNG — §1 and the first render in one command |
| one render | `node tools/render.mjs <dir> [--width PX]` | canvas capture, external fetches proxied through curl, ~2 s |
| a batch | `import { renderBatch } from "./lib/batch.mjs"` | one browser for the whole batch, per-frame callback, temp-dir jobs |
| a variation study | `node tools/variations.mjs --project DIR --variants FILE --px 620 --sheet-px 300 --cols 5` | patches with a hard match-count assert, renders, writes `families.png` + `families-thumb.png`, reports distinct-frame count |
| a seeded batch | `node tools/sample.mjs --project generative --count 100 --px 500 --sheet --cols 5 --rows 10` | derives seeds from a master seed, writes frames + `recipes.json` + sheets |
| a sheet, again | `node tools/resheet.mjs --dir seeds --px 300 --cols 5 --rows 10` | rebuilds sheets from PNGs on disk — **never re-render to change a sheet** |

`projects/tidepress-plate/` is a worked example of the output: `variants.mjs`
(the study, with the anchor tricks), `ANALYSIS.md` (the §3/§5 write-up), the
300 px sheet. `generative/` + `SEEDS.md` are the §6–§8 end of the job.

### The shared library **[pass 3]**

`tools/lib/` is the reusable half. Build a new CLI out of these rather than
copying an existing one — the two CLIs that grew independently ended up with
126 lines of near-identical sheet code between them before this was factored out.

| module | exports | use it for |
|---|---|---|
| `lib/batch.mjs` | `renderBatch(jobs, {browser, width, timeout, onResult})`, `distinctCount(pngs)` | anything that renders more than one frame. Jobs are `{id, dir \| prepare, query, probe}`: `prepare` builds a temp copy (patched variants), `query` feeds a seeded page its seed, `probe` is a JS expression evaluated in the page so a frame can hand back its recipe. Treats "no canvas" as an error. |
| `lib/sheet.mjs` | `composeSheet`, `composeSheets`, `cellsFromDir`, `writeSheets`, `ACCENTS` | labelled contact sheets. Cells are `{png, label, sublabel, accent}` where accent is `default` / `baseline` / `control`. `composeSheets` splits a long batch across sheets; `cellsFromDir` reads frames back off disk. |
| `lib/patch.mjs` | `applyReps`, `countMatches`, `checkAnchors` | exact-string patching with the match-count assert. `checkAnchors(source, {name: anchor})` is the `grep -c` preflight in code — run it on your whole anchor set before you write a single variant. |
| `lib/args.mjs` | `parseFlags(argv, spec, usage)`, `requireOpts` | flag parsing. `--sheet-px 300` arrives as `opts.sheetPx`; unknown flags throw instead of being ignored. |

Three rules these encode, all of them paid for:

1. **Cell size is independent of render size.** `--px` is what you render at,
   `--sheet-px` is the cell on the sheet. A sheet at full render size is
   redundant with the frames beside it and too big to commit.
2. **Changing a sheet never costs a re-render.** `tools/resheet.mjs` rebuilds
   from disk in seconds. Not having this once cost a batch of 100 frames.
3. **Never clear an output directory in the same command that refills it.**
   Render to a new directory and swap. An interrupted `rm -rf out/x && node …`
   leaves you with neither.

**[pass 3] Two bits of setup friction, in this order or you lose a cycle.**
`import-project.sh` refuses a dirty tree, and `npm install` creates
`node_modules/`. `.gitignore` already covers it — but if you are working
somewhere else, ignore before you install. And `playwright-core` is not
vendored, so install it first; `render.mjs` fails at import otherwise.

Budget, measured over three passes: intake ~30 s, one 3000² render ~2 s, a
14-cell study **including both sheets, 32 s**. Renders are flat in cost — pass 3
varied the dot count 68× (16² to 132² lattice) and every cell still took 1.8–2.1 s.
Chromium startup and draw-call count dominate; pixels and parameter values do
not. **Never budget more time for the dense variants, and never trim a study to
save render time — you are trading the only thing that makes the job work for
seconds.**

---

## 1. Intake

```bash
tools/import-project.sh --project-url "<url>"
```

Expect roughly: `index.html`, `core.js` (canvas setup), `sketch.js` (the piece),
`README.md`. Read **all** of it before touching anything, including the HTML —
that is where you learn the p5 version and that it comes from a CDN.

Facts worth extracting immediately:

- canvas size (3000² here) and `pixelDensity(1)` / `noLoop()` — one static frame
- p5 **global mode**: `setup`/`draw` are bare globals, auto-started on window
  `load`. A script injected *after* load will not start anything.
- hardcoded seeds (`randomSeed`/`noiseSeed`) — the piece is deterministic
  already, which is your friend.

**[pass 2]** Three greps, before you read anything closely — each one has saved
or cost a cycle:

```bash
grep -n 'Math.random' sketch.js      # every hit breaks seed reproducibility later
grep -c 'PAPER' sketch.js            # is that constant actually load-bearing?
grep -n '^function ' sketch.js       # the pipeline, in draw order
```

The middle one matters more than it looks. In Oxide Fault Weave the ground is
*not* `PAPER`: `paperBase()` paints the sheet from literals inside a pixel loop
and `PAPER` only tints a few small marks, so the obvious "dark paper" variant
rendered as a no-op. A constant with a promising name and four usages is not a
knob. Count the usages and look at where they land before you build a family on
one.

**[pass 4] Fourth piece, fourth time.** Lunar Census names `PAPER` at the top of
the file and uses it six times, every one of them tinting a *mark* — census
highlights and the ring erosion specks. The sheet is
`var v = 228 + n1 * 26 + n2 * 11 + …` inside `drawPaper()`'s pixel loop.

**[pass 5] RETRACTED — and this is the more useful lesson of the two.** Pass 4
turned four hits into a law: *"the named palette constant is a decoy every
single time."* Madder Meridian's fifth line is
`background(PAPER[0], PAPER[1], PAPER[2])`. `PAPER` has 17 usages and one of
them is the ground.

The original rule was already right and the strong form added nothing but a way
to be wrong: **count the usages and look at where they land.** That is one grep
and it answers the question either way, in either direction, in a second. Four
consecutive confirmations of a guess is not evidence that the guess replaces the
check — it is exactly when you stop running the check and start being wrong.
Whenever you are tempted to promote a streak in these notes into a law, don't;
write down the check that produced the streak instead.

**[pass 3] This is not a quirk of one sketch — expect it every time.** Tidepress
Plate had exactly the same trap, in a sketch written by a different model months
apart: `drawPaper()` paints from `let v = 230 + n1*18 + …` inside a pixel loop,
while `PAPER` (2 usages) tints erode specks and highlight strokes. These sketches
are generated, and the generator likes naming a palette constant and then not
using it for the ground. Assume the ground is literals until you have found the
line that paints it.

**[pass 3] The `Math.random` grep has a fast path.** Zero hits means the piece is
already reproducible and §9's determinism work costs you nothing — note it and
move on. Both pieces that had hits had them in a finishing pass, where they look
harmless.

**[pass 3] One more grep, and it is the cheapest insurance in the file.** Before
you write any variant, check that the string you intend to anchor on is unique:

```bash
grep -c 'const N = 48,' sketch.js     # → 2.  It is in halftone() AND gridGhost().
```

Tidepress Plate's lattice constant appears in two functions with identical
indentation. Anchoring on it patches both, silently, and the study is then a lie
in a direction you will not notice. Every anchor gets a `grep -c` before it goes
in the variants file; `variations.mjs` will throw if you get it wrong, but the
grep tells you *why* in one second instead of by bisection.

## 2. Build a render loop before you change one line

You cannot design what you cannot see, and every later step is "render 16
things and look at them". **[pass 2]** `tools/render.mjs` is that loop; the
notes below are why it is shaped the way it is, and what to check if you have to
build one somewhere else.

- Chromium is at `/opt/pw-browsers/chromium-*/chrome-linux/chrome`. Install
  `playwright-core` (not `playwright` — no browser download needed) and pass
  `executablePath`.
- **Do not use `chrome --headless --screenshot`.** It pads/clips the viewport:
  I silently lost the bottom ~3% of the frame (the lower registration marks
  were missing) and only caught it by cropping the output to inspect it.
- Capture the canvas itself:
  ```js
  await page.waitForFunction(() => document.querySelector('#sketch canvas')?.width === 3000);
  await page.waitForTimeout(2000);                    // draw() is sync, this is slack
  const url = await page.evaluate(() => document.querySelector('#sketch canvas').toDataURL('image/png'));
  ```
- Downscale **in the page** with a second canvas + `drawImage` (high quality).
  There is no PIL, no ImageMagick, and the ffmpeg shipped with Playwright
  cannot decode PNG. A 3000² PNG is ~20 MB; a 1000 px preview is ~1.5 MB.
- **[pass 2] The CDN does not work through the proxy for Chromium.** curl fetches
  `cdn.jsdelivr.net` fine; Chromium's tunnel to it is reset mid-handshake
  (`ERR_CONNECTION_RESET`, proxy log: `ws_closed_mid_exchange`). The failure is
  silent in the render — p5 never loads, no canvas is created, and a screenshot
  fallback hands you a blank sheet that looks like a page-load problem. Two
  fixes: vendor `p5.min.js` next to the sketch (touches the project), or
  intercept the request and fulfil it from curl (`page.route` + a disk cache,
  which is what `render.mjs` does — nothing to vendor, offline after the first
  fetch). Either way, **fail loudly**: log `requestfailed` and `pageerror`, and
  treat "no canvas" as an error, not as a reason to screenshot the page.
- Reuse **one browser, one page per render**. **[pass 2]** Measured on a much
  heavier sketch than the first: ~3 s per 3000² frame, and *flat* — a 5× denser
  dot lattice cost nothing extra. These sketches are bound by draw calls and by
  Chromium startup, not by pixels or by parameter values, so do not bother
  budgeting more time for the dense variants.
- **[pass 2]** p5 global mode starts on the window `load` event, so
  `goto(..., {waitUntil: "load"})` can return before `draw()` has run. Do not
  paper over it with a fixed sleep: poll a cheap fingerprint of the canvas (a
  32×32 downscale) until two consecutive probes match. Because `draw()` is
  synchronous it blocks the page's JS thread, so the probe cannot interleave
  with it — the first probe that returns is already the finished frame.

## 3. Read the sketch as a pipeline, not as code

Every piece of this kind decomposes into five layers. Name them, and you have
your parameter families for free:

| layer | in this sketch | what varying it does |
|---|---|---|
| **structure/field** | warped stripe lines built by `buildLines` | the composition |
| **gate/mask** | `blobSD` signed distance, sampled per band segment | the silhouette |
| **ink model** | 2 colours + `blendMode(MULTIPLY)` | the palette, and any *emergent* third colour |
| **ornament** | halftone fans, quad ribbons, dots, wobbly rings | the furniture |
| **finish** | flecks, specks, per-pixel grain, vignette, reg marks | the print condition |

Write down which constants feed which layer before you touch anything — but
write down the **lines**, not the constant names (§1). The comment header of a
good art sketch usually tells you the artistic intent — mine said the overlap
colour "exists as no pigment of its own". That sentence is a design constraint:
*whatever you vary, do not lose the overlap.*

**[pass 3]** This table is the map; §5a is the route. Fill the table in, then go
straight to those four questions — they turn the first three rows into a variants
file mechanically, and they tell you which of rows four and five to skip.

## 4. First variation pass: patch strings, do not refactor

To learn parameter sensitivity, generate variants by exact-string substitution
on the original source, render, and lay them out as contact sheets.

```js
for (const [find, rep] of v.reps) {
  const hits = s.split(find).length - 1;
  if (hits !== 1) throw new Error(`${v.id}: ${hits} matches for ${find}`);  // NON-NEGOTIABLE
  s = s.split(find).join(rep);
}
```

Without that throw you will render the baseline sixteen times and write a
confident summary of variation that does not exist. **[pass 2]** Assert on the
*count*, not just on presence: a bare `0` or `148` matches in a dozen places and
patches all of them at once, which is the same failure wearing a different hat.
Anchor on whole multi-line `const` blocks — they are unique, and a helper that
rebuilds the block from arguments (`pitch(148, 0, 620)`) keeps the variants file
readable:

```js
const PITCH_BLOCK = `const PITCH = 148,\n  AMP = 175,\n  LAM = 620,\n  PH0 = 0.08;`;
```

**[pass 3] When a block is not unique, extend the anchor upward until it is** —
usually as far as the enclosing `function` line, which is always unique:

```js
const LATTICE = `function halftone() {\n  const N = 48,\n    margin = 180;`;
const lattice = (n) => `function halftone() {\n  const N = ${n},\n    margin = 180;`;
```

**[pass 3] One family is often several patches, and that is not a smell.** A
"knob" is semantic, not syntactic. Inverting Tidepress Plate to a dark ground
took five coordinated replacements — the two ground literals inside the pixel
loop, the clamp range, the ink ramp, and both palette constants — because the
sketch spreads one idea across five places. Name each anchor as a `const` at the
top of the variants file and the variant itself stays one readable entry. If you
find yourself dropping a family because it needs four patches, you are about to
throw away one of your bold ones.

`tools/variations.mjs` writes the 300 px sheet from the renders it
already has, so the §5 boldness test below costs no extra time. Ask for it on
the first run.

**[pass 3] Verify the study before you read it.** The assert catches a patch that
missed; it cannot catch a patch that applied and changed nothing visible. One
command:

```bash
md5sum out/variants/*.png | awk '{print $1}' | sort -u | wc -l   # must equal your cell count
```

If the piece is seeded (no `Math.random`, §1), the whole study is deterministic:
re-running it reproduces `families-thumb.png` **byte for byte**. That is a free
end-to-end check on the tooling — run the study twice and `cmp` the sheets. If
they differ, you have an unseeded call to find before §9 becomes impossible.

Contact sheets, never single images: 2×2 or 3×4 grids, dark background,
the variant id and a one-line description under each cell. You need to compare,
and so does the user.

### 4a. Build the engine by patching too, not by retyping **[pass 4]**

§6 says to preserve the helper functions verbatim. The way to actually get that
is to never type them: copy `sketch.js`, then apply the CFG edits with the same
`applyReps` you used for the study. Pass 4's `engine.js` is the original from the
RNG section down, plus a fresh header, plus **34 asserted patches** — so a
helper cannot drift, and an anchor that stops matching (because you edited it
earlier in the same run) throws instead of silently leaving the original
behaviour in a file you will then read as generative.

Two anchors in that run were ambiguous in exactly the §4 way and had to grow:
`var base = th + HALF_PI + tilt;` and the `var th = phase + …` jitter line both
appear identically in `buildCensus()` and `satelliteCensus()`. Extend upward to
the line above, which is unique.

**[pass 5] Cut the original `draw()` off with the body.** It is the last function
in these files, and in JavaScript a later function declaration silently wins over
an earlier one — so a wholesale copy leaves the *original* `draw()` overriding
the new one. It then runs `buildRows()` without ever reading CFG. Pass 5 lost
twenty minutes to it because the symptom was an unrelated-looking
`Cannot read properties of undefined (reading 'length')` from a global the new
`draw()` would have initialised. Slice the body between the first helper and the
`/* main */` marker, not to the end of the file.

Keep the build script in the scratchpad, not the repo: it is a one-shot, and the
committed `engine.js` is the real source from then on.

## 5. Judge boldness honestly — this is where I wasted a cycle

My first five families were: whirl strength, band pitch (±2×), eye placement,
inks, press condition. The user's verdict: *"only one of those is obvious, we
aren't going for subtle."* They were right. Only the palette swap read at
thumbnail size.

The test: **shrink a variant to 300 px and put it next to the baseline. If you
cannot name the difference in one second, it is not a family, it is a finish
tweak.**

Texture knobs (grain, crumble, serration, misregistration, ±20% on any number)
are invisible. What reads:

- **count** — 1 vortex vs 2 vs 3 vs a 3×3 grid of 9
- **geometry** — same bands run as a vortex / concentric rings / radial spokes /
  mirrored 4× into a kaleidoscope
- **scale** — not ±2×, but **40×**: five slabs across the sheet vs 250 hairlines,
  plus a "ramp" that does both in one image
- **gate** — blob vs no gate at all (full-bleed plaid) vs hard diagonal split vs
  checkerboard tiles
- **palette + blend** — including dark paper with `SCREEN`, which inverts the
  entire logic of the piece

Rule of thumb: vary **how many**, **what shape**, **how big**, **what silhouette**,
**what colour**. Everything else is seasoning.

**[pass 2] Which of those five wins is piece-specific — predict it before you
render.** Palette was the only bold family in the first piece. In Oxide Fault
Weave it was the *weakest*: the second plate is a scattered accent at roughly
5 % coverage, so recolouring it changed one ornament and a handful of dots,
while `no-red` and `ink-cyan` were indistinguishable from the baseline at
thumbnail size. **[pass 3]** And in Tidepress Plate it was bold again — the ink
covers the whole plate at alpha 242, so a prussian-blue swap reads across the
room. Three passes, three verdicts: *"palette is a strong family"* is not a fact
about anything. The pre-filter below is the fact; palette is just one place it
gets applied. The cheap pre-filter, done by reading, not rendering:

> **How much of the frame does this knob paint, and at what alpha?** A knob under
> ~10 % coverage is a detail no matter how semantically important it sounds.

And the matching positive rule, which found the strongest family in the piece:

> **The knob read by the most downstream layers is the boldest family — and the
> one most in need of a guardrail.** Find it in the field/tone function, not in
> the drawing code.

Here that was the two Gaussian blooms in `toneField`: tone sets each cell's
radius, and the radius decides whether a cell is printed as ink or as pencil.
Collapsing two blooms into one did not shade the piece differently, it emptied
the figure to pale scribble. One knob, three layers, and the only variant in the
study that produced an outright dud — which is exactly the §8 guardrail arriving
early, for free.

**[pass 2] Put one control in the sheet.** Include a variant you predict will
*not* read (misregistration ×8 was mine). If it reads, your judgement of the
whole sheet is off; if it does not, the sheet has calibrated itself and the
negative results in it are worth reporting. It costs one cell. **[pass 3]**
Misregistration ×8 works as the control on any piece with a ghost pass, and it
has now failed to read twice. Reuse it.

### 5a. Derive the families, do not pick them **[pass 3]**

Passes 1 and 2 chose families from the menu above and got 1-of-5 and 2-of-8 to
read. Pass 3 got **11 of 13** — not because the piece was generous, but because
the families were derived from the code instead of chosen from a list. Four
questions, answered by reading, and the study writes itself:

1. **What is the scalar field?** Find the one function every mark consults —
   `fieldValue`, `toneField`, whatever it is called. It is usually the only
   function returning a single number from `(x, y)`. Its internals are your
   composition families: how many sources feed it, what shape they are
   (radial / linear / tiled), and the wavelength or falloff of each.
2. **What discretizes it?** A lattice, a cell grid, a step size, a band pitch —
   the thing that samples the field into marks. Its resolution is a family on
   its own, and see 5b for the family hiding *between* it and the field.
3. **What gates it?** The `continue` or the signed-distance test that decides
   where marks are allowed. Swap it for `none` / annulus / half / checker and
   you have changed the silhouette, which is the loudest change available.
4. **What paints the ground, and what paints the marks?** Not the constants —
   the lines. Inverting those two is the single boldest edit in the file.

Everything answering "yes" to *does it paint most of the frame at high alpha* is
a family; everything else is seasoning, and you skip it **before** it costs a
cell. Pass 3 discarded a satellite system (~3 % of the frame), a moiré patch
(~1.5 %) and every scratch/fiber/grain count without rendering them. That is
where the 11-of-13 came from — not from better variants, from cheaper rejects.

Then predict a verdict for each cell in writing before you render, and report the
ones you got wrong. Pass 3 called `src-solo` "medium" and it was the weakest
thing in the sheet — the second wave source is capped at 0.44 and gone 1150 px
out, so the coverage rule had already answered it and I had not listened to my
own note. **A knob with a load-bearing name and 10 % coverage will fool you every
time; that is exactly why the rule is written down.**

### 5a-bis. The coverage rule needs its second half **[pass 5]**

§5a's pre-filter asks *how much of the frame does this knob paint, and at what
alpha*. Pass 5 read that as an area question, argued that Madder Meridian's
ghost pass was a family rather than the usual control — it re-draws every thread
and every bead of the whole sheet — promoted it to a cell, and was wrong. It did
not read.

Area was never the whole question:

> **coverage × contrast.** A knob painting 100 % of the frame at 15 % contrast is
> seasoning exactly like a knob painting 3 % at full contrast.

The ghost is `[201, 193, 179]` on `[243, 238, 228]` — about 40 levels apart,
under a black-on-paper image. Moving a mark you can barely see does not make it
visible. The same correction retired a second cell in the same study: dropping
the noise term from the bead-size field changes *every* bead, but the field's
whole output range only moves a bead between 0.55× and 1.4×, so the knob has
full coverage and almost no range.

Two questions, then, before a cell is spent: what fraction of the frame, and how
far does the output actually move against what is next to it.

And the practical consequence: **misregistration ×8 is 4 for 4 as a non-reader.**
Pass 5 bet against that explicitly and lost. Keep reusing it as the control and
stop arguing with it.

### 5b. Look for two scales beating against each other **[pass 3]**

The best image in pass 3 was one nobody could have predicted by reading, and it
came from a family that is not on the menu above.

Tidepress Plate samples a wave field on a 48² lattice. The `wave-tight` variant
was specified as *"dense interference"* — shorten the wavelength, get more rings.
It rendered a clean **six-armed star**. At λ=64 the wave period approaches the
55 px cell pitch, the lattice stops being a renderer and becomes a *sampler*, and
the angular lobe term already in the field beats against it. The output is
aliasing structure, not wave structure — a different family from the one I asked
for, and the strongest cell in the study.

Generalised, and worth a deliberate cell every time:

> **Wherever a periodic field meets a discrete sampler, their ratio is a hidden
> family.** Find the two scales — wavelength vs cell pitch, hatch spacing vs
> step size, band pitch vs sample stride — and put a variant near ratio 1.

Two consequences. In the study, add one cell that deliberately drives the ratio
toward 1; it costs 2 seconds and it is the cell most likely to surprise you. In
the engine (§6), make the **ratio** a first-class parameter rather than the two
scales independently — otherwise the sampler will wander into the aliasing band
by accident and you will read the result as a bug. It is not a bug. It is the
best thing the piece does, and it deserves to be reachable on purpose.

### 5c. Ornament must follow the gate **[pass 3]**

A gate variant changes where marks are allowed. It does not change the *other*
things that restate the silhouette in ink — the rim rings, the plate-tone arc,
a frame drawn to the same radius. Leave those and a full-bleed variant reads as
a broken plate rather than a new one: the ink is still saying "circle" while the
field says "square".

Grep for every drawing call that uses the gate's centre or radius, and patch them
out alongside the gate. In pass 3 that was six lines of rim rings plus one
`plateTone()` call, hoisted into named anchors and reused by both open-gate
variants.

### 5d. Look for the jitter that has already eaten your aliasing family **[pass 4]**

§5b says to put a cell near sampling ratio 1. Pass 4 did, twice, and both cells
under-read — the `phase-lock` cell (kill the per-ring phase increment, expect the
rings to lock into spokes) did not pass the 300 px test at all. The reason was
sitting in the line above the one being patched:

```js
var th = phase + (k / n) * TWO_PI + rndr(-0.5, 0.5) * (TWO_PI / n) * 0.7;
```

±35 % of a cell of per-mark jitter. That is a **pre-emptive anti-aliasing
filter**: it destroys lattice structure before the phase term is ever consulted,
and no amount of tuning the phase gets it back.

> Before building an aliasing family, grep the mark placement for a jitter term
> scaled to the cell pitch. If one exists and is above ~0.25 of a cell, the
> family cannot read until the jitter is part of the variant — patch both, or
> skip the cell.

The positive half is better than the negative one. Once jitter is a *parameter*
rather than a constant, the aliasing band becomes reachable on purpose: pass 4's
sampler draws it from a weighted set and, when it comes out low, locks the phase
increment to something deliberate (0, the golden angle, π/2) instead of leaving
it at an arbitrary drift. Those are the seeds in the batch that comb and spiral
in ways the delivered plate cannot. Same lesson as §5b's ratio: **make the thing
that suppresses the effect a first-class parameter, not just the thing that
causes it.**

**[pass 5] The check works in the other direction too, on its first use.** Before
spending the aliasing cell, pass 5 measured the jitter against the pitch:
`random(-5, 5)` of bead position against a pitch of 136, about ±4 %. Far too
small to defend the lattice, so the lock should work — and it did, producing one
of the strongest cells in the study. Two pieces, two opposite predictions, both
correct, from one grep. Measure the jitter against the pitch and you know which
way the cell will go before you render it.

## 6. Re-cut as a CFG-driven engine (only when string patching runs out)

String patching cannot add a third vortex or change what a band *is*. When you
hit that wall, write `engine.js`: same drawing code, driven entirely by a global
`CFG`. Keep the original `sketch.js` untouched in the repo — it is the reference
render and the provenance.

What to preserve verbatim: the helper functions (`stampField`, `halftone`,
`quadBand`, `ringWob`, the grain/vignette pass). They carry the visual identity.
Copy them; do not "improve" them.

What to generalize, and how:

- **N plates, not two.** `inks: [[r,g,b],…]`, each field carries `ink: <index>`,
  draw plate 0 in `BLEND` and the rest in `MULTIPLY`/`SCREEN`. Per-plate
  `registration: [[dx,dy],…]` gives you real misregistration for free.
- **Gates as signed-distance functions.** `makeGate(g)` returns `(x,y) => d`;
  add `none`, `annulus`, `half`, `checker` alongside `blob`. This one change is
  what makes *silhouette* a free parameter. Binary gates (checker) work fine:
  return ±60 instead of a true distance.
- **Geometry as a mode.** `buildVortex` / `buildRings` / `buildSpokes` all emit
  the same thing — an array of polylines — so the stamping code never changes.
  Kaleidoscope is not a fourth builder: it is the same field stamped four times
  under `scale(±1,±1)` about the centre.
- **Pitch as free numbers** (`wOut/wIn/pulse/pf/jitter/minPitch`) so both
  extremes of the scale axis are reachable.
- **Ornaments as data**: `extras: [{kind:'halftone'|'ribbon'|'dot'|'ring', …}]`.
  Hardcoded ornament positions are the main reason a "generative" version still
  looks like one picture.
- **Finish as params**: fleck/speck counts, grain amount, vignette, marks on/off.

Performance detail that matters: bound the band walk by the gate's bounding box
(`gateBox`). Nine small gated eyes otherwise each walk the whole sheet.

## 7. The seeded sampler

Separate file (`params.js`), one function: `sampleConfig(seed) → CFG`.

- Hash the seed string (`xmur3`) into a PRNG (`mulberry32`). Accept *words*, not
  just numbers — seeds get shared.
- **Every** choice comes from that one stream, including p5's own
  `randomSeed`/`noiseSeed` (draw them from the sampler and store them in CFG).
  One `Math.random()` anywhere and reproducibility is gone.
- Helpers earn their keep: `f(a,b)`, `i(a,b)`, `pick`, `chance(p)`,
  `weighted([[v,w],…])`, `shuffle`.
- Sample **in family order** — inks → count → geometry → gate → scale → placement
  → fields → extras → press. Later stages read earlier choices; that is how
  guardrails get expressed.
- Emit a **recipe** alongside the CFG (`{count, geometry, scale, gate, inks,
  press}` as short strings). Print it under every contact-sheet cell and in the
  page HUD. Without it you cannot tune the sampler, because you cannot tell
  which knob produced the dud.

## 8. Guardrails are the actual product

An unguarded sampler produces mud roughly a third of the time. What was needed
here, all of it learned by looking at bad seeds:

- hairline pitch is only allowed **inside a blob gate, at ≤2 plates** — hairlines
  over a full-bleed sheet are grey mush *and* take minutes to render
- open gates (`none`/`half`/`checker`) get a **pitch floor** (`minPitch ≥ 14`)
- grid/ensemble layouts **force blob gates** and drop the ornament rings
- dark paper restricts the palette pool to sets that survive `SCREEN`
- **[pass 4] ground and mark-darkness are ONE choice, not two.** This is the
  guardrail pass 4 identified and did not apply, and it produced the entire dud
  list: 16 of 100 seeds weak, every one of them a dark ground, no light-ground
  seed weak at all. Two mechanisms, and both are general. First, the shading
  mixes each mark toward a near-black constant at up to 0.85 — legible on bone
  paper, an eraser on a ground of 50. Second, an ornament colour that is a
  restrained overprint on light paper (a crimson dry-brush ring) becomes the
  loudest object on the plate once the marks behind it have faded, so the dark
  seeds also all look like *each other*. Carry a per-ground **shading profile**
  (mix cap, coefficients, alpha floor) and take ornament ink from the palette
  rather than from the ground.
- plate count is clamped to the palette size
- weighted choices, never uniform: `duet` should dominate, `solo` should be rare

**[pass 5] Find every index that is pinned to the delivered value before you call
a count a parameter.** Madder Meridian's row count looked free; five separate
functions index rows by hardcoded number (`rows[4]`, `rows[6]`, `rows[5]` in the
band, plus tables of up to row 9 in the repairs, the knots and the strays). The
five-row variant threw partway through `draw()` and *still rendered*, because
canvas keeps whatever was painted before the exception. See §11 — it is the
nastiest trap in these notes.

Same shape as §5c one level up: §5c says ornament must follow the gate; this says
**every hardcoded index must follow the lattice**. In the engine, the rule that
enforces it is: nothing in `params.js` may name a row, a ring or a cell number.
Generate all of them from the count.

**[pass 5] Express each parameter in the unit that survives the others moving.**
Amplitude in pixels is meaningless when the row pitch is itself sampled — as a
*fraction of the row pitch* it means the same thing at 5 rows and at 30. Same for
bead pitch: as beads-per-wave-period it stays comparable across every waveform
and period the sampler can draw. Most "the sampler produces mud" problems are
really two parameters that are not independent being sampled as if they were,
and the batch of 100 will tell you which pair (pass 5: every under-filled seed
was low amplitude *at a low row count*; either alone was fine).

Prefer clamping a sampled value over re-rolling: re-rolls desynchronise the
stream and make seeds unstable across code changes.

## 9. Verify by looking, in bulk

```bash
node tools/sample.mjs --project generative --count 24 --px 500 --sheet --cols 6
```

Render at least 12 seeds into one labelled sheet and actually look at it.
Target: *no two alike, none broken*. My first pass came out ~8/12 strong,
2 muddy (dense grid × dark palette), 2 chaotic — that is the signal for the next
round of weight tuning, and it is only visible in bulk.

**[pass 3] Report the dud rate; do not quietly re-roll it.** Pass 3's batch of
100 came out at roughly 1 in 10 weak, from two combinations the study had already
warned about in writing (a coarse lattice behind an open gate; a tight
wavelength ratio at full coverage) and that the sampler was not guarded against.
Both are named in the piece's `SEEDS.md`. The dud rate is the number that tells you
whether the sampler is finished — hiding it makes a half-tuned sampler look done,
and the next agent then tunes the wrong thing.

**[pass 3] The recipe under each cell is what makes the batch tunable.** Have the
page publish it (`window.__RECIPE__`) and pull it back with the `probe` option;
`sample.mjs` writes `recipes.json` beside the frames. Without it you can see that
a seed is a dud but not which knob did it.

**[pass 2]** Fix the `Math.random()` calls in the *original* before you get here,
or this check can never pass. They hide in the finishing passes, where they look
harmless: Oxide Fault Weave has one in a per-pixel grain pass (`pixels[i] +=
(Math.random() - 0.5) * amp`), which changes nothing visible and every byte.

Then check determinism explicitly — same seed, two runs, compare hashes:

```bash
node tools/sample.mjs --project generative --seeds abc123 --out out/detA
node tools/sample.mjs --project generative --seeds abc123 --out out/detB
md5sum out/detA/*.png out/detB/*.png    # must match
```

## 10. Ergonomics to ship with it

- `index.html?seed=anything` — no seed given, generate one and **push it into
  the URL** so what you are looking at is always shareable.
- keys: `r` reroll (new seed in URL), `s` `saveCanvas`.
- HUD strip showing seed + recipe.
- CLI with `--seed/--seeds/--count/--start`, `--size` (canvas), `--px` (saved
  size), `--out`, `--sheet`.
- `.gitignore`: `out/`, `*.png`, `node_modules/`, the vendored `p5.min.js`. Rendered PNGs
  are 1.5–20 MB each; do not commit them.

## 11. Traps, collected

- `chrome --screenshot` clips the frame — capture the canvas (§2).
- A missing string in a patch-based variant is a silent no-op — assert (§4).
- p5 global mode starts on `load`; scripts added later never run.
- `blendMode` is global state: wrap per-plate transforms in `push()/pop()` and
  restore `BLEND` before the finishing pass, or the grain multiplies too.
- `noise()` is seeded separately from `random()` — set both.
- Sampling a colour *palette* per plate is not the same as sampling colours: the
  overlap colour is emergent, so curate palettes as sets and let multiply do the
  rest.
- Don't let the sampler kill the piece's premise. If the artist's note says the
  overlap colour is the point, weight placement so plates actually overlap.
- **[pass 2]** Chromium cannot reach the CDN through the sandbox proxy even
  though curl can, and the symptom is a blank sheet rather than an error (§2).
- **[pass 2]** A constant is not a knob until you have counted its usages: the
  ground colour of a piece can be literals inside a pixel loop while the
  invitingly named `PAPER` tints four small marks (§1).
- **[pass 2]** "Semantically central" is not "visually bold". The named feature
  of the piece — its fault seam — did not read at baseline strength, and only
  became a family at 4× (§5).
- **[pass 3]** The same constant name appears in two functions with identical
  indentation (`const N = 48, margin = 180;` in both `halftone()` and
  `gridGhost()`). `grep -c` every anchor before you use it (§1).
- **[pass 3]** A gate variant with the ornament left in place reads as a broken
  plate, not a new silhouette. Patch the rim rings and tone arcs too (§5c).
- **[pass 3]** `import-project.sh` refuses a dirty tree and `npm install` dirties
  it. Ignore `node_modules/` before you install, not after (§0).
- **[pass 3]** A shortened wavelength on a lattice-sampled field does not give
  you more rings — near the cell pitch it gives you aliasing structure, which is
  a different and usually better family (§5b).
- **[pass 3]** The match-count assert cannot catch a patch that applied and
  changed nothing visible. `md5sum` the cells and count unique hashes (§4).
- **[pass 3]** Never write `rm -rf out/x && node …re-render into out/x`. If that
  command is interrupted partway you lose the old batch without getting a new
  one — which cost 84 frames and both sheets once. Render into a fresh directory
  and swap when it succeeds.
- **[pass 5]** ~~The named palette constant is never the ground.~~ Retracted at
  the fifth piece, where `background(PAPER[...])` is the first thing `draw()`
  does. Count the usages (§1).
- **[pass 5]** **A variant that throws mid-`draw()` renders as a partial frame,
  not as an error.** The canvas keeps everything painted before the exception,
  and these sketches draw structure early and furniture late — so what survives
  looks like a *cleaner* composition than the baseline. It passes the
  match-count assert (every anchor matched), it passes the distinct-hash check
  (a partial frame is certainly distinct), and it is genuinely attractive. The
  tooling does catch it: `render.mjs` records `pageerror` and `variations.mjs`
  prints it beside the cell. I piped the run through `tail -8` and never saw it.
  **Grep the study output for errors; never read only its tail:**
  `node tools/variations.mjs … 2>&1 | grep -iE 'error|! |distinct|sheet'`
- **[pass 5]** Copying a sketch body wholesale carries its `draw()` with it, and
  the later declaration wins over your new one, silently (§4a).
- **[pass 4]** A per-mark jitter of ±35 % of a cell pitch silently kills any
  aliasing family you build, and the variant renders as a near-baseline (§5d).
- **[pass 4, fixed in pass 6]** `tools/sample.mjs` used to hardcode
  `require("../generative/rng.js")` to draw its seed strings — so a change to one
  piece's `rng.js` silently moved every other batch's seeds. It now loads
  `tools/lib/rng.cjs`, its own copy. If you change the seed-drawing RNG, every
  committed `recipes.json` stops reproducing; that is the whole point of it
  living next to the sampler.
- **[pass 3]** Backticks in a `git commit -m "…"` message are command
  substitution: a message mentioning `` `query` `` and `` `probe` `` committed
  with those words silently deleted. Write the message to a file and use
  `git commit -F`.

## 12. Layout that worked

**[pass 6] One directory per piece; nothing generated is committed.** Passes 3–5
grew a parallel set of top-level directories per piece — `artgarten-<id>/`,
`generative-<id>/`, `seeds-<id>/`, `analysis/<id>/` — which put four directories
at the root for every piece and 240 MB of PNGs in the history. Pass 6 folded each
piece into `projects/<slug>/` and dropped every rendered image from git.

This retracts the pass 4 rule that said to suffix the directories and never
rename `generative/` and `seeds/`. That rule was right about the collision and
wrong about the fix: the answer is to nest per piece, not to suffix at the root.
Paths inside a piece are now stable no matter how many pieces there are.

```
projects/<slug>/    one piece, named for itself; the id is in its README
  README.md           the piece: what it is, and its artgarten provenance
  artgarten/          original zip contents, untouched — the reference sketch
    index.html, core.js, sketch.js
  generative/       [pass 3] the §6–§8 end: the piece as a seeded engine
    index.html        seed from URL, HUD, reroll/save keys
    rng.js            xmur3 + mulberry32 + helpers
    params.js         sampleConfig(seed) → CFG   ← the taste lives here
    engine.js         CFG-driven renderer        ← the drawing lives here
  ANALYSIS.md       [pass 2] the §3 pipeline read and the §5 verdict
  variants.mjs      [pass 2] the patch families the study renders
  SEEDS.md          [pass 3] how to regenerate the batch, and the known duds
  recipes.json      [pass 3] what each seed sampled — the tuning record
tools/
  import-project.sh [pass 2] zip URL → projects/<slug>/artgarten, committed
  render.mjs        one render; `query` + `probe` for seeded pages
  variations.mjs    [pass 3] patch study → labelled contact sheets
  sample.mjs        [pass 3] seeded batch → frames + recipes + sheets
  resheet.mjs       [pass 3] rebuild sheets from disk, no re-render
  lib/              [pass 3] the reusable half — build new CLIs from these
    args.mjs          flag parsing
    batch.mjs         renderBatch, distinctCount
    patch.mjs         applyReps, checkAnchors
    sheet.mjs         composeSheet(s), cellsFromDir, writeSheets
    rng.cjs         [pass 6] the sampler's own copy of rng.js
docs/handover_skills.md   this file
justfile            [pass 6] every render, on demand
out/                gitignored — ALL generated images live here
  <slug>/render.png       the reference render
  <slug>/study/           the variation study's cells and sheets
  <slug>/seeds/           the batch: frames, recipes.json, contact sheets
```

**[pass 6] Commit no images at all; commit the command instead.** Passes 2–3
committed sheets "at thumbnail size" so `ANALYSIS.md` would render on GitHub.
Three pieces in, that convention had put 312 PNGs and 240 MB into the history
for a repo whose actual source is under 2 MB. Every one of those images is
reproducible from a seeded command, so the recipe is the deliverable and the
image is a cache. `recipes.json` and `SEEDS.md` are what make that true — they
record the master seed and what each seed sampled, so `just seeds <slug>` brings
the exact batch back rather than a fresh sample.

The cost is that the write-ups no longer show their sheets inline on GitHub.
That is the trade: a clone is 2 MB instead of 462 MB, and anyone who wants the
picture runs one command.

The split that matters: **`params.js` is judgement, `engine.js` is capability.**
Tuning the output should almost never mean editing the engine.
