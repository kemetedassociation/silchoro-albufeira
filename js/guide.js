/* ============ Photo data ============ */
const GUIDE_RESTAURANTS = [
  { img: 'a-001', tag: 'En famille', name: 'Alfredo', desc: 'Cuisine portugaise conviviale' },
  { img: 'a-002', tag: 'En famille', name: 'Jardim Rústico', desc: 'Grillades en terrasse' },
  { img: 'a-003', tag: 'En famille', name: "Vivaldo's", desc: 'Poissons et fruits de mer' },
  { img: 'a-004', tag: 'En couple', name: 'Al Quimia', desc: 'Cadre romantique' },
  { img: 'a-005', tag: 'En couple', name: 'Olive Bistro', desc: 'Cuisine raffinée' },
  { img: 'a-006', tag: 'En couple', name: 'Staar Restaurante', desc: "Soirée d'exception" },
  { img: 'a-007', tag: 'Entre amis', name: "D'VOLTA Vinhos & Tapas", desc: 'Vins et petits plats à partager' },
  { img: 'a-008', tag: 'Entre amis', name: 'Copos & Petiscos', desc: 'Ambiance conviviale' },
  { img: 'a-009', tag: 'Entre amis', name: 'Stews & More', desc: 'Tapas et bonne humeur' },
  { img: 'a-010', tag: 'Spécialité', name: 'Cataplana', desc: 'Ragoût de fruits de mer' },
  { img: 'a-011', tag: 'Spécialité', name: 'Polvo à Lagareiro', desc: "Poulpe grillé à l'huile d'olive" },
  { img: 'a-012', tag: 'Spécialité', name: 'Bacalhau à Brás', desc: 'Morue effilochée' },
  { img: 'a-013', tag: 'Spécialité', name: 'Picanha · Arroz de Marisco · Pastel de Nata', desc: 'Les incontournables à goûter' },
];

const GUIDE_SUPER = ['a-014a', 'a-014b', 'a-014c', 'a-014d'];

const GUIDE_NOCTURNE = [
  { img: 'a-018', tag: 'Bar à cocktails', name: 'Sal Rosa', desc: 'Cocktails signatures et terrasse' },
  { img: 'a-019', tag: 'Bar à cocktails', name: 'Tonic Bar', desc: 'Cocktails artisanaux' },
  { img: 'a-020', tag: 'Bar à cocktails', name: 'Yolo Treehouse', desc: 'Rooftop tropical, ambiance chic' },
  { img: 'a-021', tag: 'Bar animé', name: 'Paulos Bar', desc: 'Musique live' },
  { img: 'a-022', tag: 'Bar animé', name: 'Hot Sun Bar', desc: 'Happy hour et soirées festives' },
  { img: 'a-023', tag: 'Bar animé', name: 'Portas da Villa', desc: 'Bar convivial de la vieille ville' },
  { img: 'a-024', tag: 'Discothèque', name: 'Kiss Disco Club', desc: 'DJ internationaux' },
  { img: 'a-025', tag: 'Discothèque', name: 'Club Spaces', desc: 'Musique électronique' },
  { img: 'a-026', tag: 'Discothèque', name: 'Libertos Club', desc: 'Ambiance festive' },
  { img: 'a-027', tag: 'Discothèque', name: 'Illuzziun Club', desc: 'Tables VIP et DJ sets' },
  { img: 'a-028', tag: 'Vilamoura', name: 'Marina de Vilamoura', desc: 'Promenade parmi les yachts, restaurants et bars lounge' },
  { img: 'a-029', tag: 'Casino', name: 'Casino Vilamoura', desc: 'Machines à sous, roulette, blackjack, poker — tenue correcte recommandée' },
  { img: 'a-030', tag: 'Beach club', name: 'NoSoloÁgua', desc: 'Albufeira' },
  { img: 'a-031', tag: 'Beach club', name: 'Purobeach', desc: 'Vilamoura' },
  { img: 'a-031a', tag: 'Beach club', name: 'Purobeach', desc: 'Vilamoura, vue de nuit' },
  { img: 'a-032', tag: 'Beach club', name: 'Heaven Beach Club', desc: 'Ambiance premium, jour et soir' },
];

