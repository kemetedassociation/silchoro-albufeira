/* ============ Auto carousel engine ============ */
// Les données (GUIDE_RESTAURANTS, GUIDE_SUPER, GUIDE_NOCTURNE, GUIDE_VILLES)
// viennent de js/guide-data.js, chargé avant ce fichier.
class AutoCarousel {
  constructor(el, items, opts = {}) {
    this.el = el;
    this.items = items;
    this.catKey = opts.catKey || null; // pour construire le lien vers etablissement.html
    this.duration = opts.duration || 5000;
    this.i = 0;
    this.timer = null;
    this.build();
    this.show(0);
    this.start();
    this.el.addEventListener('mouseenter', () => this.stop());
    this.el.addEventListener('mouseleave', () => this.start());
    // Retraduit les légendes (tag/description/indices) si la langue change en cours de visite.
    window.addEventListener('luzdosol-lang-change', () => {
      const wasPaused = this.el.classList.contains('paused');
      const cur = this.i;
      this.build();
      if (wasPaused) this.el.classList.add('paused');
      this.show(cur);
    });
  }
  build() {
    const t = (key, fallback) => (window.luzdosolT ? window.luzdosolT(key) : fallback);
    const slides = this.items.map((it, i) => `
      <button class="ac-slide" data-i="${i}" type="button" aria-label="${it.name} — ${L(it.desc)}">
        <img src="assets/guide/${it.img}.webp" alt="${it.name}" loading="${i === 0 ? 'eager' : 'lazy'}">
        <div class="ac-scrim"></div>
        <div class="ac-caption">
          <div class="ac-tag">${L(it.tag)}</div>
          <div class="ac-name">${it.name}</div>
          <div class="ac-desc">${L(it.desc)}</div>
          <div class="ac-hint">${it.venue ? t('ac_hint_venue', "Cliquez pour voir la fiche et l'itinéraire →") : t('ac_hint_freeze', 'Cliquez pour figer cette photo')}</div>
        </div>
      </button>`).join('');
    const dots = this.items.map((_, i) => `<div class="ac-dot" data-i="${i}"><b></b></div>`).join('');
    this.el.innerHTML = `
      ${slides}
      <div class="ac-dots">${dots}</div>
      <button class="ac-arrow ac-prev" aria-label="${t('ac_prev', 'Précédent')}" type="button">&lsaquo;</button>
      <button class="ac-arrow ac-next" aria-label="${t('ac_next', 'Suivant')}" type="button">&rsaquo;</button>
    `;
    this.el.style.setProperty('--ac-dur', (this.duration / 1000) + 's');
    this.slideEls = Array.from(this.el.querySelectorAll('.ac-slide'));
    this.dotEls = Array.from(this.el.querySelectorAll('.ac-dot'));
    this.el.querySelector('.ac-prev').addEventListener('click', () => { this.go(this.i - 1); this.restart(); });
    this.el.querySelector('.ac-next').addEventListener('click', () => { this.go(this.i + 1); this.restart(); });
    this.dotEls.forEach(d => d.addEventListener('click', () => { this.go(+d.dataset.i); this.restart(); }));
    this.slideEls.forEach((s, i) => s.addEventListener('click', () => {
      if (this.swiped) { this.swiped = false; return; } // un swipe ne doit pas aussi déclencher le clic
      const it = this.items[i];
      if (it.venue && this.catKey) {
        window.location.href = `etablissement.html?cat=${this.catKey}&i=${i}`;
        return;
      }
      this.el.classList.toggle('paused');
      if (this.el.classList.contains('paused')) this.stop(); else this.restart();
    }));

    /* Défilement latéral au doigt (mobile) pour changer d'image */
    let tx = 0;
    this.el.addEventListener('touchstart', e => { tx = e.touches[0].clientX; this.stop(); }, { passive: true });
    this.el.addEventListener('touchend', e => {
      const dx = tx - e.changedTouches[0].clientX;
      if (Math.abs(dx) > 40) {
        this.swiped = true;
        setTimeout(() => { this.swiped = false; }, 300); // filet de sécurité si le clic fantôme ne survient pas
        this.go(this.i + (dx > 0 ? 1 : -1));
      }
      if (!this.el.classList.contains('paused')) this.restart();
    }, { passive: true });
  }
  show(i) {
    this.i = (i + this.items.length) % this.items.length;
    this.slideEls.forEach((s, idx) => s.classList.toggle('active', idx === this.i));
    this.dotEls.forEach((d, idx) => {
      d.classList.toggle('active', idx === this.i);
      d.classList.toggle('done', idx < this.i);
    });
  }
  go(i) { this.show(i); }
  start() {
    this.stop();
    this.timer = setInterval(() => this.show(this.i + 1), this.duration);
  }
  stop() { if (this.timer) clearInterval(this.timer); }
  restart() { this.start(); }
}

