/* The writer's portfolio: small behaviours, no dependencies.
   Everything here improves a page that already reads without it. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = (n) => n.toLocaleString('en-GB');
  const countWords = (el) => (el.textContent.trim().match(/\S+/g) || []).length;
  const label = (n) => `${fmt(n)} ${n === 1 ? 'word' : 'words'}`;

  /* ---- the header and the progress line ---- */
  const top = $('.top');
  const bar = $('#progress-bar');
  const prose = $('.piece-body .prose');
  const readCount = $('#read-count');
  const proseWords = prose ? countWords(prose) : 0;
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = scrollY;
    top && top.classList.toggle('is-stuck', y > 8);
    const max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    if (prose && readCount) {
      const r = prose.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (innerHeight * 0.75 - r.top) / r.height));
      readCount.textContent = `${fmt(Math.round(p * proseWords))} of ${fmt(proseWords)} words`;
    }
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---- the margin: every note counts the copy beside it ---- */
  for (const note of $$('[data-wc]')) {
    const target = $(note.dataset.wc);
    if (target && !note.hasAttribute('data-live')) note.textContent = label(countWords(target));
  }

  /* ---- the opening line arrives a word at a time, and the margin keeps count ---- */
  const title = $('.hero-title[data-words]');
  if (title) {
    const note = $('[data-live]');
    const words = title.textContent.trim().split(/\s+/);
    if (calm) {
      if (note) note.textContent = label(words.length);
    } else {
      title.setAttribute('aria-label', title.textContent.trim());
      title.innerHTML = words.map((w) => `<span class="w" aria-hidden="true">${w}</span>`).join(' ');
      if (note) note.textContent = label(0);
      $$('.w', title).forEach((span, i) => {
        setTimeout(() => {
          span.classList.add('is-in');
          if (note) note.textContent = label(i + 1);
        }, 260 + i * 170);
      });
    }
  }

  /* ---- marker and scribbles draw when they come into view ---- */
  if ('IntersectionObserver' in window) {
    const ink = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); ink.unobserve(e.target); }
    }, { threshold: 0.6 });
    $$('.hl:not(.is-in), .scribbled, .circled').forEach((el) => ink.observe(el));
  } else {
    $$('.hl, .scribbled, .circled').forEach((el) => el.classList.add('is-in'));
  }

  /* ---- the publications run as one unbroken line ---- */
  const track = $('.pubs-track');
  if (track && !calm) {
    for (const li of [...track.children]) {
      const copy = li.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      track.appendChild(copy);
    }
  }

  /* ---- the essay dial ---- */
  const tabs = $$('.dial [role="tab"]');
  const essayCount = $('#essay-count');
  const choose = (tab, focus) => {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    }
    if (essayCount) essayCount.textContent = label(Number(tab.dataset.words));
    $$('.hl', $('#' + tab.getAttribute('aria-controls'))).forEach((m) => requestAnimationFrame(() => m.classList.add('is-in')));
    if (focus) tab.focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => choose(tab));
    tab.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      choose(tabs[(i + d + tabs.length) % tabs.length], true);
    });
  });

  /* ---- the index filters ---- */
  const filters = $$('.filters button');
  const rows = $$('.work-row');
  const empty = $('#work-empty');
  filters.forEach((btn) => btn.addEventListener('click', () => {
    const group = btn.dataset.filter;
    filters.forEach((b) => b.setAttribute('aria-pressed', b === btn));
    let shown = 0;
    for (const row of rows) {
      const on = group === 'all' || row.dataset.group === group;
      row.hidden = !on;
      if (on) shown++;
    }
    if (empty) empty.hidden = shown > 0;
  }));

  /* ---- the nav marks the section in view ---- */
  const links = $$('.top-nav a[href^="#"]');
  if (links.length && 'IntersectionObserver' in window) {
    const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        links.forEach((a) => a.classList.remove('is-here'));
        const a = byId.get(e.target.id) || (['essay', 'range'].includes(e.target.id) ? byId.get('writing') : null);
        a && a.classList.add('is-here');
      }
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main > section[id]').forEach((s) => spy.observe(s));
  }

  /* ---- the film loops: fetched as each card comes into view ---- */
  const small = matchMedia('(max-width: 760px)').matches;
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
    }, { threshold: 0.55 });
    loops.forEach((v) => watch.observe(v));
  }

  /* ---- the showreel loads only when asked for ---- */
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
    v.play().catch(() => {});
  });
})();
