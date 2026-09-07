// Labelled contact sheets.
//
// Contact sheets, never single images: the whole method is comparison, and you
// cannot compare things you have to open one at a time.
//
// Composition happens in the browser because that is the entire available
// toolchain — there is no PIL and no ImageMagick in this sandbox, and the
// ffmpeg that ships with Playwright cannot decode PNG. A canvas, drawImage and
// fillText is all of it.

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const ACCENTS = {
  default: { label: "#e8e6e1", frame: "#3a3d42" },
  baseline: { label: "#ffd479", frame: "#3a3d42" },
  control: { label: "#d6a75a", frame: "#8a6d3b" },
};

// cells: [{ png (Buffer) | src (data URL), label, sublabel, accent }]
// Cell size (`px`) is deliberately independent of the size the frames were
// rendered at: a sheet at full render size is redundant with the frames sitting
// next to it and too big to commit. The sheet's job is the overview.
export async function composeSheet(browser, cells, { px = 300, cols = 5, title = "" } = {}) {
  const payload = cells.map((c) => ({
    src: c.src ?? `data:image/png;base64,${c.png.toString("base64")}`,
    label: c.label ?? "",
    sublabel: c.sublabel ?? "",
    accent: ACCENTS[c.accent] ?? ACCENTS.default,
  }));

  const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
  try {
    const dataUrl = await page.evaluate(
      async ({ cells, px, cols, title }) => {
        const pad = Math.round(px * 0.05);
        const label = Math.round(px * 0.13);
        const head = Math.round(px * 0.16);
        const rows = Math.ceil(cells.length / cols);
        const cw = px + pad;
        const ch = px + label + pad;
        const canvas = document.createElement("canvas");
        canvas.width = pad + cols * cw;
        canvas.height = head + pad + rows * ch;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#15171a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const font = (size, weight) => `${weight} ${size}px ui-sans-serif, system-ui, "DejaVu Sans", sans-serif`;

        if (title) {
          ctx.fillStyle = "#e8e6e1";
          ctx.font = font(Math.round(head * 0.34), 600);
          ctx.textBaseline = "middle";
          ctx.fillText(title, pad, head * 0.55);
        }

        const load = (src) =>
          new Promise((res, rej) => {
            const img = new Image();
            img.onload = () => res(img);
            img.onerror = () => rej(new Error("image decode failed"));
            img.src = src;
          });

        for (let n = 0; n < cells.length; n++) {
          const cell = cells[n];
          const cx = pad + (n % cols) * cw;
          const cy = head + pad + Math.floor(n / cols) * ch;
          ctx.drawImage(await load(cell.src), cx, cy, px, px);
          ctx.strokeStyle = cell.accent.frame;
          ctx.lineWidth = 2;
          ctx.strokeRect(cx + 1, cy + 1, px - 2, px - 2);

          ctx.textBaseline = "alphabetic";
          ctx.fillStyle = cell.accent.label;
          ctx.font = font(Math.round(label * 0.33), 700);
          ctx.fillText(cell.label, cx, cy + px + Math.round(label * 0.38));
          if (cell.sublabel) {
            ctx.fillStyle = "#9aa0a6";
            ctx.font = font(Math.round(label * 0.26), 400);
            // clipped, not wrapped: the cell is the argument, the caption only
            // reminds you which knob moved
            let sub = cell.sublabel;
            while (sub && ctx.measureText(sub).width > px && sub.length > 4) sub = sub.slice(0, -2);
            ctx.fillText(sub, cx, cy + px + Math.round(label * 0.75));
          }
        }
        return canvas.toDataURL("image/png");
      },
      { cells: payload, px, cols, title },
    );
    return Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
  } finally {
    await page.close();
  }
}

// Split a long batch across several sheets. `rows: 0` means one sheet, however
// tall it needs to be.
export async function composeSheets(browser, cells, { px = 300, cols = 5, rows = 0, title = "" } = {}) {
  const perSheet = rows > 0 ? cols * rows : cells.length;
  const total = Math.max(1, Math.ceil(cells.length / perSheet));
  const out = [];
  for (let s = 0; s < total; s++) {
    const slice = cells.slice(s * perSheet, (s + 1) * perSheet);
    const span = total > 1 ? ` — sheet ${s + 1}/${total}, ${s * perSheet}–${s * perSheet + slice.length - 1}` : "";
    out.push({
      index: s + 1,
      total,
      png: await composeSheet(browser, slice, { px, cols, title: `${title}${span}` }),
    });
  }
  return out;
}

// Build cells from PNGs already on disk. Rebuilding a sheet at a different cell
// size should never cost a re-render — that mistake cost a batch of 100 once.
export async function cellsFromDir(dir, { pattern = /^(\d+)[_-](.+)\.png$/, sublabels = {} } = {}) {
  const files = (await readdir(dir)).filter((f) => pattern.test(f)).sort();
  const cells = [];
  for (const file of files) {
    const m = file.match(pattern);
    const label = m[2] ?? file.replace(/\.png$/, "");
    cells.push({ png: await readFile(join(dir, file)), label, sublabel: sublabels[label] ?? "" });
  }
  return cells;
}

export async function writeSheets(sheets, dir, base = "sheet") {
  const written = [];
  for (const s of sheets) {
    const name = s.total > 1 ? `${base}-${s.index}.png` : `${base}.png`;
    await writeFile(join(dir, name), s.png);
    written.push({ name, bytes: s.png.length });
  }
  return written;
}
