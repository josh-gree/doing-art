#!/usr/bin/env node
// Render a batch of seeds from a seeded generative project.
//
//   node tools/sample.mjs --project projects/<slug>/generative --count 100 --px 500 --sheet
//
// Options:
//   --project DIR    the seeded project (index.html reads ?seed=)
//   --count N        how many seeds to draw from the master stream
//   --master STR     master seed the batch is derived from (default "tidepress")
//   --seeds A,B,C    render these exact seeds instead of drawing a batch
//   --px PX          output size (default 500); 0 keeps the canvas's full size
//   --out DIR        output directory (default out/seeds)
//   --sheet          also write labelled contact sheets of the batch
//   --cols N         columns per sheet (default 5)
//   --rows N         rows per sheet; the batch splits across sheets as needed
//   --sheet-px PX    cell size on the sheet (default 300). A sheet at full
//                    render size is redundant with the frames next to it and too
//                    big for git — the sheet's job is the overview. Use
//                    tools/resheet.mjs to change this without re-rendering.
//   --timeout MS     per-render timeout (default 180000)
//
// The batch is DERIVED from --master rather than drawn from Math.random, so the
// same command reproduces the same pieces. "Random sample" and "reproducible"
// are not in tension; giving up the second buys nothing.

import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { launchBrowser } from "./render.mjs";
import { parseFlags, requireOpts } from "./lib/args.mjs";
import { renderBatch } from "./lib/batch.mjs";
import { composeSheets, writeSheets } from "./lib/sheet.mjs";

// Every project's rng.js is the same file; the sampler only needs it to draw
// seed strings, so it loads its own copy rather than reaching into a project.
const require = createRequire(import.meta.url);
const { makeRng } = require("./lib/rng.cjs");

const USAGE =
  "usage: sample.mjs --project DIR [--count N] [--master STR] [--seeds A,B] [--px 500] [--out DIR] [--sheet] [--cols 5] [--rows N] [--sheet-px 300]";

const SPEC = {
  project: { type: "string", default: "" },
  count: { type: "number", default: 12 },
  master: { type: "string", default: "tidepress" },
  seeds: { type: "list", default: null },
  px: { type: "number", default: 500 },
  out: { type: "string", default: "out/seeds" },
  sheet: { type: "boolean", default: false },
  cols: { type: "number", default: 5 },
  rows: { type: "number", default: 0 },
  "sheet-px": { type: "number", default: 300 },
  timeout: { type: "number", default: 180000 },
};

// Seed strings, not seed numbers: seeds get shared, and a word survives being
// pasted into a URL better than a float does.
function drawSeeds(master, count) {
  const { rnd } = makeRng(`batch:${master}`);
  const seen = new Set();
  const out = [];
  while (out.length < count) {
    const s = Math.floor(rnd() * 2176782336).toString(36).padStart(6, "0").slice(0, 6);
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

async function main() {
  const opts = parseFlags(process.argv.slice(2), SPEC, USAGE);
  requireOpts(opts, ["project"]);
  const project = resolve(opts.project);
  const outDir = resolve(opts.out);
  await mkdir(outDir, { recursive: true });

  const seeds = opts.seeds ?? drawSeeds(opts.master, opts.count);
  const jobs = seeds.map((seed) => ({
    id: seed,
    dir: project,
    query: `seed=${encodeURIComponent(seed)}`,
    // The recipe is what makes a batch tunable: without it you cannot tell
    // which knob produced the dud.
    probe: "({ recipe: window.__RECIPE__, cfg: window.__CFG__ && window.__CFG__.recipe })",
  }));

  const browser = await launchBrowser();
  const records = [];
  const cells = [];
  const t0 = Date.now();

  try {
    await renderBatch(jobs, {
      browser,
      width: opts.px,
      timeout: opts.timeout,
      onResult: async ({ job, png, probed, failures, index }) => {
        if (!probed?.recipe) throw new Error(`${job.id}: no recipe — params.js did not run`);
        const name = `${String(index).padStart(3, "0")}_${job.id}.png`;
        await writeFile(join(outDir, name), png);
        records.push({ index, seed: job.id, file: name, ...probed.cfg });
        if (opts.sheet) cells.push({ png, label: job.id, sublabel: probed.recipe });
        console.log(`  ${String(index).padStart(3, "0")} ${job.id}  ${(png.length / 1024).toFixed(0).padStart(4)} KiB  ${probed.recipe}`);
        for (const f of failures.slice(0, 2)) console.warn(`      ! ${f}`);
      },
    });

    await writeFile(
      join(outDir, "recipes.json"),
      JSON.stringify({ master: opts.master, px: opts.px, seeds: records }, null, 2),
    );
    console.log(`\n${seeds.length} seeds in ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${outDir}`);

    if (opts.sheet) {
      const sheets = await composeSheets(browser, cells, {
        px: opts.sheetPx || opts.px,
        cols: opts.cols,
        rows: opts.rows,
        title: `${seeds.length} seeds from master "${opts.master}"`,
      });
      for (const w of await writeSheets(sheets, outDir, "sheet")) {
        console.log(`sheet -> ${join(outDir, w.name)} (${(w.bytes / 1024).toFixed(0)} KiB)`);
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
