/* ============================================================
   Custom cursor + hero-banner glitch overlay.
   Injects an SVG chromatic-aberration filter, attaches a
   reticle cursor, and places a filtered clone of each hero
   background that is revealed only within a radial zone
   around the cursor.
   ============================================================ */

(function () {
  const isCoarse = window.matchMedia('(hover: none)').matches || window.matchMedia('(pointer: coarse)').matches;

  /* ── SVG filter (once per document) ─────────────────────── */
  if (!document.getElementById('glitch-filter-svg')) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('id', 'glitch-filter-svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;';
    svg.innerHTML = `
      <defs>
        <filter id="glitch-filter" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.018 0.06" numOctaves="2" seed="3" result="turb">
            <animate attributeName="seed" from="0" to="99" dur="2.4s" repeatCount="indefinite"/>
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="turb" scale="14" xChannelSelector="R" yChannelSelector="G" result="displaced"/>
          <feColorMatrix in="displaced" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="redChan"/>
          <feColorMatrix in="displaced" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="grnChan"/>
          <feColorMatrix in="displaced" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="bluChan"/>
          <feOffset in="redChan" dx="7" dy="0" result="redShift"/>
          <feOffset in="bluChan" dx="-7" dy="0" result="bluShift"/>
          <feBlend mode="screen" in="redShift" in2="grnChan" result="rg"/>
          <feBlend mode="screen" in="rg" in2="bluShift"/>
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

  /* ── Glitch overlays on hero backgrounds ────────────────── */
  function wireGlitch(root) {
    const heroes = (root || document).querySelectorAll('.panel-bg, .project-hero-bg');
    heroes.forEach(bg => {
      if (bg.dataset.glitchWired === '1') return;
      bg.dataset.glitchWired = '1';

      const copy = document.createElement('div');
      copy.className = 'glitch-copy';

      const vid = bg.querySelector('video');
      if (vid) {
        const sourceEl = vid.querySelector('source');
        const src = (sourceEl && sourceEl.getAttribute('src')) || vid.getAttribute('src');
        if (src) {
          const vCopy = document.createElement('video');
          vCopy.muted = true;
          vCopy.loop = true;
          vCopy.autoplay = true;
          vCopy.defaultMuted = true;
          vCopy.setAttribute('playsinline', '');
          vCopy.setAttribute('muted', '');
          vCopy.setAttribute('autoplay', '');
          vCopy.preload = 'auto';
          const copySrc = document.createElement('source');
          const sep = src.includes('?') ? '&' : '?';
          copySrc.setAttribute('src', src + sep + 'glitch=1');
          copySrc.setAttribute('type', 'video/mp4');
          vCopy.appendChild(copySrc);
          copy.appendChild(vCopy);

          /* Best-effort resync to match the primary video each time it plays. */
          const resync = () => {
            try { vCopy.currentTime = (vid && !isNaN(vid.currentTime)) ? vid.currentTime : 0; } catch (_) {}
            vCopy.play().catch(() => {});
          };
          vid.addEventListener('playing', resync);
          vid.addEventListener('play', resync);
          bg.addEventListener('mouseenter', resync, { passive: true });
          if (vCopy.readyState < 1) {
            try { vCopy.load(); } catch (_) {}
          }
          if (!vid.paused) resync();
        }
      } else {
        const bgImg = bg.style.backgroundImage;
        if (bgImg) copy.style.backgroundImage = bgImg;
      }

      bg.appendChild(copy);

      bg.addEventListener('mousemove', e => {
        const rect = bg.getBoundingClientRect();
        bg.style.setProperty('--gx', `${e.clientX - rect.left}px`);
        bg.style.setProperty('--gy', `${e.clientY - rect.top}px`);
      }, { passive: true });

      bg.addEventListener('mouseleave', () => {
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
