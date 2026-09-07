// "Lunar Census, Plate IV"
// A printmaker's radial census of the moon: short dry ticks are ranked outer-to-inner
// and inked from a scarcity ladder — a slate sea, then jade, ochre, rust, a crimson
// corona, cream, and a gold heart — all woven flat through a stitched seam. Halftone
// shadow, dry-brush overprints, grained warm paper, construction geometry, orbit
// ridges, satellite dials, spatter, red seal.

var W = 3000,
  H = 3000;
var rndS = 1,
  noiseK = 1;
var CX = 1500,
  CYm = 1430,
  RMAX = 1330,
  RMIN = 26;
var M, S1, S2;
var SPH = [],
  ORBITS = [],
  TICKS = [];
var FR = {
  x0: 165,
  y0: 165,
  x1: 2835,
  y1: 2835
};
var MID_S = 1565,
  TILT = 0.030,
  T_PINCH = 245;
var PAPER = [229, 226, 217],
  CHARC = [45, 41, 37];
var LX = -0.45,
  LY = -0.60,
  LZ = 0.66;
var lightAz = 0,
  shAz = 0;
var LADDER = [{
  c: [88, 100, 118],
  q: 0.500,
  g: 0,
  u: 0
}, {
  c: [60, 138, 120],
  q: 0.170,
  g: 0,
  u: 0
}, {
  c: [178, 138, 52],
  q: 0.130,
  g: 0,
  u: 0
}, {
  c: [164, 82, 44],
  q: 0.075,
  g: 0,
  u: 0
}, {
  c: [174, 56, 68],
  q: 0.055,
  g: 0,
  u: 1
}, {
  c: [238, 231, 210],
  q: 0.030,
  g: 0,
  u: 0
}, {
  c: [212, 160, 50],
  q: 0.045,
  g: 1,
  u: 0
}];

function draw() {
  var ctx = drawingContext;
  rndS = 13579246;
  noiseK = 246813;
  lightAz = Math.atan2(LY, LX);
  shAz = Math.atan2(0.60, 0.45);
  M = {
    cx: CX,
    cy: CYm,
    r: 700,
    ph: 0.8
  };
  S1 = {
    cx: 2400,
    cy: 640,
    r: 165,
    ph: 2.4
  };
  S2 = {
    cx: 545,
    cy: 2500,
    r: 105,
    ph: 1.3
  };
  SPH = [M, S1, S2];
  TICKS = [];
  ORBITS = [];
  buildOrbit(M, S1, -0.16);
  buildOrbit(M, S2, 0.20);
  buildCensus();

  drawPaper(ctx);
  tonalWashes();
  showThrough(M, 1.0);
  showThrough(S1, 0.6);
  showThrough(S2, 0.5);

  guideCircles(ctx);
  halftoneShadow(M);
  dust();
  drawCensus();
  satelliteCensus(S1, 9, 12);
  satelliteCensus(S2, 8, 10);

  seatSmudge();
  stitches();
  zigzag(430, -1);
  zigzag(2572, 1);
  dryRings();

  constructionAll(ctx);
  orbitLines(ctx);
  strays(ctx, M);
  coreFlecks(ctx, M);
  coreFlecks(ctx, S1);
  coreFlecks(ctx, S2);
  centralMark();
  legend();
  registration(ctx);

  spatterAll();
  seal();
  plateFrame(ctx);
  vignette(ctx);
  speckGrain();
  grainPass();
}

// ---------- seeded rng + value noise ----------