const GUIDE_VILLES = [
  { img: 'a-033', tag: '38 km · 35-40 min', name: 'Aéroport de Faro', desc: 'Location de voiture fortement recommandée. Taxi 45-60 € · Uber/Bolt 25-40 € · Bus économique mais plus long.' },
  { img: 'a-034', tag: '3 km · 8-10 min', name: 'Albufeira', desc: 'Vieille ville, marina, plages, excursions en bateau, restaurants et vie nocturne.' },
  { img: 'a-035', tag: '15 km · 20 min', name: 'Vilamoura', desc: 'Marina de luxe, casino, golf, restaurants gastronomiques et bars lounge.' },
  { img: 'a-036', tag: '60 km · 50-55 min', name: 'Lagos', desc: 'Ponta da Piedade, plages spectaculaires, grottes, kayak et centre historique.' },
  { img: 'a-037', tag: '40 km · 35-40 min', name: 'Portimão', desc: 'Praia da Rocha, promenade maritime, restaurants de fruits de mer et shopping.' },
  { img: 'a-038', tag: '30 km · 30 min', name: 'Carvoeiro', desc: "Falaises, Algar Seco, sentiers panoramiques et excursions vers les grottes marines." },
  { img: 'a-039', tag: '25 km · 30 min', name: 'Loulé', desc: 'Marché couvert, château, artisanat et centre historique.' },
  { img: 'a-040', tag: '65 km · 55 min', name: 'Tavira', desc: 'Pont romain, salines, île de Tavira et ambiance authentique.' },
  { img: 'a-041', tag: '30 km · 30 min', name: 'Silves', desc: 'Château médiéval, cathédrale et vieille ville.' },
];

/* ============ Auto carousel engine ============ */
class AutoCarousel {
  constructor(el, items, opts = {}) {
    this.el = el;
    this.items = items;
    this.duration = opts.duration || 5000;
    this.i = 0;
    this.timer = null;
    this.build();
    this.show(0);
    this.start();
    this.el.addEventListener('mouseenter', () => this.stop());
    this.el.addEventListener('mouseleave', () => this.start());
  }
  build() {
    const slides = this.items.map((it, i) => `
      <div class="ac-slide" data-i="${i}">
        <img src="assets/guide/${it.img}.jpg" alt="${it.name}" loading="${i === 0 ? 'eager' : 'lazy'}">
        <div class="ac-scrim"></div>
        <div class="ac-caption">
          <div class="ac-tag">${it.tag}</div>
          <div class="ac-name">${it.name}</div>
          <div class="ac-desc">${it.desc}</div>
        </div>
      </div>`).join('');
    const dots = this.items.map((_, i) => `<div class="ac-dot" data-i="${i}"><b></b></div>`).join('');
    this.el.innerHTML = `
      ${slides}
      <div class="ac-dots">${dots}</div>
      <button class="ac-arrow ac-prev" aria-label="Précédent" type="button">&lsaquo;</button>
      <button class="ac-arrow ac-next" aria-label="Suivant" type="button">&rsaquo;</button>
    `;
    this.el.style.setProperty('--ac-dur', (this.duration / 1000) + 's');
    this.slideEls = Array.from(this.el.querySelectorAll('.ac-slide'));
    this.dotEls = Array.from(this.el.querySelectorAll('.ac-dot'));
    this.el.querySelector('.ac-prev').addEventListener('click', () => { this.go(this.i - 1); this.restart(); });
    this.el.querySelector('.ac-next').addEventListener('click', () => { this.go(this.i + 1); this.restart(); });
    this.dotEls.forEach(d => d.addEventListener('click', () => { this.go(+d.dataset.i); this.restart(); }));
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
    el.innerHTML = images.map((img, i) => `<div class="mini-ac-slide${i === 0 ? ' active' : ''}"><img src="assets/guide/${img}.jpg" alt="" loading="lazy"></div>`).join('');
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
  if (restEl) new AutoCarousel(restEl, GUIDE_RESTAURANTS);
  const nightEl = document.getElementById('ac-nocturne');
  if (nightEl) new AutoCarousel(nightEl, GUIDE_NOCTURNE);
  const villesEl = document.getElementById('ac-villes');
  if (villesEl) new AutoCarousel(villesEl, GUIDE_VILLES);
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
