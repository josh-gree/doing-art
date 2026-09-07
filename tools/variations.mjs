#!/usr/bin/env node
// Run a patch-based variation study over an artgarten project and lay the
// results out as labelled contact sheets.
//
//   node tools/variations.mjs --project DIR --variants FILE [options]
//
// Options:
//   --project DIR     the project directory (must contain index.html, sketch.js)
//   --variants FILE   an ES module default-exporting the variant list
//   --px PX           size each variant is rendered at (default 620)
//   --sheet-px PX     cell size on the sheet (default 300 — the boldness test)
//   --cols N          columns in the sheet (default 5)
//   --rows N          rows per sheet; the study splits across sheets as needed
//   --out DIR         where sheets and per-variant PNGs go (default out/)
//   --only IDS        comma-separated variant ids to render (default: all)
//   --timeout MS      per-render timeout (default 180000)
//
// The variants file default-exports an array of:
//   { id, desc, file?, control?, reps: [[find, replace], ...] }
// `file` defaults to "sketch.js". A variant with no `reps` renders the project
// untouched — that is the baseline cell. Mark your predicted-invisible cell
// `control: true` and it is drawn with a distinct frame.

import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { launchBrowser } from "./render.mjs";
import { parseFlags, requireOpts } from "./lib/args.mjs";
import { applyReps } from "./lib/patch.mjs";
import { renderBatch, distinctCount } from "./lib/batch.mjs";
import { composeSheets, writeSheets } from "./lib/sheet.mjs";

const USAGE =
  "usage: variations.mjs --project DIR --variants FILE [--px 620] [--sheet-px 300] [--cols 5] [--rows N] [--out out] [--only ids] [--timeout ms]";

const SPEC = {
  project: { type: "string", default: "" },
  variants: { type: "string", default: "" },
  px: { type: "number", default: 620 },
  "sheet-px": { type: "number", default: 300 },
  cols: { type: "number", default: 5 },
  rows: { type: "number", default: 0 },
  out: { type: "string", default: "out" },
  only: { type: "list", default: null },
  timeout: { type: "number", default: 180000 },
};

// Build a patched copy of the project in a temp dir. The original is never
// touched: it is the reference render and the provenance.
function prepareVariant(project, variant) {
  return async () => {
    const work = await mkdtemp(join(tmpdir(), "variation-"));
    await cp(project, work, { recursive: true, filter: (src) => !src.endsWith(".png") });
    const target = join(work, variant.file ?? "sketch.js");
    await writeFile(target, applyReps(await readFile(target, "utf8"), variant.reps, variant.id));
    return { dir: work, cleanup: () => rm(work, { recursive: true, force: true }) };
  };
}

async function main() {
  const opts = parseFlags(process.argv.slice(2), SPEC, USAGE);
  requireOpts(opts, ["project", "variants"]);
  const project = resolve(opts.project);
  const outDir = resolve(opts.out);
  const cellDir = join(outDir, "variants");
  await mkdir(cellDir, { recursive: true });

  const mod = await import(pathToFileURL(resolve(opts.variants)).href);
  let variants = mod.default;
  if (!Array.isArray(variants)) throw new Error("the variants file must default-export an array");
  if (opts.only) variants = variants.filter((v) => opts.only.includes(v.id));
  if (variants.length === 0) throw new Error("no variants selected");

  const jobs = variants.map((v) => ({
    id: v.id,
    ...(v.reps && v.reps.length ? { prepare: prepareVariant(project, v) } : { dir: project }),
  }));

  const browser = await launchBrowser();
  const cells = [];
  try {
    const results = await renderBatch(jobs, {
      browser,
      width: opts.px,
      timeout: opts.timeout,
      onResult: async ({ job, png, failures, ms }) => {
        const v = variants.find((x) => x.id === job.id);
        await writeFile(join(cellDir, `${job.id}.png`), png);
        cells.push({
          png,
          label: job.id,
          sublabel: v.desc ?? "",
          accent: v.control ? "control" : !v.reps || v.reps.length === 0 ? "baseline" : "default",
        });
        const note = failures.length ? ` (${failures.length} resource problem(s))` : "";
        console.log(`  ${job.id.padEnd(16)} ${(ms / 1000).toFixed(1)}s${note}`);
        for (const f of failures.slice(0, 3)) console.warn(`      ! ${f}`);
      },
    });

    // A patch can apply and still change nothing visible; the assert cannot see
    // that, but identical frames can.
    const distinct = distinctCount(results.map((r) => r.png));
    console.log(`\n${distinct} distinct frames of ${results.length}`);
    if (distinct !== results.length) {
      console.warn("  ! some variants rendered identically — a family that is not a family");
    }

    const title = `${basename(project)} — variation study`;
    for (const [px, base, label] of [
      [opts.px, "families", "full size"],
      [opts.sheetPx, "families-thumb", "thumbnails — if you cannot name the difference in one second, it is not a family"],
    ]) {
      if (!px) continue;
      const sheets = await composeSheets(browser, cells, {
        px,
        cols: opts.cols,
        rows: opts.rows,
        title: `${title} (${px}px: ${label})`,
      });
      for (const w of await writeSheets(sheets, outDir, base)) {
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
