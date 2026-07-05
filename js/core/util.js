/* util.js — shared maths, device capability flags, keyframe helpers. */

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const mapRange = (v, a, b, c, d) => c + (d - c) * clamp((v - a) / (b - a), 0, 1);

/* Frame-rate independent exponential smoothing. lambda ≈ 1/timeConstant. */
export const damp = (current, target, lambda, dt) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

export const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/* Keyframe track: kf([[p0, v0], [p1, v1], ...]) -> fn(p) with linear
   interpolation between stops. Values may be numbers or arrays. */
export function kf(stops) {
  return (p) => {
    if (p <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) {
      if (p <= stops[i][0]) {
        const [pa, va] = stops[i - 1];
        const [pb, vb] = stops[i];
        const t = (p - pa) / (pb - pa);
        if (Array.isArray(va)) return va.map((v, j) => lerp(v, vb[j], t));
        return lerp(va, vb, t);
      }
    }
    return stops[stops.length - 1][1];
  };
}

/* Eased keyframe segment helper: progress of p within [a, b], eased. */
export const seg = (p, a, b, ease) => {
  const t = clamp((p - a) / (b - a), 0, 1);
  return ease ? ease(t) : t;
};
export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t) => t * t * t;

/* ---- device caps ---- */
export const REDUCED_MOTION =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const IS_MOBILE =
  window.matchMedia('(max-width: 768px)').matches ||
  (navigator.maxTouchPoints > 1 && window.matchMedia('(max-width: 1024px)').matches);

export const HAS_WEBGL = (() => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
})();

/* Mobile asset tier: names that ship a -m variant. */
const MOBILE_TIER = new Set([
  'land-00-base', 'land-01-hills-far', 'land-02-hill-main', 'land-03-tower',
  'land-04-flora-mid', 'land-05-flora-fore', 'moth-full', 'goddess-full',
  'mask-hires',
]);
export function asset(path) {
  if (!IS_MOBILE) return path;
  const m = path.match(/([^/]+)\.webp$/);
  if (m && MOBILE_TIER.has(m[1])) return path.replace(/\.webp$/, '-m.webp');
  return path;
}

/* Root-relative path helper so the same modules serve /, /film/, etc. */
export const ROOT = document.documentElement.dataset.root || '.';
export const fromRoot = (p) => `${ROOT}/${p}`;

export const qs = (sel, el = document) => el.querySelector(sel);
export const qsa = (sel, el = document) => [...el.querySelectorAll(sel)];

/* Debug params */
export const PARAMS = new URLSearchParams(location.search);
