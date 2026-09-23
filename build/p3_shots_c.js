// ============================================================ SEQUENCE 7 — powers of ten, in metres (double precision; each layer rendered camera-relative in its own unit)
const AU = 1.496e11, PC = 3.086e16, KPC = PC * 1e3, MPC = PC * 1e6, RE = 6.371e6, RSUN = 6.96e8, RMOON = 1.737e6;
const S0 = [0, 0, 0];
const Ug = 15 * KPC, S_GAL = [-.035, 0, -.532];                    // our star sits on a spiral arm
const GAL = [-S_GAL[0] * Ug, 0, -S_GAL[2] * Ug];
const Uc = 2 * MPC, CLUS = V.add(GAL, [.35 * Uc, .1 * Uc, -.2 * Uc]);
const Uw = 40 * MPC;
const EARTH = [AU * Math.cos(2.2), 0, AU * Math.sin(2.2)], En = V.norm(EARTH);
const NEBW = [9 * PC, 2 * PC, 6 * PC], NEBR = 7 * PC, CLUW = [1.2 * PC, .3 * PC, -.8 * PC];
const CITYN = V.norm([En[0] * .92 - En[2] * .3, .28, En[2] * .92 + En[0] * .3]), CITY = V.add(EARTH, V.mul(CITYN, RE));
const SKY_Z = skyMat(V.norm(V.sub(GAL, S0)), [0, 1, 0]);
const LKEYS = [[136, 11.8], [138, 12.7], [141, 16.4], [143.5, 18.1], [146, 20.3], [148.2, 21.4], [150.3, 23.0], [152.6, 25.1], [154.2, 25.3],
  [156, 24.1], [157.5, 22.3], [159, 20.2], [160.5, 17.6], [161.8, 13.6], [162.9, 10.3], [164, 8.3], [165, 7.4], [166.2, 4.7], [167.2, 4.62], [168.4, 27.5]];
const T_IN = 154.2;
const dirOut = t => { const a = .03 * (t - 136), d = V.norm([.35, .5, -.79]); return V.norm([d[0] * Math.cos(a) - d[2] * Math.sin(a), d[1], d[0] * Math.sin(a) + d[2] * Math.cos(a)]); };
function focusOut(L) { let F = S0; F = V.lerp(F, GAL, sm(19.8, 21, L)); return V.lerp(F, CLUS, sm(21.9, 22.9, L)); }
function focusIn(L) {
  let F = CITY; F = V.lerp(F, EARTH, sm(7.3, 8.3, L)); F = V.lerp(F, S0, sm(9.5, 12.2, L));
  F = V.lerp(F, NEBW, sm(16.2, 17.2, L) * (1 - sm(17.6, 18.6, L)));
  F = V.lerp(F, GAL, sm(20, 21.2, L)); return V.lerp(F, CLUS, sm(22.2, 23, L));
}
const cityT = V.norm(V.cross(CITYN, [0, 1, 0]));
const DIRS = [[4.6, V.norm(V.add(V.mul(CITYN, .8), V.mul(cityT, .6)))], [6.5, V.norm(V.add(V.mul(CITYN, .7), V.mul(cityT, .7)))],
  [8, V.norm(V.add(V.lerp(V.mul(En, -1), CITYN, .55), [0, .3, 0]))], [11, V.norm([.3, .45, -.84])], [15, V.norm([.1, .12, -1])],
  [18, V.norm([-.5, .2, -.84])], [20.5, V.norm([.3, .18, -.94])], [23, V.norm([.2, .4, -.9])], [25.3, dirOut(T_IN)]];
function dirIn(L) {
  if (L <= DIRS[0][0]) return DIRS[0][1]; if (L >= DIRS[DIRS.length - 1][0]) return DIRS[DIRS.length - 1][1];
  let i = 0; while (L > DIRS[i + 1][0]) i++;
  return V.norm(V.lerp(DIRS[i][1], DIRS[i + 1][1], sm(DIRS[i][0], DIRS[i + 1][0], L)));
}
const MOONW = (() => { const L = 7.8, D = 10 ** L, f = focusIn(L), d = dirIn(L), cp = V.add(f, V.mul(d, D));
  const r = V.norm(V.cross(V.mul(d, -1), [0, 1, 0])); return V.add(V.add(cp, V.mul(d, -.33 * D)), V.mul(r, .12 * D)); })();

