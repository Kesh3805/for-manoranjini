// ============================================================ math (double precision, camera-relative)
const TAU = Math.PI * 2;
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const sm = (a, b, x) => { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
const mix = (a, b, t) => a + (b - a) * t;
const bump = (t, c, w) => Math.exp(-(((t - c) / w) ** 2));
const vis = (L, a, b, c, d) => sm(a, b, L) * (1 - sm(c, d, L));
const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: a => Math.hypot(a[0], a[1], a[2]), norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
};
const modp = (x, B) => ((x % B) + B) % B;
// time-aware cubic Hermite spline through [t, vec] keys (C1 continuous velocity)
function spline(K, t) {
  const n = K.length;
  if (t <= K[0][0]) return K[0][1].slice(); if (t >= K[n - 1][0]) return K[n - 1][1].slice();
  let i = 0; while (t > K[i + 1][0]) i++;
  const h = K[i + 1][0] - K[i][0], s = (t - K[i][0]) / h;
  const tan = j => { const a = K[Math.max(0, j - 1)], b = K[Math.min(n - 1, j + 1)]; return a[1].map((v, k) => (b[1][k] - v) / (b[0] - a[0])); };
  const m0 = tan(i), m1 = tan(i + 1), s2 = s * s, s3 = s2 * s;
  return K[i][1].map((v, k) => (2 * s3 - 3 * s2 + 1) * v + (s3 - 2 * s2 + s) * h * m0[k] + (-2 * s3 + 3 * s2) * K[i + 1][1][k] + (s3 - s2) * h * m1[k]);
}
// monotone cubic for scalar keys (no overshoot) — used for the logarithmic camera distance
function mono(K, t) {
  const n = K.length;
  if (t <= K[0][0]) return K[0][1]; if (t >= K[n - 1][0]) return K[n - 1][1];
  let i = 0; while (t > K[i + 1][0]) i++;
  const sec = j => (K[j + 1][1] - K[j][1]) / (K[j + 1][0] - K[j][0]);
  const tg = j => { if (j === 0) return sec(0); if (j === n - 1) return sec(n - 2); const a = sec(j - 1), b = sec(j); return a * b <= 0 ? 0 : 2 / (1 / a + 1 / b); };
  const h = K[i + 1][0] - K[i][0], s = (t - K[i][0]) / h, s2 = s * s, s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * K[i][1] + (s3 - 2 * s2 + s) * h * tg(i) + (-2 * s3 + 3 * s2) * K[i + 1][1] + (s3 - s2) * h * tg(i + 1);
}
function cam(p, tg, up, fov) {
  const f = V.norm(V.sub(tg, p)), r = V.norm(V.cross(f, up)), u = V.cross(r, f);
  return { p, f, r, u, tan: Math.tan(fov * Math.PI / 360) };
}
// orthonormal frame with y = n, scaled; column-major mat3
function orient(n, s = 1) {
  n = V.norm(n); const x = V.norm(V.cross(n, Math.abs(n[2]) < .9 ? [0, 0, 1] : [1, 0, 0])), z = V.cross(x, n);
  const m = new Float32Array([x[0] * s, x[1] * s, x[2] * s, n[0] * s, n[1] * s, n[2] * s, z[0] * s, z[1] * s, z[2] * s]);
  m.ax = [x, n, z]; m.s = s; return m;
}
const toLocal = (M, v) => [V.dot(M.ax[0], v) / M.s, V.dot(M.ax[1], v) / M.s, V.dot(M.ax[2], v) / M.s];
const toWorld = (M, v) => V.add(V.add(V.mul(M.ax[0], v[0] * M.s), V.mul(M.ax[1], v[1] * M.s)), V.mul(M.ax[2], v[2] * M.s));
const I3 = orient([0, 1, 0], 1);
// sky orientation: q.x toward galactic core, q.y galactic pole (rows of the matrix)
function skyMat(core, pole) {
  pole = V.norm(pole); core = V.norm(V.sub(core, V.mul(pole, V.dot(core, pole)))); const z = V.cross(core, pole);
  return new Float32Array([core[0], pole[0], z[0], core[1], pole[1], z[1], core[2], pole[2], z[2]]);
}
function bbJS(T) {
  const x = clamp(Math.log2(T / 1000) / 5, 0, 1), L = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const a = [1, .28, .06], b = [1, .62, .32], c = [1, .93, .84], d = [.78, .86, 1], e = [.58, .7, 1];
  if (x < .25) return L(a, b, x / .25); if (x < .45) return L(b, c, (x - .25) / .2); if (x < .6) return L(c, d, (x - .45) / .15); return L(d, e, (x - .6) / .4);
}
function rng(seed) { let s = seed >>> 0; return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ============================================================ frame description
function newFrame(c) {
  return { cam: c, bg: null, sky: null, bh: null, bodies: [], light: { p: [0, 0, 0], col: [0, 0, 0] }, vol: null, parts: [], sprites: [],
    post: { exp: 1, trail: 0, bloom: .05, fade: 1, flash: 0, flashCol: [1, .95, .9], rip: [.5, .5, 0, 0] } };
}
function skySpec(o) {
  return Object.assign({ A: [0, 0, 0, 0], B: [1, .25, 0, 0], rot: I3, grb: [0, 0, 1, 0], rip: [0, 0, 1, 0], ripR: 0, lens: [0, 0, 1, 0] }, o);
}
function PS(mode, count, o, opt = {}) {
  return Object.assign({ M: I3, scale: 1, P0: [0, 0, 0, 0], P1: [0, 0, 0, 0], P2: [0, 0, 0, 0], P3: [0, 0, 0, 0], bright: 1, ref: 1e6,
    pxMin: 1.6, near: 1e-4, blend: 0, seed: 1, hide: [0, 0, 0, 0] }, opt, { mode, count, o });
}
const relTo = c => p => V.sub(p, c.p);
function sprite(F, p, size, col, I, spikes = 0, halo = 1) { if (I > 1e-4) F.sprites.push([p, size, col, I, spikes, halo]); }

// ============================================================ GL
const cv = document.getElementById('c');
const gl = cv.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' });
if (!gl) { document.body.innerHTML = '<p style="color:#888;font:14px sans-serif;text-align:center;margin-top:40vh">WebGL2 is required.</p>'; throw new Error('no webgl2'); }
const HDR = !!gl.getExtension('EXT_color_buffer_float');
const MAXPT = Math.min(gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1], 256);

