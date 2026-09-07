// "Tidepress Plate" — a circular halftone wave-plate: charcoal dots swelling along concentric
// ripples from an off-centre ink bloom, interfered by a second centre, framed by hand-etched
// ink rings, satellite systems and print wear on aged cream paper

const PAPER = [233, 227, 211];
const PAPER_DK = [203, 193, 171];
const INK = [48, 44, 40];
const L1 = 200,
  L2 = 350;

let P1, P2, P3, RC;

function draw() {
  randomSeed(20240607);
  noiseSeed(4242);
  strokeJoin(ROUND);
  strokeCap(ROUND);

  P1 = {
    x: width * 0.46,
    y: height * 0.535
  };
  P2 = {
    x: width * 0.735,
    y: height * 0.295
  };
  P3 = {
    x: width * 0.29,
    y: height * 0.735
  };
  RC = {
    x: width * 0.5,
    y: height * 0.505
  };

  drawPaper();
  blotches();
  fibers();

  gridGhost();
  showThrough(P1.x, P1.y, 140, 16);
  scratches(8);
  plateTone();

  subSystem(P3.x, P3.y, 50, 185, 6, 5.5, 170);

  const accents = buildAccents();
  for (const e of accents) drawElem(e, 18, -13, 0.30); // misregistered ghost pass

  halftone();

  for (const e of accents) drawElem(e, 0, 0, 1);
  scratchesTop(3);

  const rim1 = ringObj(RC.x, RC.y, 1160, 6, 205);
  const rim2 = ringObj(RC.x, RC.y, 1215, 27, 240);
  drawElem(rim1, 14, -10, 0.25);
  drawElem(rim2, 14, -10, 0.25);
  drawElem(rim1, 0, 0, 1);
  drawElem(rim2, 0, 0, 1);

  spatter(P1.x, P1.y);
  darkGrain();
  erode();
  centerAnchor(P1.x, P1.y);
  roughFrame();
  ticks();
  vignette();
}

// ---------- halftone wave field (sketch A's language, driven by sketch B's ripples) ----------

function fieldValue(x, y) {
  const dx1 = x - P1.x,
    dy1 = y - P1.y;
  const d1 = Math.sqrt(dx1 * dx1 + dy1 * dy1),
    a1 = Math.atan2(dy1, dx1);
  const wob = (noise(Math.cos(a1) * 1.3 + 7.3, Math.sin(a1) * 1.3 + 2.1 + d1 * 0.0011) - 0.5) * 2.6;
  const lam1 = L1 * (1 + 0.06 * Math.sin(2 * a1 + 1.3));
  const ph = TWO_PI * d1 / lam1 + wob;
  let w1 = 0.5 + 0.5 * Math.cos(ph);
  w1 = Math.pow(w1, 1.3);
  // crests swell and fade around the circle, so bands are not perfect rings
  w1 *= 1 + 0.30 * Math.sin(2 * a1 + 0.7) + 0.16 * Math.sin(5 * a1 + 2.0);
  w1 = constrain(w1, 0, 1);
  const env1 = constrain(1.28 - d1 / 2250, 0, 1);

  const dx2 = x - P2.x,
    dy2 = y - P2.y;
  const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2),
    a2 = Math.atan2(dy2, dx2);
  const wob2 = (noise(Math.cos(a2) * 1.1 + 17.3, Math.sin(a2) * 1.1 + 8.7 + d2 * 0.0013) - 0.5) * 2.2;
  let w2 = 0.5 + 0.5 * Math.cos(TWO_PI * d2 / L2 + wob2);
  w2 = Math.pow(w2, 1.3);
  const env2 = constrain(1.05 - d2 / 1150, 0, 1) * 0.44;

  const lob = 1 + 0.15 * Math.sin(3 * a1 + 0.9) + 0.08 * Math.sin(5 * a1 + 2.2);
  const bloom = Math.exp(-(d1 * d1) / (2 * 300 * 300)) * lob;
  const rd = segDist(x, y, P1.x, P1.y, P2.x, P2.y);
  const ridge = 0.13 * Math.exp(-(rd * rd) / (2 * 135 * 135));
  const cl = noise(x * 0.0034 + 11, y * 0.0034 + 11);

  return constrain(0.15 + 0.62 * w1 * env1 + w2 * env2 + 0.52 * bloom + ridge + 0.14 * (cl - 0.5), 0.02, 1);
}

