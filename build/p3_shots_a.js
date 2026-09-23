// ============================================================ SEQUENCE 1 — awakening inside a galaxy (local frame, arbitrary "ly" units)
const L_PATH = [[0, [0, 0, 0]], [8, [0, 0, 5]], [14, [.4, .2, 28]], [20, [3, 1, 92]], [26, [1.5, 0, 188]], [31, [-2, -1, 268]],
  [35, [-1, -.5, 316]], [38, [1.5, 0, 331]], [40, [2.5, .4, 338]]];
const SUN = [-30, -3, 345], GG = [9, -2, 340], MOON1 = [4.5, -.8, 334.5], NEB = [-4, 2, 228], CLU = [18, 5, 118], BIN = [-70, 25, 420], PUL = [45, -12, 400];
const NSTARS = [[6, -5, -6], [-14, 8, 10], [3, 12, 18]].map(o => V.add(NEB, o));
const SKY_L = skyMat([.4, -.2, 1], [.35, 1, -.3]);
const GRB_L = V.norm([-.4, .5, .77]);
const COMET_A = [15, 9, -45], COMET_B = [25, 5, 0];

function shotLocal(t) {
  const p = spline(L_PATH, t);
  const v = V.sub(spline(L_PATH, t + .05), spline(L_PATH, Math.max(0, t - .05)));
  let fd = V.len(v) > 1e-6 ? V.norm(v) : [0, 0, 1];
  fd = V.norm(V.lerp(fd, V.norm(V.sub(NEB, p)), sm(18, 22, t) * (1 - sm(24, 27, t)) * .3));
  fd = V.norm(V.lerp(fd, V.norm(V.sub(GG, p)), sm(32.5, 37, t) * .45));
  const C = cam(p, V.add(p, fd), [Math.sin(t * .07) * .12, 1, 0], 56), rel = relTo(C);
  const F = newFrame(C);
  const grb = t > 18.3 ? Math.exp(-(t - 18.3) * 4) * sm(18.3, 18.36, t) * 4 : 0;
  F.sky = skySpec({ A: [1, .9 * sm(9, 20, t), .6 * sm(8, 20, t), .35 * sm(10, 22, t)], B: [sm(4, 16, t), .3, 0, 0], rot: SKY_L, grb: [...GRB_L, grb] });
  // near stars: a handful at first, then thousands
  const B = 60, rv = t < 7 ? .00012 + .004 * sm(1, 7, t) : mix(.0041, 1, Math.pow(sm(7, 15.5, t), 2));
  F.parts.push(PS(0, 160000, [0, 0, 0], { P0: [B, rv, 0, 0], P1: [modp(p[0], B), modp(p[1], B), modp(p[2], B), 0], bright: 14 * (1 + 3 * (1 - sm(4, 12, t))), ref: 5, near: .05, seed: 11 }));
  const fv = sm(10, 15, t) * (1 - sm(30, 34, t));
  if (fv > 0) F.parts.push(PS(10, 70000, rel([0, 0, 150]), { P0: [70, 70, 2.5, 220], P1: [.012, 0, 0, 0], bright: 1.2 * fv, ref: 25, near: .05, seed: 12 }));
  const cvis = sm(13, 16, t) * (1 - sm(26, 29, t));
  if (cvis > 0) F.parts.push(PS(11, 45000, rel(CLU), { P0: [2.5, 0, 0, 0], bright: 12 * cvis, ref: 5, near: .05, seed: 13 }));
  const nv = sm(15, 20, t) * (1 - sm(34, 38, t));
  if (nv > 0) {
    F.vol = { mode: 0, c: rel(NEB), R: 46, P: [1.1, .8, 0, 3.7], A: [1, .22, .18], B: [.12, .55, .75], bright: nv * .9,
      lights: NSTARS.map((s, i) => [rel(s), 1.4, bbJS([9000, 25000, 6000][i])]) };
    NSTARS.forEach((s, i) => sprite(F, rel(s), .3, bbJS([9000, 25000, 6000][i]), 400 / Math.max(V.len(rel(s)) ** 2, 1) * nv, .8));
  }
  // solar system
  const sv = sm(25, 30, t);
  if (sv > 0) {
    F.light = { p: rel(SUN), col: [2.6, 2.45, 2.2] };
    F.bodies.push({ type: 3, p: rel(SUN), R: 2.2, seed: 1, a: 5700, b: 5 * sv, X: [1, 0, 0, 0] });
    F.bodies.push({ type: 1, p: rel(GG), R: 3, seed: 2, X: [.25, 1, .1, 1] });
    F.bodies.push({ type: 2, p: rel(MOON1), R: .7, seed: 3 });
    F.bodies.push({ type: 4, p: rel(PUL), R: .3, a: .8 * sv, b: 5, X: [.3, 1, .2, 45] });
    sprite(F, rel(SUN), 2.2, bbJS(5700), 5e4 / V.dot(rel(SUN), rel(SUN)) * sv, 1, 1);
    F.parts.push(PS(2, 160000, rel(SUN), { M: orient([.08, 1, .05]), P0: [34, 44, .9, 35], P1: [.05, .8, 0, 0], bright: 1.4 * sv, ref: 6, near: .05, seed: 14 }));
    const ct = clamp((t - 28) / 12, 0, 1), nuc = V.lerp(COMET_A, COMET_B, ct), cvel = V.mul(V.sub(COMET_B, COMET_A), 1 / 12);
    F.parts.push(PS(3, 60000, rel(SUN), { P0: [...nuc, 6], P1: [...cvel, 3.5], P2: [.12, .12, 0, 0], bright: 4 * sv, ref: 8, seed: 15, near: .05 }));
    sprite(F, rel(V.add(SUN, nuc)), .1, [.8, .9, 1], 60 / Math.max(V.dot(rel(V.add(SUN, nuc)), rel(V.add(SUN, nuc))), 1) * sv, .5);
    const a = t * TAU / 5, o = [Math.cos(a) * 1.6, Math.sin(a) * .3, Math.sin(a) * 1.6];
    const d2 = V.dot(rel(BIN), rel(BIN));
    sprite(F, rel(V.add(BIN, o)), .5, bbJS(4200), 3e5 / d2 * sv, 1); sprite(F, rel(V.sub(BIN, V.mul(o, .6))), .35, bbJS(18000), 4e5 / d2 * sv, 1);
    sprite(F, rel(PUL), .3, [.7, .8, 1], 4e4 / V.dot(rel(PUL), rel(PUL)) * sv, .6);
  }
  F.post.trail = .45 * sm(15, 18, t) * (1 - sm(28, 31, t));
  F.post.exp = 1.1;
  return F;
}

