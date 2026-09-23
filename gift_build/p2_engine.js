// ============================================================ math
const TAU = Math.PI * 2;
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const sm = (a, b, x) => { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
const mix = (a, b, t) => a + (b - a) * t;
const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: a => Math.hypot(a[0], a[1], a[2]), norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
};
// time-aware cubic Hermite spline through [t, vec] keys
function spline(K, t) {
  const n = K.length;
  if (t <= K[0][0]) return K[0][1].slice(); if (t >= K[n - 1][0]) return K[n - 1][1].slice();
  let i = 0; while (t > K[i + 1][0]) i++;
  const h = K[i + 1][0] - K[i][0], s = (t - K[i][0]) / h;
  const tan = j => { if (j === 0 || j === n - 1) return K[j][1].map(() => 0); const a = K[j - 1], b = K[j + 1]; return a[1].map((v, k) => (b[1][k] - v) / (b[0] - a[0])); };
  const m0 = tan(i), m1 = tan(i + 1), s2 = s * s, s3 = s2 * s;
  return K[i][1].map((v, k) => (2 * s3 - 3 * s2 + 1) * v + (s3 - 2 * s2 + s) * h * m0[k] + (-2 * s3 + 3 * s2) * K[i + 1][1][k] + (s3 - s2) * h * m1[k]);
}
function cam(p, tg, fov, roll = 0) {
  const f = V.norm(V.sub(tg, p)), r0 = V.norm(V.cross(f, [0, 1, 0])), u0 = V.cross(r0, f);
  const c = Math.cos(roll), s = Math.sin(roll);
  return { p, f, r: V.add(V.mul(r0, c), V.mul(u0, s)), u: V.sub(V.mul(u0, c), V.mul(r0, s)), tan: Math.tan(fov * Math.PI / 360) };
}
// rotation (+ uniform scale) as a column-major mat3
function rotM(ax, ang, s = 1, tilt = 0) {
  const ry = ang, rx = tilt, cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
  // R = Ry * Rx
  return new Float32Array([cy * s, 0, -sy * s, sy * sx * s, cx * s, cy * sx * s, sy * cx * s, -sx * s, cy * cx * s]);
}
const I3 = rotM(0, 0);
function rng(seed) { let s = seed >>> 0; return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function gauss(r) { return Math.sqrt(-2 * Math.log(Math.max(r(), 1e-9))) * Math.cos(TAU * r()); }

// ============================================================ GL
const cv = document.getElementById('c');
const gl = cv.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' });
if (!gl) { document.body.innerHTML = '<p style="color:#888;font:14px sans-serif;text-align:center;margin-top:40vh">WebGL2 is required.</p>'; throw new Error('no webgl2'); }
const HDR = !!gl.getExtension('EXT_color_buffer_float');
const MAXPT = Math.min(gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1], 256);
function compile(type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(s); console.error(log); throw new Error(log); }
  return s;
}
function program(vs, fs) {
  const p = gl.createProgram(); gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const cache = {}; p.u = n => n in cache ? cache[n] : (cache[n] = gl.getUniformLocation(p, n)); return p;
}
const PR = { env: program(FSQ_VS, ENV_FS), body: program(FSQ_VS, BODY_FS), part: program(PART_VS, PART_FS), spr: program(SPR_VS, SPR_FS),
  down: program(FSQ_VS, DOWN_FS), up: program(FSQ_VS, UP_FS), fin: program(FSQ_VS, FINAL_FS) };
const emptyVAO = gl.createVertexArray();
const sprVAO = gl.createVertexArray(), sprBuf = gl.createBuffer();
gl.bindVertexArray(sprVAO); gl.bindBuffer(gl.ARRAY_BUFFER, sprBuf);
for (let i = 0; i < 3; i++) { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, 4, gl.FLOAT, false, 48, i * 16); gl.vertexAttribDivisor(i, 1); }
gl.bindVertexArray(null);
const sprData = new Float32Array(64 * 12);

