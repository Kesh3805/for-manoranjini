// ============================================================ SEQUENCE 4 — binary supermassive black holes, inspiral and merger
const B2_POS = [[84, [0, 40, -110]], [92, [35, 30, -75]], [98, [22, 26, -58]], [104, [-18, 24, -80]]];
const T_MERGE = 98;
function binState(t) {
  const a0 = 26, T = 14, x = clamp((t - 84) / T, 0, 1);
  if (t < T_MERGE) return { sep: a0 * Math.pow(1 - x, .25), ph: .9 * T * 1.6 * (1 - Math.pow(1 - x, .625)), merged: 0 };
  return { sep: 0, ph: .9 * T * 1.6 + (t - T_MERGE) * 1.5, merged: 1 };
}
function shotBinary(t) {
  const tp = t - T_MERGE, shake = tp > 0 ? Math.exp(-tp * 1.2) * 1.2 : 0;
  const pos = V.add(spline(B2_POS, t), [Math.sin(t * 37) * shake, Math.cos(t * 29) * shake, Math.sin(t * 23) * shake * .5]);
  const C = cam(pos, [0, 0, 0], [0, 1, 0], 46), rel = relTo(C);
  const F = newFrame(C), b = binState(t);
  const A = [b.sep / 2 * Math.cos(b.ph), 0, b.sep / 2 * Math.sin(b.ph)], Bp = V.mul(A, -1);
  const toBH = V.norm(rel([0, 0, 0]));
  const ripA = tp > 0 ? 2.2 * Math.exp(-tp / 2.6) : 0;
  F.sky = skySpec({ A: [1, .5, 1, .3], B: [1, .3, 0, 0], rot: skyMat([-.3, .2, 1], [.3, 1, .1]), rip: [...toBH, ripA], ripR: tp * .45 });
  const rout = clamp(.4 * b.sep, 2.9, 10);
  F.bh = b.merged
    ? { bh: [[...rel([0, 0, 0]), 1.9], [0, 0, 0, 0]], dn: [[0, 1, 0, 15 * sm(0, 3, tp) + 2.9], [0, 1, 0, 0]], dp: [3, 1.2, 1.6, 10000], haze: .35 }
    : { bh: [[...rel(A), 1], [...rel(Bp), 1]], dn: [[...V.norm([.15, 1, 0]), rout], [...V.norm([-.1, 1, .12]), rout]], dp: [3, .9, 1.6, 10000], haze: .35 };
  F.parts.push(PS(5, 420000, rel([0, 0, 0]), { P0: [...A, 0], P1: [...Bp, 0], P2: [b.ph, b.merged ? sm(0, 2.5, tp) : 0, Math.max(tp, 0) * 38, ripA], P3: [Math.max(b.sep, .01), 0, 0, 0],
    bright: .22 * (1 + .6 * sm(92, 98, t)), near: .05, seed: 51 }));
  if (tp > 0) sprite(F, rel([0, 0, 0]), 1.5, [.85, .9, 1], 600 * Math.exp(-tp * 2.2), 1, 1.5);
  const sc = [.5, .5];
  F.post.rip = tp > 0 ? [sc[0], sc[1], tp * .3, 1.4 * Math.exp(-tp / 2)] : [.5, .5, 0, 0];
  F.post.exp = 1.0 / (1 + (tp > 0 ? 3 * Math.exp(-tp * .8) : 0));
  F.post.flash = 2 * (1 - sm(84, 85.2, t));
  F.post.trail = .25 * sm(95, 98, t) * (1 - sm(99, 101, t));
  F.post.fade = 1 - sm(103.2, 104, t);
  return F;
}