function halftone() {
  const N = 48,
    margin = 180;
  const cw = (width - 2 * margin) / N;
  const maxR = cw * 0.82;
  const cells = [];
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = margin + (i + 0.5) * cw,
        y = margin + (j + 0.5) * cw;
      const dRC = Math.sqrt((x - RC.x) * (x - RC.x) + (y - RC.y) * (y - RC.y));
      if (dRC > 1198) continue;
      let t = fieldValue(x, y);
      t *= Math.pow(constrain((1198 - dRC) / 130, 0, 1), 0.75); // soft plate edge
      cells.push({
        x,
        y,
        t
      });
    }
  }
  cells.sort((a, b) => b.t - a.t);
  let idx = 0;
  noStroke();
  for (const c of cells) {
    idx++;
    const fj = 0.80 + 0.40 * noise(idx * 0.91, 5.5);
    const r = maxR * Math.pow(c.t, 0.82) * fj;
    const jx = (noise(idx * 0.37, 7.7) - 0.5) * cw * 0.18;
    const jy = (noise(idx * 0.37, 3.3) - 0.5) * cw * 0.18;
    drawDot(c.x + jx, c.y + jy, r, c.t, idx);
  }
}

function drawDot(x, y, r, t, s) {
  const inkV = 150 - 132 * constrain(t * 1.45, 0, 1);
  const sep = constrain((t - 0.62) / 0.33, 0, 1); // warm umber duotone in dense ink
  const jw = random(-6, 7);
  const R = inkV + 5 + 22 * sep + jw;
  const G = inkV + 2 + 8 * sep + jw * 0.3;
  const bl = inkV - 5 - 14 * sep + jw * 0.5;
  noStroke();

  // misregistration ghost
  const ga = random(TWO_PI),
    gd = 2 + r * 0.07;
  fill(160, 153, 139, 60);
  dotBlob(x + Math.cos(ga) * gd, y + Math.sin(ga) * gd, r * 0.94, s * 2.1 + 31);

  // ink-bleed halo on some mid-size dots
  if (r > 12 && r < 36 && random() < 0.07) {
    noFill();
    stroke(R, G, bl, 26);
    strokeWeight(1.5 + random(1.5));
    circle(x, y, r * 2.5 + random(14));
    noStroke();
  }

  fill(R, G, bl, 242);
  dotBlob(x, y, r, s * 1.7);

  // satellite splatter
  if (r > 8 && random() < 0.18) {
    const n = 1 + floor(random(3));
    for (let k = 0; k < n; k++) {
      const a = random(TWO_PI),
        d = r * (1.05 + random(0.8));
      fill(R, G, bl, 210);
      circle(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.5 + random(3));
    }
  }

  // internal ink grain for large dots
  if (r > 30) {
    const n = floor(r / 4);
    for (let k = 0; k < n; k++) {
      const a = random(TWO_PI),
        d = Math.sqrt(random()) * r * 0.78;
      if (random() < 0.6) fill(228, 222, 206, 24 + random(30));
      else fill(10, 9, 8, 28 + random(32));
      circle(x + Math.cos(a) * d, y + Math.sin(a) * d, 1 + random(2.4));
    }
  }
}

function dotBlob(x, y, r, s) {
  const K = 30;
  beginShape();
  for (let k = 0; k < K; k++) {
    const a = (k / K) * TWO_PI;
    const w = 1 + 0.045 * Math.sin(a * 3 + s) + 0.03 * Math.sin(a * 7 + s * 1.7) + 0.018 * Math.sin(a * 13 + s * 0.6);
    vertex(x + Math.cos(a) * r * w, y + Math.sin(a) * r * w);
  }
  endShape(CLOSE);
}

function segDist(px, py, ax, ay, bx, by) {
  const abx = bx - ax,
    aby = by - ay;
  const apx = px - ax,
    apy = py - ay;
  const len2 = abx * abx + aby * aby;
  let s = (apx * abx + apy * aby) / len2;
  s = constrain(s, 0, 1);
  const cx = ax + abx * s,
    cy = ay + aby * s;
  return Math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy));
}

// ---------- etched line-work (sketch B's language) ----------

