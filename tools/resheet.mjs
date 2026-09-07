#!/usr/bin/env node
// Rebuild contact sheets from PNGs already on disk — no re-rendering.
//
//   node tools/resheet.mjs --dir seeds --cols 5 --rows 10 --px 300
//
// Options:
//   --dir DIR       directory of rendered frames (NNN_name.png)
//   --out DIR       where to write the sheets (default: --dir)
//   --px PX         cell size (default 300)
//   --cols N        columns per sheet (default 5)
//   --rows N        rows per sheet; 0 = one sheet however tall (default 0)
//   --base NAME     sheet filename stem (default "sheet")
//   --title STR     sheet title
//   --recipes FILE  a recipes.json whose entries caption the cells
//
// Changing a sheet's cell size, columns or split should never cost a re-render.
// It once cost a batch of 100 frames, which is why this exists.

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { launchBrowser } from "./render.mjs";
import { parseFlags, requireOpts } from "./lib/args.mjs";
import { cellsFromDir, composeSheets, writeSheets } from "./lib/sheet.mjs";

const USAGE = "usage: resheet.mjs --dir DIR [--out DIR] [--px 300] [--cols 5] [--rows N] [--base sheet] [--title STR] [--recipes FILE]";

const SPEC = {
  dir: { type: "string", default: "" },
  out: { type: "string", default: "" },
  px: { type: "number", default: 300 },
  cols: { type: "number", default: 5 },
  rows: { type: "number", default: 0 },
  base: { type: "string", default: "sheet" },
  title: { type: "string", default: "" },
  recipes: { type: "string", default: "" },
};

async function main() {
  const opts = parseFlags(process.argv.slice(2), SPEC, USAGE);
  requireOpts(opts, ["dir"]);
  const dir = resolve(opts.dir);
  const outDir = opts.out ? resolve(opts.out) : dir;

  let sublabels = {};
  if (opts.recipes) {
    const data = JSON.parse(await readFile(resolve(opts.recipes), "utf8"));
    for (const r of data.seeds ?? []) {
      sublabels[r.seed] = [r.lattice, r.sources, `λ/pitch ${r.ratio}`, r.gate, r.ink].filter(Boolean).join(" · ");
    }
  }

  const cells = await cellsFromDir(dir, { sublabels });
  if (cells.length === 0) throw new Error(`no NNN_name.png frames found in ${dir}`);

  const browser = await launchBrowser();
  try {
    const sheets = await composeSheets(browser, cells, {
      px: opts.px,
      cols: opts.cols,
      rows: opts.rows,
      title: opts.title || `${cells.length} frames`,
    });
    for (const w of await writeSheets(sheets, outDir, opts.base)) {
      console.log(`sheet -> ${resolve(outDir, w.name)} (${(w.bytes / 1024).toFixed(0)} KiB)`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