class MiniCarousel {
  constructor(el, images, opts = {}) {
    this.el = el;
    this.images = images;
    this.duration = opts.duration || 2600;
    this.i = 0;
    el.innerHTML = images.map((img, i) => `<div class="mini-ac-slide${i === 0 ? ' active' : ''}"><img src="assets/guide/${img}.webp" alt="" loading="lazy"></div>`).join('');
    this.slideEls = Array.from(el.querySelectorAll('.mini-ac-slide'));
    setInterval(() => {
      this.i = (this.i + 1) % this.images.length;
      this.slideEls.forEach((s, idx) => s.classList.toggle('active', idx === this.i));
    }, this.duration);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const isMobile = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent) || window.innerWidth <= 900;

  const restEl = document.getElementById('ac-restaurants');
  if (restEl) new AutoCarousel(restEl, GUIDE_RESTAURANTS, { catKey: 'restaurants' });
  const nightEl = document.getElementById('ac-nocturne');
  if (nightEl) new AutoCarousel(nightEl, GUIDE_NOCTURNE, { catKey: 'nocturne' });
  const villesEl = document.getElementById('ac-villes');
  if (villesEl) new AutoCarousel(villesEl, GUIDE_VILLES, { catKey: 'villes' });
  const superEl = document.getElementById('ac-super');
  if (superEl) new MiniCarousel(superEl, GUIDE_SUPER);

  /* --- Reveal-on-scroll for section intros --- */
  document.querySelectorAll('.night-plan, .tip-box').forEach(el => el.classList.add('reveal'));

  /* --- Hero text + scroll cue fade-in --- */
  requestAnimationFrame(() => {
    setTimeout(() => {
      document.getElementById('guide-hero-text')?.classList.add('guide-in');
      document.getElementById('guide-scroll-cue')?.classList.add('in');
      const line = document.getElementById('guide-hero-line');
      if (line) line.style.width = '64px';
    }, 150);
  });

  /* --- Progress bar --- */
  const progressBar = document.querySelector('.st-progress');
  window.addEventListener('scroll', () => {
    if (!progressBar) return;
    const pct = window.scrollY / (document.body.scrollHeight - window.innerHeight);
    progressBar.style.transform = `scaleX(${pct})`;
  }, { passive: true });

  /* --- Reveal on scroll --- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
  function scanReveals() {
    document.querySelectorAll('.reveal,.reveal-sc,.reveal-l,.reveal-r')
      .forEach(el => { if (!el.dataset.io) { el.dataset.io = '1'; io.observe(el); } });
  }
  scanReveals(); setTimeout(scanReveals, 300);

  /* --- Magnetic buttons (desktop) --- */
  if (!isMobile) {
    document.querySelectorAll('[data-magnetic]').forEach(el => {
      el.addEventListener('mousemove', ev => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(ev.clientX - r.left - r.width / 2) * 0.28}px,${(ev.clientY - r.top - r.height / 2) * 0.36}px) scale(1.04)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* --- Custom cursor (desktop) --- */
  if (!isMobile) {
    const dot = document.querySelector('.cursor-dot');
    const ring = document.querySelector('.cursor-ring');
    if (dot && ring) {
      let rx = 0, ry = 0, dx = 0, dy = 0;
      window.addEventListener('mousemove', e => {
        dx = e.clientX; dy = e.clientY;
        dot.style.left = dx + 'px'; dot.style.top = dy + 'px';
      });
      (function loop() {
        rx += (dx - rx) * 0.16; ry += (dy - ry) * 0.16;
        ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
        requestAnimationFrame(loop);
      })();
      document.querySelectorAll('a,button,.lift,[data-magnetic],.ac-dot,.ac-arrow,.svc-card').forEach(el => {
        el.addEventListener('mouseenter', () => {
          ring.style.width = '62px'; ring.style.height = '62px';
          ring.style.borderColor = 'rgba(25,182,201,.6)';
          dot.style.width = '5px'; dot.style.height = '5px';
        });
        el.addEventListener('mouseleave', () => {
          ring.style.width = '40px'; ring.style.height = '40px';
          ring.style.borderColor = 'rgba(10,92,134,.35)';
          dot.style.width = '9px'; dot.style.height = '9px';
        });
      });
    }
  }

  /* --- Active section highlight in the guide sub-nav --- */
  const navLinks = document.querySelectorAll('.guide-nav a');
  const sections = Array.from(navLinks).map(a => document.querySelector(a.getAttribute('href')));
  const navIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        navLinks.forEach(a => a.classList.remove('active'));
        const idx = sections.indexOf(e.target);
        if (idx > -1) navLinks[idx].classList.add('active');
      }
    });
  }, { threshold: 0, rootMargin: '-40% 0px -55% 0px' });
  sections.forEach(s => s && navIO.observe(s));
});
