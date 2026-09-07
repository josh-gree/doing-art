// Render a list of jobs through one browser.
//
// Launching Chromium costs more than a render does, so a batch shares one
// browser and opens a page per frame. Measured across three projects: ~2 s per
// 3000² frame, and flat — a 68× range in mark count did not move it. Budget by
// frame count, never by how heavy a variant looks.

import { renderProject } from "../render.mjs";

// jobs: [{ id, dir?, prepare?, query?, probe? }]
//   dir      — a project directory to render as-is
//   prepare  — async () => { dir, cleanup? }, for jobs that build a temp copy
//   query    — query string for index.html (a seeded page reads its seed here)
//   probe    — JS expression evaluated in the page, returned as `probed`
//
// onResult({ job, png, probed, failures, ms, index, total }) is called per frame
// so callers can stream progress instead of waiting for the whole batch.
export async function renderBatch(jobs, { browser, width = 500, timeout = 180000, onResult } = {}) {
  const results = [];
  for (let n = 0; n < jobs.length; n++) {
    const job = jobs[n];
    const t0 = Date.now();
    let dir = job.dir;
    let cleanup = null;
    if (job.prepare) ({ dir, cleanup } = await job.prepare());
    try {
      const { png, hasCanvas, failures, probed } = await renderProject(dir, {
        width,
        timeout,
        browser,
        query: job.query ?? "",
        probe: job.probe ?? null,
      });
      // "No canvas" means the sketch never drew. Treat it as an error: the
      // screenshot fallback hands you a blank sheet that looks like a page-load
      // problem, and a blank frame in a study is worse than a crash.
      if (!hasCanvas) throw new Error(`${job.id}: no canvas — the sketch never drew`);
      const result = { job, png, probed, failures, ms: Date.now() - t0, index: n, total: jobs.length };
      results.push(result);
      if (onResult) await onResult(result);
    } finally {
      if (cleanup) await cleanup();
    }
  }
  return results;
}

// The assert catches a patch that missed; it cannot catch a patch that applied
// and changed nothing visible. Hash the frames and count the distinct ones.
export function distinctCount(pngs) {
  const seen = new Set();
  for (const png of pngs) seen.add(hash(png));
  return seen.size;
}

function hash(buf) {
  // FNV-1a over the bytes: enough to tell frames apart, and avoids pulling in
  // node:crypto for a sanity check.
  let h = 0x811c9dc5;
  for (let i = 0; i < buf.length; i++) {
    h ^= buf[i];
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