function compile(type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(s); console.error(log, src.split('\n').map((l, i) => (i + 1) + ': ' + l).join('\n')); throw new Error(log); }
  return s;
}
function program(vs, fs) {
  const p = gl.createProgram(); gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const cache = {}; p.u = n => n in cache ? cache[n] : (cache[n] = gl.getUniformLocation(p, n)); return p;
}
const PR = {
  sky: program(FSQ_VS, SKY_FS), bh: program(FSQ_VS, BH_FS), body: program(FSQ_VS, BODY_FS), vol: program(FSQ_VS, VOL_FS),
  part: program(PART_VS, PART_FS), spr: program(SPR_VS, SPR_FS), blit: program(FSQ_VS, BLIT_FS), acc: program(FSQ_VS, ACC_FS),
  down: program(FSQ_VS, DOWN_FS), up: program(FSQ_VS, UP_FS), fin: program(FSQ_VS, FINAL_FS),
};
const emptyVAO = gl.createVertexArray();
const sprVAO = gl.createVertexArray(), sprBuf = gl.createBuffer();
gl.bindVertexArray(sprVAO); gl.bindBuffer(gl.ARRAY_BUFFER, sprBuf);
for (let i = 0; i < 3; i++) { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, 4, gl.FLOAT, false, 48, i * 16); gl.vertexAttribDivisor(i, 1); }
gl.bindVertexArray(null);
const sprData = new Float32Array(256 * 12);

function target(w, h) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, HDR ? gl.RGBA16F : gl.RGBA8, w, h, 0, gl.RGBA, HDR ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
  return { t, f, w, h };
}
let RT = null, qRes = 1, qPart = 1, W = 0, H = 0;
function resize() {
  const cssW = innerWidth, cssH = innerHeight;
  cv.style.width = cssW + 'px';
  cv.style.height = cssH + 'px';
  const dpr = Math.min(devicePixelRatio || 1, 2);
  let scale = dpr * qRes;
  if (cssW * scale > 1920) scale = 1920 / cssW;
  if (cssH * scale > 1200) scale = Math.min(scale, 1200 / cssH);
  W = Math.max(320, Math.round(cssW * scale));
  H = Math.max(240, Math.round(cssH * scale));
  W = (W + 1) & ~1;
  H = (H + 1) & ~1;
  cv.width = W; cv.height = H;
  if (RT) for (const k in RT) { const a = Array.isArray(RT[k]) ? RT[k] : [RT[k]]; for (const r of a) { gl.deleteTexture(r.t); gl.deleteFramebuffer(r.f); } }
  const hW = W >> 1, hH = H >> 1;
  RT = { scene: target(W, H), acc: [target(W, H), target(W, H)], vol: target(hW, hH), down: [], up: [] };
  for (let i = 1; i <= 6; i++) {
    const sW = Math.max(2, W >> i), sH = Math.max(2, H >> i);
    RT.down.push(target(sW, sH));
    RT.up.push(target(sW, sH));
  }
}
addEventListener('resize', resize); resize();
let accIdx = 0;

