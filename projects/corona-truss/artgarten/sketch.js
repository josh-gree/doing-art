// "Corona Truss" — a warped triangular truss-lattice suffuses the whole plate in
// three woven line families; from it erupt ray-bursts whose cores are solid
// clusters of truss cells with honeycomb punch windows, tapered halo-woven rays,
// misregistered ghost passes, orbit arcs, dashed rings, vermilion pupils and
// embers, a cobalt stray, satellite micro-bursts, marginalia, plate mark, grain.
const INK = '#191511';
const PAPER = '#F2EDE0';
const GHOST = '#DBD2BC';
const VERM = '#D8431B';
const COBALT = '#2A46B8';

let S, R, N, x0, y0, Ww, Hh;
let nodes = [];
let fams = [
  [],
  [],
  []
]; // 0 horizontal, 1 down-right, 2 down-left
let cellsAll = [],
  adj = [],
  filledKind = [];
let cellsList = [],
  punches = [];
let F1, F2, F3, F4;
const clearings = [];
const AX = -Math.PI / 3; // long axis of the main mass / lens metric

function draw() {
  randomSeed(9);
  noiseSeed(20250613);
  background(PAPER);
  strokeCap(ROUND);
  strokeJoin(ROUND);

  S = 150;
  R = 24;
  N = 21;
  Ww = N * S;
  Hh = R * S * 0.8660254;
  x0 = (width - Ww) / 2; // lattice bleeds off every edge
  y0 = (height - Hh) / 2;

  F1 = {
    x: width * 0.44,
    y: height * 0.45
  }; // dominant burst
  F2 = {
    x: width * 0.905,
    y: height * 0.66
  }; // secondary, cropped right
  F3 = {
    x: width * 0.155,
    y: height * 0.85
  }; // small, lower left
  F4 = {
    x: width * 0.78,
    y: height * 0.195
  }; // weightless tick echo

  clearings.length = 0;
  clearings.push({
    x: width * 0.27,
    y: height * 0.155,
    r: 290,
    k: 0.45
  });
  clearings.push({
    x: width * 0.615,
    y: height * 0.815,
    r: 310,
    k: 0.42
  });
  clearings.push({
    x: F4.x,
    y: F4.y,
    r: 310,
    k: 0.50
  });

  buildNodes();
  buildSegments();
  buildCells();

  underGrain(7000, 6);

  ghostPass(); // misregistered ghost lattice
  renderLattice(); // three families, paper-halo weave
  orbitField(); // halo-woven arcs around F1

  drawBurst(F1, 32, 1500, 500, 82, 102, 15, {
    x: 20,
    y: 26
  });
  drawBurst(F2, 20, 800, 260, 46, 60, 11, null);
  drawBurst(F3, 14, 420, 160, 36, 48, 9, null);

  renderClusters(); // solid truss masses cover the ray roots

  rimFlicker(F1, 760, 16);
  pupil(F1, 140, 3);
  pupil(F2, 64, 0);

  dashedRingHalo(F2.x, F2.y, 770, 8, 8, 13);
  dashedRingHalo(F3.x, F3.y, 560, 10, 8, 13);

  satellites();
  tickBurst(F4.x, F4.y, 520);
  scatterField();
  embers();
  marginalia();
  plateMark();
  topGrain(6500, 22);
}

// ---------- lattice ----------

function buildNodes() {
  nodes = [];
  for (let j = 0; j <= R; j++) {
    const row = [];
    const off = (j % 2) ? S / 2 : 0;
    const cnt = (j % 2) ? N : N + 1;
    for (let i = 0; i < cnt; i++) {
      const bx = x0 + off + i * S;
      const by = y0 + j * S * 0.8660254;
      const dF = dist(bx, by, F1.x, F1.y);
      const t = constrain(dF / 1700, 0, 1);
      const amp = 10 + 34 * t; // calm near the sun, wild at edges
      let dx = (noise(bx * 0.00075, by * 0.00075, 11.7) - 0.5) * 2 * amp;
      let dy = (noise(bx * 0.00075, by * 0.00075, 23.3) - 0.5) * 2 * amp;
      if (dF > 1) { // slight parting around the mass
        const push = Math.max(0, 1 - dF / 700);
        const k = push * push * 40;
        dx += ((bx - F1.x) / dF) * k;
        dy += ((by - F1.y) / dF) * k;
      }
      row.push({
        x: bx + dx,
        y: by + dy
      });
    }
    nodes.push(row);
  }
}

