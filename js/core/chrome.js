/* chrome.js — the last card: the wordmark cast in living metal.
   A domain-warped fbm height field, shaded as chrome from the gradient of
   that field: a sharp specular for the metal, a fresnel-gated cosine
   palette for the thin-film sheen. The technique is the webgl-liquid-metal
   skill's; what is ours is where the light comes from and what colour the
   hot end of the highlight goes. The reference tints its specular lime; we
   tint ours to the same flare the film's torches burn at, so the metal
   belongs to this world rather than arriving from a shader gallery.

   The canvas is masked to the wordmark's own alpha, so the metal is only
   ever seen through the letterforms. The key light follows the pointer,
   which is the whole trick: a still highlight reads as a texture, a
   highlight that moves with your hand reads as a surface. */

import { clamp, damp, qs, PARAMS, REDUCED_MOTION } from './util.js';

const FRAG = `#version 300 es
precision highp float;
out vec4 o;
uniform vec2 res;
uniform float t;
uniform vec2 light;      // the key light, driven by the pointer
uniform float warm;      // how far the sheen leans into gold

float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for(int i=0;i<5;i++){ v += a*noise(p); p = p*2.02 + 3.1; a *= 0.5; }
  return v;
}
/* the molten surface: noise warped by noise, drifting slowly */
float height(vec2 uv){
  float tt = t*0.07;
  vec2 q = vec2(fbm(uv*1.5 + tt), fbm(uv*1.5 - tt + 7.3));
  return fbm(uv*1.8 + 2.0*q + vec2(0.0, tt));
}
/* thin-film sheen. The phases are pulled towards the site's own range:
   ochre, then a turn through the trance's slate, rather than a full
   spectrum rainbow, which on a wordmark reads as a novelty */
vec3 iridescent(float x){
  return 0.52 + 0.44*cos(6.2831853*(vec3(x) + vec3(0.02, 0.22, 0.50)));
}
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*res) / res.y;
  float e = 0.0016;
  float h  = height(uv);
  float hx = height(uv + vec2(e, 0.0));
  float hy = height(uv + vec2(0.0, e));
  vec3 n = normalize(vec3((h-hx)/e, (h-hy)/e, 1.0));
  vec3 ld = normalize(vec3(light.x, light.y, 0.85));
  vec3 vd = vec3(0.0, 0.0, 1.0);
  vec3 hlf = normalize(ld + vd);
  float spec = pow(clamp(dot(n, hlf), 0.0, 1.0), 84.0);
  float diff = clamp(dot(n, ld), 0.0, 1.0);
  float fres = pow(1.0 - clamp(dot(n, vd), 0.0, 1.0), 4.0);
  /* the base is a cool oxidised silver so the gold has something to be
     gold against; without the cool floor the whole thing reads as brass */
  vec3 chrome = mix(vec3(0.045, 0.048, 0.062), vec3(0.60, 0.62, 0.70), diff);
  vec3 irid = iridescent(h*1.35 + fres*0.55 + t*0.018);
  vec3 col = chrome + irid * (fres*0.62 + 0.10);
  col += vec3(1.0) * spec;
  col = mix(col, vec3(0.965, 0.737, 0.337), spec*warm);   // the flare, #f6bc56
  col = pow(col, vec3(0.9));
  o = vec4(col, 1.0);
}`;

const VERT = `#version 300 es
in vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

export function initChrome() {
  const stage = qs('#chrome-stage');
  const canvas = qs('#chrome-canvas');
  if (!stage || !canvas) return { warm: () => {} };

  const fallback = () => {
    // never a blank rectangle: the wordmark stands in flat bone instead
    stage.classList.add('is-flat');
    return { warm: () => {} };
  };

  const gl = canvas.getContext('webgl2', {
    antialias: false,
    alpha: false,
    powerPreference: 'low-power',
    // the drawing buffer is cleared after compositing, so a frame cannot be
    // read back to check the shader actually drew; ?dbg keeps it around
    preserveDrawingBuffer: PARAMS.has('dbg'),
  });
  if (!gl || REDUCED_MOTION) return fallback();

  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn('[chrome] shader:', gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return fallback();

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.bindAttribLocation(prog, 0, 'p');
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('[chrome] link:', gl.getProgramInfoLog(prog));
    return fallback();
  }
  gl.useProgram(prog);

  // one triangle big enough to cover the clip square
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'res');
  const uT = gl.getUniformLocation(prog, 't');
  const uLight = gl.getUniformLocation(prog, 'light');
  const uWarm = gl.getUniformLocation(prog, 'warm');

  /* three height samples of a five-octave fbm per pixel is real work, and
     this canvas is only ever seen through letterforms, so it renders at
     reduced scale and lets the mask hide the softness */
  const SCALE = 0.6;
  const size = () => {
    const dpr = Math.min(devicePixelRatio || 1, 1.75) * SCALE;
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width === w && canvas.height === h) return;
    canvas.width = w; canvas.height = h;
    gl.viewport(0, 0, w, h);
  };
  size();
  addEventListener('resize', size);

  /* the light lives where the hand is. Off the pointer it drifts back to a
     slow orbit, so the metal is never dead when nobody is touching it. */
  let lx = 0.35, ly = 0.45, tx = 0.35, ty = 0.45, tracking = false;
  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    tx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1) * 1.15;
    ty = clamp(1 - ((e.clientY - r.top) / r.height) * 2, -1, 1) * 0.9;
    tracking = true;
  }, { passive: true });
  stage.addEventListener('pointerleave', () => { tracking = false; });

  let warmth = 0.34;
  let visible = false;
  new IntersectionObserver((es) => {
    // the shader is only ever running while it can be seen
    visible = es[0].isIntersecting;
    if (visible) { size(); start = start || performance.now(); }
  }, { threshold: 0.02 }).observe(stage);

  let start = 0;
  let last = performance.now();
  let raf = 0;
  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    if (!visible) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!tracking) {
      const a = now * 0.00022;
      tx = Math.sin(a) * 0.75;
      ty = 0.35 + Math.cos(a * 0.8) * 0.35;
    }
    lx = damp(lx, tx, 5, dt);
    ly = damp(ly, ty, 5, dt);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uT, (now - start) / 1000);
    gl.uniform2f(uLight, lx, ly);
    gl.uniform1f(uWarm, warmth);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  raf = requestAnimationFrame(frame);

  return {
    /* the scroll heats the metal: cool silver on arrival, full flare as the
       wordmark takes the frame, so the last beat of the page has a peak */
    warm: (v) => { warmth = 0.16 + clamp(v, 0, 1) * 0.5; },
    stop: () => cancelAnimationFrame(raf),
  };
}
