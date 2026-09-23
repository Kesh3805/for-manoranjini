// ============================================================ stroke letterforms (no font files): polylines in a 1 x 1.4 cell
const arc = (cx, cy, rx, ry, a0, a1, n = 18) => { const o = []; for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return o; };
const GLYPH = {
  A: { w: 1, s: [[[0, 0], [.5, 1.4], [1, 0]], [[.2, .56], [.8, .56]]] },
  D: { w: 1, s: [[[0, 0], [0, 1.4], [.42, 1.4], ...arc(.42, .7, .58, .7, 90, -90), [0, 0]]] },
  E: { w: .9, s: [[[.9, 0], [0, 0], [0, 1.4], [.9, 1.4]], [[0, .72], [.7, .72]]] },
  F: { w: .9, s: [[[0, 0], [0, 1.4], [.9, 1.4]], [[0, .74], [.7, .74]]] },
  H: { w: 1, s: [[[0, 0], [0, 1.4]], [[1, 0], [1, 1.4]], [[0, .72], [1, .72]]] },
  I: { w: .5, s: [[[.25, 0], [.25, 1.4]], [[0, 0], [.5, 0]], [[0, 1.4], [.5, 1.4]]] },
  J: { w: .9, s: [[[.2, 1.4], [.9, 1.4]], [[.65, 1.4], [.65, .42], ...arc(.35, .42, .3, .42, 0, -180)]] },
  M: { w: 1.15, s: [[[0, 0], [0, 1.4], [.575, .55], [1.15, 1.4], [1.15, 0]]] },
  N: { w: 1, s: [[[0, 0], [0, 1.4], [1, 0], [1, 1.4]]] },
  O: { w: 1.1, s: [arc(.55, .7, .55, .7, 0, 360, 40)] },
  R: { w: 1, s: [[[0, 0], [0, 1.4], [.55, 1.4], ...arc(.55, 1.06, .4, .34, 90, -90, 14), [0, .72]], [[.45, .72], [1, 0]]] },
  S: { w: .95, s: [[...arc(.48, 1.05, .45, .35, 20, 270, 16), ...arc(.48, .35, .47, .35, 90, -160, 18)]] },
  T: { w: 1, s: [[[0, 1.4], [1, 1.4]], [[.5, 1.4], [.5, 0]]] },
  U: { w: 1, s: [[[0, 1.4], [0, .45], ...arc(.5, .45, .5, .45, 180, 360, 18), [1, 1.4]]] },
  V: { w: 1, s: [[[0, 1.4], [.5, 0], [1, 1.4]]] },
  W: { w: 1.3, s: [[[0, 1.4], [.3, 0], [.65, .95], [1, 0], [1.3, 1.4]]] },
  Y: { w: 1, s: [[[0, 1.4], [.5, .7], [1, 1.4]], [[.5, .7], [.5, 0]]] },
  ',': { w: .35, s: [[[.2, .12], [.05, -.28]]] },
  '.': { w: .35, s: [arc(.15, .07, .07, .07, 0, 360, 10)] },
  ' ': { w: .55, s: [] },
};
// lay out lines of text into segments (and "star" vertices for the constellation)
function layout(lines, width, lineGap = 2.2) {
  const segs = [], verts = [], rows = [];
  for (const line of lines) { let x = 0; const row = []; for (const ch of line) { const g = GLYPH[ch]; row.push([g, x]); x += g.w + .32; } rows.push([row, x - .32]); }
  const maxW = Math.max(...rows.map(r => r[1])), sc = width / maxW, H = (rows.length - 1) * lineGap;
  rows.forEach(([row, w], li) => {
    const ox = -w / 2, oy = H / 2 - li * lineGap - .7;
    for (const [g, x] of row) for (const pl of g.s) {
      const P = pl.map(([a, b]) => [-(a + x + ox) * sc, (b + oy) * sc]); // camera looks down +z, so mirror x
      for (let i = 0; i < P.length - 1; i++) segs.push([P[i], P[i + 1], Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1])]);
      P.forEach((q, i) => { if (i === 0 || i === P.length - 1 || i % 6 === 0 || pl.length <= 5) verts.push(q); });
    }
  });
  return { segs, verts, sc };
}
function onSegs(segs, r) {
  const tot = segs.reduce((a, s) => a + s[2], 0); let u = r() * tot;
  for (const s of segs) { if (u <= s[2]) { const f = u / s[2]; return [mix(s[0][0], s[1][0], f), mix(s[0][1], s[1][1], f)]; } u -= s[2]; }
  const s = segs[segs.length - 1]; return s[1];
}