function dataTex(w, h, data) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  return t;
}
function target(w, h) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, HDR ? gl.RGBA16F : gl.RGBA8, w, h, 0, gl.RGBA, HDR ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
  return { t, f, w, h };
}
let RT = null, qRes = 1, qPart = 1, W = 0;
function resize() {
  const css = Math.floor(Math.min(innerWidth, innerHeight));
  cv.style.width = cv.style.height = css + 'px';
  W = Math.max(320, Math.min(1400, Math.round(css * Math.min(devicePixelRatio || 1, 2) * qRes)));
  cv.width = cv.height = W;
  if (RT) for (const r of [RT.scene, ...RT.down, ...RT.up]) { gl.deleteTexture(r.t); gl.deleteFramebuffer(r.f); }
  RT = { scene: target(W, W), down: [], up: [] };
  for (let i = 1; i <= 6; i++) { const s = Math.max(2, W >> i); RT.down.push(target(s, s)); RT.up.push(target(s, s)); }
}
addEventListener('resize', resize); resize();

function setCam(p, C, t) {
  gl.uniform3fv(p.u('uCamR'), C.r); gl.uniform3fv(p.u('uCamU'), C.u); gl.uniform3fv(p.u('uCamF'), C.f); gl.uniform3fv(p.u('uCamPos'), C.p);
  gl.uniform1f(p.u('uTan'), C.tan); gl.uniform2f(p.u('uRes'), W, W); gl.uniform1f(p.u('uTime'), t);
}
function bindTarget(r) { gl.bindFramebuffer(gl.FRAMEBUFFER, r ? r.f : null); gl.viewport(0, 0, r ? r.w : W, r ? r.h : W); }
function fsq() { gl.bindVertexArray(emptyVAO); gl.drawArrays(gl.TRIANGLES, 0, 3); }
function tex(p, name, t, unit) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(p.u(name), unit); }
const f32 = (a, n) => { const o = new Float32Array(n); a.forEach((v, i) => o.set(v, i * 4)); return o; };

// a frame is a declarative description of everything visible at time t
function newFrame(C) {
  return { cam: C, env: { warm: 0, reveal: 0, neb: 0, ocean: 0, dim: 1, sun: [0, 0, 1], isl: [] }, hero: [0, 0, 0], heroI: 0,
    bodies: [], parts: [], story: null, sprites: [], post: { exp: 1, bloom: .05, fade: 1, white: 0, warm: 0, bh: [.5, .5, 0, 0] } };
}
function PS(mode, count, opt = {}) { return Object.assign({ mode, count, P0: [0, 0, 0, 0], P1: [0, 0, 0, 0], P2: [0, 0, 0, 0], bright: 1, ref: 1e6, pxMin: 1.6, near: .02, seed: mode + 1 }, opt); }
function sprite(F, p, size, col, I, spikes = 0, halo = 1) { if (I > 1e-4) F.sprites.push([p, size, col, I, spikes, halo]); }