function shotZoom(t) {
  const L = mono(LKEYS, t), D = 10 ** L, inPhase = t >= T_IN;
  const Fp = inPhase ? focusIn(L) : focusOut(L), dir = inPhase ? dirIn(L) : dirOut(t);
  const cp = V.add(Fp, V.mul(dir, D));
  const C = cam(cp, Fp, [0, 1, 0], 52), F = newFrame(C);
  const relU = (P, U) => V.mul(V.sub(P, cp), 1 / U);
  const inner = 1 - sm(16.8, 18.2, L);
  F.sky = skySpec({ A: [inner, inner * .8, inner * .7, inner * .3], B: [1, .15 + .5 * sm(22, 25.5, L), 0, 0], rot: SKY_Z });
  // solar system — bodies in units of the current camera distance
  const Ub = D;
  if (L < 12.6) {
    F.light = { p: relU(S0, Ub), col: [1.7, 1.65, 1.55] };
    F.bodies.push({ type: 3, p: relU(S0, Ub), R: RSUN / Ub, seed: 1, a: 5800, b: 5, X: [1, .2, 0, 0] });
    if (L < 11) F.bodies.push({ type: 5, p: relU(EARTH, Ub), R: RE / Ub, seed: 4.2, a: 4, X: [...relU(CITY, Ub), Ub / 220] });
    if (L < 9.6) F.bodies.push({ type: 2, p: relU(MOONW, Ub), R: RMOON / Ub, seed: 6 });
  }
  const dS = V.len(V.sub(S0, cp));
  sprite(F, relU(S0, Ub), RSUN / Ub, bbJS(5800), clamp(30 * (1e12 / dS) ** 2, 1.2, 300) * (1 - sm(17.3, 18.3, L)), 1, 1);
  if (L > 9 && L < 13) sprite(F, relU(EARTH, Ub), RE / Ub, [.5, .7, 1], .6 * vis(L, 9, 9.8, 12, 13));
  // stellar neighbourhood (parsecs)
  let v = vis(L, 14.6, 15.6, 17.6, 18.6);
  if (v > 0) { const cq = V.mul(cp, 1 / PC), B = 12;
    F.parts.push(PS(0, 110000, [0, 0, 0], { P0: [B, 1, 0, 0], P1: [modp(cq[0], B), modp(cq[1], B), modp(cq[2], B), 0], bright: 20 * v, ref: 1, near: .002, seed: 81 })); }
  v = vis(L, 15.2, 16.3, 18.3, 19.3);
  if (v > 0) F.parts.push(PS(11, 60000, relU(CLUW, PC), { P0: [1.5, 0, 0, 0], bright: 8 * v, ref: 2, near: .002, seed: 82 }));
  v = vis(L, 16, 16.8, 18.8, 19.6);
  if (v > 0) F.vol = { mode: 0, c: relU(NEBW, PC), R: NEBR / PC, P: [1.2, .8, 0, 9.1], A: [.25, .55, 1], B: [1, .3, .45], bright: v,
    lights: [[relU(V.add(NEBW, [2 * PC, 1 * PC, 0]), PC), 1.5, [.7, .8, 1]]] };
  // the galaxy (15 kpc units)
  v = vis(L, 18, 19, 22.6, 23.3);
  if (v > 0) { const o = relU(GAL, Ug);
    F.parts.push(PS(1, 1300000, o, { P0: [0, 2, 2.6, .12], P2: [0, .012, 0, 0], bright: .05 * v, near: 1e-7, seed: 21 }));
    F.parts.push(PS(1, 200000, o, { P0: [0, 2, 2.6, .12], P2: [0, .012, 0, 0], P3: [1, 0, 0, 0], bright: .5 * v, blend: 1, near: 1e-7, seed: 22 }));
    sprite(F, o, .06, [1, .8, .55], 3 * v, 0, 1.5); }
  // galaxy cluster (2 Mpc units): each point is a galaxy
  v = vis(L, 21.7, 22.4, 24.2, 25);
  if (v > 0) { F.parts.push(PS(9, 160000, relU(CLUS, Uc), { bright: .12 * v, near: 1e-7, seed: 91 }));
    sprite(F, relU(GAL, Uc), .008, [1, .85, .65], 2 * vis(L, 22, 22.6, 23.6, 24.2), 0, 1); }
  // cosmic web (40 Mpc units); matter drifts along filaments into the nodes
  v = sm(23, 23.9, L);
  if (v > 0) F.parts.push(PS(8, 950000, relU(CLUS, Uw), { P0: [9, .018, .003, 0], P1: [4, 4, 4, 0], bright: .05 * v, near: 1e-7, seed: 101 }));
  const spd = Math.abs(mono(LKEYS, t + .05) - mono(LKEYS, t - .05)) * 10;
  F.post.trail = clamp(spd * .12, 0, .8);
  F.post.exp = 1.1;
  F.post.fade = sm(136, 136.5, t);
  F.post.flash = 2 * sm(167.9, 168.4, t);
  return F;
}