function clearingK(x, y) {
  let k = 0;
  for (const c of clearings) {
    const d = dist(x, y, c.x, c.y);
    k = Math.max(k, c.k * Math.exp(-(d * d) / (2 * c.r * c.r)));
  }
  return k;
}

function skipProb(a, b) {
  const mx = (a.x + b.x) / 2,
    my = (a.y + b.y) / 2;
  const dF = dist(mx, my, F1.x, F1.y);
  let p = 0.02 + 0.16 * constrain(dF / 1900, 0, 1); // frays outward
  p += clearingK(mx, my);
  return p;
}

function segWeight(a, b) {
  const mx = (a.x + b.x) / 2,
    my = (a.y + b.y) / 2;
  const prox = 1 - constrain(dist(mx, my, F1.x, F1.y) / 1900, 0, 1);
  return (7.5 + 9.0 * prox) * (0.72 + 0.56 * noise(mx * 0.0016, my * 0.0016, 31.1));
}

function consider(a, b, f) {
  if (random() < skipProb(a, b)) return;
  fams[f].push({
    a: {
      x: a.x,
      y: a.y
    },
    b: {
      x: b.x,
      y: b.y
    },
    w: segWeight(a, b),
    col: INK
  });
}

function buildSegments() {
  fams = [
    [],
    [],
    []
  ];
  for (let j = 0; j <= R; j++) {
    for (let i = 0; i < nodes[j].length; i++) {
      const a = nodes[j][i];
      if (i < nodes[j].length - 1) consider(a, nodes[j][i + 1], 0);
      if (j < R) {
        if (j % 2 === 0) {
          if (i - 1 >= 0) consider(a, nodes[j + 1][i - 1], 2);
          if (i <= N - 1) consider(a, nodes[j + 1][i], 1);
        } else {
          consider(a, nodes[j + 1][i], 2);
          consider(a, nodes[j + 1][i + 1], 1);
        }
      }
    }
  }
  const flat = fams[0].concat(fams[1], fams[2]);
  const cands = flat.filter(sg =>
    dist((sg.a.x + sg.b.x) / 2, (sg.a.y + sg.b.y) / 2, F1.x, F1.y) > 620);
  const pool = cands.length ? cands : flat;
  for (let k = 0; k < 3; k++) random(pool).col = VERM;
  random(pool).col = COBALT;
}

// ---------- cells ----------

function nearestCell(pt) {
  let best = 0,
    bd = Infinity;
  for (let a = 0; a < cellsAll.length; a++) {
    const dx = cellsAll[a].cx - pt.x,
      dy = cellsAll[a].cy - pt.y;
    const q = dx * dx + dy * dy;
    if (q < bd) {
      bd = q;
      best = a;
    }
  }
  return best;
}

function metricLens(x, y) {
  const dx = x - F1.x,
    dy = y - F1.y;
  const cA = Math.cos(AX),
    sA = Math.sin(AX);
  const ta = (dx * cA + dy * sA) / 800;
  const up = (-dx * sA + dy * cA) / 620;
  return Math.sqrt(ta * ta + up * up);
}

function metricCircle(pt, reach) {
  return (x, y) => dist(x, y, pt.x, pt.y) / reach;
}

function growCluster(seed, maxCount, metric, coreFall) {
  filledKind[seed] = INK;
  const frontier = [seed];
  let count = 1,
    guard = 0;
  while (frontier.length && count < maxCount && guard++ < 12000) {
    const fi = int(random(frontier.length));
    const nbrs = adj[frontier[fi]].filter(m => !filledKind[m]);
    if (!nbrs.length) {
      frontier.splice(fi, 1);
      continue;
    }
    const m = random(nbrs);
    const c = cellsAll[m];
    const d = metric(c.cx, c.cy);
    if (d > 0.97) {
      frontier.splice(fi, 1);
      continue;
    }
    if (random() < (1 - coreFall * d) * (1 - clearingK(c.cx, c.cy) * 0.5)) {
      filledKind[m] = INK;
      frontier.push(m);
      count++;
    } else if (random() < 0.04) frontier.splice(fi, 1);
  }
}