// ============================================================ SEQUENCE 2 — the galaxy, its neighbours, a collision (galaxy radius = 1)
const G_POS = [[40, [0.56, 0.01, 0.0]], [45, [0.47, 0.035, -0.27]], [50, [0.55, 0.5, -0.85]], [54, [0.3, 1.3, -1.4]], [58, [-0.8, 2.3, -2.8]], [61, [-3.2, 2.0, -4.6]], [64, [-4.7, 1.45, -5.6]]];
const G_TGT = [[40, [0.4, 0.0, -0.45]], [45, [0.15, 0.0, -0.62]], [50, [0, 0, 0]], [54, [0, 0, 0]], [58, [-1.2, 0.3, -1.6]], [61, [-5.3, 1.2, -6.0]], [64, [-5.6, 1.15, -6.1]]];
const CP = [-5.5, 1.2, -6.0];
const GAL_OTHERS = [
  { p: [3.8, .8, -3.5], n: [.3, 1, -.2], s: .7, ty: 1, c: 300000, seed: 31 },
  { p: [-2.4, -.5, 1.8], n: [.2, 1, .4], s: .35, ty: 2, c: 90000, seed: 32, arms: 4 },
  { p: [1.8, -.9, 2.6], n: [0, 1, 0], s: .22, ty: 1, c: 40000, seed: 33 },
  { p: [7, -2.5, -10], n: [.6, 1, .3], s: .9, ty: 0, c: 150000, seed: 34, arms: 2, tw: 2.2 },
  { p: [-9, 3, 1.5], n: [-.4, 1, .5], s: .6, ty: 0, c: 100000, seed: 35, arms: 3, tw: 3 },
];
function shotGalaxy(t) {
  const C = cam(spline(G_POS, t), spline(G_TGT, t), [0, 1, 0], 58), rel = relTo(C);
  const F = newFrame(C);
  const inside = 1 - sm(44, 50, t);
  F.sky = skySpec({ A: [.35 * inside, 0, 1, 0], B: [1, .35, 0, 0], grb: [...V.norm([.3, -.4, -.86]), t > 57 ? Math.exp(-(t - 57) * 4) * sm(57, 57.05, t) * 3 : 0] });
  const home = orient([0, 1, 0]);
  F.parts.push(PS(1, 1300000, rel([0, 0, 0]), { M: home, P0: [0, 2, 2.6, .12], P2: [.05, .012, 0, 0], bright: .11, near: .0005, seed: 21 }));
  F.parts.push(PS(1, 220000, rel([0, 0, 0]), { M: home, P0: [0, 2, 2.6, .12], P2: [.05, .012, 0, 0], P3: [1, 0, 0, 0], bright: .12, blend: 1, near: .0005, seed: 22 }));
  sprite(F, rel([0, 0, 0]), .06, [1, .8, .55], 6, 0, 2);
  if (inside > 0) F.parts.push(PS(0, 90000, [0, 0, 0], { P0: [.04, 1, 0, 0], P1: [modp(C.p[0], .04), modp(C.p[1], .04), modp(C.p[2], .04), 0], bright: 3 * inside, ref: .003, near: .0003, seed: 23 }));
  // a distant supernova flares in a spiral arm
  sprite(F, rel([-.3, 0, .42]), .002, [.9, .9, 1], t > 51 ? 60 * Math.exp(-(t - 51) * .9) * sm(51, 51.15, t) : 0, 1, 1);
  for (const g of GAL_OTHERS) {
    const d = V.len(rel(g.p)), n = Math.min(g.c, Math.floor(g.c * clamp(1.6 * g.s / d, .15, 1)));
    F.parts.push(PS(1, n, rel(g.p), { M: orient(g.n, g.s), scale: g.s, P0: [g.ty, g.arms || 2, g.tw || 2.6, .15], P2: [.04, .015, 0, 0], bright: .09 * g.c / n, seed: g.seed }));
    sprite(F, rel(g.p), .04 * g.s, [1, .85, .6], 1.5, 0, 1);
  }
  // colliding pair: tidal tails grow as they close in
  const sep = mix(2.0, 1.15, sm(50, 64, t)), tid = mix(.35, 1.05, sm(48, 64, t));
  const Ac = V.add(CP, V.mul([-.6, .1, .3], sep)), Bc = V.add(CP, V.mul([.6, -.1, -.3], sep));
  const MA = orient([.3, 1, .2], .75), MB = orient([-.5, 1, -.3], .6);
  F.parts.push(PS(1, 450000, rel(Ac), { M: MA, scale: .75, P0: [0, 2, 2.4, .14], P1: [...toLocal(MA, V.sub(Bc, Ac)), tid], P2: [.06, .014, 0, 0], bright: .09, seed: 36 }));
  F.parts.push(PS(1, 320000, rel(Bc), { M: MB, scale: .6, P0: [0, 2, 2.8, .12], P1: [...toLocal(MB, V.sub(Ac, Bc)), tid * .9], P2: [.07, .014, 0, 0], bright: .09, seed: 37 }));
  sprite(F, rel(Ac), .03, [1, .85, .6], 2.5 + 20 * sm(61, 64, t), 0, 1); sprite(F, rel(Bc), .03, [1, .85, .6], 2);
  F.post.trail = .7 * (1 - sm(40, 43, t)) + .3 * sm(62, 64, t);
  F.post.exp = 1.25;
  F.post.flash = 3 * sm(62.6, 64, t);
  return F;
}