function setCam(p, C, w, h, t) {
  gl.uniform3fv(p.u('uCamR'), C.r); gl.uniform3fv(p.u('uCamU'), C.u); gl.uniform3fv(p.u('uCamF'), C.f);
  gl.uniform1f(p.u('uTan'), C.tan); gl.uniform2f(p.u('uRes'), w, h); gl.uniform1f(p.u('uTime'), t);
}
function setSky(p, S) {
  gl.uniform4fv(p.u('uSkyA'), S.A); gl.uniform4fv(p.u('uSkyB'), S.B); gl.uniformMatrix3fv(p.u('uSkyRot'), false, S.rot);
  gl.uniform4fv(p.u('uGRB'), S.grb); gl.uniform4fv(p.u('uRip'), S.rip); gl.uniform1f(p.u('uRipR'), S.ripR); gl.uniform4fv(p.u('uLensGal'), S.lens);
}
function bindTarget(r) { gl.bindFramebuffer(gl.FRAMEBUFFER, r ? r.f : null); gl.viewport(0, 0, r ? r.w : W, r ? r.h : H); }
function fsq() { gl.bindVertexArray(emptyVAO); gl.drawArrays(gl.TRIANGLES, 0, 3); }
function tex(p, name, t, unit) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(p.u(name), unit); }
const f32 = (a, n) => { const o = new Float32Array(n); a.forEach((v, i) => o.set(v, i * 4)); return o; };

