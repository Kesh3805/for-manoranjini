// ============================================================ Universe 1 — cool, vast, searching (0:00 – 1:20)
const H1 = [[0, [0, 0, 0]], [8, [1.2, .3, 4]], [16, [4, 1, 14]], [24, [6, 2, 30]], [30, [4, 3, 44]], [38, [0, 2, 52]], [46, [-3, 1, 58]],
  [54, [-6, 0, 70]], [62, [-8, -1, 95]], [70, [-9, -1.5, 118]], [77.5, [-9, -1.6, 130]], [80, [-9, -1.6, 131]]];
const PATH_T = 80;
const PATH_TEX = (() => { const d = new Float32Array(256 * 4); for (let i = 0; i < 256; i++) d.set([...spline(H1, i / 255 * PATH_T), 0], i * 4); return dataTex(256, 1, d); })();
const BHP = [-9, -1.6, 130], BH_RS = 1.2, BH_N = V.norm([.25, 1, -.35]);
const P1 = [3.2, .2, 10], P2 = [1.5, 1.2, 55], P3 = [6.5, 3.2, 33];
const C1 = [ // camera: [t, pos, target, fov]
  [0, [0, .3, -7], [0, 0, 0], 40], [6, [0, .4, -6.5], [.5, .1, 1.5], 40], [12, [-2, 1.5, -3], [2.4, .6, 8.6], 44],
  [20, [-6, 5, 2], [5, 1.5, 22], 50], [28, [-12, 10, 10], [5, 2.5, 40], 55],
  [32, [-4, 6, 34], [3, 2.8, 47], 50], [36, [3.2, 2.4, 49.5], [1.5, 1.2, 55], 42], [40, [2.3, 2.1, 52.6], [1.2, 1, 54.5], 40],
  [44, [.4, 2, 53.2], [1, 1.6, 54.2], 40], [48, [-1.5, 1.6, 56], [-3.2, 1.1, 58.5], 42], [52, [-2, 2.2, 60], [-4.6, .6, 63.5], 44],
  [56, [-1, 6, 56], [-7, -.5, 80], 55], [60, [-3, 4, 68], [-8, -1, 100], 52],
  [66, [-6, 1.5, 90], [-9, -1.5, 120], 48], [72, [-8.2, -.6, 112], [-9, -1.6, 130], 46], [76, [-8.8, -1.3, 122], [-9, -1.6, 130], 46], [80, [-9, -1.55, 128], [-9, -1.6, 132], 46]];
const camKey = (K, t) => { const P = spline(K.map(k => [k[0], [...k[1], ...k[2], k[3]]]), t); return cam(P.slice(0, 3), P.slice(3, 6), P[6], Math.sin(t * .05) * .03); };
function project(C, p) { const w = V.sub(p, C.p), z = V.dot(w, C.f); return z <= 0 ? null : [.5 + .5 * V.dot(w, C.r) / (z * C.tan), .5 + .5 * V.dot(w, C.u) / (z * C.tan), z]; }

