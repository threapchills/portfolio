/* ============================================================
   Shared logic for all project pages.
   Each project page includes data.js then this file,
   then calls initProjectPage(projectId).
   ============================================================ */

function toYouTubeEmbed(url) {
  let v = (url.match(/[?&]v=([A-Za-z0-9_-]{11})/) || [])[1];
  if (!v) v = (url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/) || [])[1];
  if (!v) v = (url.match(/\/shorts\/([A-Za-z0-9_-]{11})/) || [])[1];
  if (!v) return null;
  const start = (url.match(/[?&]t=(\d+)/) || [])[1];
  return `https://www.youtube-nocookie.com/embed/${v}?rel=0${start ? '&start=' + start : ''}`;
}

function toDriveEmbed(url) {
  const m = url.match(/\/file\/d\/([A-Za-z0-9_-]+)\//);
  return m ? `https://drive.google.com/file/d/${m[1]}/preview` : null;
}

function initProjectPage(projectId) {
  const p = PROJECTS.find(x => x.id === projectId);
  if (!p) return;

  /* ── Nav ─────────────────────────────────────────────────── */
  const nav = document.getElementById('main-nav');
  const navLinks = document.getElementById('nav-links');
  PROJECTS.forEach(proj => {
    const li = document.createElement('li');
    li.innerHTML = `<a href="../../projects/${proj.id}/"${proj.id === projectId ? ' class="active"' : ''}>${proj.title}</a>`;
    navLinks.appendChild(li);
  });

  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 60);
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ── Hero ────────────────────────────────────────────────── */
  const hero = document.getElementById('project-hero');

  if (p.heroVideo) {
    const posterAttr = p.heroFallback ? ` poster="${p.heroFallback}"` : '';
    hero.innerHTML = `
      <div class="project-hero-bg">
        <video autoplay muted loop playsinline${posterAttr}>
          <source src="${p.heroVideo}" type="video/mp4">
        </video>
      </div>`;
  } else if (p.heroSlides) {
    // Slideshow hero for Mythopoeic
    hero.innerHTML = `
      <div class="project-hero-bg hero-slideshow" id="hero-slideshow">
        ${p.heroSlides.map((s, i) => `<div class="slide${i === 0 ? ' active' : ''}" style="background-image:url('${s}')"></div>`).join('')}
        <div class="slideshow-dots">
          ${p.heroSlides.map((_, i) => `<span class="dot${i === 0 ? ' active' : ''}" data-i="${i}"></span>`).join('')}
        </div>
      </div>`;
    // Auto-advance
    let current = 0;
    const slides = hero.querySelectorAll('.slide');
    const dots = hero.querySelectorAll('.dot');
    function goTo(n) {
      slides[current].classList.remove('active');
      dots[current].classList.remove('active');
      current = (n + slides.length) % slides.length;
      slides[current].classList.add('active');
      dots[current].classList.add('active');
    }
    dots.forEach(d => d.addEventListener('click', () => goTo(+d.dataset.i)));
    setInterval(() => goTo(current + 1), 4000);
  } else {
    const img = p.heroImage || p.heroFallback || '';
    hero.innerHTML = `<div class="project-hero-bg" style="background-image:url('${img}')"></div>`;
  }

  // Hero overlay content
  const heroContent = document.createElement('div');
  heroContent.className = 'project-hero-content';
  heroContent.innerHTML = `
    <span class="project-hero-num">${p.index} / ${p.category}</span>
    <h1 class="project-hero-title">${p.title}</h1>`;
  hero.appendChild(heroContent);

  /* ── Body: intro + sidebar ───────────────────────────────── */
  const body = document.getElementById('project-body');

  const descParagraphs = p.description.trim().split(/\n\n+/).map(t => `<p>${t.trim()}</p>`).join('');

  const skillsHTML = p.skills.map(s => `
    <li class="skill-item">
      <span class="skill-check"></span>${s}
    </li>`).join('');

  const linksHTML = p.links && p.links.length ? `
    <div class="project-links">
      ${p.links.map(l => `<a href="${l.url}" target="_blank" rel="noopener" class="btn ${l.primary ? 'btn-primary' : 'btn-outline'}">${l.label}</a>`).join('')}
    </div>` : '';

  body.innerHTML = `
    <a href="../../" class="back-link">All Projects</a>
    <div class="project-intro">
      <div class="project-description">${descParagraphs}</div>
      <aside class="project-sidebar">
        <div class="sidebar-block">
          <div class="sidebar-label">Category</div>
          <div class="sidebar-value">${p.category}</div>
        </div>
        <div class="sidebar-block">
          <div class="sidebar-label">Type</div>
          <div class="sidebar-value">${p.type}</div>
        </div>
        <div class="sidebar-block">
          <div class="sidebar-label">Skills</div>
          <ul class="skills-list">${skillsHTML}</ul>
        </div>
        ${linksHTML}
      </aside>
    </div>`;

  /* ── Gallery ─────────────────────────────────────────────── */
  if (p.gallery && p.gallery.length) {
    const gallerySection = document.createElement('div');
    gallerySection.className = 'gallery-section';
    gallerySection.innerHTML = `<span class="section-label">Gallery</span>`;

    const trackWrap = document.createElement('div');
    trackWrap.className = 'carousel-track-wrap';
    const track = document.createElement('div');
    track.className = 'carousel-track';

    p.gallery.forEach((src, idx) => {
      const item = document.createElement('div');
      item.className = 'carousel-item';
      item.style.cursor = 'zoom-in';
      item.innerHTML = `<img src="${src}" alt="" loading="lazy">`;
      item.addEventListener('click', () => openLightbox(p.gallery, idx));
      track.appendChild(item);
    });

    trackWrap.appendChild(track);
    gallerySection.appendChild(trackWrap);

    // Controls
    let pos = 0;
    const itemWidth = () => track.children[0] ? track.children[0].offsetWidth + 16 : 300;
    const maxPos = () => Math.max(0, p.gallery.length - 3);

    const controls = document.createElement('div');
    controls.className = 'carousel-controls';
    const prev = document.createElement('button');
    prev.className = 'carousel-btn'; prev.innerHTML = '←';
    const next = document.createElement('button');
    next.className = 'carousel-btn'; next.innerHTML = '→';

    prev.addEventListener('click', () => {
      pos = Math.max(0, pos - 1);
      track.style.transform = `translateX(-${pos * itemWidth()}px)`;
    });
    next.addEventListener('click', () => {
      pos = Math.min(maxPos(), pos + 1);
      track.style.transform = `translateX(-${pos * itemWidth()}px)`;
    });

    controls.appendChild(prev);
    controls.appendChild(next);
    gallerySection.appendChild(controls);
    body.appendChild(gallerySection);
  }

  /* ── Writing cards ───────────────────────────────────────── */
  if (p.stories && p.stories.length) {
    const ws = document.createElement('div');
    ws.className = 'gallery-section';
    ws.innerHTML = `<span class="section-label">Selected articles</span>`;
    const grid = document.createElement('div');
    grid.className = 'writing-grid';
    p.stories.forEach(s => {
      const card = document.createElement('div');
      card.className = 'writing-card';
      card.innerHTML = `
        <h3>${s.title}</h3>
        <p>${s.excerpt}</p>
        <a href="${s.url}" target="_blank" rel="noopener">Read →</a>`;
      grid.appendChild(card);
    });
    ws.appendChild(grid);
    body.appendChild(ws);
  }

  /* ── Video grid ──────────────────────────────────────────── */
  if (p.videos && p.videos.length) {
    const vs = document.createElement('div');
    vs.className = 'gallery-section';
    vs.innerHTML = `<span class="section-label">Films</span>`;
    const grid = document.createElement('div');
    grid.className = 'video-grid';
    p.videos.forEach(url => {
      let embed = toYouTubeEmbed(url) || toDriveEmbed(url);
      if (!embed) return;
      const wrap = document.createElement('div');
      wrap.className = 'video-embed-wrap';
      wrap.innerHTML = `<iframe src="${embed}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
      grid.appendChild(wrap);
    });
    vs.appendChild(grid);
    body.appendChild(vs);
  }

  /* ── Reveal observer ─────────────────────────────────────── */
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); revealObs.unobserve(e.target); }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));
}

/* ── Lightbox ──────────────────────────────────────────────── */
function openLightbox(images, startIdx) {
  let current = startIdx;

  // Build DOM once; reuse if it exists
  let lb = document.getElementById('lightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'lightbox';
    lb.className = 'lightbox';
    lb.innerHTML = `
      <button class="lightbox-close">Close</button>
      <button class="lightbox-nav lightbox-prev">←</button>
      <img class="lightbox-img" src="" alt="">
      <button class="lightbox-nav lightbox-next">→</button>
      <span class="lightbox-counter"></span>`;
    document.body.appendChild(lb);

    // Close on background click or close button
    lb.addEventListener('click', e => {
      if (e.target === lb || e.target.classList.contains('lightbox-close')) closeLightbox();
    });

    // Keyboard nav
    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') lb.querySelector('.lightbox-next').click();
      if (e.key === 'ArrowLeft') lb.querySelector('.lightbox-prev').click();
    });
  }

  const img = lb.querySelector('.lightbox-img');
  const counter = lb.querySelector('.lightbox-counter');

  function show(idx) {
    current = (idx + images.length) % images.length;
    img.src = images[current];
    counter.textContent = `${current + 1} / ${images.length}`;
  }

  lb.querySelector('.lightbox-prev').onclick = e => { e.stopPropagation(); show(current - 1); };
  lb.querySelector('.lightbox-next').onclick = e => { e.stopPropagation(); show(current + 1); };

  show(current);
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (lb) lb.classList.remove('open');
  document.body.style.overflow = '';
}
