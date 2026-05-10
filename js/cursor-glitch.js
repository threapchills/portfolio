/* ============================================================
   Custom cursor — minimal dot.
   Replaces the previous reticle + SVG glitch overlay system,
   which was tanking framerate by running feTurbulence +
   feDisplacementMap filters on every hero panel simultaneously.
   ============================================================ */

(function () {
  const isCoarse =
    window.matchMedia('(hover: none)').matches ||
    window.matchMedia('(pointer: coarse)').matches;
  if (isCoarse) return;

  document.documentElement.classList.add('cursor-active');

  const cursor = document.createElement('div');
  cursor.id = 'cursor-dot';
  document.body.appendChild(cursor);

  let tx = -200, ty = -200, cx = -200, cy = -200;
  document.addEventListener('mousemove', e => {
    tx = e.clientX;
    ty = e.clientY;
  }, { passive: true });

  function tick() {
    cx += (tx - cx) * 0.35;
    cy += (ty - cy) * 0.35;
    cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  const hoverSelector =
    'a, button, .project-panel, .carousel-item, .writing-card, .carousel-btn, .video-embed-wrap, .nav-menu-btn, .contact-btn';

  document.addEventListener('mouseover', e => {
    if (e.target.closest && e.target.closest(hoverSelector)) cursor.classList.add('cursor-hover');
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest && e.target.closest(hoverSelector)) cursor.classList.remove('cursor-hover');
  });
  document.addEventListener('mouseleave', () => cursor.classList.add('cursor-gone'));
  document.addEventListener('mouseenter', () => cursor.classList.remove('cursor-gone'));
  document.addEventListener('mousedown', () => cursor.classList.add('cursor-down'));
  document.addEventListener('mouseup',   () => cursor.classList.remove('cursor-down'));
})();