function universe1(t) {
  const hero = spline(H1, t);
  let C = camKey(C1, t);
  // intimate follow shot: the creatures gather around the particle
  const fw = sm(44.5, 46.5, t) * (1 - sm(53, 56, t));
  if (fw > 0) { const ah = spline(H1, t + .4), side = V.norm(V.cross(V.sub(ah, hero), [0, 1, 0]));
    const fwd = V.norm(V.sub(ah, hero)), fp = V.add(V.add(hero, V.mul(fwd, 1.5)), V.add(V.mul(side, 1.1), [0, .4, 0]));
    const C2_ = cam(fp, V.sub(hero, V.mul(fwd, .9)), 42); C = cam(V.lerp(C.p, fp, fw), V.lerp(V.add(C.p, C.f), V.add(fp, C2_.f), fw), mix(40, 42, fw)); }
  const F = newFrame(C);
  F.hero = hero; F.heroI = sm(3, 6, t) * (1 + .4 * sm(50, 60, t));
  F.env = { warm: 0, reveal: .8 * sm(9, 45, t), neb: .4 * sm(9, 40, t), ocean: 0, dim: 1, sun: [0, 0, 1], isl: [] };
  // matter spawned in the particle's wake
  F.parts.push(PS(0, 200000, { bright: 3, ref: 2.5, seed: 11 }));
  // galaxies condensing in the distance, seeded from points on the path
  for (const [ts, off, R, arms, n] of [[16, [-22, 8, 30], 9, 2, 90000], [22, [26, -6, 55], 11, 3, 110000], [28, [-30, 12, 70], 8, 2, 80000]]) {
    const c = V.add(spline(H1, ts), off);
    F.parts.push(PS(1, n, { P0: [...c, ts], P1: [...V.norm([Math.sin(ts), 1, Math.cos(ts)]), R], P2: [arms, .06, 0, 0], bright: .5, seed: 20 + ts }));
  }
  // the largest galaxy, with the black hole at its core
  F.parts.push(PS(1, 420000, { P0: [...BHP, 20], P1: [...BH_N, 30], P2: [2, .05, 0, 0], bright: .35 * (1 - .6 * sm(70, 77, t)), seed: 29 }));
  // planets accreting from dust; one becomes a world of flowers
  for (const [P, R, ts, type, seed] of [[P1, .6, 7, 0, 3], [P3, .9, 13, 0, 7], [P2, 1.5, 21, 1, 11]]) {
    const f = sm(ts, ts + 9, t);
    if (f > 0) { F.parts.push(PS(2, 30000, { P0: [...P, ts], P1: [R, 0, 0, 0], bright: 1.2, ref: 3, seed: 40 + seed }));
      F.bodies.push({ p: P, R: R * Math.cbrt(f), type, seed, bloom: sm(33, 41, t) }); }
  }
  // tiny glowing creatures begin trailing the particle
  const cv = sm(40, 45, t) * (1 - sm(74, 77, t));
  if (cv > 0) F.parts.push(PS(3, 1600, { P0: [cv, 0, 0, 0], bright: 14, ref: 2, pxMin: 7, seed: 50 }));
  // the black hole: accretion disk + screen-space lensing
  const bv = sm(56, 64, t);
  if (bv > 0) F.parts.push(PS(4, 140000, { P0: [...BHP, bv], P1: [...BH_N, BH_RS], bright: .45, seed: 60 }));
  const pr = project(C, BHP);
  if (pr && bv > 0) F.post.bh = [pr[0], pr[1], Math.min(BH_RS / pr[2] / C.tan * .5, 2), bv];
  sprite(F, hero, .04, [.8, .9, 1], 2.2 * F.heroI, .6, .8);
  F.post.warm = 0; F.post.exp = 1.1;
  F.post.white = sm(76.9, 77.7, t);
  F.post.fade = sm(1.5, 4, t);
  return F;
}

// ============================================================ Universe 2 — warm, dense, arriving (1:20 – 3:00)
const H2 = [[80, [0, 6, 0]], [86, [2, 5.6, 10]], [92, [0, 4.5, 20]], [98, [-3, 5, 28]], [104, [-1, 6, 33]], [110, [0, 8, 38]], [180, [0, 8, 38]]];
const C5 = [0, 13, 48];
const C2 = [
  [80, [0, 6.3, -4], [0, 6, 1], 46], [84, [-3, 6, 2], [1, 5.6, 9], 48], [88, [4, 3, 8], [1, 4.8, 14], 50], [94, [-4, 2.2, 16], [0, 4.5, 21], 50],
  [100, [3, 4.5, 22], [-2.5, 5, 29], 48], [106, [-2, 7, 26], [-.5, 6.6, 34], 46], [110, [0, 8.6, 30], [0, 8.4, 38], 46],
  [114, [0, 9.5, 29], [0, 12, 46], 50], [120, [0, 9.8, 31], [0, 12.6, 47], 50], [128, [0, 10.2, 32], [0, 13, 48], 50], [131, [0, 10.2, 32.3], [0, 13, 48], 50],
  [136, [0, 11, 22], [0, 13, 48], 44], [150, [0, 11, 24], [0, 13, 48], 46], [154, [0, 11, 25], [0, 13, 48], 46], [160, [0, 11, 25], [0, 13, 48], 46],
  [172, [0, 11, 21], [0, 13, 48], 48], [180, [0, 11, 20.5], [0, 13, 48], 48]];
// story particles: [t0, t1, from, to, stagger, swirl]
const STORY = [
  [84, 94, 'src', 'src', 0, 0], [94, 110, 'src', 'ball', 1.6, .2], [110, 116, 'ball', 'flowers', .5, .6], [116, 121, 'flowers', 'stars', .5, .5],
  [121, 131, 'stars', 'name', .45, .4], [131, 135, 'name', 'constel', .3, .1], [135, 139, 'constel', 'constel', 0, 0], [139, 143, 'constel', 'galaxy', .5, .4],
  [143, 147.5, 'galaxy', 'heart', .5, .5], [147.5, 150, 'heart', 'scatter', .4, .3], [150, 154, 'scatter', 'sent', .5, .3], [154, 160, 'sent', 'sent', 0, 0],
  [160, 172, 'sent', 'far', .8, .5]];