// ============================================================ target shapes for the one continuous story particle set (256 x 256)
const NS = 65536, SHAPES = [];
function makeShape(fn, seed) {
  const r = rng(seed), d = new Float32Array(NS * 4);
  for (let i = 0; i < NS; i++) { const v = fn(i, r); d.set(v, i * 4); }
  const s = { tex: dataTex(256, 256, d) }; SHAPES.push(s); return SHAPES.length - 1;
}
const sphR = (r, rad) => { const z = 2 * r() - 1, a = TAU * r(), q = Math.sqrt(1 - z * z), k = rad * Math.cbrt(r()); return [q * Math.cos(a) * k, z * k, q * Math.sin(a) * k]; };
const NAME_L = layout(['MANORANJINI'], 12.5);
const SENT_L = layout(['IN AN INFINITE UNIVERSE,', 'SOMEHOW I FOUND YOU.'], 13.5, 2.3);
const ISL = [[4, 5, 12, 2.2], [-5, 6.5, 18, 2.8], [3, 4, 26, 1.8], [-2, 8, 36, 2.4], [7, 9, 40, 3]];

const SH = {};
SH.none = makeShape(() => [0, 0, 0, 0], 1);
// light scattered through the second universe: blooms on the islands and glints above the ocean
SH.src = makeShape((i, r) => {
  if (r() < .62) { const I = ISL[Math.floor(r() * 5)], a = r() * TAU, q = Math.sqrt(r()) * I[3] * .8;
    return [I[0] + Math.cos(a) * q, I[1] + .1 + r() * .25, I[2] + Math.sin(a) * q, .5 + r() * .6]; }
  return [(r() - .5) * 26, .15 + r() * .6, 4 + r() * 36, .35 + r() * .4];
}, 2);
SH.ball = makeShape((i, r) => { const p = sphR(r, .45); return [p[0], p[1], p[2], 1.4]; }, 3);
SH.flowers = makeShape((i, r) => {
  const k = i % 40, rr = rng(k * 97 + 5); const a = k / 40 * TAU * 3.1 + rr(), rad = 1.5 + 5.5 * Math.sqrt((k + .5) / 40);
  const cx = Math.cos(a) * rad, cy = Math.sin(a) * rad * .62, size = .45 + rr() * .45, pet = 5 + Math.floor(rr() * 3);
  if (r() < .14) { const q = sphR(r, .08 * size); return [cx + q[0], cy + q[1], q[2], 1.8]; }
  const th = r() * TAU, rm = size * Math.abs(Math.cos(pet * th / 2)), q = Math.sqrt(r()) * rm;
  return [cx + Math.cos(th) * q, cy + Math.sin(th) * q, (r() - .5) * .15, .8 + .5 * q / Math.max(rm, 1e-3)];
}, 4);
SH.stars = makeShape((i, r) => {
  const k = i % 150, rr = rng(k * 31 + 7); const x = (rr() - .5) * 15, y = (rr() - .5) * 6, z = (rr() - .5) * 2;
  const g = .04 + .06 * Math.pow(rr(), 3); return [x + gauss(r) * g, y + gauss(r) * g, z + gauss(r) * g, 1 + rr() * 1.5];
}, 5);
SH.name = makeShape((i, r) => { const [x, y] = onSegs(NAME_L.segs, r); return [x + gauss(r) * .045, y + gauss(r) * .045, gauss(r) * .05, 1.1]; }, 6);
SH.constel = makeShape((i, r) => {
  if (r() < .3) { const v = NAME_L.verts[Math.floor(r() * NAME_L.verts.length)]; return [v[0] + gauss(r) * .02, v[1] + gauss(r) * .02, 0, 2.6]; }
  const [x, y] = onSegs(NAME_L.segs, r); return [x + gauss(r) * .012, y + gauss(r) * .012, 0, .28];
}, 7);
SH.galaxy = makeShape((i, r) => {
  const rad = Math.min(-Math.log(1 - r() * .985) * 1.9, 8), k = r() < .5 ? 0 : Math.PI;
  const th = k + 2.4 * Math.log(Math.max(rad, .05)) + gauss(r) * (r() < .75 ? .22 : .8);
  return [Math.cos(th) * rad, Math.sin(th) * rad * .55, gauss(r) * .12, rad < 1 ? 1.6 : .9];
}, 8);
SH.heart = makeShape((i, r) => {
  const t = r() * TAU, hx = 16 * Math.pow(Math.sin(t), 3), hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  const edge = r() < .45, q = edge ? 1 : Math.sqrt(r());
  return [hx * q * .3, (hy * q + 2.5 * (1 - q)) * .3, gauss(r) * .18 * (1 - q * .6), edge ? 1.6 : .8];
}, 9);
SH.scatter = makeShape((i, r) => { const p = sphR(r, 11); return [p[0], p[1], p[2], .55]; }, 10);
SH.sent = makeShape((i, r) => { const [x, y] = onSegs(SENT_L.segs, r); return [x + gauss(r) * .035, y + gauss(r) * .035, gauss(r) * .04, 1.05]; }, 11);
SH.far = makeShape((i, r) => { const z = 2 * r() - 1, a = TAU * r(), q = Math.sqrt(1 - z * z), k = 45 + r() * 60; return [q * Math.cos(a) * k, z * k * .6, q * Math.sin(a) * k, .35]; }, 12);