// ============================================================ SEQUENCE 5 — a dying supergiant (stellar radius = 1)
const SN_POS = [[104, [0, 1.2, -13]], [112, [2.5, 1.6, -11]], [113, [2.6, 1.6, -11.2]], [116, [8, 3.8, -24]], [119.5, [6, 3, -21]], [122, [2, 1.3, -8.5]]];
const T_SN = 112.6, SN_P1 = [-4.2, .6, 2.2], SN_P2 = [3.4, -.5, -5.2];
const snCore = tp => tp < 0 ? 0 : 3000 * Math.exp(-tp / .8) + 60 * Math.exp(-tp / 5) + 6;
function shotSN(t) {
  const C = cam(spline(SN_POS, t), [0, 0, 0], [Math.sin(t * .1) * .1, 1, 0], 50), rel = relTo(C);
  const F = newFrame(C), tp = t - T_SN;
  F.sky = skySpec({ A: [.8, .3, 1, .4], B: [1, .3, 0, 0], rot: skyMat([.2, -1, .3], [1, .2, .1]) });
  const core = snCore(tp);
  if (tp < .15) {
    const A = .02 + .07 * sm(104, 112, t);
    const R = (1 + A * Math.sin(TAU * t / 1.1) + .02 * Math.sin(t * 7.3)) * (1 - .22 * sm(112, T_SN, t));
    const br = .75 * (1 + .35 * Math.sin(TAU * t / 1.1 + .6)) * (1 - .5 * sm(112, T_SN, t));
    F.bodies.push({ type: 3, p: rel([0, 0, 0]), R, seed: 5, a: 3400, b: br, X: [1.3, 1, 0, 0] });
    F.light = { p: rel([0, 0, 0]), col: V.mul(bbJS(3400), 1.6 * br / .75) };
    sprite(F, rel([0, 0, 0]), R, bbJS(3400), br * .6, 0, .8);
  } else F.light = { p: rel([0, 0, 0]), col: V.mul(bbJS(12000), .02 * core + 1.2) };
  F.bodies.push({ type: 0, p: rel(SN_P1), R: .32, seed: 7 });
  F.bodies.push({ type: 0, p: rel(SN_P2), R: .22, seed: 9 });
  const Rsh = tp > 0 ? 1 + 13 * (1 - Math.exp(-tp / 4.5)) : 0;
  F.parts.push(PS(6, 130000, rel([0, 0, 0]), { P0: [tp, 0, 1, 0], P1: [Rsh * 1.02, 1, 0, 0], bright: 1.4, ref: 1e6, near: .02, seed: 61 }));
  if (tp > 0) {
    F.parts.push(PS(6, 260000, rel([0, 0, 0]), { P0: [tp, 14, 1, 2.3], P1: [0, 0, 0, 0], bright: .9, near: .02, seed: 62 }));
    const vR = Rsh * 1.35 + 1.5;
    F.vol = { mode: 1, c: rel([0, 0, 0]), R: vR, P: [3 * Math.exp(-tp / 2), .55, Rsh / vR, 4.1], A: [1, .25, .18], B: [.2, .8, .9], bright: .7 * sm(0, .4, tp),
      lights: [[rel([0, 0, 0]), .01 * core + .6, [1, .9, .8]]] };
    sprite(F, rel([0, 0, 0]), .4, [1, .95, .9], core, 1, 1.4);
  }
  if (tp > 2.5) F.bodies.push({ type: 4, p: rel([0, 0, 0]), R: .06, a: 3 * sm(2.5, 4.5, tp), b: 4.5, X: [.2, 1, .4, 25] });
  F.post.exp = 1 / (1 + .004 * snCore(tp - .6));
  F.post.fade = sm(104, 104.25, t);
  F.post.flash = tp > 0 ? 1.5 * Math.exp(-tp * 3) : 0;
  F.post.flashCol = [1, .9, .8];
  F.post.trail = tp > 0 && tp < 2 ? .35 : 0;
  return F;
}

// ============================================================ SEQUENCE 6 — stars being born inside a molecular cloud (cloud radius = 12)
const BR_POS = [[122, [0, 1, -11]], [129, [2.2, 1.6, -7]], [136, [-1, .8, -3.8]]];
const BR_TGT = [[122, [0, 0, 0]], [136, [0, 0, 2]]];
const PROTO = (() => { const r = rng(777), a = new Float32Array(96);
  for (let i = 0; i < 24; i++) { const d = V.norm([r() - .5, (r() - .5) * .6, r() - .5]), rad = 1 + 6 * Math.sqrt(r());
    a.set([d[0] * rad, d[1] * rad, d[2] * rad + 1.5, 123.5 + i * .45 + r() * .8], i * 4); } return a; })();
function shotBirth(t) {
  const C = cam(spline(BR_POS, t), spline(BR_TGT, t), [0, 1, 0], 54), rel = relTo(C);
  const F = newFrame(C);
  F.sky = skySpec({ A: [.25, 0, .3, .2], B: [1, .2, 0, 0] });
  F.proto = PROTO;
  const lights = [];
  for (let i = 0; i < 24; i++) {
    const p = [PROTO[i * 4], PROTO[i * 4 + 1], PROTO[i * 4 + 2]], on = sm(PROTO[i * 4 + 3], PROTO[i * 4 + 3] + 2.5, t);
    const col = bbJS(mix(2500, 8000, on)), rp = rel(p);
    lights.push([rp, .15 + 2.5 * on, col, on / Math.max(V.dot(rp, rp), .5)]);
    sprite(F, rp, .02, col, (.05 + 12 * on) / Math.max(V.dot(rp, rp), .3), on, 1);
  }
  lights.sort((a, b) => b[3] - a[3]);
  F.vol = { mode: 2, c: rel([0, 0, 0]), R: 12, P: [.8, 2.2, 0, 0], A: [1, .32, .16], B: [.35, .2, .45], bright: .9, lights: lights.slice(0, 4) };
  F.parts.push(PS(7, 360000, rel([0, 0, 0]), { bright: .6, ref: 3, near: .02, seed: 71 }));
  F.post.exp = 1.15;
  F.post.flash = 1.2 * (1 - sm(122, 123.5, t)); F.post.flashCol = [1, .6, .4];
  F.post.fade = 1 - sm(135.5, 136, t);
  return F;
}