function buildCells() {
  cellsAll = [];
  for (let j = 0; j < R; j++) {
    for (let i = 0; i < N; i++) {
      const tris = [];
      if (j % 2 === 0) {
        tris.push([nodes[j][i], nodes[j][i + 1], nodes[j + 1][i]]);
        if (i < N - 1) tris.push([nodes[j][i + 1], nodes[j + 1][i + 1], nodes[j + 1][i]]);
      } else {
        if (i < N - 1) {
          tris.push([nodes[j][i], nodes[j][i + 1], nodes[j + 1][i + 1]]);
          tris.push([nodes[j][i], nodes[j + 1][i], nodes[j + 1][i + 1]]);
        } else {
          tris.push([nodes[j][i], nodes[j + 1][i], nodes[j + 1][i + 1]]);
        }
      }
      for (const tr of tris) {
        const cx = (tr[0].x + tr[1].x + tr[2].x) / 3;
        const cy = (tr[0].y + tr[1].y + tr[2].y) / 3;
        cellsAll.push({
          tr,
          cx,
          cy
        });
      }
    }
  }
  const n = cellsAll.length;
  adj = new Array(n);
  for (let a = 0; a < n; a++) adj[a] = [];
  const maxD = S * 0.95,
    maxQ = maxD * maxD; // tolerant: warped cells stay connected
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      const dx = cellsAll[a].cx - cellsAll[b].cx;
      const dy = cellsAll[a].cy - cellsAll[b].cy;
      if (dx * dx + dy * dy < maxQ) {
        adj[a].push(b);
        adj[b].push(a);
      }
    }
  }
  filledKind = new Array(n).fill(null);

  growCluster(nearestCell(F1), 300, metricLens, 0.25);
  growCluster(nearestCell(F2), 70, metricCircle(F2, 470), 0.45);
  growCluster(nearestCell(F3), 30, metricCircle(F3, 330), 0.55);

  // guarantee a fat solid lens regardless of adjacency pinches:
  // heart fully tiled, belly tiled with a few natural gaps
  for (let a = 0; a < n; a++) {
    if (filledKind[a]) continue;
    const ml = metricLens(cellsAll[a].cx, cellsAll[a].cy);
    if (ml < 0.55) filledKind[a] = INK;
    else if (ml < 0.80 && random() < 0.92) filledKind[a] = INK;
  }

  // accent cells: vermilion ring inside, cobalt ring outside, kept apart
  let cob = 0,
    vems = 0;
  for (let a = 0; a < n; a++) {
    if (filledKind[a] !== INK) continue;
    const c = cellsAll[a];
    const d1 = dist(c.cx, c.cy, F1.x, F1.y);
    if (vems < 3 && d1 > 230 && d1 < 360 && random() < 0.09) {
      filledKind[a] = VERM;
      vems++;
    } else if (cob < 1 && d1 > 360 && d1 < 470 && random() < 0.08) {
      filledKind[a] = COBALT;
      cob++;
    }
  }
  for (let a = 0; a < n; a++) { // one vermilion cell in the F2 mass
    if (filledKind[a] !== INK) continue;
    const c = cellsAll[a];
    if (dist(c.cx, c.cy, F2.x, F2.y) < 240 && random() < 0.08) {
      filledKind[a] = VERM;
      break;
    }
  }

  for (let a = 0; a < n; a++) { // sparse pepper far from the masses
    if (filledKind[a]) continue;
    const c = cellsAll[a];
    const t = constrain(dist(c.cx, c.cy, F1.x, F1.y) / 1900, 0, 1);
    const p = (0.006 + 0.012 * t) * (1 - clearingK(c.cx, c.cy));
    if (random() < p) filledKind[a] = INK;
  }

  punches = []; // honeycomb windows, belly only
  for (let a = 0; a < n; a++) {
    if (filledKind[a] !== INK) continue;
    const c = cellsAll[a];
    let rate = 0;
    const ml = metricLens(c.cx, c.cy);
    if (ml > 0.36 && ml < 0.78) rate = 0.24;
    else if (dist(c.cx, c.cy, F2.x, F2.y) < 300) rate = 0.16;
    if (random() < rate) {
      const k = 0.52;
      const p0 = {
        x: c.cx + (c.tr[0].x - c.cx) * k,
        y: c.cy + (c.tr[0].y - c.cy) * k
      };
      const p1 = {
        x: c.cx + (c.tr[1].x - c.cx) * k,
        y: c.cy + (c.tr[1].y - c.cy) * k
      };
      const p2 = {
        x: c.cx + (c.tr[2].x - c.cx) * k,
        y: c.cy + (c.tr[2].y - c.cy) * k
      };
      punches.push([p0, p1, p2]);
    }
  }

  cellsList = [];
  for (let a = 0; a < n; a++) {
    if (filledKind[a]) cellsList.push({
      tr: cellsAll[a].tr,
      kind: filledKind[a]
    });
  }
}

