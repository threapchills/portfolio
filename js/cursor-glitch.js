/* ============================================================
   Custom cursor + hero-banner glitch overlay.

   Single-video approach: the glitch layer is driven by each
   hero's poster / fallback image, not a cloned video. Keeps
   GPU load low and sidesteps Chrome's concurrent-decoder cap.
   ============================================================ */

(function () {
  const isCoarse = window.matchMedia('(hover: none)').matches || window.matchMedia('(pointer: coarse)').matches;

  /* ── SVG filter (static; no animated seed) ──────────────── */
  if (!document.getElementById('glitch-filter-svg')) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('id', 'glitch-filter-svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;';
    svg.innerHTML = `
      <defs>
        <filter id="glitch-filter" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.025 0.08" numOctaves="2" seed="5" result="turb"/>
          <feDisplacementMap in="SourceGraphic" in2="turb" scale="10" xChannelSelector="R" yChannelSelector="G" result="displaced"/>
          <feColorMatrix in="displaced" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="redCh"/>
          <feColorMatrix in="displaced" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="grnCh"/>
          <feColorMatrix in="displaced" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="bluCh"/>
          <feOffset in="redCh" dx="8" dy="0" result="redOff"/>
          <feOffset in="bluCh" dx="-8" dy="0" result="bluOff"/>
          <feBlend in="redOff" in2="grnCh" mode="lighten" result="rg"/>
          <feBlend in="rg" in2="bluOff" mode="lighten"/>
        </filter>
      </defs>`;
    document.body.appendChild(svg);
  }

  /* ── Custom cursor (pointer-device only) ────────────────── */
  if (!isCoarse) {
    document.documentElement.classList.add('cursor-active');

    const cursor = document.createElement('div');
    cursor.id = 'cursor-reticle';
    cursor.innerHTML = '<span class="cursor-dot"></span>';
    document.body.appendChild(cursor);

    let tx = -200, ty = -200, cx = -200, cy = -200;
    document.addEventListener('mousemove', e => {
      tx = e.clientX;
      ty = e.clientY;
    }, { passive: true });

    function tick() {
      cx += (tx - cx) * 0.24;
      cy += (ty - cy) * 0.24;
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    const hoverSelector = 'a, button, .project-panel, .carousel-item, .writing-card, .carousel-btn, .video-embed-wrap, .nav-menu-btn';
    document.addEventListener('mouseover', e => {
      if (e.target.closest && e.target.closest(hoverSelector)) cursor.classList.add('cursor-hover');
    });
    document.addEventListener('mouseout', e => {
      if (e.target.closest && e.target.closest(hoverSelector)) cursor.classList.remove('cursor-hover');
    });
    document.addEventListener('mouseleave', () => cursor.classList.add('cursor-gone'));
    document.addEventListener('mouseenter', () => cursor.classList.remove('cursor-gone'));

    document.addEventListener('mousedown', () => cursor.classList.add('cursor-down'));
    document.addEventListener('mouseup', () => cursor.classList.remove('cursor-down'));
  }

  /* ── Glitch overlays (poster-image driven, no video clone) ─ */
  function wireGlitch(root) {
    const heroes = (root || document).querySelectorAll('.panel-bg, .project-hero-bg');
    heroes.forEach(bg => {
      if (bg.dataset.glitchWired === '1') return;
      bg.dataset.glitchWired = '1';

      const copy = document.createElement('div');
      copy.className = 'glitch-copy';

      const vid = bg.querySelector('video');
      if (vid) {
        const poster = vid.getAttribute('poster');
        if (poster) copy.style.backgroundImage = `url('${poster}')`;
      } else {
        const inlineBg = bg.style.backgroundImage;
        if (inlineBg) copy.style.backgroundImage = inlineBg;
      }

      bg.appendChild(copy);

      /* Batch mouse updates to one paint per frame. */
      let pending = 0;
      let lastX = -9999, lastY = -9999;
      bg.addEventListener('mousemove', e => {
        const rect = bg.getBoundingClientRect();
        lastX = e.clientX - rect.left;
        lastY = e.clientY - rect.top;
        if (!pending) {
          pending = requestAnimationFrame(() => {
            bg.style.setProperty('--gx', `${lastX}px`);
            bg.style.setProperty('--gy', `${lastY}px`);
            pending = 0;
          });
        }
      }, { passive: true });

      bg.addEventListener('mouseleave', () => {
        if (pending) { cancelAnimationFrame(pending); pending = 0; }
        bg.style.setProperty('--gx', `-9999px`);
        bg.style.setProperty('--gy', `-9999px`);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => wireGlitch());
  } else {
    wireGlitch();
  }

  window.wireGlitch = wireGlitch;
})();