const OFF = (new URLSearchParams(location.search).get('off') || '').split(',');
function render(F, t) {
  const C = F.cam;
  if (OFF.includes('sky')) { F.sky = F.sky && Object.assign({}, F.sky, { A: [0, 0, 0, 0] }); }
  if (OFF.includes('vol')) F.vol = null; if (OFF.includes('bodies')) F.bodies = []; if (OFF.includes('sprites')) F.sprites = [];
  if (OFF.includes('parts')) F.parts = []; F.parts = F.parts.filter(p => !OFF.includes('m' + p.mode));
  bindTarget(RT.scene); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); gl.disable(gl.BLEND);
  // background: lensing ray tracer or plain procedural sky
  if (F.bh) {
    const p = PR.bh; gl.useProgram(p); setCam(p, C, W, H, t); setSky(p, F.sky);
    gl.uniform4fv(p.u('uBH'), f32(F.bh.bh, 8)); gl.uniform4fv(p.u('uDN'), f32(F.bh.dn, 8)); gl.uniform4fv(p.u('uDP'), F.bh.dp); gl.uniform1f(p.u('uHaze'), F.bh.haze);
    fsq();
  } else if (F.sky) { const p = PR.sky; gl.useProgram(p); setCam(p, C, W, H, t); setSky(p, F.sky); fsq(); }
  gl.enable(gl.BLEND);
  if (F.bodies.length) {
    const p = PR.body; gl.useProgram(p); setCam(p, C, W, H, t); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const b = F.bodies.slice(0, 6);
    gl.uniform1i(p.u('uNB'), b.length);
    gl.uniform4fv(p.u('uBP'), f32(b.map(x => [...x.p, x.R]), 24)); gl.uniform4fv(p.u('uBT'), f32(b.map(x => [x.type, x.seed || 0, x.a || 0, x.b || 0]), 24));
    gl.uniform4fv(p.u('uBX'), f32(b.map(x => x.X || [0, 1, 0, 0]), 24));
    gl.uniform3fv(p.u('uLPos'), F.light.p); gl.uniform3fv(p.u('uLCol'), F.light.col);
    fsq();
  }
  if (F.vol && F.vol.bright > 1e-3) {
    const v = F.vol, p = PR.vol; gl.disable(gl.BLEND); bindTarget(RT.vol); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(p); setCam(p, C, RT.vol.w, RT.vol.h, t);
    gl.uniform4f(p.u('uVC'), v.c[0], v.c[1], v.c[2], v.R); gl.uniform1i(p.u('uVM'), v.mode); gl.uniform4fv(p.u('uVP'), v.P);
    gl.uniform3fv(p.u('uVA'), v.A); gl.uniform3fv(p.u('uVB'), v.B); gl.uniform1f(p.u('uVBr'), v.bright);
    const L = (v.lights || []).slice(0, 4);
    gl.uniform4fv(p.u('uL'), f32(L.map(l => [...l[0], l[1]]), 16));
    const lc = new Float32Array(12); L.forEach((l, i) => lc.set(l[2], i * 3)); gl.uniform3fv(p.u('uLC'), lc);
    fsq();
    bindTarget(RT.scene); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(PR.blit); tex(PR.blit, 'uT', RT.vol.t, 0); gl.uniform2f(PR.blit.u('uInv'), 1 / W, 1 / H); fsq();
  }
  if (F.parts.length) {
    const p = PR.part; gl.useProgram(p); setCam(p, C, W, H, t); gl.bindVertexArray(emptyVAO);
    gl.uniform1f(p.u('uMaxPx'), MAXPT);
    if (F.proto) gl.uniform4fv(p.u('uProto'), F.proto);
    for (const s of F.parts) {
      const n = Math.floor(s.count * qPart); if (n < 1 || s.bright <= 0) continue;
      if (s.blend === 1) gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_COLOR); else gl.blendFunc(gl.ONE, gl.ONE);
      gl.uniform1i(p.u('uMode'), s.mode); gl.uniform1ui(p.u('uSeed'), s.seed >>> 0);
      gl.uniform3fv(p.u('uO'), s.o); gl.uniformMatrix3fv(p.u('uM'), false, s.M); gl.uniform1f(p.u('uScale'), s.scale);
      gl.uniform4fv(p.u('uP0'), s.P0); gl.uniform4fv(p.u('uP1'), s.P1); gl.uniform4fv(p.u('uP2'), s.P2); gl.uniform4fv(p.u('uP3'), s.P3);
      gl.uniform1f(p.u('uBright'), s.bright); gl.uniform1f(p.u('uRef'), s.ref); gl.uniform1f(p.u('uPxMin'), s.pxMin * H / 1000);
      gl.uniform1f(p.u('uNear'), s.near); gl.uniform4fv(p.u('uHide'), s.hide);
      gl.drawArrays(gl.POINTS, 0, n);
    }
  }
  if (F.sprites.length) {
    const p = PR.spr, n = Math.min(256, F.sprites.length); gl.useProgram(p); setCam(p, C, W, H, t); gl.uniform1f(p.u('uNear'), 1e-6);
    gl.blendFunc(gl.ONE, gl.ONE);
    F.sprites.slice(0, n).forEach((s, i) => sprData.set([...s[0], s[1], ...s[2], s[3], s[4], s[5], 0, 0], i * 12));
    gl.bindVertexArray(sprVAO); gl.bindBuffer(gl.ARRAY_BUFFER, sprBuf); gl.bufferData(gl.ARRAY_BUFFER, sprData.subarray(0, n * 12), gl.DYNAMIC_DRAW);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, n);
  }
  gl.disable(gl.BLEND);
  // temporal accumulation = motion-blur approximation in fast shots
  const cur = RT.acc[accIdx], prev = RT.acc[1 - accIdx]; accIdx = 1 - accIdx;
  bindTarget(cur); gl.useProgram(PR.acc); tex(PR.acc, 'uCur', RT.scene.t, 0); tex(PR.acc, 'uPrev', prev.t, 1);
  gl.uniform1f(PR.acc.u('uTrail'), F.post.trail); gl.uniform2f(PR.acc.u('uInv'), 1 / W, 1 / H); fsq();
  // bloom pyramid (no threshold: physically-motivated glare of the whole HDR image)
  let src = cur;
  for (let i = 0; i < RT.down.length; i++) {
    const d = RT.down[i]; bindTarget(d); gl.useProgram(PR.down); tex(PR.down, 'uT', src.t, 0);
    gl.uniform2f(PR.down.u('uInv'), 1 / d.w, 1 / d.h); gl.uniform2f(PR.down.u('uSrc'), .5 / src.w, .5 / src.h); fsq(); src = d;
  }
  let low = RT.down[RT.down.length - 1];
  for (let i = RT.down.length - 2; i >= 0; i--) {
    const u = RT.up[i]; bindTarget(u); gl.useProgram(PR.up); tex(PR.up, 'uT', RT.down[i].t, 0); tex(PR.up, 'uLow', low.t, 1);
    gl.uniform2f(PR.up.u('uInv'), 1 / u.w, 1 / u.h); gl.uniform2f(PR.up.u('uSrc'), 1 / low.w, 1 / low.h); fsq(); low = u;
  }
  bindTarget(null); const p = PR.fin; gl.useProgram(p); tex(p, 'uImg', cur.t, 0); tex(p, 'uBloom', low.t, 1);
  gl.uniform2f(p.u('uRes'), W, H); gl.uniform1f(p.u('uExp'), F.post.exp); gl.uniform1f(p.u('uBloomAmt'), F.post.bloom);
  gl.uniform1f(p.u('uFade'), F.post.fade); gl.uniform1f(p.u('uFlash'), F.post.flash); gl.uniform3fv(p.u('uFlashCol'), F.post.flashCol);
  gl.uniform1f(p.u('uTime'), t); gl.uniform4fv(p.u('uRipS'), F.post.rip); fsq();
}