// ---------- render ----------

function ghostPass() {
  push();
  translate(18, 22);
  noFill();
  stroke(GHOST);
  for (const fam of fams)
    for (const sg of fam) {
      strokeWeight(sg.w + 4);
      line(sg.a.x, sg.a.y, sg.b.x, sg.b.y);
    }
  pop();
}

function renderLattice() {
  for (const fam of fams) {
    noFill();
    stroke(PAPER);
    for (const sg of fam) {
      strokeWeight(sg.w + 8);
      line(sg.a.x, sg.a.y, sg.b.x, sg.b.y);
    }
    for (const sg of fam) {
      stroke(sg.col);
      strokeWeight(sg.w);
      line(sg.a.x, sg.a.y, sg.b.x, sg.b.y);
    }
  }
  noStroke();
}

function orbitField() {
  orbitArcsHalo(F1.x, F1.y, 1120, PI * 0.95, PI * 1.55, 5, 11, 16);
  orbitArcsHalo(F1.x, F1.y, 1330, PI * 1.00, PI * 1.45, 3, 9, 13);
  orbitArcsHalo(F1.x, F1.y, 1620, 0, TWO_PI, 6, 7, 10);
}

function orbitArcsHalo(cx, cy, r, a0, a1, count, wMin, wMax) {
  const specs = [];
  for (let j = 0; j < count; j++) {
    const s = random(a0, Math.max(a0 + 0.05, a1 - 0.3));
    const span = Math.min(random(0.25, 0.7), a1 - s);
    specs.push([s, span, random(wMin, wMax)]);
  }
  noFill();
  stroke(PAPER);
  for (const sp of specs) {
    strokeWeight(sp[2] + 9);
    arc(cx, cy, r * 2, r * 2, sp[0], sp[0] + sp[1]);
  }
  stroke(INK);
  for (const sp of specs) {
    strokeWeight(sp[2]);
    arc(cx, cy, r * 2, r * 2, sp[0], sp[0] + sp[1]);
  }
  noStroke();
}

function dashedRingHalo(cx, cy, r, count, wMin, wMax) {
  const specs = [];
  for (let j = 0; j < count; j++) {
    const s = random(TWO_PI);
    const span = random(0.22, 0.85);
    specs.push([s, span, random(wMin, wMax)]);
  }
  noFill();
  stroke(PAPER);
  for (const sp of specs) {
    strokeWeight(sp[2] + 8);
    arc(cx, cy, r * 2, r * 2, sp[0], sp[0] + sp[1]);
  }
  stroke(INK);
  for (const sp of specs) {
    strokeWeight(sp[2]);
    arc(cx, cy, r * 2, r * 2, sp[0], sp[0] + sp[1]);
  }
  noStroke();
}

// tapered ribbon polygon; halo widens the paper under-pass
function ribbonPath(cx, cy, a, inner, L, t0, t1, w0, w1, bend, halo) {
  const K = 12;
  const dx = Math.cos(a),
    dy = Math.sin(a);
  const px = -dy,
    py = dx;
  beginShape();
  for (let k = 0; k <= K; k++) {
    const t = t0 + (t1 - t0) * (k / K);
    const r = inner + L * t;
    const w = lerp(w0, w1, t) / 2 + halo;
    const off = bend * t * t;
    vertex(cx + dx * r + px * (off + w), cy + dy * r + py * (off + w));
  }
  for (let k = K; k >= 0; k--) {
    const t = t0 + (t1 - t0) * (k / K);
    const r = inner + L * t;
    const w = lerp(w0, w1, t) / 2 + halo;
    const off = bend * t * t;
    vertex(cx + dx * r + px * (off - w), cy + dy * r + py * (off - w));
  }
  endShape(CLOSE);
}