const LOCAL = new Set(['flowers', 'stars', 'name', 'constel', 'galaxy', 'heart', 'scatter', 'sent', 'far']);
function shapeXform(name, t, hero) {
  if (name === 'src') return [I3, [0, 0, 0]];
  if (name === 'ball') return [I3, hero];
  if (name === 'name') { const k = 1 - sm(123.5, 130, t); return [rotM(0, k * 1.35 + .1 * Math.sin(t * .3) * k, 1, k * .5), C5]; }
  if (name === 'constel') { const a = sm(135, 139.5, t) * TAU; return [rotM(0, a, 1, Math.sin(a) * .25), C5]; }
  if (name === 'galaxy') return [rotM(0, t * .15, 1, -.5), C5];
  return [I3, C5];
}
function storyAt(t, hero) {
  if (t < 84 || t >= 172) return null;
  const s = STORY.find(s => t < s[1]) || STORY[STORY.length - 1];
  const u = sm(s[0], s[1], t), [RA, OA] = shapeXform(s[2], t, s[2] === 'ball' ? spline(H2, s[0] === 110 ? 110 : t) : hero), [RB, OB] = shapeXform(s[3], t, hero);
  const chaos = t < 121 ? .05 : t < 131 ? 1.1 * Math.pow(1 - sm(122, 130, t), .6) + .015 : .015;
  const alpha = sm(84, 88, t) * (1 - sm(164, 172, t)) * (1 + 1.2 * sm(100, 110, t) * (1 - sm(110, 114, t)));
  return { mode: 7, count: NS, A: SH[s[2]], B: SH[s[3]], RA, OA, RB, OB, mix: u, stag: s[4], swirl: s[5], chaos, alpha, P0: [0, 0, 0, 0], P1: [0, 0, 0, 0], P2: [0, 0, 0, 0],
    bright: 2.2, ref: 1e6, pxMin: 1.6, near: .05, seed: 99 };
}
function universe2(t) {
  const C = camKey(C2, t), F = newFrame(C), hero = spline(H2, t);
  const collected = sm(94, 110, t);
  F.hero = hero; F.heroI = (.8 + 3 * collected) * (1 - sm(110, 115, t));
  const dim = (1 - .6 * sm(110, 119, t)) * (1 - .6 * sm(160, 176, t));
  F.env = { warm: 1, reveal: .6 + .4 * sm(110, 130, t), neb: .5, ocean: 1, dim, sun: V.norm([-.8, .14, .6]), isl: ISL };
  const bv = sm(82, 88, t) * (1 - sm(114, 122, t));
  if (bv > 0) F.parts.push(PS(5, 420, { P0: [bv, 0, 0, 0], bright: 1.6, ref: 4, seed: 70 }));
  F.parts.push(PS(6, 30, { P0: [dim, 0, 0, 0], bright: 3, ref: 1e6, seed: 80 }));
  F.story = storyAt(t, hero);
  sprite(F, hero, .06 + .1 * collected, [1, .85, .6], (2 + 30 * collected) * F.heroI / (.8 + 3 * collected + 1e-3), .8, 1.4);
  // the final star: one small, steady light
  sprite(F, C5, .02, [1, .92, .8], sm(170, 175, t) * 3.5, .7, 1);
  F.post.warm = 1; F.post.exp = 1.05;
  F.post.white = 1 - sm(80.3, 83, t);
  F.post.fade = 1 - .35 * sm(176, 180, t);
  return F;
}

// ============================================================ playback
const DUR = 180;
const frameAt = t => t < 80 ? universe1(t) : universe2(t);
let T = 0, paused = false, last = performance.now(), ftA = 0, ftN = 0;
const q0 = new URLSearchParams(location.search);
if (q0.get('t')) T = parseFloat(q0.get('t')) || 0;
if (q0.get('p')) paused = true;
addEventListener('keydown', e => {
  if (e.code === 'Space') { paused = !paused; e.preventDefault(); }
  else if (e.code === 'ArrowRight') T = Math.min(DUR - .01, T + 10);
  else if (e.code === 'ArrowLeft') T = Math.max(0, T - 10);
  else if (e.code === 'KeyR') T = 0;
  else if (e.code === 'KeyF') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
});
cv.addEventListener('dblclick', () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.());
function loop(now) {
  requestAnimationFrame(loop);
  const raw = (now - last) / 1000; last = now;
  if (!paused) { T = Math.min(T + Math.min(raw, .1), DUR); // holds on the final star
    ftA += raw; ftN++;
    if (ftN >= 60) { const a = ftA / ftN; ftA = 0; ftN = 0;
      if (a > .028) { if (qPart > .5) qPart *= .85; else if (qRes > .55) { qRes *= .88; resize(); } }
      else if (a < .014) { if (qRes < 1) { qRes = Math.min(1, qRes / .92); resize(); } else if (qPart < 1) qPart = Math.min(1, qPart / .9); } } }
  render(frameAt(T), T);
}
window.__gift = { frame: t => frameAt(t), get t() { return T; }, set t(v) { T = v; }, get q() { return [qRes, qPart, W]; } };
requestAnimationFrame(loop);