// ============================================================ SEQUENCE 3 — a supermassive black hole (rs = 1)
const B1_POS = [[64, [0, 14, -150]], [72, [25, 8, -70]], [78, [18, 3.2, -30]], [81, [4, 2.2, -21]], [84, [-12, 5, -14]]];
const N1 = V.norm([.08, 1, .12]), M1 = orient(N1);
const LG1 = V.norm(V.mul(spline(B1_POS, 74), -1));
function tidalStar(t, st, dur, r0, spd) {
  const w0 = spd * .7071 * Math.pow(r0, -1.5);
  if (t < st) return { r: r0, th: w0 * (t - st), x: 0 };
  const x = clamp((t - st) / dur, 0, 1);
  return { r: 1 + (r0 - 1) * Math.sqrt(1 - x), th: w0 * dur * 4 * (1 - Math.pow(1 - x, .25)), x };
}
function shotBH(t) {
  const tg = [mix(0, -3, sm(80, 84, t)), 0, 0];
  const C = cam(spline(B1_POS, t), tg, [0, 1, 0], 42), rel = relTo(C);
  const F = newFrame(C);
  F.sky = skySpec({ A: [1, .7, 1, .35], B: [1, .3, 0, 0], rot: skyMat([1, .3, .2], [.2, 1, -.4]), lens: [...LG1, .45] });
  F.bh = { bh: [[...rel([0, 0, 0]), 1], [0, 0, 0, 0]], dn: [[...N1, 15], [0, 1, 0, 0]], dp: [3, 4.5, 1.2 * .7071, 9000], haze: .5 };
  F.parts.push(PS(4, 360000, rel([0, 0, 0]), { M: M1, P0: [3, 16, 1.2, 0], P2: [22, 13, 68, 3], bright: .1, hide: [...rel([0, 0, 0]), 2.7], near: .05, seed: 41 }));
  const s = tidalStar(t, 68, 13, 22, 1.2);
  if (s.x < 1) {
    const sp = toWorld(M1, [Math.cos(s.th) * s.r, 0, Math.sin(s.th) * s.r]);
    sprite(F, rel(sp), .25, bbJS(5500 + s.x * 9000), 400 / V.dot(rel(sp), rel(sp)) * (1 - s.x * .6), 1, 1);
  }
  sprite(F, rel([0, 0, 0]), .5, [1, .8, .6], t > 81 ? 30 * Math.exp(-(t - 81) * 2) : 0, 1, 1);
  F.post.exp = 1.0;
  F.post.flash = 2.5 * (1 - sm(64, 65.2, t)) + 3 * sm(83, 84, t);
  return F;
}