function drawBurst(c, n, baseR, inner, w0lo, w0hi, halo, ghostOff) {
  const rot = random(TWO_PI);
  const heroes = new Set();
  while (heroes.size < 4) heroes.add(int(random(n)));
  const specs = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TWO_PI + random(-0.22, 0.22) * (TWO_PI / n);
    const L = heroes.has(i) ? baseR * random(1.08, 1.25) :
      baseR * (0.55 + 0.45 * pow(random(), 1.2));
    const w0 = random(w0lo, w0hi);
    const w1 = Math.max(18, w0 * random(0.30, 0.45));
    const bend = (random() < 0.15 ? random(-1, 1) : random(-0.2, 0.2)) * L * 0.045;
    let pieces;
    if (L > 500 && random() < 0.18) { // broken stroke: gap punched out
      const g0 = random(0.32, 0.62);
      pieces = [
        [0, g0],
        [g0 + random(0.05, 0.13), 1]
      ];
    } else {
      pieces = [
        [0, 1]
      ];
    }
    specs.push({
      a,
      L,
      w0,
      w1,
      bend,
      pieces
    });
  }
  if (ghostOff) { // misregistered ghost of the burst
    push();
    translate(ghostOff.x, ghostOff.y);
    noStroke();
    fill(GHOST);
    for (const sp of specs)
      for (const pc of sp.pieces)
        ribbonPath(c.x, c.y, sp.a, inner, sp.L, pc[0], pc[1], sp.w0, sp.w1, sp.bend, 0);
    pop();
  }
  noStroke();
  fill(PAPER); // halo pass weaves over the lattice
  for (const sp of specs)
    for (const pc of sp.pieces)
      ribbonPath(c.x, c.y, sp.a, inner, sp.L, pc[0], pc[1], sp.w0, sp.w1, sp.bend, halo);
  fill(INK);
  for (const sp of specs)
    for (const pc of sp.pieces)
      ribbonPath(c.x, c.y, sp.a, inner, sp.L, pc[0], pc[1], sp.w0, sp.w1, sp.bend, 0);
}

function renderClusters() {
  noStroke();
  for (const c of cellsList) {
    fill(c.kind);
    triangle(c.tr[0].x, c.tr[0].y, c.tr[1].x, c.tr[1].y, c.tr[2].x, c.tr[2].y);
  }
  fill(PAPER);
  for (const p of punches) triangle(p[0].x, p[0].y, p[1].x, p[1].y, p[2].x, p[2].y);
}

function rimFlicker(c, r0, n) {
  noStroke();
  fill(INK);
  const rot = random(TWO_PI);
  for (let i = 0; i < n; i++) {
    const a = rot + ((i + 0.5) / n) * TWO_PI + random(-0.25, 0.25) * (TWO_PI / n);
    ribbonPath(c.x, c.y, a, r0, random(140, 300), 0, 1, random(10, 16), 6, 0, 0);
  }
}

function pupil(c, d, nRiv) {
  noStroke();
  fill(VERM);
  ellipse(c.x, c.y, d, d);
  let placed = 0,
    guard = 0;
  while (placed < nRiv && guard++ < 800) {
    const cl = random(cellsList);
    if (!cl || cl.kind !== INK) continue;
    const mx = (cl.tr[0].x + cl.tr[1].x + cl.tr[2].x) / 3;
    const my = (cl.tr[0].y + cl.tr[1].y + cl.tr[2].y) / 3;
    const dd = dist(mx, my, c.x, c.y);
    if (dd > d * 0.75 && dd < d * 2.2) {
      ellipse(mx, my, 18 + random() * 8, 18 + random() * 8);
      placed++;
    }
  }
}

function satellites() {
  const spots = [
    [0.655, 0.335],
    [0.225, 0.575],
    [0.60, 0.80],
    [0.13, 0.14]
  ];
  for (const s of spots) microBurst(width * s[0], height * s[1], random(90, 150));
}

function microBurst(cx, cy, Rm) {
  const n = int(random(7, 11));
  const rot = random(TWO_PI);
  const specs = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TWO_PI + random(-0.15, 0.15) * (TWO_PI / n);
    specs.push([a, Rm * random(0.6, 1.0), random(8, 13)]);
  }
  noStroke();
  fill(PAPER);
  ellipse(cx, cy, Rm * 1.35, Rm * 1.35); // paper medallion clears the lattice
  for (const s of specs) ribbonPath(cx, cy, s[0], 8, s[1], 0, 1, s[2], 4, 0, 7);
  fill(INK);
  for (const s of specs) ribbonPath(cx, cy, s[0], 8, s[1], 0, 1, s[2], 4, 0, 0);
  ellipse(cx, cy, 22, 22);
}