function wobbleR(base, t, amp, freq, seed) {
  if (!amp) return base;
  const n1 = noise(Math.cos(t) * freq + seed, Math.sin(t) * freq + seed * 1.7 + 31.7);
  const n2 = noise(Math.cos(t) * freq * 2.7 + seed * 2.3, Math.sin(t) * freq * 2.7 + seed * 3.1 + 17.3);
  return base + (n1 - 0.5) * 2 * amp + (n2 - 0.5) * 2 * amp * 0.35;
}

function blob(cx, cy, baseR, amp, freq, seed, steps) {
  steps = steps || 140;
  beginShape();
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * TWO_PI;
    const rr = wobbleR(baseR, t, amp, freq, seed);
    vertex(cx + Math.cos(t) * rr, cy + Math.sin(t) * rr);
  }
  endShape(CLOSE);
}

function arcPath(e, t0, t1, ox, oy, rOff) {
  noFill();
  const steps = e.steps || 220;
  beginShape();
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const t = t0 + (t1 - t0) * f;
    const rr = wobbleR(e.r + (rOff || 0), t, e.amp, e.freq, e.seed) + (e.drift || 0) * f;
    vertex(e.cx + ox + Math.cos(t) * rr, e.cy + oy + Math.sin(t) * rr);
  }
  endShape();
}

function ringSegs(e, ox, oy, rOff) {
  let segs = [
    [0, TWO_PI]
  ];
  if (e.gaps) {
    segs = [];
    for (const g of e.gaps) segs.push([g[0] + g[1], g[0] + TWO_PI]);
  }
  for (const s of segs) arcPath(e, s[0], s[1], ox, oy, rOff);
}

function ringObj(cx, cy, r, w, alpha, opts = {}) {
  return Object.assign({
    kind: 'ring',
    cx,
    cy,
    r,
    w,
    alpha,
    amp: 5 + r * 0.011 + random(4),
    freq: random(1.5, 4.2),
    seed: random(100),
    steps: max(200, int(r * 0.35)),
    gaps: null
  }, opts);
}

function drawElem(e, ox, oy, aMul) {
  if (e.kind === 'ring') {
    ink(12 * aMul);
    strokeWeight(e.w * 1.9);
    ringSegs(e, ox, oy, 0);
    ink(e.alpha * aMul);
    strokeWeight(e.w);
    ringSegs(e, ox, oy, 0);
    if (e.w >= 18) {
      ink(min(255, e.alpha + 25) * aMul);
      strokeWeight(2.8);
      ringSegs(e, ox, oy, e.w / 2 - 2.5);
      ringSegs(e, ox, oy, -(e.w / 2 - 2.5));
      if (aMul > 0.5) {
        const nStreaks = int(e.w / 14) + 1;
        for (let k = 0; k < nStreaks; k++) {
          paperStroke(random(35, 80));
          strokeWeight(random(1.5, 3.2));
          arcPath(e, 0, TWO_PI * random(0.55, 1), ox, oy, random(-e.w / 2 + 4.5, e.w / 2 - 4.5));
        }
      }
    }
  } else if (e.kind === 'dash') {
    ink(e.alpha * aMul);
    strokeWeight(e.w);
    const t0 = e.t0 !== undefined ? e.t0 : random(0.1);
    const tEnd = e.t1 !== undefined ? e.t1 : TWO_PI;
    let t = t0;
    while (t < tEnd) {
      const len = e.dashLen * random(0.75, 1.25);
      arcPath(e, t, min(t + len, tEnd), ox, oy, 0);
      t += len + e.gapLen * random(0.75, 1.25);
    }
  } else if (e.kind === 'moire') {
    strokeWeight(1.8);
    for (let rr = e.r0; rr <= e.r1; rr += 6) {
      ink(e.alpha * aMul * random(0.7, 1));
      arcPath({
        cx: e.cx,
        cy: e.cy,
        r: rr,
        amp: 3.5,
        freq: 3.1,
        seed: e.seed + rr * 0.013,
        steps: 220
      }, 0, TWO_PI, ox, oy, 0);
    }
  } else if (e.kind === 'hatchArc') {
    ink(e.alpha * aMul);
    strokeWeight(2.8);
    const n = 210;
    for (let i = 0; i <= n; i++) {
      const t = e.a0 + (e.a1 - e.a0) * (i / n);
      const ja = random(-0.008, 0.008);
      const r0 = wobbleR(e.r0 + random(-2, 2), t + ja, 5, 2.4, e.seed);
      const r1 = wobbleR(e.r1 + random(-2, 2), t + ja, 5, 2.4, e.seed);
      line(e.cx + ox + Math.cos(t + ja) * r0, e.cy + oy + Math.sin(t + ja) * r0,
        e.cx + ox + Math.cos(t + ja) * r1, e.cy + oy + Math.sin(t + ja) * r1);
    }
    ink(min(255, e.alpha + 40) * aMul);
    strokeWeight(3);
    arcPath({
      cx: e.cx,
      cy: e.cy,
      r: e.r0,
      amp: 5,
      freq: 2.4,
      seed: e.seed,
      steps: 200
    }, e.a0, e.a1, ox, oy, 0);
    arcPath({
      cx: e.cx,
      cy: e.cy,
      r: e.r1,
      amp: 5,
      freq: 2.4,
      seed: e.seed + 3.1,
      steps: 200
    }, e.a0, e.a1, ox, oy, 0);
  }
}

