document.addEventListener('DOMContentLoaded', () => {
  const PHONE = '33777777777';
  const EMAIL = 'contact@silchoro-albufeira.com';
  const PRICE_FROM = 43;

  // ===== SCROLLYTELLING ENGINE (rewritten for perfect sync) =====
  const scenes = document.querySelectorAll('.st-scene');
  const progressBar = document.querySelector('.st-progress');
  const stContainer = document.querySelector('.st-container');
  let lastRaf = 0;

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  // Smooth video scrubbing — avoid jumps
  const videoTargets = new Map();

  function updateScrollytelling() {
    const scrollY = window.scrollY;
    const docH = document.body.scrollHeight - window.innerHeight;

    if (progressBar && docH > 0) {
      progressBar.style.transform = 'scaleX(' + (scrollY / docH) + ')';
    }

    scenes.forEach(scene => {
      const rect = scene.getBoundingClientRect();
      const sceneH = scene.offsetHeight;
      const viewH = window.innerHeight;
      const inView = rect.top < viewH && rect.bottom > 0;
      const progress = clamp01(-rect.top / (sceneH - viewH));

      // Multi-video scene (data-multi)
      const isMulti = scene.hasAttribute('data-multi');
      if (isMulti) {
        const videos = scene.querySelectorAll('.st-multi-video video');
        const segCount = videos.length;
        if (segCount > 0 && inView) {
          const activeIdx = Math.min(Math.floor(progress * segCount), segCount - 1);
          const segSize = 1 / segCount;
          const segProgress = clamp01((progress - activeIdx * segSize) / segSize);
          videos.forEach((v, vi) => {
            if (vi === activeIdx) {
              v.classList.add('vid-active');
              if (v.paused && v.readyState >= 2) v.play().catch(() => {});
              if (v.duration && isFinite(v.duration)) {
                const target = segProgress * v.duration;
                if (!videoTargets.has(v)) videoTargets.set(v, v.currentTime);
                const smoothed = lerp(videoTargets.get(v), target, 0.2);
                v.currentTime = smoothed;
                videoTargets.set(v, smoothed);
              }
            } else {
              v.classList.remove('vid-active');
              if (!v.paused) v.pause();
              videoTargets.delete(v);
            }
          });
        } else if (isMulti && !inView) {
          scene.querySelectorAll('.st-multi-video video').forEach(v => {
            v.classList.remove('vid-active');
            if (!v.paused) v.pause();
            videoTargets.delete(v);
          });
        }
      } else {
        // Single video sync
        const video = scene.querySelector(':scope > .st-video-wrap > video');
        if (video && inView) {
          if (video.paused && video.readyState >= 2) video.play().catch(() => {});
          if (video.duration && isFinite(video.duration)) {
            const target = progress * video.duration;
            if (!videoTargets.has(video)) videoTargets.set(video, video.currentTime);
            const prev = videoTargets.get(video);
            const smoothed = lerp(prev, target, 0.25);
            video.currentTime = smoothed;
            videoTargets.set(video, smoothed);
          }
        } else if (video && !inView) {
          if (!video.paused) video.pause();
          videoTargets.delete(video);
        }
      }

      // Image zoom (for scroll-zoom scenes)
      const zoomImg = scene.querySelector('[data-scroll-zoom]');
      if (zoomImg && inView) {
        const scale = 1 + progress * 0.35;
        const y = -progress * 15;
        zoomImg.style.transform = `scale(${scale}) translateY(${y}%)`;
      }

      // Text panels — crossfade with smooth opacity
      const panels = scene.querySelectorAll('.st-text');
      const count = panels.length;
      if (count === 0) return;

      panels.forEach((panel, i) => {
        const segSize = 1 / count;
        const center = (i + 0.5) * segSize;
        const halfWindow = segSize * 0.38;
        const fadeZone = segSize * 0.15;

        const distFromCenter = Math.abs(progress - center);
        let opacity, yOffset;

        if (distFromCenter <= halfWindow - fadeZone) {
          // Fully visible
          opacity = 1;
          yOffset = 0;
        } else if (distFromCenter <= halfWindow + fadeZone) {
          // Fading in/out
          const fadeProgress = (distFromCenter - (halfWindow - fadeZone)) / (fadeZone * 2);
          opacity = 1 - easeOutCubic(clamp01(fadeProgress));
          yOffset = progress < center
            ? (1 - opacity) * 50
            : -(1 - opacity) * 40;
        } else {
          opacity = 0;
          yOffset = progress < center ? 60 : -40;
        }

        panel.style.opacity = opacity;
        panel.style.transform = `translateY(${yOffset}px)`;
        panel.style.filter = opacity < 0.3 ? `blur(${(1 - opacity) * 8}px)` : 'none';

        // Line animation
        const line = panel.querySelector('.st-line');
        if (line) {
          line.style.width = opacity > 0.5 ? '80px' : '0px';
        }
      });
    });
  }

  // ===== SCROLL-CONTROLLED VIDEOS (activity section etc) =====
  function updateScrollVideos() {
    document.querySelectorAll('[data-scroll-video]').forEach(wrap => {
      const video = wrap.querySelector('video');
      if (!video || !video.duration) return;
      const rect = wrap.getBoundingClientRect();
      const viewH = window.innerHeight;
      if (rect.top < viewH && rect.bottom > 0) {
        const progress = clamp01((viewH - rect.top) / (viewH + rect.height));
        video.currentTime = progress * video.duration;
      }
    });
  }

  // ===== CALENDAR STATE =====
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let calY = today.getFullYear();
  let calM = today.getMonth();
  let arrival = null;

  const occupied = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), 11 + i);
    occupied.push(key(d));
  }
  for (let i = 0; i < 6; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + 1, 8 + i);
    occupied.push(key(d));
  }

  function key(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function parseKey(k) { const [y, m, da] = k.split('-').map(Number); return new Date(y, m - 1, da); }

  function seasonStatus(d) {
    const k2 = key(d);
    if (occupied.includes(k2)) return 'occ';
    const m = d.getMonth();
    if (m === 11 || m === 2 || m === 3) return 'promo';
    if (m >= 5 && m <= 8) return 'high';
    if (m === 0 || m === 1) return 'closed';
    return 'low';
  }

  function nightlyPrice(m) {
    if (m >= 5 && m <= 8) return 65;
    if (m === 11 || m === 2 || m === 3) return 43;
    if (m === 9 || m === 10 || m === 4) return 50;
    return null;
  }

  function monthName(y, m) {
    const s = new Date(y, m, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function fmtDate(d) { return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }); }
  function waUrl(text) { return 'https://wa.me/' + PHONE + (text ? '?text=' + encodeURIComponent(text) : ''); }

  // ===== CALENDAR RENDER =====
  function renderCalendar() {
    const container = document.getElementById('cal-container');
    if (!container) return;
    const months = [{ y: calY, m: calM }];
    let nm = calM + 1, ny = calY;
    if (nm > 11) { nm = 0; ny++; }
    months.push({ y: ny, m: nm });

    let html = '';
    months.forEach(({ y, m }) => {
      const first = new Date(y, m, 1);
      const startDay = (first.getDay() + 6) % 7;
      const total = new Date(y, m + 1, 0).getDate();
      const depKey = arrival ? (() => { const a = parseKey(arrival); a.setDate(a.getDate() + 6); return key(a); })() : null;

      html += `<div><div style="text-align:center;font-weight:700;font-size:19px;margin-bottom:16px;letter-spacing:-.01em">${monthName(y, m)}</div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-bottom:8px">
          ${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => `<div style="text-align:center;font-size:11px;font-weight:700;color:#9aa7ad">${d}</div>`).join('')}
        </div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px">`;

      for (let i = 0; i < startDay; i++) html += '<div class="cal-day blank"></div>';
      for (let day = 1; day <= total; day++) {
        const date = new Date(y, m, day);
        const k = key(date);
        let st = seasonStatus(date);
        if (date.getTime() < today.getTime()) st = 'occ';
        let cls = 'cal-day ' + st;
        if (arrival) {
          const a = parseKey(arrival);
          const dep = new Date(a); dep.setDate(a.getDate() + 6);
          const t = new Date(y, m, day).getTime();
          if (t > a.getTime() && t < dep.getTime()) cls += ' range';
        }
        if (arrival === k) cls += ' sel';
        if (depKey === k) cls += ' dep';
        const selectable = st !== 'occ' && st !== 'closed';
        html += `<div class="${cls}" ${selectable ? `data-pick="${k}"` : ''}>${day}</div>`;
      }
      html += '</div></div>';
    });
    container.innerHTML = html;
    container.querySelectorAll('[data-pick]').forEach(el => {
      el.addEventListener('click', () => { arrival = el.dataset.pick; renderCalendar(); updateStay(); updateDateInput(); });
    });
    updateStay();
  }

  function updateStay() {
    const labelEl = document.getElementById('stay-label');
    const priceEl = document.getElementById('stay-price');
    if (!labelEl || !priceEl) return;
    if (!arrival) { labelEl.textContent = "Sélectionnez une date d’arrivée"; priceEl.textContent = '—'; return; }
    const a = parseKey(arrival);
    const dep = new Date(a); dep.setDate(a.getDate() + 6);
    const p = nightlyPrice(a.getMonth());
    labelEl.textContent = fmtDate(a) + ' → ' + fmtDate(dep) + ' · 6 nuits';
    priceEl.textContent = p ? p + ' € / nuit' : 'Sur demande';
  }

  function updateDateInput() {
    const input = document.getElementById('f-date');
    if (input && arrival) input.value = fmtDate(parseKey(arrival));
  }

  document.getElementById('cal-prev')?.addEventListener('click', () => { calM--; if (calM < 0) { calM = 11; calY--; } renderCalendar(); });
  document.getElementById('cal-next')?.addEventListener('click', () => { calM++; if (calM > 11) { calM = 0; calY++; } renderCalendar(); });

  // ===== PRICE FROM =====
  document.querySelectorAll('.price-from').forEach(el => { el.textContent = PRICE_FROM; });

  // ===== WHATSAPP LINKS =====
  const waText = "Bonjour ! Je suis intéressé(e) par l'appartement Silchoro à Albufeira. Pouvez-vous m'indiquer les disponibilités et le meilleur tarif ?";
  document.querySelectorAll('.wa-link').forEach(el => { el.href = waUrl(waText); });
  const mailLink = document.querySelector('.mail-link');
  if (mailLink) mailLink.href = 'mailto:' + EMAIL;

  // ===== FORM =====
  document.getElementById('btn-wa-submit')?.addEventListener('click', () => {
    const v = id => document.getElementById(id)?.value || '';
    const msg = `Bonjour ! Je souhaite réserver l'appartement Silchoro à Albufeira.\n\nNom : ${v('f-prenom')} ${v('f-nom')}\nTéléphone : ${v('f-tel')}\nEmail : ${v('f-email')}\nArrivée : ${v('f-date') || (arrival ? fmtDate(parseKey(arrival)) : 'à définir')}\nVoyageurs : ${v('f-voyageurs')}\nMessage : ${v('f-msg')}`;
    window.open(waUrl(msg), '_blank');
  });
  document.getElementById('btn-stripe')?.addEventListener('click', () => {
    window.open(waUrl('Bonjour, je souhaite régler un acompte via Stripe pour ma réservation à Albufeira.'), '_blank');
  });
  document.getElementById('f-date')?.addEventListener('focus', function () { if (arrival) this.value = fmtDate(parseKey(arrival)); });

  // ===== REVEAL ON SCROLL =====
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  function scanReveals() {
    document.querySelectorAll('.reveal,.reveal-sc,.reveal-bl,.reveal-l,.reveal-r').forEach(el => { if (!el.dataset.io) { el.dataset.io = '1'; io.observe(el); } });
  }
  scanReveals(); setTimeout(scanReveals, 400); setTimeout(scanReveals, 1200);

  // ===== COUNT-UP =====
  const cio = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { countUp(e.target); cio.unobserve(e.target); } });
  }, { threshold: 0.4 });
  document.querySelectorAll('[data-count]').forEach(el => cio.observe(el));
  function countUp(el) {
    const target = parseFloat(el.dataset.count) || 0;
    const suffix = el.dataset.suffix || '';
    const dur = 1500; const t0 = performance.now();
    function step(t) { const p = Math.min(1, (t - t0) / dur); const e2 = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(target * e2) + suffix; if (p < 1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  }

  // ===== MASTER SCROLL HANDLER =====
  const nav = document.querySelector('.site-nav');
  const stickyBar = document.querySelector('.sticky-bar');

  function onFrame() {
    const y = window.scrollY;
    if (nav) { if (y > 40) nav.classList.add('scrolled'); else nav.classList.remove('scrolled'); }
    if (stickyBar) {
      const docH = document.body.scrollHeight;
      const show = y > window.innerHeight * 2 && (y + window.innerHeight) < docH - 360;
      stickyBar.style.transform = show ? 'translateY(0)' : 'translateY(140%)';
    }
    updateScrollytelling();
    updateScrollVideos();
    requestAnimationFrame(onFrame);
  }
  requestAnimationFrame(onFrame);

  // ===== MAGNETIC BUTTONS =====
  document.querySelectorAll('[data-magnetic]').forEach(el => {
    el.addEventListener('mousemove', ev => { const r = el.getBoundingClientRect(); el.style.transform = 'translate(' + ((ev.clientX - r.left - r.width / 2) * 0.3) + 'px,' + ((ev.clientY - r.top - r.height / 2) * 0.4) + 'px) scale(1.04)'; });
    el.addEventListener('mouseleave', () => { el.style.transform = 'translate(0,0) scale(1)'; });
  });
  document.querySelectorAll('[data-float]').forEach(el => { el.style.animation = 'floaty 4s ease-in-out infinite'; });
  document.querySelectorAll('[data-pulse]').forEach(el => { el.style.animation = 'pulseRing 2.2s ease-out infinite'; });

  // ===== CUSTOM CURSOR =====
  if (window.matchMedia('(min-width:761px)').matches) {
    const dot = document.querySelector('.cursor-dot');
    const ring = document.querySelector('.cursor-ring');
    if (dot && ring) {
      let rx = 0, ry = 0, dx = 0, dy = 0;
      window.addEventListener('mousemove', e => { dx = e.clientX; dy = e.clientY; dot.style.left = dx + 'px'; dot.style.top = dy + 'px'; });
      (function loop() { rx += (dx - rx) * 0.16; ry += (dy - ry) * 0.16; ring.style.left = rx + 'px'; ring.style.top = ry + 'px'; requestAnimationFrame(loop); })();
      document.querySelectorAll('a,button,.lift,[data-magnetic],.cal-day').forEach(el => {
        el.addEventListener('mouseenter', () => { ring.style.width = '62px'; ring.style.height = '62px'; ring.style.borderColor = 'rgba(25,182,201,.6)'; dot.style.width = '5px'; dot.style.height = '5px'; });
        el.addEventListener('mouseleave', () => { ring.style.width = '40px'; ring.style.height = '40px'; ring.style.borderColor = 'rgba(10,92,134,.35)'; dot.style.width = '9px'; dot.style.height = '9px'; });
      });
    }
  }

  // ===== LIGHTBOX =====
  const lb = document.querySelector('.lb');
  const lbImg = document.getElementById('lb-img');
  document.querySelectorAll('.gallery-item').forEach(el => {
    el.addEventListener('click', () => {
      const img = el.querySelector('img');
      if (img && lb && lbImg) { lbImg.src = img.src; lb.classList.add('on'); }
    });
  });
  function closeLightbox() { if (lb) lb.classList.remove('on'); }
  document.querySelector('.lb-x')?.addEventListener('click', closeLightbox);
  lb?.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

  // ===== AUTO-PLAY INLINE VIDEOS ON INTERSECTION =====
  const vidObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      const v = e.target.querySelector('video[data-autoplay]');
      if (!v) return;
      if (e.isIntersecting) v.play().catch(() => {});
      else v.pause();
    });
  }, { threshold: 0.3 });
  document.querySelectorAll('.gal-vid, .act-card').forEach(el => vidObs.observe(el));

  // ===== INIT =====
  renderCalendar();
  scenes.forEach(scene => {
    const v = scene.querySelector('video');
    if (v) { v.preload = 'auto'; v.muted = true; v.playsInline = true; }
  });
});