function tickBurst(cx, cy, Rm) {
  const n = 30;
  const rot = random(TWO_PI);
  const specs = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TWO_PI + random(-0.15, 0.15) * (TWO_PI / n);
    specs.push([a, Rm * 0.38, Rm * random(0.28, 0.50), random(14, 19)]);
  }
  noStroke();
  fill(PAPER);
  ellipse(cx, cy, Rm * 1.04, Rm * 1.04); // open-paper pad under the echo
  for (const s of specs) ribbonPath(cx, cy, s[0], s[1], s[2], 0, 1, s[3], 7, 0, 5);
  fill(INK);
  for (const s of specs) ribbonPath(cx, cy, s[0], s[1], s[2], 0, 1, s[3], 7, 0, 0);
  fill(VERM);
  ellipse(cx, cy, 34, 34);
  dashedRingHalo(cx, cy, Rm * 0.98, 8, 6, 9);
}

function scatterField() {
  const keepClear = [{
    x: F1.x,
    y: F1.y,
    r: 1000
  }, {
    x: F2.x,
    y: F2.y,
    r: 520
  }, {
    x: F3.x,
    y: F3.y,
    r: 430
  }, {
    x: F4.x,
    y: F4.y,
    r: 380
  }, ];
  noStroke();
  for (let i = 0; i < 110; i++) {
    const x = random(width),
      y = random(height);
    let blocked = false;
    for (const c of keepClear)
      if (dist(x, y, c.x, c.y) < c.r) {
        blocked = true;
        break;
      }
    if (blocked) continue;
    if (random() < 0.6) {
      fill(INK);
      const r = random(3, 11);
      ellipse(x, y, r * 2, r * 2);
    } else {
      const a = Math.atan2(F1.y - y, F1.x - x) + random(-0.5, 0.5);
      const L = random(24, 72),
        w0 = random(7, 12);
      fill(PAPER);
      ribbonPath(x, y, a, 0, L, 0, 1, w0, 4, 0, 5);
      fill(INK);
      ribbonPath(x, y, a, 0, L, 0, 1, w0, 4, 0, 0);
    }
  }
}

function embers() {
  noStroke();
  fill(VERM);
  ellipse(width * 0.575, height * 0.125, 28, 28);
  ellipse(width * 0.475, height * 0.875, 22, 22);
  ellipse(width * 0.055, height * 0.60, 18, 18);
}

function marginalia() {
  const marks = [{
    x: 430,
    y: 330,
    ux: 0.5,
    uy: -0.866,
    L: 130,
    w: 11,
    col: INK
  }, {
    x: 185,
    y: 1520,
    ux: 1,
    uy: 0,
    L: 105,
    w: 10,
    col: INK
  }, {
    x: 2790,
    y: 1060,
    ux: -0.5,
    uy: 0.866,
    L: 120,
    w: 11,
    col: VERM
  }];
  for (const m of marks) {
    noFill();
    stroke(PAPER);
    strokeWeight(m.w + 10);
    line(m.x, m.y, m.x + m.ux * m.L, m.y + m.uy * m.L);
    stroke(m.col);
    strokeWeight(m.w);
    line(m.x, m.y, m.x + m.ux * m.L, m.y + m.uy * m.L);
  }
  noStroke();
}

function plateMark() {
  push();
  translate(200, 2800);
  noFill();
  stroke(INK);
  strokeWeight(6);
  strokeJoin(ROUND);
  triangle(0, 0, 48, 0, 24, -42);
  stroke(VERM);
  line(64, -21, 128, -21);
  pop();
  noStroke();
}

// ---------- texture ----------

function underGrain(n, a) {
  noStroke();
  fill(25, 21, 17, a);
  for (let i = 0; i < n; i++) {
    const s = random(1, 3);
    rect(random(width), random(height), s, s);
  }
}

function topGrain(n, a) {
  noStroke();
  for (let i = 0; i < n; i++) {
    if (random() < 0.5) fill(255, a);
    else fill(30, a);
    const s = random(1, 3);
    rect(random(width), random(height), s, s);
  }
}
