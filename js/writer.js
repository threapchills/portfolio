/* The writer's portfolio. The page reads without any of this; with it, the
   cards are dealt, the headline cuts through its noise, and the scroll has
   some weight. GSAP, ScrollTrigger and Lenis are loaded on the home page
   only; the reading pages use the first few lines and nothing else. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const motion = !calm && !!(window.gsap && window.ScrollTrigger);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  document.documentElement.classList.toggle('has-motion', motion);

  /* ---- the header and the progress line (every page) ---- */
  const top = $('.top');
  const bar = $('#progress-bar');
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    top && top.classList.toggle('is-stuck', scrollY > 8);
    const max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---- marker and scribbles draw when they come into view (every page) ---- */
  if ('IntersectionObserver' in window) {
    const ink = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); ink.unobserve(e.target); }
    }, { threshold: 0.7 });
    $$('.hl, .scribbled, .circled').forEach((el) => ink.observe(el));
  } else {
    $$('.hl, .scribbled, .circled').forEach((el) => el.classList.add('is-in'));
  }

  if (!document.body.classList.contains('home')) return;

  /* ============================================================
     the home page
     ============================================================ */
  let lenis = null;
  let velocity = 0;
  if (motion) {
    gsap.registerPlugin(ScrollTrigger);
    if (window.Lenis) {
      lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1 });
      lenis.on('scroll', (e) => { velocity = e.velocity || 0; ScrollTrigger.update(); });
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || !lenis) return;
    const target = $(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: -56, duration: 1.4 });
  });

  /* ---- headings rise a word at a time ---- */
  const split = (el) => {
    const out = [];
    for (const node of [...el.childNodes]) {
      if (node.nodeType === 3) {
        const frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach((part) => {
          if (!part.trim()) { frag.append(part); return; }
          const outer = document.createElement('span'); outer.className = 'rise';
          const inner = document.createElement('i'); inner.textContent = part;
          outer.append(inner); frag.append(outer); out.push(inner);
        });
        node.replaceWith(frag);
      } else {
        const outer = document.createElement('span'); outer.className = 'rise';
        const inner = document.createElement('i');
        node.replaceWith(outer); inner.append(node); outer.append(inner); out.push(inner);
      }
    }
    return out;
  };
  let heroWords = [];
  if (motion) {
    for (const el of $$('[data-rise]')) {
      el.setAttribute('aria-label', el.textContent.trim());
      const words = split(el);
      if (el.dataset.rise === 'load') { heroWords = words; gsap.set(words, { yPercent: 115 }); continue; }
      gsap.from(words, {
        yPercent: 115, duration: 1.1, ease: 'power4.out', stagger: 0.09,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    }
  }

  /* ---- the hero: a field of typographic noise, and a line that clears it ---- */
  (() => {
    const cv = $('#noise'), hero = $('.hero'), title = $('#hero-title');
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    const GLYPHS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ&?!;:,.*#%@/+=~';
    const pick = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];
    let W = 0, H = 0, cell = 20, cols = 0, rows = 0, chars = [], clear = new Float32Array(0), box = null;
    const state = { wipe: calm ? 2 : -0.15, live: true };
    const pointer = { x: -999, y: -999, on: false };

    // a cheap, smooth value noise: enough to make the static gather and thin
    const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
    const noise = (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };

    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = hero.clientWidth; H = hero.clientHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cell = W < 700 ? 15 : 19;
      cols = Math.ceil(W / cell) + 1; rows = Math.ceil(H / (cell * 1.3)) + 1;
      chars = Array.from({ length: cols * rows }, pick);
      clear = new Float32Array(cols * rows);
      const h = hero.getBoundingClientRect(), t = title.getBoundingClientRect();
      box = { x0: t.left - h.left, y0: t.top - h.top, x1: t.right - h.left, y1: t.bottom - h.top };
    };

    const draw = (time) => {
      ctx.clearRect(0, 0, W, H);
      ctx.font = `500 ${Math.round(cell * 0.66)}px "Space Grotesk", sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#1c1104';
      const t = time * 0.00007;
      const wipeX = state.wipe * W * 1.2;
      for (let r = 0; r < rows; r++) {
        const y = r * cell * 1.3 + cell * 0.6;
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const x = c * cell;
          let a = smooth(0.4, 0.82, noise(c * 0.11 + t * 3, r * 0.17 - t * 2)) * 0.42;
          // the line has passed here: the noise parts around the headline
          const cut = smooth(0, W * 0.18, wipeX - x - (y - H / 2) * 0.35);
          const dx = Math.max(box.x0 - x, 0, x - box.x1), dy = Math.max(box.y0 - y, 0, y - box.y1);
          const near = smooth(0, 120, Math.hypot(dx, dy));
          a *= 1 - cut * (1 - near);
          // the pointer cuts a swathe of its own, which closes slowly behind it
          if (pointer.on) {
            const d = Math.hypot(pointer.x - x, pointer.y - y);
            if (d < 170) clear[i] = Math.max(clear[i], 1 - d / 170);
          }
          if (clear[i] > 0.003) { a *= 1 - clear[i]; clear[i] *= 0.972; }
          if (a < 0.02) continue;
          if (!calm && Math.random() < 0.01) chars[i] = pick();
          ctx.globalAlpha = a;
          ctx.fillText(chars[i], x, y);
        }
      }
      ctx.globalAlpha = 1;
    };

    size();
    addEventListener('resize', () => { size(); if (calm) draw(0); });
    document.fonts && document.fonts.ready.then(() => { size(); if (calm) draw(0); });
    if (calm) { draw(0); return; }

    hero.addEventListener('pointermove', (e) => {
      const h = hero.getBoundingClientRect();
      pointer.x = e.clientX - h.left; pointer.y = e.clientY - h.top; pointer.on = true;
    });
    hero.addEventListener('pointerleave', () => { pointer.on = false; });
    new IntersectionObserver(([e]) => { state.live = e.isIntersecting; }).observe(hero);

    let frame = 0;
    const loop = (time) => {
      requestAnimationFrame(loop);
      if (!state.live || (frame++ & 1)) return;      // thirty frames a second is plenty for static
      draw(time);
    };
    requestAnimationFrame(loop);

    // the opening: the line sweeps across, the noise parts, the words rise
    if (motion) {
      gsap.to(state, { wipe: 1.3, duration: 1.9, ease: 'power2.inOut', delay: 0.25 });
      gsap.to(heroWords, { yPercent: 0, duration: 1.2, ease: 'power4.out', stagger: 0.11, delay: 0.55 });
      gsap.to(cv, { opacity: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom 20%', scrub: true } });
      gsap.to(title, { yPercent: 22, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    } else {
      state.wipe = 2;
    }
  })();

  /* ---- marquees: the publications and the clients run with the scroll ---- */
  const marquees = $$('[data-marquee]').map((track) => {
    if (calm) { track.style.flexWrap = 'wrap'; track.style.width = 'auto'; track.style.rowGap = '0.6rem'; return null; }
    const originals = [...track.children];
    const fill = () => {
      while (track.scrollWidth < innerWidth * 2.4) {
        for (const li of originals) { const copy = li.cloneNode(true); copy.setAttribute('aria-hidden', 'true'); track.appendChild(copy); }
      }
    };
    fill();
    return { track, x: 0, speed: Number(track.dataset.speed || 1), span: () => originals.reduce((w, li) => w + li.offsetWidth, 0) + parseFloat(getComputedStyle(track).columnGap || 0) * originals.length };
  }).filter(Boolean);
  if (marquees.length) {
    let last = performance.now(), dir = 1;
    const run = (now) => {
      requestAnimationFrame(run);
      const dt = Math.min(64, now - last); last = now;
      if (Math.abs(velocity) > 0.5) dir = velocity > 0 ? 1 : -1;
      for (const m of marquees) {
        const span = m.span();
        m.x -= (0.045 * m.speed * dir + velocity * 0.035) * dt;
        if (m.x <= -span) m.x += span;
        if (m.x > 0) m.x -= span;
        m.track.style.transform = `translate3d(${m.x.toFixed(1)}px,0,0)`;
      }
      velocity *= 0.92;
    };
    requestAnimationFrame(run);
  }

  /* ---- the cards: light, tilt and a cursor that comes to meet the pointer ---- */
  const tiltable = (card, strength = 1) => {
    if (!fine || !motion) return;
    const rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3.out' });
    const ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3.out' });
    const tag = $('.t-cursor', card);
    gsap.set(card, { transformPerspective: 1300 });
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      rx((0.5 - py) * 7 * strength); ry((px - 0.5) * 9 * strength);
      card.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
      card.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
      if (tag) {
        const t = tag.getBoundingClientRect();
        tag.style.setProperty('--fx', `${clamp((e.clientX - t.left) * 0.45, -220, 40).toFixed(0)}px`);
        tag.style.setProperty('--fy', `${clamp((e.clientY - t.top) * 0.45, -20, 200).toFixed(0)}px`);
      }
    });
    card.addEventListener('pointerleave', () => {
      rx(0); ry(0);
      if (tag) { tag.style.setProperty('--fx', '0px'); tag.style.setProperty('--fy', '0px'); }
    });
  };

  // each card is dealt onto the table as the scroll reaches it
  const deal = (card, trigger, i) => {
    if (!motion) return;
    const side = i % 2 ? 1 : -1;
    const tilt = parseFloat(getComputedStyle(card).getPropertyValue('--tilt')) || 0;
    card.style.rotate = 'none';
    gsap.fromTo(card,
      { y: 150, rotation: side * 10, scale: 0.9, autoAlpha: 0 },
      { y: 0, rotation: tilt, scale: 1, autoAlpha: 1, ease: 'power2.out',
        scrollTrigger: { trigger, start: 'top 98%', end: 'top 58%', scrub: 0.7 } });
  };

  $$('.t-card').forEach((card, i) => {
    // wrap, so the trigger stays put while the card travels
    const seat = document.createElement('div'); seat.className = 't-seat';
    card.replaceWith(seat); seat.append(card);
    deal(card, seat, i); tiltable(card);
  });

  /* ---- the writing: two columns of cards, reshuffled by the filters ---- */
  const grid = $('#work-grid');
  const items = $$('.w-item', grid);
  let shown = items.slice();
  let cols = [];
  const wide = () => innerWidth > 820;
  const place = (list) => {
    cols.forEach((c) => c.replaceChildren());
    for (const item of list) {
      const col = cols.reduce((a, b) => (a.offsetHeight <= b.offsetHeight ? a : b));
      col.appendChild(item);
    }
  };
  const build = () => {
    const n = wide() ? 2 : 1;
    if (cols.length === n) return;
    grid.replaceChildren();
    grid.classList.add('is-built');
    cols = Array.from({ length: n }, () => { const d = document.createElement('div'); d.className = 'w-col'; grid.appendChild(d); return d; });
    place(shown);
    if (motion) ScrollTrigger.refresh();
  };
  if (grid) {
    build();
    items.forEach((item, i) => { const card = $('.w-card', item); deal(card, item, i); tiltable(card); });
    let resizing;
    addEventListener('resize', () => { clearTimeout(resizing); resizing = setTimeout(build, 200); });
    document.fonts && document.fonts.ready.then(() => { place(shown); if (motion) ScrollTrigger.refresh(); });
  }

  const filters = $$('.filters button');
  filters.forEach((btn) => btn.addEventListener('click', () => {
    const group = btn.dataset.filter;
    filters.forEach((b) => b.setAttribute('aria-pressed', b === btn));
    const next = items.filter((item) => group === 'all' || item.dataset.group === group);
    const before = new Map(shown.map((item) => [item, item.getBoundingClientRect()]));
    shown = next;
    place(shown);
    if (!motion) return;
    // measure and refresh with every card at rest, then let them travel
    gsap.killTweensOf(items);
    gsap.set(items, { x: 0, y: 0, rotation: 0, autoAlpha: 1 });
    const after = new Map(shown.map((item) => [item, item.getBoundingClientRect()]));
    ScrollTrigger.refresh();
    shown.forEach((item, i) => {
      const was = before.get(item), now = after.get(item);
      if (was) {
        gsap.fromTo(item, { x: was.left - now.left, y: was.top - now.top }, { x: 0, y: 0, duration: 0.9, ease: 'power4.out', overwrite: true });
      } else {
        gsap.fromTo(item, { y: 90, rotation: i % 2 ? 6 : -6, autoAlpha: 0 }, { y: 0, rotation: 0, autoAlpha: 1, duration: 0.8, ease: 'power4.out', delay: 0.05 * i, overwrite: true });
      }
    });
  }));

  /* ---- columns drift against each other, and lean into the scroll ---- */
  if (motion) {
    const drifting = [...$$('.t-col'), ...$$('.w-col')];
    drifting.forEach((col, i) => {
      if (i % 2 === 0 || !wide()) return;
      gsap.to(col, { y: -90, ease: 'none', scrollTrigger: { trigger: col.parentElement, start: 'top bottom', end: 'bottom top', scrub: 0.5 } });
    });
    const setters = drifting.map((col) => gsap.quickSetter(col, 'skewY', 'deg'));
    let lean = 0;
    gsap.ticker.add(() => {
      const target = clamp(velocity * 0.045, -2.2, 2.2);
      lean += (target - lean) * 0.12;
      const v = Math.abs(lean) < 0.01 ? 0 : lean;
      setters.forEach((set, i) => set(i % 2 ? -v : v));
    });
    const photo = $('.about-photo');
    if (photo) gsap.fromTo(photo, { y: 60 }, { y: -60, ease: 'none', scrollTrigger: { trigger: photo, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
  }

  /* ---- the pointer's label ---- */
  const cur = $('#cur');
  if (cur && fine && motion) {
    const x = gsap.quickTo(cur, 'x', { duration: 0.35, ease: 'power3.out' });
    const y = gsap.quickTo(cur, 'y', { duration: 0.35, ease: 'power3.out' });
    addEventListener('pointermove', (e) => {
      x(e.clientX); y(e.clientY);
      const el = e.target.closest ? e.target.closest('[data-cursor]') : null;
      cur.classList.toggle('is-on', !!el);
      if (el) {
        cur.firstElementChild.firstElementChild.textContent = el.dataset.cursor;
        cur.classList.toggle('on-night', !!el.closest('.screen'));
      }
    }, { passive: true });
    document.addEventListener('pointerleave', () => cur.classList.remove('is-on'));
  }

  /* ---- services open and close with some give ---- */
  for (const d of $$('.service')) {
    const summary = $('summary', d), body = $('ul', d);
    summary.addEventListener('click', (e) => {
      if (!motion) return;
      e.preventDefault();
      if (!d.open) {
        d.open = true;
        gsap.fromTo(body, { height: 0, autoAlpha: 0 }, { height: 'auto', autoAlpha: 1, duration: 0.6, ease: 'power3.out', clearProps: 'height', onComplete: () => ScrollTrigger.refresh() });
        gsap.from($$('li', body), { y: 14, autoAlpha: 0, duration: 0.5, ease: 'power3.out', stagger: 0.05, delay: 0.08 });
      } else {
        gsap.to(body, { height: 0, autoAlpha: 0, duration: 0.4, ease: 'power3.inOut', onComplete: () => { d.open = false; gsap.set(body, { clearProps: 'all' }); ScrollTrigger.refresh(); } });
      }
    });
  }

  /* ---- the screen: the reel grows into place, the films travel sideways ---- */
  const small = matchMedia('(max-width: 820px)').matches;
  const play = $('#reel-play');
  if (play) play.addEventListener('click', () => {
    const reel = $('#reel');
    const vertical = small && innerHeight > innerWidth;
    const v = document.createElement('video');
    v.controls = true; v.playsInline = true; v.autoplay = true;
    v.setAttribute('controlslist', 'nodownload');
    v.src = vertical ? 'showreel/mike-whyle-showreel-2026-vertical.mp4' : 'showreel/mike-whyle-showreel-2026.mp4';
    reel.classList.toggle('is-vertical', vertical);
    reel.replaceChildren(v);
    cur && cur.classList.remove('is-on');
    v.play().catch(() => {});
  });

  const loops = $$('.film video[data-loop]');
  if (loops.length && 'IntersectionObserver' in window) {
    const dir = small ? 'video/loops-m/' : 'video/loops/';
    const watch = new IntersectionObserver((entries) => {
      for (const { target: v, isIntersecting } of entries) {
        if (isIntersecting) {
          if (!v.src) v.src = dir + v.dataset.loop + '.mp4';
          if (!calm) v.play().catch(() => {});
        } else if (!v.paused) v.pause();
      }
    }, { threshold: 0.35 });
    loops.forEach((v) => watch.observe(v));
  }

  if (motion) {
    gsap.fromTo('#reel', { scale: 0.78, y: 60 }, { scale: 1, y: 0, ease: 'none', scrollTrigger: { trigger: '#reel', start: 'top 100%', end: 'top 18%', scrub: 0.5 } });

    const rail = $('#film-rail'), stage = $('.rail-stage'), track = $('#film-track'), progress = $('#film-progress');
    if (rail && fine && innerWidth > 900) {
      rail.classList.add('is-pinned');
      const distance = () => Math.max(0, track.scrollWidth - innerWidth);
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: stage, pin: true, scrub: 0.7, start: 'top top', end: () => '+=' + distance(), invalidateOnRefresh: true,
          onUpdate: (self) => { progress.style.transform = `scaleX(${self.progress.toFixed(4)})`; },
        },
      });
      tl.to(track, { x: () => -distance(), ease: 'none' }, 0)
        .fromTo($$('.film video'), { xPercent: -4.5 }, { xPercent: 4.5, ease: 'none' }, 0);
    }

    // made after the pin, so its end takes the pinned distance into account
    ScrollTrigger.create({ trigger: '.screen', start: 'top 48px', end: 'bottom 48px', onToggle: (self) => top.classList.toggle('on-night', self.isActive) });

    $$('.board-frame img').forEach((img) => {
      gsap.fromTo(img, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: 0.5 } });
    });

    gsap.from('.artefact', {
      y: 110, rotation: (i) => (i % 2 ? 7 : -7), autoAlpha: 0, duration: 1, ease: 'power4.out', stagger: 0.09,
      scrollTrigger: { trigger: '.artefacts', start: 'top 86%', once: true },
    });
    gsap.from('.contact-moons img', { scale: 0, rotation: -40, duration: 0.9, ease: 'back.out(1.8)', stagger: 0.08, scrollTrigger: { trigger: '.contact-moons', start: 'top 90%', once: true } });
  }
  $$('.artefact').forEach((card) => tiltable(card, 1.4));

  /* ---- the nav marks the section in view ---- */
  const links = $$('.top-nav a[href^="#"]');
  if (links.length && 'IntersectionObserver' in window) {
    const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        links.forEach((a) => a.classList.remove('is-here'));
        const a = byId.get(e.target.id);
        a && a.classList.add('is-here');
      }
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main > section[id]').forEach((s) => spy.observe(s));
  }

  if (motion) {
    addEventListener('load', () => ScrollTrigger.refresh());
    document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
})();