function buildAccents() {
  const es = [];
  es.push(ringObj(P1.x, P1.y, 520, 7.5, 245, {
    kind: 'dash',
    amp: 8,
    freq: 3,
    steps: 30,
    dashLen: 0.055,
    gapLen: 0.045
  }));
  es.push(ringObj(P1.x, P1.y, 735, 5, 205, {
    gaps: [
      [random(TWO_PI), 0.85],
      [random(TWO_PI), 0.45]
    ]
  }));
  es.push(ringObj(P1.x, P1.y, 975, 4, 175));
  es.push(ringObj(P1.x, P1.y, 1080, 3.5, 170));
  es.push(ringObj(P1.x, P1.y, 1096, 3.5, 170));
  es.push(ringObj(P1.x, P1.y, 920, 4.5, 185, {
    kind: 'dash',
    amp: 8,
    freq: 3,
    steps: 26,
    dashLen: 0.06,
    gapLen: 0.05,
    t0: 0.45,
    t1: 1.05
  }));
  es.push({
    kind: 'moire',
    cx: P2.x,
    cy: P2.y,
    r0: 100,
    r1: 260,
    seed: random(100),
    alpha: 150
  });
  es.push({
    kind: 'hatchArc',
    cx: P1.x,
    cy: P1.y,
    r0: 645,
    r1: 715,
    a0: 0.25,
    a1: 1.35,
    seed: random(100),
    alpha: 230
  });
  return es;
}

function subSystem(cx, cy, r0, r1, n, w, alpha) {
  for (let i = 0; i < n; i++) {
    const r = lerp(r0, r1, i / (n - 1)) + random(-9, 9);
    drawElem({
      kind: 'ring',
      cx,
      cy,
      r,
      w: w * random(0.85, 1.3),
      amp: 3 + r * 0.012,
      freq: random(2, 4.2),
      seed: random(100),
      alpha: alpha * random(0.8, 1.1),
      steps: 200,
      gaps: random() < 0.25 ? [
        [random(TWO_PI), random(0.3, 0.8)]
      ] : null
    }, 0, 0, 1);
  }
  noStroke();
  fill(INK[0], INK[1], INK[2], 150);
  blob(cx, cy, 12, 3, 2.5, random(100), 80);
}

function centerAnchor(cx, cy) {
  noStroke();
  fill(INK[0], INK[1], INK[2], 26);
  blob(cx, cy, 128, 12, 2.2, 9.1, 120);
  fill(INK[0], INK[1], INK[2], 244);
  blob(cx, cy, 92, 9, 2.6, 5.5, 120);
  noFill();
  paperStroke(215);
  strokeWeight(6);
  arcPath({
    cx,
    cy,
    r: 47,
    amp: 4,
    freq: 3.3,
    seed: 6.6,
    steps: 160
  }, 0, TWO_PI, 0, 0, 0);
  noStroke();
  fill(INK[0], INK[1], INK[2], 238);
  blob(cx, cy, 15, 2.5, 2.2, 3.3, 80);
}

// ---------- under-print and wear ----------

