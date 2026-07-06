/* gl-planes.js — minimal WebGL plane engine, no Three.js.
   Planes track DOM elements; one shared context renders them all.
   Ships the three decoded behaviours:
     1. scroll bend    — y += sin(x·π) · sin(uDeform / 240)
     2. cursor ripple  — cosine wave from the pointer, falloff 0.4/(d+0.4)
     3. transition     — uTrans remapped so distortion peaks mid-morph,
                         warped pixels catching light by displacement
   Fallback: pages keep their <img>; without WebGL nothing breaks. */

import { clamp, damp, HAS_WEBGL } from './util.js';

const GRID = 48;

const VERT = `
attribute vec2 aPos;
uniform vec4 uRect;
uniform vec2 uViewport;
uniform float uDeform;
uniform vec2 uMouse;
uniform float uTime;
uniform mediump float uTrans;
uniform float uRipple;
varying vec2 vUv;
varying float vZ;
void main() {
  vUv = aPos;
  vec2 px = uRect.xy + aPos * uRect.zw;
  float bend = sin(aPos.x * 3.14159) * sin(uDeform / 240.0) * uRect.w * 0.12;
  px.y += bend;
  float aspect = uRect.z / uRect.w;
  vec2 p = vec2(aPos.x * aspect, aPos.y);
  vec2 m = vec2(uMouse.x * aspect, uMouse.y);
  float d = distance(p, m);
  float rip = cos(d * 18.0 - uTime * 5.0) * (0.4 / (d + 0.4)) * uRipple;
  float tPeak = 1.0 - abs(uTrans * 2.0 - 1.0);
  float morph = sin(aPos.y * 3.14159) * sin(aPos.x * 3.14159) * tPeak * 3.0;
  vZ = rip + morph + bend * 0.05;
  vec2 clip = (px / uViewport) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
varying vec2 vUv;
varying float vZ;
uniform sampler2D uTexA;
uniform sampler2D uTexB;
uniform float uTrans;
uniform vec2 uScaleA; uniform vec2 uOffsetA;
uniform vec2 uScaleB; uniform vec2 uOffsetB;
void main() {
  float tPeak = 1.0 - abs(uTrans * 2.0 - 1.0);
  vec2 warp = vec2(vZ * 0.012, vZ * 0.018) * (0.35 + tPeak * 1.4);
  vec2 uvA = clamp((vUv + warp) * uScaleA + uOffsetA, 0.002, 0.998);
  vec2 uvB = clamp((vUv - warp) * uScaleB + uOffsetB, 0.002, 0.998);
  vec4 a = texture2D(uTexA, uvA);
  vec4 b = texture2D(uTexB, uvB);
  vec4 c = mix(a, b, smoothstep(0.32, 0.68, uTrans));
  c.rgb *= 1.0 + vZ * 0.06;
  gl_FragColor = c;
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn('[gl] shader:', gl.getShaderInfoLog(s));
  }
  return s;
}

export class GLPlanes {
  constructor(canvas) {
    this.enabled = HAS_WEBGL;
    if (!this.enabled) return;
    this.canvas = canvas;
    const gl = canvas.getContext('webgl', { alpha: true, antialias: false });
    if (!gl) { this.enabled = false; return; }
    this.gl = gl;
    this.planes = [];
    this.velocity = 0;
    this._scrollPrev = window.scrollY;

    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('[gl] link:', gl.getProgramInfoLog(prog));
      this.enabled = false;
      return;
    }
    this.prog = prog;
    this.loc = {};
    for (const u of ['uRect', 'uViewport', 'uDeform', 'uMouse', 'uTime', 'uTrans',
      'uRipple', 'uTexA', 'uTexB', 'uScaleA', 'uOffsetA', 'uScaleB', 'uOffsetB']) {
      this.loc[u] = gl.getUniformLocation(prog, u);
    }

    // one subdivided quad shared by every plane
    const verts = [];
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const x0 = x / GRID, x1 = (x + 1) / GRID;
        const y0 = y / GRID, y1 = (y + 1) / GRID;
        verts.push(x0, y0, x1, y0, x0, y1, x1, y0, x1, y1, x0, y1);
      }
    }
    this.vertCount = verts.length / 2;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = innerWidth * dpr;
    this.canvas.height = innerHeight * dpr;
    this.dpr = dpr;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  texture(src, onload) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([8, 8, 8, 255]));
    const img = new Image();
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      tex.iw = img.naturalWidth; tex.ih = img.naturalHeight;
      onload?.();
    };
    img.src = src;
    tex.iw = 1; tex.ih = 1;
    return tex;
  }

  /* el: the DOM element the plane shadows. opts: srcA, srcB, ripple, bend. */
  addPlane(el, opts) {
    if (!this.enabled) return null;
    const plane = {
      el,
      texA: this.texture(opts.srcA),
      texB: opts.srcB ? this.texture(opts.srcB) : null,
      ripple: opts.ripple ? 1 : 0,
      bend: opts.bend !== false,
      trans: 0,
      mouse: { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 },
    };
    if (opts.ripple) {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        plane.mouse.tx = (e.clientX - r.left) / r.width;
        plane.mouse.ty = (e.clientY - r.top) / r.height;
      });
    }
    this.planes.push(plane);
    return plane;
  }

  render(time, dt) {
    if (!this.enabled) return;
    const gl = this.gl;
    const y = window.scrollY;
    const v = (y - this._scrollPrev) / Math.max(dt, 0.001);
    this._scrollPrev = y;
    this.velocity = damp(this.velocity, clamp(v, -3000, 3000), 4, dt);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.prog);
    gl.uniform2f(this.loc.uViewport, innerWidth, innerHeight);
    gl.uniform1f(this.loc.uTime, time);

    for (const p of this.planes) {
      if (p.hide) continue;
      const r = p.el.getBoundingClientRect();
      if (r.bottom < -80 || r.top > innerHeight + 80) continue;
      if (r.right < -80 || r.left > innerWidth + 80) continue;
      p.mouse.x = damp(p.mouse.x, p.mouse.tx, 8, dt);
      p.mouse.y = damp(p.mouse.y, p.mouse.ty, 8, dt);

      gl.uniform4f(this.loc.uRect, r.left, r.top, r.width, r.height);
      gl.uniform1f(this.loc.uDeform, p.bend ? this.velocity * 0.14 : 0);
      gl.uniform2f(this.loc.uMouse, p.mouse.x, p.mouse.y);
      gl.uniform1f(this.loc.uTrans, p.trans);
      gl.uniform1f(this.loc.uRipple, p.ripple);

      this.cover(p.texA, r, this.loc.uScaleA, this.loc.uOffsetA);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, p.texA);
      gl.uniform1i(this.loc.uTexA, 0);
      const b = p.texB || p.texA;
      this.cover(b, r, this.loc.uScaleB, this.loc.uOffsetB);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, b);
      gl.uniform1i(this.loc.uTexB, 1);

      gl.drawArrays(gl.TRIANGLES, 0, this.vertCount);
    }
  }

  /* cover-fit uv mapping for a texture inside a plane rect */
  cover(tex, r, scaleLoc, offsetLoc) {
    const gl = this.gl;
    const ta = (tex.iw || 1) / (tex.ih || 1);
    const ra = r.width / r.height;
    let sx = 1, sy = 1;
    if (ta > ra) sx = ra / ta; else sy = ta / ra;
    gl.uniform2f(scaleLoc, sx, sy);
    gl.uniform2f(offsetLoc, (1 - sx) / 2, (1 - sy) / 2);
  }
}
