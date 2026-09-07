# Tidepress Plate

A standalone p5.js sketch grown in artgarten.

## Run it

Open `index.html` in a browser. There is nothing to install or build. p5.js loads from a CDN, so it needs a network connection unless the library is cached; the sketch itself is self-contained.

## Change it

Edit `sketch.js`. It defines `draw()` and may define helpers, but must not define `setup()` or call `createCanvas()`: `core.js` owns the 3000x3000 canvas, `pixelDensity(1)`, and `noLoop()` scaffolding. `index.html` scales the canvas for display without changing its pixel dimensions.

If the sketch uses `random()` or `noise()` without corresponding seeds, reopening it may produce a different image. Adding `randomSeed()` or `noiseSeed()` makes future runs repeatable but cannot recover the stored render's original random state.

## Where this came from

- **Individual** `e08f1353-68a4-4249-8de6-b8a2e96d7cab`
- **Garten** `1e389412-50cf-4a75-b061-0846957e8bc2`
- **Operator** crossover
- **Model** stealth/ox-alpha
- **Created** 2026-08-24T21:58:02.793423+00:00
