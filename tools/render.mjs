#!/usr/bin/env node
// Render a project directory's index.html to a PNG.
//
//   node tools/render.mjs <project-dir> [--out FILE] [--width PX] [--timeout MS]
//
// The directory is served over a throwaway localhost HTTP server (so the page
// behaves as it would on a real host) and opened in Chromium. Requests the page
// makes to the outside world (p5.js from a CDN, say) are fetched with curl and
// handed back to the browser, then cached on disk: Chromium does not always get
// on with the sandbox's egress proxy, and a cached fetch also makes re-renders
// repeatable and quick. If the page draws
// into a <canvas> — as every artgarten sketch does — the PNG is read straight
// off the canvas at its full pixel dimensions, which is sharper and more
// faithful than photographing the scaled-down on-screen element. Pages without
// a canvas fall back to a full-page screenshot.

import { execFile, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { extname, join, resolve, basename } from "node:path";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const require = createRequire(import.meta.url);

// playwright may be installed globally rather than next to this script. Loaded
// lazily so that --help, and every code path that never opens a browser, work
// without it — and so a missing install says so instead of throwing MODULE_NOT_FOUND.
function loadPlaywright() {
  try {
    return require("playwright");
  } catch {}
  try {
    const globalRoot = execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim();
    return require(join(globalRoot, "playwright"));
  } catch {}
  throw new Error("playwright is not installed — run `just setup`");
}

function parseArgs(argv) {
  const opts = {
    dir: null,
    out: null,
    width: 1500, // 0 renders the canvas at its full pixel size
    timeout: 60000,
    cache: DEFAULT_CACHE_DIR,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--out") opts.out = argv[++i];
    else if (arg === "--width") opts.width = Number(argv[++i]);
    else if (arg === "--timeout") opts.timeout = Number(argv[++i]);
    else if (arg === "--cache") opts.cache = argv[++i];
    else if (arg === "-h" || arg === "--help") {
      console.log("usage: render.mjs <project-dir> [--out FILE] [--width PX] [--timeout MS] [--cache DIR]");
      process.exit(0);
    } else if (arg.startsWith("-")) throw new Error(`unknown option: ${arg}`);
    else if (opts.dir === null) opts.dir = arg;
    else throw new Error(`unexpected argument: ${arg}`);
  }
  if (!opts.dir) {
    throw new Error("usage: render.mjs <project-dir> [--out FILE] [--width PX] [--timeout MS] [--cache DIR]");
  }
  opts.dir = resolve(opts.dir);
  opts.out ??= join(opts.dir, "render.png");
  return opts;
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

async function serve(root) {
  const server = createServer(async (req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const filePath = resolve(join(root, urlPath === "/" ? "/index.html" : urlPath));
    // Never serve anything outside the project directory.
    if (filePath !== root && !filePath.startsWith(root + "/")) {
      res.writeHead(403).end("forbidden");
      return;
    }
    try {
      const body = await readFile(filePath);
      res.writeHead(200, { "content-type": MIME[extname(filePath).toLowerCase()] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  return { server, port: server.address().port };
}


// Fetch an external URL with curl (which is set up for the sandbox's proxy and
// CA bundle) and cache the result on disk, keyed by URL.
async function fetchExternal(url, cacheDir) {
  const key = createHash("sha256").update(url).digest("hex").slice(0, 32);
  const bodyPath = join(cacheDir, `${key}.body`);
  const metaPath = join(cacheDir, `${key}.type`);
  const cached = await readFile(bodyPath).catch(() => null);
  if (cached) {
    const contentType = await readFile(metaPath, "utf8").catch(() => "application/octet-stream");
    return { body: cached, contentType };
  }
  await mkdir(cacheDir, { recursive: true });
  const { stdout } = await execFileAsync(
    "curl",
    ["-sSL", "--fail", "--max-time", "60", "-o", bodyPath, "-w", "%{content_type}", url],
    { maxBuffer: 1 << 20 },
  );
  const contentType = stdout.trim() || "application/octet-stream";
  await writeFile(metaPath, contentType);
  return { body: await readFile(bodyPath), contentType };
}

// Wait until the canvas stops changing, so animated sketches are captured in a
// settled state rather than mid-stroke.
async function waitForStableCanvas(page, timeout) {
  return page.evaluate(async (timeoutMs) => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return false;
    const probe = () => {
      // A cheap fingerprint: a small downscale of the canvas, not the full image.
      const c = document.createElement("canvas");
      c.width = 32;
      c.height = 32;
      c.getContext("2d").drawImage(canvas, 0, 0, 32, 32);
      return c.toDataURL();
    };
    const deadline = Date.now() + timeoutMs;
    let previous = null;
    while (Date.now() < deadline) {
      await new Promise((ok) => setTimeout(ok, 400));
      const current = probe();
      if (current === previous) return true;
      previous = current;
    }
    return true;
  }, timeout);
}

export const DEFAULT_CACHE_DIR = process.env.RENDER_CACHE_DIR ?? join(tmpdir(), "artgarten-render-cache");

export async function launchBrowser() {
  const { chromium } = loadPlaywright();
  return chromium.launch();
}

// Render one project directory and hand back the PNG bytes. Callers rendering a
// batch should pass their own `browser` and reuse it — launching Chromium costs
// more than the render does.
// `query` is appended to index.html's URL (a seeded page reads its seed from
// there). `probe` is a JS expression evaluated in the page after the render and
// returned alongside the PNG — how a batch gets each frame's recipe out.
export async function renderProject(dir, { width = 1500, timeout = 60000, cache = DEFAULT_CACHE_DIR, browser, query = "", probe = null } = {}) {
  const root = resolve(dir);
  if (!(await stat(join(root, "index.html")).catch(() => null))) {
    throw new Error(`no index.html in ${root}`);
  }

  const ownBrowser = browser ?? (await launchBrowser());
  const { server, port } = await serve(root);
  const origin = `http://127.0.0.1:${port}`;
  const failures = [];

  try {
    const page = await ownBrowser.newPage({ viewport: { width: 1200, height: 1200 } });
    page.on("requestfailed", (r) => failures.push(`${r.url()} (${r.failure()?.errorText})`));
    page.on("pageerror", (e) => failures.push(`page error: ${e.message}`));

    // Anything not served by our own localhost server goes out through curl.
    await page.route("**/*", async (route) => {
      const url = route.request().url();
      if (url.startsWith(origin) || !/^https?:/i.test(url)) return route.continue();
      try {
        const { body, contentType } = await fetchExternal(url, cache);
        await route.fulfill({ status: 200, contentType, body });
      } catch (err) {
        failures.push(`${url} (${err.message.split("\n")[0]})`);
        await route.abort();
      }
    });

    const qs = query ? (query.startsWith("?") ? query : `?${query}`) : "";
    await page.goto(`${origin}/index.html${qs}`, { waitUntil: "load", timeout });
    const hasCanvas = await page
      .waitForSelector("canvas", { timeout, state: "attached" })
      .then(() => true, () => false);

    let png;
    if (hasCanvas) {
      await waitForStableCanvas(page, timeout);
      const dataUrl = await page.evaluate((targetWidth) => {
        const canvas = document.querySelector("canvas");
        if (!targetWidth || targetWidth >= canvas.width) return canvas.toDataURL("image/png");
        const scaled = document.createElement("canvas");
        scaled.width = targetWidth;
        scaled.height = Math.round((canvas.height / canvas.width) * targetWidth);
        const ctx = scaled.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(canvas, 0, 0, scaled.width, scaled.height);
        return scaled.toDataURL("image/png");
      }, width);
      png = Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
    } else {
      png = await page.screenshot({ fullPage: true });
    }
    const probed = probe ? await page.evaluate(probe) : undefined;
    await page.close();
    return { png, hasCanvas, failures, probed };
  } finally {
    server.close();
    if (!browser) await ownBrowser.close();
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const { png, hasCanvas, failures } = await renderProject(opts.dir, {
    width: opts.width,
    timeout: opts.timeout,
    cache: opts.cache,
  });
  await writeFile(opts.out, png);
  if (failures.length) {
    console.warn(`warning: ${failures.length} resource/page problem(s) while rendering:`);
    for (const f of failures.slice(0, 10)) console.warn(`  - ${f}`);
  }
  console.log(
    `${basename(opts.dir)} -> ${opts.out} (${(png.length / 1024).toFixed(0)} KiB${hasCanvas ? ", from canvas" : ", page screenshot"})`,
  );
}

// Only run the CLI when this file is what node was pointed at.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