function rnd() {
  rndS |= 0;
  rndS = (rndS + 0x6D2B79F5) | 0;
  var t = Math.imul(rndS ^ (rndS >>> 15), 1 | rndS);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function rndr(a, b) {
  return a + (b - a) * rnd();
}

function h2(x, y) {
  var h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + (noiseK | 0);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function vnoise(x, y) {
  var xi = Math.floor(x),
    yi = Math.floor(y);
  var xf = x - xi,
    yf = y - yi;
  var u = xf * xf * (3 - 2 * xf),
    v = yf * yf * (3 - 2 * yf);
  var a = h2(xi, yi),
    b = h2(xi + 1, yi),
    c = h2(xi, yi + 1),
    d = h2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function sstep(a, b, x) {
  var t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function rgba3(r, g, b, a) {
  return 'rgba(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ',' +
    Math.max(0, Math.min(1, a)).toFixed(3) + ')';
}

function tri(t) {
  t = ((t % 2) + 2) % 2;
  return t < 1 ? 2 * t - 1 : 1 - 2 * (t - 1);
}

function mixc(a, b, t) {
  t = Math.max(0, Math.min(1, t));
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// ---------- seam ----------

function seamAt(x) {
  return MID_S + TILT * (x - W / 2) + 26 * ((vnoise(x * 0.0012, 5.5) - 0.5) * 2);
}

function warpPt(x, y, rr) {
  var d = y - seamAt(x);
  var pin = Math.exp(-(d * d) / (T_PINCH * T_PINCH));
  if (rr !== undefined) {
    // heart stays round, corona barely woven, outer rings fully threaded
    pin *= sstep(120, 220, rr) * (0.25 + 0.75 * sstep(340, 560, rr));
  }
  return {
    x: x,
    y: y - d * pin * 0.88,
    pin: pin
  };
}

// ---------- shading model ----------

function shadeAt(px, py, cx, cy, r) {
  var nx = (px - cx) / r,
    ny = (py - cy) / r;
  var q = nx * nx + ny * ny;
  if (q > 1) q = 1;
  var nz = Math.sqrt(1 - q);
  var d = nx * LX + ny * LY + nz * LZ;
  var shade = Math.min(1, Math.max(0, (d + 0.35) / 1.25));
  shade *= 0.95 + 0.10 * vnoise(px * 0.0015, py * 0.0015);
  return Math.min(1, shade);
}

function insideAnySphere(x, y, f) {
  for (var s = 0; s < SPH.length; s++) {
    var Sp = SPH[s];
    var dx = x - Sp.cx,
      dy = y - Sp.cy;
    if (dx * dx + dy * dy < (Sp.r * f) * (Sp.r * f)) return true;
  }
  return false;
}

// ---------- the census field ----------

function buildCensus() {
  var ring = 0,
    r = RMAX;
  while (r >= RMIN) {
    var inS = r < M.r;
    var gap = inS ? 12 : 19;
    var step = inS ? 16 : (28 + 14 * vnoise(ring * 0.16, 3.7));
    var n = Math.max(8, Math.floor(TWO_PI * r / step));
    var phase = ring * 0.37;
    for (var k = 0; k < n; k++) {
      var th = phase + (k / n) * TWO_PI + rndr(-0.5, 0.5) * (TWO_PI / n) * 0.7;
      var cs = Math.cos(th),
        sn = Math.sin(th);
      if (!inS && r > M.r * 1.06) {
        var wth = 0.06 + 0.11 * vnoise(cs * 0.55 + 2, sn * 0.55 + 2) + ring * 0.015;
        if (wth > 0.22) wth = 0.22;
        if (vnoise(cs * 1.2 + 21 + ring * 0.05, sn * 1.2 + 21) < wth) continue;
      }
      var rr = r + (vnoise(cs * 1.4 + 5 + ring * 0.03, sn * 1.4 + 5) - 0.5) * 32 + rndr(-6, 6);
      var x = CX + rr * cs,
        y = CYm + rr * sn;
      var wp = warpPt(x, y, Math.max(rr, 1));
      var tilt = (vnoise(x * 0.0013 + 9, y * 0.0013 + 9) - 0.5) * 2.0 +
        rndr(-0.06, 0.06) + 0.1 * Math.sin(th * 4 + r * 0.01);
      var base = th + HALF_PI + tilt;
      var bx = (1 - wp.pin) * Math.cos(base) + wp.pin;
      var by = (1 - wp.pin) * Math.sin(base);
      var ln = rndr(15, 27),
        wg = rndr(3, 6);
      if (inS) {
        ln *= 0.9;
        wg = rndr(3.4, 6.4);
      }
      ln *= 1 + 0.55 * wp.pin;
      wg *= 1 + 0.3 * wp.pin;
      TICKS.push({
        x: x,
        y: wp.y,
        ang: Math.atan2(by, bx),
        len: ln,
        wgt: wg,
        rr: Math.max(rr, 1),
        pin: wp.pin
      });
    }
    r -= gap;
    ring++;
  }
}

function pickInk(u) {
  var cum = 0;
  for (var i = 0; i < LADDER.length; i++) {
    cum += LADDER[i].q;
    if (u <= cum) return LADDER[i];
  }
  return LADDER[LADDER.length - 1];
}

function drawCensus() {
  var N = TICKS.length;
  strokeCap(ROUND);
  for (var i = 0; i < N; i++) {
    var t = TICKS[i];
    var u = i / N;
    var shrink = 0.3 + 0.7 * t.rr / RMAX;
    u += ((vnoise(t.x * 0.0011 + 3, t.y * 0.0011 + 7) - 0.5) * 32 * shrink + rndr(-4, 4) * shrink) *
      2 * t.rr / (RMAX * RMAX);
    var ink = pickInk(u);
    var c = ink.c,
      ln = t.len,
      wg = t.wgt,
      al;
    var dx = t.x - M.cx,
      dy = t.y - M.cy;
    var dd = Math.sqrt(dx * dx + dy * dy),
      rr = dd / M.r;
    if (rr < 1.02) {
      var sh = shadeAt(t.x, t.y, M.cx, M.cy, M.r);
      var kd = Math.pow(Math.max(0, 1 - sh), 1.15);
      var rim = sstep(0.88, 1.0, rr) * (1 - sh);
      c = mixc(c, CHARC, Math.min(0.85, (ink.g ? 0.44 : 0.58) * kd + 0.22 * rim));
      c = mixc(c, PAPER, sstep(0.62, 0.96, sh) * 0.30);
      al = 175 + 75 * (1 - sh);
      ln *= 0.85 + 0.3 * (1 - sh);
      wg *= 0.95 + 0.15 * (1 - sh);
    } else {
      c = mixc(c, PAPER, 0.10 * vnoise(t.x * 0.002 + 40, t.y * 0.002 + 40));
      al = 190 + 50 * vnoise(i * 0.05, 7.7);
    }
    if (t.pin > 0.01) {
      c = mixc(c, [70, 64, 56], 0.22 * t.pin);
      al = Math.min(246, al + 55 * t.pin);
    }
    var ca2 = Math.cos(t.ang) * ln * 0.5,
      sa2 = Math.sin(t.ang) * ln * 0.5;
    if (ink.g) {
      stroke(94, 66, 30, 90);
      strokeWeight(wg);
      line(t.x - ca2 + 1.6, t.y - sa2 + 2.2, t.x + ca2 + 1.6, t.y + sa2 + 2.2);
      stroke(c[0], c[1], c[2], Math.min(246, al + 16));
      strokeWeight(wg);
      line(t.x - ca2, t.y - sa2, t.x + ca2, t.y + sa2);
      if (rnd() < 0.5) {
        stroke(242, 204, 104, 105);
        strokeWeight(wg * 0.5);
        line(t.x - ca2 * 0.8 - 1.2, t.y - sa2 * 0.8 - 1.6, t.x + ca2 * 0.8 - 1.2, t.y + sa2 * 0.8 - 1.6);
      }
    } else if (ink.u) {
      stroke(70, 30, 34, 70);
      strokeWeight(wg);
      line(t.x - ca2 + 1.4, t.y - sa2 + 1.8, t.x + ca2 + 1.4, t.y + sa2 + 1.8);
      stroke(c[0], c[1], c[2], al);
      strokeWeight(wg);
      line(t.x - ca2, t.y - sa2, t.x + ca2, t.y + sa2);
    } else {
      stroke(c[0], c[1], c[2], al);
      strokeWeight(wg);
      line(t.x - ca2, t.y - sa2, t.x + ca2, t.y + sa2);
      if (rnd() < 0.10) {
        stroke(c[0], c[1], c[2], al * 0.55);
        strokeWeight(wg * 0.8);
        line(t.x - ca2 + rndr(-2, 2), t.y - sa2 + rndr(-2, 2), t.x + ca2 + rndr(-2, 2), t.y + sa2 + rndr(-2, 2));
      }
    }
  }
}

function satelliteCensus(S, gap, step) {
  var list = [],
    r = S.r - 6,
    ring = 0;
  while (r >= 8) {
    var n = Math.max(6, Math.floor(TWO_PI * r / step));
    var phase = ring * 0.53;
    for (var k = 0; k < n; k++) {
      var th = phase + (k / n) * TWO_PI + rndr(-0.5, 0.5) * (TWO_PI / n) * 0.7;
      var rr = r + (vnoise(Math.cos(th) * 1.5 + 9 + ring * 0.07, Math.sin(th) * 1.5 + 9) - 0.5) * 8 + rndr(-2.5, 2.5);
      var x = S.cx + rr * Math.cos(th),
        y = S.cy + rr * Math.sin(th);
      var wp = warpPt(x, y, rr);
      var tilt = (vnoise(x * 0.002 + 4, y * 0.002 + 4) - 0.5) * 1.4 + rndr(-0.08, 0.08);
      var base = th + HALF_PI + tilt;
      var bx = (1 - wp.pin) * Math.cos(base) + wp.pin;
      var by = (1 - wp.pin) * Math.sin(base);
      list.push({
        x: x,
        y: wp.y,
        ang: Math.atan2(by, bx),
        len: rndr(7, 13) * (S.r > 140 ? 1 : 0.85),
        wgt: rndr(2, 3.6),
        rr: rr,
        pin: wp.pin
      });
    }
    r -= gap;
    ring++;
  }
  var N = list.length;
  strokeCap(ROUND);
  for (var i = 0; i < N; i++) {
    var t = list[i];
    var u = i / N + ((vnoise(t.x * 0.002 + 3, t.y * 0.002 + 7) - 0.5) * 20) * 2 * t.rr / (S.r * S.r);
    var ink = pickInk(u);
    var c = ink.c,
      ln = t.len,
      wg = t.wgt;
    var sh = shadeAt(t.x, t.y, S.cx, S.cy, S.r);
    var kd = Math.pow(Math.max(0, 1 - sh), 1.15);
    var rr2 = Math.min(1, t.rr / S.r);
    var rim = sstep(0.86, 1.0, rr2) * (1 - sh);
    c = mixc(c, CHARC, Math.min(0.85, 0.6 * kd + 0.25 * rim));
    c = mixc(c, PAPER, sstep(0.6, 0.95, sh) * 0.35);
    var al = Math.min(246, 160 + 100 * (1 - sh));
    var ca2 = Math.cos(t.ang) * ln * 0.5,
      sa2 = Math.sin(t.ang) * ln * 0.5;
    if (ink.g) {
      stroke(94, 66, 30, 80);
      strokeWeight(wg);
      line(t.x - ca2 + 1.2, t.y - sa2 + 1.6, t.x + ca2 + 1.2, t.y + sa2 + 1.6);
    }
    stroke(c[0], c[1], c[2], al);
    strokeWeight(wg);
    line(t.x - ca2, t.y - sa2, t.x + ca2, t.y + sa2);
  }
  var cc = warpPt(S.cx, S.cy, 0);
  strokeCap(ROUND);
  stroke(58, 50, 42, 120);
  strokeWeight(S.r > 140 ? 7 : 5);
  line(cc.x, cc.y - S.r * 0.14, cc.x, cc.y + S.r * 0.14);
  stroke(243, 240, 230);
  strokeWeight(S.r > 140 ? 4.5 : 3.2);
  line(cc.x, cc.y - S.r * 0.13, cc.x, cc.y + S.r * 0.13);
}

// ---------- guide circles, halftone shadow, dust ----------

function guideCircles(ctx) {
  var radii = [420, 1020, 1315];
  for (var i = 0; i < radii.length; i++) {
    sketchCircle(ctx, CX, CYm, radii[i], 1.1, 0.10);
  }
}

function halftoneShadow(S) {
  var cw = 26,
    ang = -0.16;
  var ca = Math.cos(ang),
    sa = Math.sin(ang);
  var Rn = Math.ceil(S.r / cw);
  noStroke();
  for (var l = -Rn; l <= Rn; l++) {
    for (var k = -Rn; k <= Rn; k++) {
      var gx = k * cw,
        gy = l * cw;
      var x = S.cx + ca * gx - sa * gy,
        y = S.cy + sa * gx + ca * gy;
      var ddx = x - S.cx,
        ddy = y - S.cy;
      if (ddx * ddx + ddy * ddy > S.r * S.r * 0.98) continue;
      var sh = shadeAt(x, y, S.cx, S.cy, S.r);
      if (sh > 0.40) continue;
      var tone = Math.pow(1 - sh, 1.3);
      var r = cw * 0.42 * tone * (0.85 + 0.3 * vnoise(k * 3.1, l * 2.7));
      if (r < 1.8) continue;
      fill(52, 47, 42, 48 + 58 * tone);
      blob(x, y, r, k * 73 + l * 131 + 7);
    }
  }
}

function dust() {
  noStroke();
  for (var i = 0; i < 2200; i++) {
    var a = rnd() * TWO_PI;
    var rd = Math.sqrt(770 * 770 + (RMAX * RMAX - 770 * 770) * rnd());
    var x = CX + rd * Math.cos(a),
      y = CYm + rd * Math.sin(a);
    if (x < FR.x0 + 6 || x > FR.x1 - 6 || y < FR.y0 + 6 || y > FR.y1 - 6) continue;
    if (rd > 1010) fill(96, 106, 122, rndr(38, 120));
    else fill(64, 138, 118, rndr(34, 105));
    ellipse(x, y, rndr(2.2, 5.2));
  }
}

// ---------- zigzag dry rows ----------

function zigzag(yc, dir) {
  var ctx = drawingContext;
  var pw = rndr(300, 362),
    ph = rndr(0, pw),
    amp = rndr(52, 68);
  var pts = [],
    i, x, b;
  for (x = FR.x0 + 30; x <= FR.x1 - 30; x += 10) {
    var v = tri((x + ph) / pw);
    var mod = 0.8 + 0.4 * vnoise(x * 0.0006 + yc * 0.01, 3.3);
    var y = yc + dir * amp * mod * v + 8 * (vnoise(x * 0.001 + 7, yc * 0.013) - 0.5);
    pts.push([x, y]);
  }
  var breaks = [],
    nb = 2 + Math.floor(rnd() * 2);
  for (b = 0; b < nb; b++) breaks.push({
    x: rndr(FR.x0 + 150, FR.x1 - 150),
    w: rndr(26, 70)
  });
  ctx.lineCap = 'round';
  for (var p = 0; p < 2; p++) {
    var off = p === 0 ? 0 : -6;
    var aBase = p === 0 ? 70 : 40;
    for (i = 1; i < pts.length; i++) {
      var x1 = pts[i - 1][0],
        y1 = pts[i - 1][1] + off;
      var x2 = pts[i][0],
        y2 = pts[i][1] + off;
      var skip = false;
      for (b = 0; b < breaks.length; b++)
        if (Math.abs(pts[i][0] - breaks[b].x) < breaks[b].w) skip = true;
      if (skip || rnd() < 0.02) continue;
      var fade = 1;
      for (var s = 0; s < SPH.length; s++) {
        var Sp = SPH[s];
        var dd = Math.sqrt((x2 - Sp.cx) * (x2 - Sp.cx) + (y2 - Sp.cy) * (y2 - Sp.cy)) / Sp.r;
        fade *= 1 - sstep(1.12, 0.99, dd);
      }
      if (fade < 0.03) continue;
      var al = aBase * (0.45 + 0.9 * vnoise(i * 0.045, p * 9 + 3)) * fade;
      if (al < 4) continue;
      ctx.strokeStyle = rgba3(64, 56, 48, al / 255);
      ctx.lineWidth = 14 + 8 * vnoise(i * 0.03, p * 5);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }
}

// ---------- dry-brush overprinted rings ----------

function dryRings() {
  ringDry(330, {
    passes: 4,
    w: 48,
    col: [74, 40, 34],
    a: 150,
    ox: 9,
    oy: -6,
    echo: false
  });
  ringDry(525, {
    passes: 1,
    w: 30,
    col: [70, 58, 50],
    a: 64,
    ox: -7,
    oy: 5,
    echo: true
  });
  ringDry(865, {
    passes: 1,
    w: 32,
    col: [70, 58, 50],
    a: 60,
    ox: -6,
    oy: 6,
    echo: true
  });
  ringDry(1185, {
    passes: 1,
    w: 34,
    col: [70, 58, 50],
    a: 56,
    ox: 6,
    oy: -6,
    echo: true
  });
}

function ringPts(R) {
  var pts = [];
  for (var a = 0; a < 256; a++) {
    var th = a / 256 * TWO_PI;
    var wob = (vnoise(Math.cos(th) * 2 + 30, Math.sin(th) * 2) - 0.5) * 16;
    var x = CX + Math.cos(th) * (R + wob),
      y = CYm + Math.sin(th) * (R + wob);
    var wp = warpPt(x, y, R);
    pts.push([wp.x, wp.y]);
  }
  pts.push([pts[0][0], pts[0][1]]);
  return pts;
}

function ringDry(R, opt) {
  var pts = ringPts(R);
  var n = pts.length,
    nx = [],
    ny = [],
    k;
  for (k = 0; k < n; k++) {
    var a1 = pts[(k - 1 + n - 1) % (n - 1)],
      b1 = pts[(k + 1) % (n - 1)];
    var tx = b1[0] - a1[0],
      ty = b1[1] - a1[1];
    var L = Math.sqrt(tx * tx + ty * ty) || 1;
    nx.push(-ty / L);
    ny.push(tx / L);
  }
  strokeJoin(ROUND);
  strokeCap(ROUND);
  if (!opt.echo) smudgeAlongPts(pts, opt.w * 1.4, 6, 0.5, 5);
  var baseBreak = Math.floor(rnd() * 256);
  for (var p = 0; p < opt.passes; p++) {
    var off = opt.w * 0.16;
    var br = [{
      c: (baseBreak + p * 67 + Math.floor(rnd() * 18)) % 256,
      w: rndr(5, 12)
    }];
    inkPassRing(pts, opt, {
      ox: opt.ox + rndr(-off, off),
      oy: opt.oy + rndr(-off, off),
      pi: p,
      breaks: br
    });
  }
  if (!opt.echo) {
    smudgeAlongPts(pts, opt.w * 1.9, 4, 0.4, 17);
    inkPassRing(pts, {
      w: opt.w * 0.5,
      col: [158, 66, 52],
      a: 55,
      echo: false
    }, {
      ox: -15,
      oy: 11,
      pi: 9,
      breaks: []
    });
    striateRing(pts, nx, ny, opt.w, 4);
    erodeRing(pts, nx, ny, opt.w, 1.5);
    dustRing(pts, 470);
  } else {
    erodeRing(pts, nx, ny, opt.w, 0.8);
  }
}

function inkPassRing(pts, opt, o) {
  var n = pts.length;
  var nOff = rnd() * 1000;
  var wBase = opt.w * rndr(0.75, 1.0);
  var aBase = opt.a * ((!opt.echo && o.pi === 2) ? 0.55 : rndr(0.68, 1.0));
  var lx = null,
    ly = null;
  for (var i = 0; i < n; i++) {
    var skip = rnd() < 0.008;
    for (var b = 0; b < o.breaks.length; b++) {
      var d = Math.abs(i - o.breaks[b].c);
      d = Math.min(d, n - d);
      if (d < o.breaks[b].w) skip = true;
    }
    if (skip) {
      lx = null;
      continue;
    }
    var x = pts[i][0] + o.ox + rndr(-1.5, 1.5),
      y = pts[i][1] + o.oy + rndr(-1.5, 1.5);
    var fade = 1;
    for (var s = 1; s < SPH.length; s++) {
      var Sp = SPH[s];
      var dd = Math.sqrt((x - Sp.cx) * (x - Sp.cx) + (y - Sp.cy) * (y - Sp.cy)) / Sp.r;
      fade *= 1 - sstep(1.10, 0.97, dd);
    }
    if (fade < 0.03) {
      lx = null;
      continue;
    }
    if (lx !== null) {
      var press = 0.65 + 0.85 * vnoise(i * 0.06 + nOff, 50);
      stroke(opt.col[0] + rndr(-8, 8), opt.col[1] + rndr(-6, 6), opt.col[2] + rndr(-6, 6),
        Math.min(242, aBase * (0.55 + 0.55 * vnoise(i * 0.05, nOff * 0.013)) * fade));
      strokeWeight(Math.min(wBase * press * (0.8 + 0.45 * vnoise(i * 0.033 + 7, 2.2)), wBase * 1.5));
      line(lx, ly, x, y);
    }
    lx = x;
    ly = y;
  }
}

function smudgeAlongPts(pts, w, aMax, dens, sd) {
  var N = pts.length;
  for (var i = 1; i < N; i++) {
    if (rnd() > dens) continue;
    var a = aMax * (0.25 + 0.95 * vnoise(i * 0.02, sd));
    if (a < 2) continue;
    stroke(96, 90, 80, a);
    strokeWeight(w * (0.55 + 0.85 * vnoise(i * 0.015 + sd + 40, 1.1)));
    line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
  }
}

function striateRing(pts, nx, ny, w, nN) {
  noStroke();
  var N = pts.length;
  for (var j = 0; j < nN; j++) {
    var o = rndr(-w * 0.26, w * 0.26),
      wob = rndr(2, 6),
      nOff = rnd() * 1000;
    fill(PAPER[0], PAPER[1], PAPER[2], rndr(32, 70));
    for (var i = 0; i < N; i += 2) {
      var off = o + (vnoise(i * 0.05 + nOff, 3.3) - 0.5) * wob * 2;
      if (rnd() > 0.10) circle(pts[i][0] + nx[i] * off, pts[i][1] + ny[i] * off, rndr(2.5, 7));
    }
  }
}

function erodeRing(pts, nx, ny, w, dens) {
  noStroke();
  var N = pts.length;
  for (var i = 0; i < N; i++) {
    var bx = pts[i][0],
      by = pts[i][1];
    if (rnd() < 0.7 * dens) {
      var o = (rnd() + rnd() + rnd() - 1.5) * w * 0.32;
      fill(PAPER[0], PAPER[1], PAPER[2], rndr(40, 120));
      circle(bx + nx[i] * o, by + ny[i] * o, rndr(1, 4.4));
    }
    if (rnd() < 0.45 * dens) {
      var side = rnd() < 0.5 ? -1 : 1;
      var o2 = side * (w * 0.5 + rndr(0, w * 0.35));
      fill(60, 58, 54, rndr(15, 60));
      circle(bx + nx[i] * o2, by + ny[i] * o2, rndr(0.8, 3));
    }
  }
}

function dustRing(pts, nD) {
  noStroke();
  var N = pts.length;
  for (var k = 0; k < nD; k++) {
    var i = Math.floor(rnd() * N);
    fill(70, 68, 64, rndr(8, 40));
    circle(pts[i][0] + (rnd() + rnd() - 1) * 26, pts[i][1] + (rnd() + rnd() - 1) * 26, rndr(0.8, 3.4));
  }
}

// ---------- seam seating + stitches ----------

function seatSmudge() {
  noFill();
  strokeJoin(ROUND);
  strokeCap(ROUND);
  stroke(70, 62, 50, 7);
  strokeWeight(150);
  beginShape();
  for (var x = FR.x0; x <= FR.x1; x += 20) vertex(x, seamAt(x));
  endShape();
  stroke(70, 62, 50, 6);
  strokeWeight(60);
  beginShape();
  for (x = FR.x0; x <= FR.x1; x += 20) vertex(x, seamAt(x) + 26);
  endShape();
  sketchLine(drawingContext, FR.x0 + 30, seamAt(FR.x0 + 30) + rndr(-3, 3),
    FR.x1 - 30, seamAt(FR.x1 - 30) + rndr(-3, 3), 1.6, 0.22);
}

function stitches() {
  stroke(48, 44, 39, 215);
  strokeWeight(7.5);
  strokeCap(ROUND);
  var x = FR.x0 + rndr(50, 180);
  while (x < FR.x1 - 50) {
    var y = seamAt(x);
    if (!insideAnySphere(x, y, 1.06)) {
      var len = rndr(46, 68),
        j = rndr(-5, 5);
      line(x + j, y - len, x - j, y + len);
    }
    x += rndr(120, 290);
  }
}

// ---------- construction geometry ----------

function constructionAll(ctx) {
  ctx.lineCap = 'round';
  sketchCircle(ctx, M.cx, M.cy, M.r * 1.12, 2.6, 0.50);
  sketchCircle(ctx, M.cx, M.cy, M.r * 1.128, 1.3, 0.26);
  sketchLine(ctx, M.cx - M.r * 1.26, M.cy + rndr(-4, 4), M.cx + M.r * 1.26, M.cy + rndr(-4, 4), 1.9, 0.28);
  sketchLine(ctx, M.cx + rndr(-4, 4), M.cy - M.r * 1.26, M.cx + rndr(-4, 4), M.cy + M.r * 1.26, 1.9, 0.28);
  ctx.strokeStyle = rgba3(96, 94, 86, 0.30);
  for (var i = 0; i < 24; i++) {
    var a = i / 24 * TWO_PI + 0.06;
    var r1 = M.r * 1.152,
      r2 = M.r * 1.192;
    var ca = Math.cos(a),
      sa = Math.sin(a);
    ctx.lineWidth = i % 6 === 0 ? 3.0 : 1.8;
    ctx.beginPath();
    ctx.moveTo(M.cx + ca * r1, M.cy + sa * r1);
    ctx.lineTo(M.cx + ca * r2, M.cy + sa * r2);
    ctx.stroke();
    if (i % 6 === 0) {
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(M.cx + ca * (r1 + r2) / 2, M.cy + sa * (r1 + r2) / 2, 11, 0, TWO_PI);
      ctx.stroke();
    }
  }
  for (var s2 = 1; s2 < SPH.length; s2++) {
    var S = SPH[s2];
    sketchLine(ctx, S.cx - S.r * 1.7, S.cy, S.cx + S.r * 1.7, S.cy, 1.3, 0.22);
    sketchLine(ctx, S.cx, S.cy - S.r * 1.7, S.cx, S.cy + S.r * 1.7, 1.3, 0.22);
  }
  ghostDial(ctx, 2712, 1745, 88);
}

function ghostDial(ctx, gx, gy, gr) {
  sketchCircle(ctx, gx, gy, gr, 2.6, 0.62);
  sketchCircle(ctx, gx, gy, gr * 1.06, 1.2, 0.34);
  sketchLine(ctx, gx - gr * 1.5, gy, gx + gr * 1.5, gy, 1.3, 0.40);
  sketchLine(ctx, gx, gy - gr * 1.5, gx, gy + gr * 1.5, 1.3, 0.40);
}

function legend() {
  strokeCap(ROUND);
  var x0 = 2690;
  for (var i = 0; i < LADDER.length; i++) {
    var y0 = 2010 + i * 56;
    var ink = LADDER[i];
    for (var j = 0; j < 3; j++) {
      var lx = x0 + j * 34,
        ly = y0 + rndr(-3, 3);
      if (ink.g) {
        stroke(94, 66, 30, 80);
        strokeWeight(4.5);
        line(lx - 10 + 1.4, ly + 1.8, lx + 10 + 1.4, ly + 1.8);
      }
      stroke(ink.c[0], ink.c[1], ink.c[2], ink.c[0] > 230 ? 235 : 215);
      strokeWeight(4.5);
      line(lx - 10, ly, lx + 10, ly);
    }
  }
  noStroke();
  fill(90, 86, 78, 120);
  for (var s = 0; s < 4; s++) circle(x0 - 34, 2010 + s * 56 * 2 - 8, 2.2);
}

function registration(ctx) {
  var corners = [
    [232, 232],
    [2768, 232],
    [232, 2768],
    [2768, 2768]
  ];
  for (var i = 0; i < corners.length; i++) {
    var c = corners[i];
    ctx.strokeStyle = rgba3(100, 98, 90, 0.42);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(c[0] - 26, c[1]);
    ctx.lineTo(c[0] + 26, c[1]);
    ctx.moveTo(c[0], c[1] - 26);
    ctx.lineTo(c[0], c[1] + 26);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(c[0], c[1], 14, 0, TWO_PI);
    ctx.stroke();
  }
}

function sketchCircle(ctx, x, y, rad, w, al) {
  ctx.strokeStyle = rgba3(126, 124, 118, al);
  ctx.lineWidth = w;
  ctx.beginPath();
  var step = 0.045,
    pen = false;
  for (var a = 0; a <= Math.PI * 2 + step; a += step) {
    if (rnd() < 0.06) {
      pen = false;
      continue;
    }
    var jx = (vnoise(Math.cos(a) * 2 + 10, Math.sin(a) * 2) - 0.5) * 6.4;
    var jy = (vnoise(Math.cos(a) * 2, Math.sin(a) * 2 + 30) - 0.5) * 6.4;
    var px = x + Math.cos(a) * rad + jx;
    var py = y + Math.sin(a) * rad + jy;
    if (!pen) {
      ctx.moveTo(px, py);
      pen = true;
    } else ctx.lineTo(px, py);
  }
  ctx.stroke();
}

function sketchLine(ctx, x1, y1, x2, y2, w, al) {
  ctx.strokeStyle = rgba3(126, 124, 118, al);
  ctx.lineWidth = w;
  var dx = x2 - x1,
    dy = y2 - y1;
  var L = Math.sqrt(dx * dx + dy * dy);
  var ux = dx / L,
    uy = dy / L;
  var px = -uy,
    py = ux;
  var step = 26;
  ctx.beginPath();
  var pen = false;
  for (var t = 0; t <= L; t += step) {
    if (rnd() < 0.05) {
      pen = false;
      continue;
    }
    var j = (vnoise(t * 0.01 + x1 * 0.001, y1 * 0.001) - 0.5) * 6;
    var X = x1 + ux * t + px * j,
      Y = y1 + uy * t + py * j;
    if (!pen) {
      ctx.moveTo(X, Y);
      pen = true;
    } else ctx.lineTo(X, Y);
  }
  ctx.stroke();
}

// ---------- orbit ridges ----------

function buildOrbit(A, B, bowFrac) {
  var dx = B.cx - A.cx,
    dy = B.cy - A.cy;
  var L = Math.sqrt(dx * dx + dy * dy);
  var ux = dx / L,
    uy = dy / L;
  var px = -uy,
    py = ux;
  var x1 = A.cx + ux * A.r,
    y1 = A.cy + uy * A.r;
  var x2 = B.cx - ux * B.r,
    y2 = B.cy - uy * B.r;
  var mx = (x1 + x2) / 2 + px * L * bowFrac;
  var my = (y1 + y2) / 2 + py * L * bowFrac;
  var pts = [];
  for (var i = 0; i <= 90; i++) {
    var t = i / 90;
    var a = (1 - t) * (1 - t),
      b2 = 2 * (1 - t) * t,
      c2 = t * t;
    pts.push({
      x: a * x1 + b2 * mx + c2 * x2,
      y: a * y1 + b2 * my + c2 * y2
    });
  }
  ORBITS.push(pts);
}

function orbitLines(ctx) {
  ctx.lineCap = 'round';
  for (var o = 0; o < ORBITS.length; o++) {
    var pts = ORBITS[o];
    for (var p = 0; p < 2; p++) {
      var off = p === 0 ? -3.4 : 3.4;
      ctx.strokeStyle = rgba3(116, 114, 106, p === 0 ? 0.20 : 0.13);
      ctx.lineWidth = p === 0 ? 1.7 : 1.1;
      ctx.beginPath();
      var pen = false;
      for (var i = 0; i < pts.length; i++) {
        if (rnd() < 0.10) {
          pen = false;
          continue;
        }
        var jx = (vnoise(i * 0.3, o * 7 + p * 13) - 0.5) * 8 + off * 0.4;
        var jy = (vnoise(i * 0.3 + 40, o * 7 + p * 13) - 0.5) * 8 + off * 0.4;
        if (!pen) {
          ctx.moveTo(pts[i].x + jx, pts[i].y + jy);
          pen = true;
        } else ctx.lineTo(pts[i].x + jx, pts[i].y + jy);
      }
      ctx.stroke();
    }
  }
}

// ---------- flecks, strays ----------

function strays(ctx, Mc) {
  ctx.lineCap = 'round';
  for (var i = 0; i < 54; i++) {
    var a;
    if (rnd() < 0.75) a = rndr(-2.6, 0.6);
    else a = rnd() * Math.PI * 2;
    var rad = Mc.r * rndr(1.05, 1.30);
    var x = Mc.cx + Math.cos(a) * rad,
      y = Mc.cy + Math.sin(a) * rad;
    var dir = a + Math.PI / 2 + rndr(-0.5, 0.5);
    var len = rndr(50, 220);
    var dx = Math.cos(dir),
      dy = Math.sin(dir);
    var bow = rndr(-0.25, 0.25) * len;
    ctx.strokeStyle = rgba3(104, 102, 94, rndr(0.28, 0.50));
    ctx.lineWidth = rndr(1.2, 2.4);
    ctx.beginPath();
    ctx.moveTo(x - dx * len / 2, y - dy * len / 2);
    ctx.quadraticCurveTo(x - dy * bow, y + dx * bow, x + dx * len / 2, y + dy * len / 2);
    ctx.stroke();
  }
}

function coreFlecks(ctx, S) {
  var n = S.r > 400 ? 1100 : 130;
  ctx.lineCap = 'round';
  for (var i = 0; i < n; i++) {
    var ang = shAz + rndr(-1.0, 1.0);
    var fall = 1 - Math.abs(ang - shAz) / 1.0;
    if (fall <= 0) continue;
    var rr = S.r * rndr(0.45, 0.965);
    var x = S.cx + rr * Math.cos(ang),
      y = S.cy + rr * Math.sin(ang);
    var tg = ang + Math.PI / 2;
    var len = rndr(9, 30);
    var dx = Math.cos(tg),
      dy = Math.sin(tg);
    ctx.strokeStyle = rgba3(216 + rndr(0, 22), 212 + rndr(0, 18), 202 + rndr(0, 16), rndr(0.10, 0.26) * fall);
    ctx.lineWidth = rndr(0.8, 1.9);
    ctx.beginPath();
    ctx.moveTo(x - dx * len / 2, y - dy * len / 2);
    ctx.lineTo(x + dx * len / 2, y + dy * len / 2);
    ctx.stroke();
  }
}

// ---------- central mark ----------

function centralMark() {
  noStroke();
  var c = warpPt(CX, CYm, 0);
  for (var j = 0; j < 5; j++) {
    fill(214, 168, 64, rndr(34, 64));
    blob(c.x + rndr(-14, 14), c.y + rndr(-14, 14), rndr(40, 72), j * 7 + 3);
  }
  strokeCap(ROUND);
  stroke(58, 50, 42, 110);
  strokeWeight(15);
  line(c.x, c.y - 29, c.x, c.y + 29);
  stroke(246, 243, 233);
  strokeWeight(10);
  line(c.x, c.y - 27, c.x, c.y + 27);
  noStroke();
  for (var f = 0; f < 7; f++) {
    fill(246, 243, 233, rndr(150, 230));
    var a = rnd() * TWO_PI,
      d = rndr(30, 58);
    circle(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, rndr(1.5, 3.5));
  }
}

// ---------- paper ----------

function drawPaper(ctx) {
  var gw = 1000,
    gh = 1000;
  var g = createGraphics(gw, gh);
  g.loadPixels();
  for (var y = 0; y < gh; y++) {
    for (var x = 0; x < gw; x++) {
      var n1 = vnoise(x * 0.11, y * 0.11) - 0.5;
      var n2 = vnoise(x * 0.018 + 50, y * 0.018 + 50) - 0.5;
      var v = 228 + n1 * 26 + n2 * 11 + Math.sin(y * 0.055 + Math.sin(x * 0.01) * 2) * 2;
      var dx = x / gw - 0.5,
        dy = y / gh - 0.5;
      var dd = Math.sqrt(dx * dx + dy * dy) / 0.707;
      v *= 1 - 0.05 * Math.pow(dd, 2.6);
      v = Math.min(248, Math.max(204, v));
      var i4 = 4 * (y * gw + x);
      g.pixels[i4] = v + 5;
      g.pixels[i4 + 1] = v + 1;
      g.pixels[i4 + 2] = v - 7;
      g.pixels[i4 + 3] = 255;
    }
  }
  g.updatePixels();
  image(g, 0, 0, width, height);

  for (var b = 0; b < 650; b++) {
    var x2 = rnd() * 3000,
      y2 = rnd() * 3000;
    var rad = rndr(140, 480);
    var gr = ctx.createRadialGradient(x2, y2, 0, x2, y2, rad);
    var c = rnd() < 0.55 ? '192,188,178' : '251,249,242';
    var al = rndr(0.015, 0.05);
    gr.addColorStop(0, 'rgba(' + c + ',' + al.toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(' + c + ',0)');
    ctx.fillStyle = gr;
    ctx.fillRect(x2 - rad, y2 - rad, rad * 2, rad * 2);
  }
  for (var f = 0; f < 1000; f++) {
    var fx = rnd() * 3000,
      fy = rnd() * 3000;
    var l = rndr(2, 9),
      a = rnd() * Math.PI * 2;
    ctx.strokeStyle = rgba3(rndr(140, 175), rndr(138, 172), rndr(130, 165), rndr(0.03, 0.09));
    ctx.lineWidth = rndr(0.6, 1.5);
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + Math.cos(a) * l, fy + Math.sin(a) * l);
    ctx.stroke();
  }
}

function tonalWashes() {
  noStroke();
  fill(251, 248, 239, 30);
  ellipse(W * 0.30, H * 0.20, 2200, 1500);
  fill(120, 110, 95, 14);
  ellipse(W * 0.64, H * 0.88, 2500, 1300);
}

function showThrough(S, k) {
  noStroke();
  var n = Math.round(24 * k) + 8;
  for (var i = n; i > 0; i--) {
    fill(122, 120, 112, 3);
    var d = S.r * 2 * (0.55 + 0.6 * i / n);
    circle(S.cx + rndr(-1, 1) * 26 * k, S.cy + rndr(-1, 1) * 26 * k, d);
  }
}

function blob(x, y, r, s) {
  if (r < 0.5) return;
  var K = 30;
  beginShape();
  for (var k = 0; k < K; k++) {
    var a = (k / K) * TWO_PI;
    var w = 1 + 0.045 * Math.sin(a * 3 + s) + 0.03 * Math.sin(a * 7 + s * 1.7) + 0.018 * Math.sin(a * 13 + s * 0.6);
    vertex(x + Math.cos(a) * r * w, y + Math.sin(a) * r * w);
  }
  endShape(CLOSE);
}

// ---------- spatter, seal, frame, grain ----------

function spatterAll() {
  noStroke();
  var seamY = seamAt(W / 2),
    i, x, y;
  for (i = 0; i < 200; i++) {
    x = rndr(FR.x0, FR.x1);
    y = seamY + (rnd() + rnd() + rnd() - 1.5) * 380;
    y = Math.min(FR.y1, Math.max(FR.y0, y));
    fill(52, 48, 42, rndr(35, 130));
    circle(x, y, rndr(1, 4.6));
  }
  for (i = 0; i < 26; i++) {
    x = rndr(FR.x0 + 60, FR.x1 - 60);
    y = seamAt(x) + rndr(-70, 70);
    fill(52, 48, 42, rndr(30, 90));
    circle(x, y, rndr(0.8, 2.4));
  }
  for (i = 0; i < 230; i++) {
    x = rndr(FR.x0, FR.x1);
    y = rndr(FR.y0, FR.y1);
    var big = rnd() < 0.10;
    var r = big ? rndr(3, 6.2) : rndr(1, 3.0);
    var g = rndr(40, 110);
    fill(g, g - 2, g - 4, rndr(60, 160));
    if (big) blob(x, y, r, i * 2.3);
    else circle(x, y, r * 2);
  }
  for (i = 0; i < 14; i++) {
    x = rndr(FR.x0 + 100, FR.x1 - 100);
    y = Math.min(FR.y1 - 60, Math.max(FR.y0 + 60, seamY + (rnd() + rnd() - 1) * 300));
    fill(48, 44, 40, rndr(60, 150));
    circle(x, y, rndr(3.5, 6.5));
  }
}

function seal() {
  push();
  translate(W - 252, H - 252);
  rotate(-0.02);
  noStroke();
  fill(172, 56, 40, 215);
  rect(-41, -41, 82, 82, 9);
  stroke(242, 238, 228, 235);
  strokeWeight(8);
  noFill();
  beginShape();
  vertex(-18, 17);
  vertex(0, -15);
  vertex(18, 17);
  endShape(CLOSE);
  pop();
}

function plateFrame(ctx) {
  wobbleRect(ctx, 92, 4.5, rgba3(50, 48, 44, 0.85));
  wobbleRect(ctx, 108, 1.4, rgba3(95, 93, 86, 0.42));
  ctx.strokeStyle = rgba3(60, 58, 52, 0.6);
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  var mx = 1500,
    my = 1500;
  var ticks = [
    [mx, 92, 0, 1],
    [mx, 3000 - 92, 0, -1],
    [92, my, 1, 0],
    [3000 - 92, my, -1, 0]
  ];
  for (var i = 0; i < ticks.length; i++) {
    var t = ticks[i];
    ctx.beginPath();
    ctx.moveTo(t[0], t[1]);
    ctx.lineTo(t[0] + t[2] * 26, t[1] + t[3] * 26);
    ctx.stroke();
  }
}

function wobbleRect(ctx, off, w, col) {
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  var step = 18,
    amp = 3.0;
  var first = true;
  var S = 3000;
  var edge = function(x, y) {
    var jx = (vnoise(x * 0.012, y * 0.012) - 0.5) * amp * 2;
    var jy = (vnoise(x * 0.012 + 77, y * 0.012 + 31) - 0.5) * amp * 2;
    if (first) {
      ctx.moveTo(x + jx, y + jy);
      first = false;
    } else ctx.lineTo(x + jx, y + jy);
  };
  var x, y;
  for (x = off; x <= S - off; x += step) edge(x, off);
  for (y = off; y <= S - off; y += step) edge(S - off, y);
  for (x = S - off; x >= off; x -= step) edge(x, S - off);
  for (y = S - off; y >= off; y -= step) edge(off, y);
  ctx.closePath();
  ctx.stroke();
}

function vignette(ctx) {
  var g = ctx.createRadialGradient(1500, 1500, 1050, 1500, 1500, 2160);
  g.addColorStop(0, 'rgba(88,82,70,0)');
  g.addColorStop(1, 'rgba(88,82,70,0.10)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 3000, 3000);
}

function speckGrain() {
  noStroke();
  for (var k = 0; k < 4500; k++) {
    var dk = rnd() < 0.55;
    fill(dk ? 70 : 246, dk ? 70 : 244, dk ? 66 : 234, 6 + rndr(0, 14));
    rect(rnd() * width, rnd() * height, 1 + rndr(0, 2.2), 1 + rndr(0, 2.2));
  }
}

function grainPass() {
  loadPixels();
  var d = pixels;
  for (var i = 0; i < d.length; i += 4) {
    var g = (rnd() - 0.5) * 11;
    d[i] += g;
    d[i + 1] += g;
    d[i + 2] += g;
  }
  updatePixels();
}
