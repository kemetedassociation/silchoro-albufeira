document.addEventListener('DOMContentLoaded', () => {
  const isMobile = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent) || window.innerWidth <= 900;

  /* --- Apply reveal-on-scroll classes to guide content (same language as the homepage) --- */
  document.querySelectorAll('.guide-eyebrow, .guide-section > h2, .guide-section > p.lead, .night-plan, .tip-box')
    .forEach(el => el.classList.add('reveal'));

  document.querySelectorAll('.guide-grid').forEach(grid => {
    const delays = ['', 'reveal-d2', 'reveal-d3', 'reveal-d4', 'reveal-d5'];
    Array.from(grid.children).forEach((card, i) => {
      card.classList.add('reveal', 'reveal-sc', 'lift');
      const d = delays[i % delays.length];
      if (d) card.classList.add(d);
    });
  });

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
  document.querySelectorAll('.reveal,.reveal-sc,.reveal-l,.reveal-r').forEach(el => io.observe(el));

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
      document.querySelectorAll('a,button,.lift,[data-magnetic]').forEach(el => {
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