// ============================================================ SEQUENCE 8 — it was all a single glowing mote orbiting a black hole
const NF = V.norm([.05, 1, .1]), MF = orient(NF), TF0 = 168.4, TF_FALL = 171.4, FALL_D = 1.9, SPD_F = 20;
function shotFinal(t) {
  const s = tidalStar(t, TF_FALL, FALL_D, 7, SPD_F);
  const pp = toWorld(MF, [Math.cos(s.th) * s.r, 0, Math.sin(s.th) * s.r]);
  const camEnd = [-8, 3.6, -36], e = sm(TF0, 171, t);
  const dEnd = V.len(V.sub(camEnd, pp)), d = Math.exp(mix(Math.log(.06), Math.log(dEnd), e));
  const cp = V.add(pp, V.mul(V.norm(V.sub(camEnd, pp)), d));
  const C = cam(cp, V.lerp(pp, [0, 0, 0], e), [0, 1, 0], 44), rel = relTo(C);
  const F = newFrame(C);
  F.sky = skySpec({ A: [1, .5, 1, .25], B: [1, .3, 0, 0], rot: skyMat([.6, -.2, 1], [-.2, 1, .3]) });
  F.bh = { bh: [[...rel([0, 0, 0]), 1], [0, 0, 0, 0]], dn: [[...NF, 12], [0, 1, 0, 0]], dp: [3, 1.2, 1.1, 8000], haze: .4 };
  F.parts.push(PS(4, 200000, rel([0, 0, 0]), { M: MF, P0: [3, 13, 1.1, 0], P2: [7, FALL_D, TF_FALL, 0], bright: .4, hide: [...rel([0, 0, 0]), 2.7], near: .01, seed: 111 }));
  F.parts.push(PS(4, 70000, rel([0, 0, 0]), { M: MF, P0: [3, 13, SPD_F, 0], P2: [7, FALL_D, TF_FALL, 2.5], P3: [1, 0, 0, 0], bright: .8, hide: [...rel([0, 0, 0]), 2.7], near: .01, seed: 112 }));
  const rp = rel(pp);
  if (s.x < 1) sprite(F, rp, .04, [1, .9, .7], Math.min(3 / Math.max(V.dot(rp, rp), 1e-3), 300) * (1 - s.x * .7), 1, 1.2);
  sprite(F, rel([0, 0, 0]), .3, [1, .85, .7], t > 173.3 ? 25 * Math.exp(-(t - 173.3) * 6) : 0, 1, 1);
  F.post.flash = 2 * (1 - sm(TF0, TF0 + .8, t));
  F.post.exp = 1.0;
  return F;
}
function shotEnd(t) {
  const C = cam([0, 0, 0], [0, 0, 1], [0, 1, 0], 50), F = newFrame(C);
  sprite(F, [0, 0, 60], .02, bbJS(6500), sm(176, 177.6, t) * (1 - sm(179.2, 180, t)) * 2.5 * (1 + .08 * Math.sin(t * 3)), .6, 1);
  return F;
}

// ============================================================ timeline + playback
const SHOTS = [[0, 40, shotLocal], [40, 64, shotGalaxy], [64, 84, shotBH], [84, 104, shotBinary], [104, 122, shotSN], [122, 136, shotBirth],
  [136, TF0, shotZoom], [TF0, 173.6, shotFinal], [173.6, 180, shotEnd]];
const DUR = 180;
function frameAt(t) {
  const s = SHOTS.find(s => t < s[1]) || SHOTS[SHOTS.length - 1];
  const F = s[2](t);
  F.post.fade *= sm(0, 1.8, t) * (1 - .92 * bump(t, 40, .25));
  return F;
}
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
  if (!paused) { T += Math.min(raw, .1); if (T >= DUR) T = 0;
    ftA += raw; ftN++;
    if (ftN >= 60) { const a = ftA / ftN; ftA = 0; ftN = 0;
      if (a > .028) { if (qPart > .45) qPart *= .85; else if (qRes > .55) { qRes *= .88; resize(); } }
      else if (a < .014) { if (qRes < 1) { qRes = Math.min(1, qRes / .92); resize(); } else if (qPart < 1) qPart = Math.min(1, qPart / .9); } } }
  render(frameAt(T), T);
}
window.__cosmos = { get t() { return T; }, set t(v) { T = v; }, get q() { return [qRes, qPart, W, H]; }, pause(v) { paused = v; } };
requestAnimationFrame(loop);