function gridGhost() {
  const N = 48,
    margin = 180;
  const cw = (width - 2 * margin) / N;
  noStroke();
  fill(172, 165, 148, 55);
  for (let j = 0; j <= N; j++) {
    for (let i = 0; i <= N; i++) {
      const x = margin + i * cw,
        y = margin + j * cw;
      if (Math.sqrt((x - RC.x) * (x - RC.x) + (y - RC.y) * (y - RC.y)) > 1205) continue;
      circle(x, y, 4);
    }
  }
}

function showThrough(x, y, base, k) {
  noStroke();
  for (let i = k; i > 0; i--) {
    fill(120, 112, 96, 2);
    circle(x, y, base + i * 24);
  }
}

function scratches(n) {
  stroke(60, 55, 48, 30);
  strokeWeight(3);
  noFill();
  for (let k = 0; k < n; k++) {
    const sx = random(400, width - 400),
      sy = random(400, height - 400);
    const a = random(TWO_PI),
      l = 300 + random(450);
    bezier(sx, sy,
      sx + Math.cos(a) * l * 0.35 + random(-120, 120), sy + Math.sin(a) * l * 0.35 + random(-120, 120),
      sx + Math.cos(a) * l * 0.7 + random(-120, 120), sy + Math.sin(a) * l * 0.7 + random(-120, 120),
      sx + Math.cos(a) * l, sy + Math.sin(a) * l);
  }
  noStroke();
}

function scratchesTop(n) {
  stroke(40, 36, 32, 30);
  strokeWeight(2.5);
  noFill();
  for (let k = 0; k < n; k++) {
    const a0 = random(TWO_PI),
      rr = 350 + random(650);
    const sx = P1.x + Math.cos(a0) * rr,
      sy = P1.y + Math.sin(a0) * rr;
    const a = a0 + random(-0.9, 0.9),
      l = 200 + random(320);
    bezier(sx, sy,
      sx + Math.cos(a) * l * 0.4 + random(-80, 80), sy + Math.sin(a) * l * 0.4 + random(-80, 80),
      sx + Math.cos(a) * l * 0.75 + random(-80, 80), sy + Math.sin(a) * l * 0.75 + random(-80, 80),
      sx + Math.cos(a) * l, sy + Math.sin(a) * l);
  }
  noStroke();
}

function plateTone() {
  ink(14);
  strokeWeight(110);
  arcPath({
    cx: RC.x,
    cy: RC.y,
    r: 1318,
    amp: 14,
    freq: 2.2,
    seed: 55.5,
    steps: 300
  }, 0, TWO_PI, 0, 0, 0);
}

function spatter(cx, cy) {
  noStroke();
  for (let i = 0; i < 260; i++) {
    const a = random(TWO_PI),
      d = random(120, 1350);
    fill(INK[0], INK[1], INK[2], random(25, 90));
    circle(cx + Math.cos(a) * d, cy + Math.sin(a) * d, random(1, 4.2));
  }
  for (let i = 0; i < 36; i++) {
    const a = random(TWO_PI),
      d = random(150, 1300);
    fill(INK[0], INK[1], INK[2], random(60, 140));
    circle(cx + Math.cos(a) * d, cy + Math.sin(a) * d, random(3.5, 7));
  }
}

function darkGrain() {
  noStroke();
  for (let i = 0; i < 5200; i++) {
    fill(INK[0], INK[1], INK[2], random(5, 26));
    const s = random(0.8, 2.4);
    rect(random(width), random(height), s, s);
  }
  for (let i = 0; i < 2600; i++) {
    const dk = random() < 0.55;
    fill(dk ? 90 : 246, dk ? 84 : 240, dk ? 74 : 224, 6 + random(12));
    rect(random(width), random(height), 1 + random(2.2), 1 + random(2.2));
  }
}

function erode() {
  noStroke();
  for (let i = 0; i < 4600; i++) {
    fill(PAPER[0] + random(-8, 8), PAPER[1] + random(-8, 8), PAPER[2] + random(-8, 8), random(40, 120));
    const s = random(1, 2.8);
    rect(random(width), random(height), s, s);
  }
  for (let i = 0; i < 80; i++) {
    paperStroke(random(50, 110));
    strokeWeight(random(1, 2.6));
    const x = random(width),
      y = random(height),
      a = random(TWO_PI),
      l = random(30, 170);
    line(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l);
  }
  noStroke();
}