function render(F, t) {
  const C = F.cam;
  bindTarget(RT.scene); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); gl.disable(gl.BLEND);
  const isl = f32(F.env.isl, 20);
  { const p = PR.env, e = F.env; gl.useProgram(p); setCam(p, C, t);
    gl.uniform1f(p.u('uWarm'), e.warm); gl.uniform1f(p.u('uReveal'), e.reveal); gl.uniform1f(p.u('uNeb'), e.neb); gl.uniform1f(p.u('uOcean'), e.ocean);
    gl.uniform1f(p.u('uDim'), e.dim); gl.uniform3fv(p.u('uSun'), e.sun); gl.uniform3fv(p.u('uHero'), F.hero); gl.uniform1f(p.u('uHeroI'), F.heroI);
    gl.uniform4fv(p.u('uIsl'), isl); fsq(); }
  gl.enable(gl.BLEND);
  if (F.bodies.length) {
    const p = PR.body, b = F.bodies.slice(0, 4); gl.useProgram(p); setCam(p, C, t); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform1i(p.u('uNB'), b.length); gl.uniform4fv(p.u('uBP'), f32(b.map(x => [...x.p, x.R]), 16));
    gl.uniform4fv(p.u('uBT'), f32(b.map(x => [x.type, x.seed || 0, x.bloom || 0, 0]), 16));
    gl.uniform3fv(p.u('uHero'), F.hero); gl.uniform1f(p.u('uHeroI'), F.heroI); fsq();
  }
  const p = PR.part; gl.useProgram(p); setCam(p, C, t); gl.bindVertexArray(emptyVAO); gl.blendFunc(gl.ONE, gl.ONE);
  gl.uniform1f(p.u('uMaxPx'), MAXPT); gl.uniform4fv(p.u('uIsl'), isl);
  tex(p, 'uPath', PATH_TEX, 0); gl.uniform1f(p.u('uPathT'), PATH_T);
  tex(p, 'uSA', SHAPES[0].tex, 1); tex(p, 'uSB', SHAPES[0].tex, 2);
  let list = F.story ? [...F.parts, F.story] : F.parts;
  const ONLY = new URLSearchParams(location.search).get('only'); if (ONLY) list = list.filter(s => String(s.mode) === ONLY);
  for (const s of list) {
    const n = s.mode === 7 ? s.count : Math.floor(s.count * qPart); if (n < 1 || s.bright <= 0) continue;
    gl.uniform1i(p.u('uMode'), s.mode); gl.uniform1ui(p.u('uSeed'), s.seed >>> 0);
    gl.uniform4fv(p.u('uP0'), s.P0); gl.uniform4fv(p.u('uP1'), s.P1); gl.uniform4fv(p.u('uP2'), s.P2);
    gl.uniform1f(p.u('uBright'), s.bright); gl.uniform1f(p.u('uRef'), s.ref); gl.uniform1f(p.u('uPxMin'), s.pxMin * W / 1000); gl.uniform1f(p.u('uNear'), s.near);
    if (s.mode === 7) {
      tex(p, 'uSA', SHAPES[s.A].tex, 1); tex(p, 'uSB', SHAPES[s.B].tex, 2);
      gl.uniformMatrix3fv(p.u('uRA'), false, s.RA); gl.uniformMatrix3fv(p.u('uRB'), false, s.RB);
      gl.uniform3fv(p.u('uOA'), s.OA); gl.uniform3fv(p.u('uOB'), s.OB);
      gl.uniform1f(p.u('uMix'), s.mix); gl.uniform1f(p.u('uStag'), s.stag); gl.uniform1f(p.u('uChaos'), s.chaos); gl.uniform1f(p.u('uSwirl'), s.swirl); gl.uniform1f(p.u('uAlpha'), s.alpha);
    }
    gl.drawArrays(gl.POINTS, 0, n);
  }
  if (F.sprites.length) {
    const sp = PR.spr, n = Math.min(64, F.sprites.length); gl.useProgram(sp); setCam(sp, C, t);
    F.sprites.slice(0, n).forEach((s, i) => sprData.set([...s[0], s[1], ...s[2], s[3], s[4], s[5], 0, 0], i * 12));
    gl.bindVertexArray(sprVAO); gl.bindBuffer(gl.ARRAY_BUFFER, sprBuf); gl.bufferData(gl.ARRAY_BUFFER, sprData.subarray(0, n * 12), gl.DYNAMIC_DRAW);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, n);
  }
  gl.disable(gl.BLEND);
  let src = RT.scene;
  for (const d of RT.down) { bindTarget(d); gl.useProgram(PR.down); tex(PR.down, 'uT', src.t, 0);
    gl.uniform2f(PR.down.u('uInv'), 1 / d.w, 1 / d.h); gl.uniform2f(PR.down.u('uSrc'), .5 / src.w, .5 / src.h); fsq(); src = d; }
  let low = RT.down[RT.down.length - 1];
  for (let i = RT.down.length - 2; i >= 0; i--) { const u = RT.up[i]; bindTarget(u); gl.useProgram(PR.up); tex(PR.up, 'uT', RT.down[i].t, 0); tex(PR.up, 'uLow', low.t, 1);
    gl.uniform2f(PR.up.u('uInv'), 1 / u.w, 1 / u.h); gl.uniform2f(PR.up.u('uSrc'), 1 / low.w, 1 / low.h); fsq(); low = u; }
  bindTarget(null); const f = PR.fin, P = F.post; gl.useProgram(f); tex(f, 'uImg', RT.scene.t, 0); tex(f, 'uBloom', low.t, 1);
  gl.uniform2f(f.u('uRes'), W, W); gl.uniform1f(f.u('uExp'), P.exp); gl.uniform1f(f.u('uBloomAmt'), P.bloom); gl.uniform1f(f.u('uFade'), P.fade);
  gl.uniform1f(f.u('uWhite'), P.white); gl.uniform1f(f.u('uWarm'), P.warm); gl.uniform1f(f.u('uTime'), t); gl.uniform4fv(f.u('uBH'), P.bh); fsq();
}