function blotches() {
  noStroke();
  for (let i = 0; i < 12; i++) {
    const bx = random(width),
      by = random(height),
      br = random(140, 360);
    fill(PAPER_DK[0], PAPER_DK[1], PAPER_DK[2], random(2, 4));
    for (let j = 0; j < 36; j++) {
      const a = random(TWO_PI),
        d = random(br);
      circle(bx + Math.cos(a) * d, by + Math.sin(a) * d, random(70, 190));
    }
  }
}

function fibers() {
  for (let i = 0; i < 340; i++) {
    stroke(PAPER_DK[0], PAPER_DK[1], PAPER_DK[2], random(10, 26));
    strokeWeight(random(0.8, 1.8));
    const x = random(width),
      y = random(height),
      a = random(TWO_PI),
      l = random(24, 110);
    line(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l);
  }
  noStroke();
}

function roughFrame() {
  noFill();
  ink(242);
  strokeWeight(32);
  roughRect(82, 5, 3.1, 12.3);
  ink(150);
  strokeWeight(5);
  roughRect(132, 3.5, 2.6, 44.4);
}

function roughRect(inset, amp, freq, seed) {
  const x0 = inset,
    y0 = inset,
    x1 = width - inset,
    y1 = height - inset;
  const w1 = x1 - x0,
    h1 = y1 - y0;
  const per = 2 * w1 + 2 * h1;
  const steps = 480;
  beginShape();
  for (let i = 0; i <= steps; i++) {
    const d = (i / steps) * per;
    let x, y;
    if (d < w1) {
      x = x0 + d;
      y = y0;
    } else if (d < w1 + h1) {
      x = x1;
      y = y0 + (d - w1);
    } else if (d < 2 * w1 + h1) {
      x = x1 - (d - w1 - h1);
      y = y1;
    } else {
      x = x0;
      y = y1 - (d - 2 * w1 - h1);
    }
    const n = noise(Math.cos((d / per) * TWO_PI) * freq + seed, Math.sin((d / per) * TWO_PI) * freq + seed * 1.3);
    const off = (n - 0.5) * 2 * amp;
    vertex(x + off, y + off * 0.6);
  }
  endShape();
}

function ticks() {
  stroke(INK[0], INK[1], INK[2], 130);
  strokeWeight(2.4);
  const m = 46,
    l = 12;
  for (const p of [
      [m, m],
      [width - m, m],
      [m, height - m],
      [width - m, height - m]
    ]) {
    line(p[0] - l, p[1], p[0] + l, p[1]);
    line(p[0], p[1] - l, p[0], p[1] + l);
  }
  noStroke();
}

function vignette() {
  const g = drawingContext.createRadialGradient(width / 2, height / 2, height * 0.28, width / 2, height / 2, height * 0.74);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(44,36,26,0.17)');
  drawingContext.fillStyle = g;
  drawingContext.fillRect(0, 0, width, height);
}

function drawPaper() {
  const gw = 1000,
    gh = 1000;
  const g = createGraphics(gw, gh);
  g.loadPixels();
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const n1 = g.noise(x * 0.11, y * 0.11) - 0.5;
      const n2 = g.noise(x * 0.018 + 50, y * 0.018 + 50) - 0.5;
      const n3 = g.noise(x * 0.006 + 90, y * 0.006 + 90) - 0.5;
      let v = 230 + n1 * 18 + n2 * 10 + n3 * 18;
      const dx = x / gw - 0.5,
        dy = y / gh - 0.5;
      const dd = Math.sqrt(dx * dx + dy * dy) / 0.707;
      v *= 1 - 0.05 * Math.pow(dd, 2.6);
      v = constrain(v, 200, 246);
      const i = 4 * (y * gw + x);
      g.pixels[i] = v + 6;
      g.pixels[i + 1] = v;
      g.pixels[i + 2] = v - 14;
      g.pixels[i + 3] = 255;
    }
  }
  g.updatePixels();
  image(g, 0, 0, width, height);
}

function ink(a) {
  stroke(INK[0], INK[1], INK[2], a);
}

function paperStroke(a) {
  stroke(PAPER[0], PAPER[1], PAPER[2], a);
}
