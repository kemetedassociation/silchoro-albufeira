/**
 * main.js — Orchestration: preloader → scrollytelling → page interactions
 */

/* ─────────────────────────────────────────────
   SCENE CONFIGURATION
   To add a scene: add entry here + matching HTML
   ───────────────────────────────────────────── */
// Standard single-sequence scenes — allégé : 2 séquences courtes (au lieu de 7)
// servant uniquement de hero sur la page d'accueil.
const STANDARD_SCENES = [
  { id: 'hero-a', basePath: 'assets/frames/hero-a', count: 84, scrollHeight: 2000 },
  { id: 'hero-b', basePath: 'assets/frames/hero-b', count: 84, scrollHeight: 1650 },
];

const SCENE_CONFIG = [
  ...STANDARD_SCENES,
];

const PHONE = '33610418154'; // Numéro WhatsApp de LUZDOSOL
const EMAIL = 'luzdosol351@gmail.com';
const PRICE_FROM = 43;
const RESA_TRACKER_URL = 'https://script.google.com/macros/s/AKfycby4e6klDol6ik6-DXkhlrHS3P-FNEp5PAWyB_3DlbQ6nO4QsxAyUHvTSQswgQerR5louw/exec';
const BOOKING_WORKER_URL = 'https://luzdosol-chatbot.kemeted-association.workers.dev';
const DEPOSIT_RATE = 0.3; // doit rester identique à DEPOSIT_RATE dans chatbot-worker/src/index.ts
const isMobile = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent) || window.innerWidth <= 900;

// Perf constants
// Les séquences sur disque ont déjà été allégées à 84 frames (au lieu de 251) — stride=1.
// scrollHeight ×0.5 → page 50% plus courte sur mobile (moins fatiguant à scroller)
const FRAME_STRIDE = 1;
const FRAME_COUNT  = 84;
const MOB_SCROLL   = 0.5;   // scroll-height multiplier for mobile only

/* ─────────────────────────────────────────────
   LOADER — animated messages
   ───────────────────────────────────────────── */
const LOADER_MSGS = [
  `Préparation de votre séjour à Albufeira…`,
  `Saviez-vous ? « Albufeira » vient de l’arabe — cela signifie « le lagon ».`,
  `Devinette : on ne m’admire qu’en kayak. Je suis percée de lumière comme une cathédrale. Qui suis-je ?`,
  `La grotte de Benagil — à 20 minutes de l’appartement.`,
  `L’Algarve est la région la plus ensoleilée d’Europe : 300 jours de soleil par an.`,
  `Devinette : dorée à l’aube, turquoise à midi, rose au coucher du soleil…`,
  `C’est la mer d’Algarve. Elle vous attend.`,
  `Prêt dans quelques instants…`,
];
let _msgIdx = 0;
let _msgTimer = null;

function startLoaderMsgs() {
  const el = document.getElementById('ld-msg');
  if (!el) return;
  _msgTimer = setInterval(() => {
    el.classList.add('fade');
    setTimeout(() => {
      _msgIdx = (_msgIdx + 1) % LOADER_MSGS.length;
      el.textContent = LOADER_MSGS[_msgIdx];
      el.classList.remove('fade');
    }, 500);
  }, 3200);
}

/* ─────────────────────────────────────────────
   BOOT
   ───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  /* Le loader plein écran + les scènes canvas n'existent que sur l'accueil
     (index.html) — les autres pages n'ont ni #site-loader ni canvas, donc on
     évite tout téléchargement de frames inutile ailleurs. */
  if (document.getElementById('site-loader')) {

  startLoaderMsgs();

  /* --- PRELOADER + SCENE CONFIG --- */
  const preloader = new FramePreloader();

  const allSeqs = [
    ...STANDARD_SCENES,
  ].map(s => ({ ...s, count: FRAME_COUNT, stride: FRAME_STRIDE }));

  const controllerScenes = SCENE_CONFIG.map(s => {
    if (s.type === 'multi-seq') {
      return {
        ...s,
        totalScrollHeight: Math.round(s.totalScrollHeight * (isMobile ? MOB_SCROLL : 1)),
        sequences: s.sequences.map(seq => ({
          ...seq,
          count : FRAME_COUNT,
          stride: FRAME_STRIDE,
        })),
      };
    }
    return {
      ...s,
      count       : FRAME_COUNT,
      stride      : FRAME_STRIDE,
      scrollHeight: Math.round((s.scrollHeight || 3000) * (isMobile ? MOB_SCROLL : 1)),
    };
  });

  // Sync wrapper heights before GSAP init to prevent canvas drift after unpin
  if (isMobile) {
    controllerScenes.forEach(s => {
      if (s.type === 'multi-seq') {
        const el = document.getElementById(s.wrapperId);
        if (el) el.style.height = s.totalScrollHeight + 'px';
      } else {
        const el = document.getElementById(`st-wrap-${s.id}`);
        if (el) el.style.height = (s.scrollHeight || 3000) + 'px';
      }
    });
  }

  /* --- SCROLL CONTROLLER — start immediately, canvases fill as frames arrive --- */
  const controller = new ScrollController(preloader, controllerScenes);
  controller.init();

  /* --- LOADER DISMISS — max 4 s or once loading flows (whichever first) --- */
  let _loaderDone = false;
  function dismissLoader() {
    if (_loaderDone) return;
    _loaderDone = true;
    clearInterval(_msgTimer);
    const bar   = document.getElementById('loader-bar');
    const scrim = document.getElementById('site-loader');
    if (bar) bar.style.width = '100%';
    setTimeout(() => {
      if (scrim) { scrim.style.opacity = '0'; setTimeout(() => scrim.remove(), 800); }
    }, 300);
  }
  setTimeout(dismissLoader, 4000); // safety net: never block longer than 4 s

  preloader.onProgress = pct => {
    const bar = document.getElementById('loader-bar');
    const num = document.getElementById('loader-pct');
    if (bar) bar.style.width = pct + '%';
    if (num) num.textContent = Math.round(pct) + ' %';
    if (pct >= 5) dismissLoader(); // dismiss early once loading starts flowing
  };

  preloader.load(allSeqs);

  } // fin du bloc loader + scènes canvas (accueil uniquement)

  /* --- DROPDOWN NAV --- */
  const ddBtn  = document.getElementById('nav-dd-btn');
  const ddMenu = document.getElementById('nav-dropdown');
  if (ddBtn && ddMenu) {
    ddBtn.addEventListener('click', e => {
      e.stopPropagation();
      const open = ddMenu.classList.toggle('open');
      ddBtn.classList.toggle('open', open);
      ddBtn.setAttribute('aria-expanded', open);
    });
    ddMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      ddMenu.classList.remove('open');
      ddBtn.classList.remove('open');
    }));
    document.addEventListener('click', () => {
      ddMenu.classList.remove('open');
      ddBtn.classList.remove('open');
    });
  }

  /* --- MOBILE MENU --- */
  const burger     = document.getElementById('nav-burger');
  const mobileMenu = document.getElementById('mobile-menu');
  if (burger && mobileMenu) {
    burger.addEventListener('click', () => {
      const opening = !mobileMenu.classList.contains('open');
      burger.classList.toggle('open');
      mobileMenu.classList.toggle('open');
      document.body.style.overflow = opening ? 'hidden' : '';
    });
    const closeMenu = () => {
      burger.classList.remove('open');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    };
    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
    document.getElementById('mm-close')?.addEventListener('click', closeMenu);
  }

  /* --- APARTMENT CAROUSEL --- */
  const track = document.getElementById('apt-track');
  if (track) {
    const slides = track.querySelectorAll('.apt-carousel-slide');
    const dotsEl = document.getElementById('apt-dots');
    const perView = isMobile ? 1 : 2;
    const total   = slides.length;
    let cur = 0;

    const getSlideW = () => slides[0].offsetWidth + (isMobile ? 4 : 12);
    const pages     = () => Math.ceil(total / perView);

    function buildDots() {
      if (!dotsEl) return;
      dotsEl.innerHTML = '';
      for (let i = 0; i < pages(); i++) {
        const d = document.createElement('div');
        d.className = 'apt-dot' + (i === 0 ? ' active' : '');
        d.addEventListener('click', () => goTo(i * perView));
        dotsEl.appendChild(d);
      }
    }
    function goTo(idx) {
      cur = Math.max(0, Math.min(idx, total - 1));
      track.style.transform = `translateX(${-(cur * getSlideW())}px)`;
      dotsEl?.querySelectorAll('.apt-dot').forEach((d, i) => {
        d.classList.toggle('active', i === Math.floor(cur / perView));
      });
    }
    buildDots();
    document.getElementById('apt-prev')?.addEventListener('click', () => { goTo(cur - perView); startAuto(); });
    document.getElementById('apt-next')?.addEventListener('click', () => { goTo(cur + perView); startAuto(); });
    let tx = 0;
    track.parentElement.addEventListener('touchstart', e => { tx = e.touches[0].clientX; stopAuto(); }, { passive: true });
    track.parentElement.addEventListener('touchend', e => {
      const dx = tx - e.changedTouches[0].clientX;
      if (Math.abs(dx) > 40) goTo(dx > 0 ? cur + perView : cur - perView);
      startAuto();
    }, { passive: true });
    window.addEventListener('resize', () => { buildDots(); goTo(cur); });

    /* Défilement automatique toutes les 6s, pause au survol/interaction */
    let autoTimer = null;
    function nextSlide() { goTo(cur + perView >= total ? 0 : cur + perView); }
    function startAuto() { stopAuto(); autoTimer = setInterval(nextSlide, 6000); }
    function stopAuto() { if (autoTimer) clearInterval(autoTimer); }
    startAuto();
    track.parentElement.addEventListener('mouseenter', stopAuto);
    track.parentElement.addEventListener('mouseleave', startAuto);
  }

  /* --- BOUTON RETOUR (discret : apparaît en scrollant vers le haut, disparaît vers le bas) --- */
  const backBtn = document.getElementById('back-btn');
  if (backBtn) {
    if (history.length <= 1) {
      backBtn.style.display = 'none';
    } else {
      backBtn.addEventListener('click', () => history.back());
      backBtn.classList.add('bb-hidden');
      let lastY = window.scrollY;
      let bbTicking = false;
      function updateBackBtn() {
        const y = Math.max(window.scrollY, 0);
        const delta = y - lastY;
        if (delta > 4) backBtn.classList.add('bb-hidden');
        else if (delta < -4) backBtn.classList.remove('bb-hidden');
        lastY = y;
        bbTicking = false;
      }
      window.addEventListener('scroll', () => {
        if (!bbTicking) { requestAnimationFrame(updateBackBtn); bbTicking = true; }
      }, { passive: true });
    }
  }

  /* --- SOMMAIRE DE PAGE (surbrillance de la section active) --- */
  const tocLinks = document.querySelectorAll('.page-toc a');
  if (tocLinks.length) {
    const tocSections = Array.from(tocLinks).map(a => document.querySelector(a.getAttribute('href')));
    const tocIO = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          tocLinks.forEach(a => a.classList.remove('active'));
          const idx = tocSections.indexOf(e.target);
          if (idx > -1) tocLinks[idx].classList.add('active');
        }
      });
    }, { threshold: 0, rootMargin: '-40% 0px -55% 0px' });
    tocSections.forEach(s => s && tocIO.observe(s));
  }

  /* --- NAV SCROLL STYLE --- */
  const nav = document.querySelector('.site-nav');
  const navForceSolid = nav && nav.dataset.solid === '1';
  const stickyBar = document.querySelector('.sticky-bar');
  if (nav && navForceSolid) nav.classList.add('scrolled');
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (nav && !navForceSolid) nav.classList.toggle('scrolled', y > 40);
    if (stickyBar) {
      const show = y > window.innerHeight * 1.5
        && (y + window.innerHeight) < document.body.scrollHeight - 360;
      stickyBar.style.transform = show ? 'translateY(0)' : 'translateY(140%)';
    }
  }, { passive: true });

  /* --- PROGRESS BAR --- */
  const progressBar = document.querySelector('.st-progress');
  window.addEventListener('scroll', () => {
    if (!progressBar) return;
    const pct = window.scrollY / (document.body.scrollHeight - window.innerHeight);
    progressBar.style.transform = `scaleX(${pct})`;
  }, { passive: true });

  /* --- REVEAL ON SCROLL --- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
  function scanReveals() {
    document.querySelectorAll('.reveal,.reveal-sc,.reveal-bl,.reveal-l,.reveal-r')
      .forEach(el => { if (!el.dataset.io) { el.dataset.io = '1'; io.observe(el); } });
  }
  scanReveals(); setTimeout(scanReveals, 600); setTimeout(scanReveals, 1400);

  /* --- ONGLETS FLUIDES (tarifs.html : Tarifs / Disponibilités / Réserver) --- */
  const tabBtns = document.querySelectorAll('.tab-btn');
  if (tabBtns.length) {
    const panels = document.querySelectorAll('.tab-panel');
    function activateTab(id, updateHash) {
      tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === id));
      panels.forEach(p => p.classList.toggle('active', p.id === id));
      if (updateHash) history.replaceState(null, '', '#' + id);
      scanReveals();
    }
    tabBtns.forEach(b => b.addEventListener('click', () => activateTab(b.dataset.tab, true)));
    const wanted = location.hash.slice(1);
    const initial = [...panels].some(p => p.id === wanted) ? wanted : (panels[0] && panels[0].id);
    if (initial) activateTab(initial, false);
  }

  /* --- COUNT-UP --- */
  const cio = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { countUp(e.target); cio.unobserve(e.target); } });
  }, { threshold: 0.4 });
  document.querySelectorAll('[data-count]').forEach(el => cio.observe(el));
  function countUp(el) {
    const tgt = parseFloat(el.dataset.count) || 0;
    const sfx = el.dataset.suffix || '';
    const dur = 1600, t0 = performance.now();
    const step = t => {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(tgt * (1 - Math.pow(1 - p, 3))) + sfx;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* --- MAGNETIC BUTTONS (desktop) --- */
  if (!isMobile) {
    document.querySelectorAll('[data-magnetic]').forEach(el => {
      el.addEventListener('mousemove', ev => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(ev.clientX - r.left - r.width / 2) * 0.28}px,${(ev.clientY - r.top - r.height / 2) * 0.36}px) scale(1.04)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* --- CUSTOM CURSOR (desktop) --- */
  if (!isMobile) {
    const dot  = document.querySelector('.cursor-dot');
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
      document.querySelectorAll('a,button,.lift,[data-magnetic],.cal-day').forEach(el => {
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

  /* --- AUTOPLAY VIDEOS --- */
  const videoIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.play().catch(() => {});
      else e.target.pause();
    });
  }, { threshold: 0.3 });
  document.querySelectorAll('video[data-autoplay]').forEach(v => videoIO.observe(v));

  /* --- LIGHTBOX --- */
  const lb = document.querySelector('.lb');
  const lbImg = document.getElementById('lb-img');
  document.querySelectorAll('.gallery-item').forEach(el => {
    el.addEventListener('click', () => {
      const img = el.querySelector('img');
      if (img && lb && lbImg) { lbImg.src = img.src; lb.classList.add('on'); }
    });
  });
  const closeLB = () => lb?.classList.remove('on');
  document.querySelector('.lb-x')?.addEventListener('click', closeLB);
  lb?.addEventListener('click', e => { if (e.target === lb) closeLB(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLB(); });

  /* --- WA / MAIL LINKS --- */
  const t = key => (window.luzdosolT ? window.luzdosolT(key) : key);
  // Tant que PHONE n'est pas configuré, on ne prend jamais le risque de contacter un vrai inconnu :
  // tous les liens "WhatsApp" basculent silencieusement sur un email pré-rempli.
  const waUrl = txt => PHONE
    ? `https://wa.me/${PHONE}` + (txt ? `?text=${encodeURIComponent(txt)}` : '')
    : `mailto:${EMAIL}` + (txt ? `?subject=${encodeURIComponent('LUZDOSOL - Albufeira')}&body=${encodeURIComponent(txt)}` : '');
  function refreshWaLinks() {
    document.querySelectorAll('.wa-link').forEach(el => { el.href = waUrl(t('wa_intro_msg')); });
  }
  refreshWaLinks();
  window.addEventListener('luzdosol-lang-change', () => { refreshWaLinks(); renderCalendar(); });
  const ml = document.querySelector('.mail-link');
  if (ml) ml.href = `mailto:${EMAIL}`;
  document.querySelectorAll('.price-from').forEach(el => { el.textContent = PRICE_FROM; });

  /* --- CALENDAR --- */
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let calY = today.getFullYear(), calM = today.getMonth(), arrival = null, departure = null, rangeChosen = false;
  const occ = [];
  // Dates réellement occupées, synchronisées depuis Booking.com (voir .github/workflows/sync-booking-calendar.yml)
  fetch('data/booked-dates.json').then(r => r.ok ? r.json() : null).then(d => {
    if (d && Array.isArray(d.bookedDates)) {
      occ.length = 0;
      d.bookedDates.forEach(k => occ.push(k));
      renderCalendar();
    }
  }).catch(() => {});

  const MIN_NIGHTS = 4;
  let nights = MIN_NIGHTS;

  function key(d) { return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }
  function parseKey(k) { const [y,m,da]=k.split('-').map(Number); return new Date(y,m-1,da); }
  // Date de départ affichée : celle choisie explicitement en 2e clic sur le calendrier,
  // ou saisie via le champ "nombre de nuits". Tant qu'aucune des deux n'a eu lieu
  // (juste après le 1er clic d'arrivée), on n'affiche aucun départ/plage pré-rempli —
  // comportement Booking.com : on choisit ses dates une à une.
  function currentDeparture() {
    if (departure) return parseKey(departure);
    if (!arrival || !rangeChosen) return null;
    const a = parseKey(arrival), dep = new Date(a); dep.setDate(a.getDate() + nights);
    return dep;
  }
  function showNightsError() {
    const errEl = document.getElementById('nights-error');
    if (!errEl) return;
    errEl.textContent = t('nights_min_error');
    errEl.classList.add('show');
    errEl.classList.remove('shake');
    void errEl.offsetWidth; // relance l'animation même si le message était déjà affiché
    errEl.classList.add('shake');
  }
  function hideNightsError() {
    document.getElementById('nights-error')?.classList.remove('show');
  }
  // Tarifs par mois (index 0 = janvier)
  const MONTH_PRICE = [43, 43, 43, 59, 74, 99, 224, 224, 74, 59, 43, 43];
  function nightlyPrice(m) { return MONTH_PRICE[m]; }
  function seasonStatus(d) {
    if (occ.includes(key(d))) return 'occ';
    const pr = MONTH_PRICE[d.getMonth()];
    if (pr >= 99) return 'high';
    if (pr >= 55) return 'mid';
    return 'low';
  }
  const calLocale = () => (window.LUZDOSOL_LOCALE_MAP && window.LUZDOSOL_LOCALE_MAP[window.LUZDOSOL_LANG]) || 'fr-FR';
  function fmtDate(d) { return d.toLocaleDateString(calLocale(),{day:'numeric',month:'long'}); }
  function monthName(y,m) { const s=new Date(y,m,1).toLocaleDateString(calLocale(),{month:'long',year:'numeric'}); return s[0].toUpperCase()+s.slice(1); }

  function renderCalendar() {
    const cont = document.getElementById('cal-container');
    if (!cont) return;
    const months=[{y:calY,m:calM}];
    let nm=calM+1,ny=calY; if(nm>11){nm=0;ny++;} months.push({y:ny,m:nm});
    const depDate=currentDeparture();
    const depKey=depDate?key(depDate):null;
    let html='';
    months.forEach(({y,m})=>{
      const startDay=(new Date(y,m,1).getDay()+6)%7;
      const total=new Date(y,m+1,0).getDate();
      html+=`<div><div style="text-align:center;font-weight:700;font-size:19px;margin-bottom:16px">${monthName(y,m)}</div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-bottom:8px">
          ${['L','M','M','J','V','S','D'].map(d=>`<div style="text-align:center;font-size:11px;font-weight:700;color:#9aa7ad">${d}</div>`).join('')}
        </div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px">`;
      for(let i=0;i<startDay;i++) html+='<div class="cal-day blank"></div>';
      for(let day=1;day<=total;day++){
        const date=new Date(y,m,day),k=key(date);
        let st=seasonStatus(date);
        if(date<today) st='occ';
        let cls='cal-day '+st;
        if(arrival){const a=parseKey(arrival);if(depDate&&date>a&&date<depDate)cls+=' range';}
        if(arrival===k)cls+=' sel';
        if(depKey===k)cls+=' dep';
        html+=`<div class="${cls}" ${(st!=='occ'&&st!=='closed')?`data-pick="${k}"`:''}>${day}</div>`;
      }
      html+='</div></div>';
    });
    cont.innerHTML=html;
    cont.querySelectorAll('[data-pick]').forEach(el=>{
      el.addEventListener('click',()=>pickDate(el.dataset.pick));
    });
    // Aperçu au survol (desktop) entre l'arrivée déjà choisie et la date sous la souris —
    // comme sur Booking.com, avant que le départ ne soit réellement cliqué.
    if (!isMobile && arrival && !departure) {
      cont.querySelectorAll('[data-pick]').forEach(el=>{
        el.addEventListener('mouseenter',()=>previewRange(el.dataset.pick));
        el.addEventListener('mouseleave',clearRangePreview);
      });
    }
    updateStay();
  }
  function previewRange(k) {
    if (!arrival || departure) return;
    const a=parseKey(arrival), h=parseKey(k);
    if (h<=a) return;
    document.querySelectorAll('#cal-container [data-pick]').forEach(el=>{
      const d=parseKey(el.dataset.pick);
      el.classList.toggle('range-preview', d>a && d<h);
    });
  }
  function clearRangePreview() {
    document.querySelectorAll('#cal-container .range-preview').forEach(el=>el.classList.remove('range-preview'));
  }
  // Sélection manuelle arrivée/départ en 2 clics sur le calendrier, une date à la fois
  // (comme Booking.com) : le 1er clic ne présélectionne aucune durée par défaut.
  // 1er clic (ou clic après une sélection déjà complète) = nouvelle arrivée.
  // 2e clic = tentative de départ : accepté si ≥ MIN_NIGHTS nuits après l'arrivée,
  // sinon message d'erreur animé et l'arrivée reste sélectionnée pour un nouvel essai.
  function pickDate(k) {
    const clicked = parseKey(k);
    if (!arrival || departure) {
      arrival = k; departure = null; rangeChosen = false; hideNightsError();
    } else {
      const a = parseKey(arrival);
      if (clicked <= a) {
        arrival = k; departure = null; rangeChosen = false; hideNightsError();
      } else {
        const diffNights = Math.round((clicked - a) / 86400000);
        if (diffNights < MIN_NIGHTS) {
          showNightsError();
        } else {
          departure = k; nights = diffNights; rangeChosen = true;
          const input = document.getElementById('nights-input');
          if (input) input.value = nights;
          hideNightsError();
        }
      }
    }
    renderCalendar(); updateStay(); updateDateInput();
  }
  function updateStay(){
    const l=document.getElementById('stay-label'),p=document.getElementById('stay-price');
    updatePaymentAmounts();
    if(!l||!p)return;
    if(!arrival){l.textContent=t('stay_default');l.dataset.set='0';p.textContent='—';return;}
    const a=parseKey(arrival),dep=currentDeparture();
    const pr=nightlyPrice(a.getMonth());
    if(!dep){
      l.dataset.set='0';
      l.textContent=fmtDate(a)+' → '+t('cal_choose_departure');
      p.textContent=pr?pr+t('per_night'):t('on_request');
      return;
    }
    l.dataset.set='1';
    l.textContent=fmtDate(a)+' → '+fmtDate(dep)+' · '+nights+' '+t('nights_word');
    p.textContent=pr?pr+t('per_night'):t('on_request');
  }

  /* --- MONTANTS DE PAIEMENT (acompte 30% / total) --- */
  function computeAmounts(){
    if(!arrival)return null;
    const a=parseKey(arrival);
    const nightly=nightlyPrice(a.getMonth());
    const totalCents=Math.round(nights*nightly*100);
    return { totalCents, acompteCents: Math.round(totalCents*DEPOSIT_RATE) };
  }
  function fmtEuros(cents){ return (cents/100).toLocaleString(calLocale(),{minimumFractionDigits:2,maximumFractionDigits:2})+' €'; }
  function updatePaymentAmounts(){
    const amt=computeAmounts();
    const elA=document.getElementById('amt-acompte'),elT=document.getElementById('amt-total');
    if(elA)elA.textContent=amt?fmtEuros(amt.acompteCents):'—';
    if(elT)elT.textContent=amt?fmtEuros(amt.totalCents):'—';
  }
  function updateDateInput(){const i=document.getElementById('f-date');if(i&&arrival)i.value=fmtDate(parseKey(arrival));}

  /* --- SÉLECTEUR DE NUITS (minimum 4, avec message d'erreur) --- */
  function setNights(v){
    const n=parseInt(v,10);
    const input=document.getElementById('nights-input');
    if(isNaN(n)||n<MIN_NIGHTS){
      showNightsError();
      nights=MIN_NIGHTS;
      if(input)input.value=MIN_NIGHTS;
    }else{
      hideNightsError();
      nights=n;
      if(input)input.value=n;
    }
    departure=null; // le champ "nuits" reprend la main sur la date de départ
    rangeChosen=!!arrival;
    renderCalendar();updateStay();
  }
  document.getElementById('nights-input')?.addEventListener('change',e=>setNights(e.target.value));
  document.getElementById('nights-input')?.addEventListener('input',e=>{
    if(parseInt(e.target.value,10)>=MIN_NIGHTS) hideNightsError();
  });

  document.getElementById('cal-prev')?.addEventListener('click',()=>{calM--;if(calM<0){calM=11;calY--;}renderCalendar();});
  document.getElementById('cal-next')?.addEventListener('click',()=>{calM++;if(calM>11){calM=0;calY++;}renderCalendar();});
  renderCalendar();

  /* --- ENCADRÉS TARIFS (janvier→décembre) → clic direct vers le calendrier --- */
  document.querySelectorAll('.tarif-month-card[data-month]').forEach(card=>{
    const goToMonth=()=>{
      calM=parseInt(card.dataset.month,10);
      calY=(calM<today.getMonth())?today.getFullYear()+1:today.getFullYear();
      renderCalendar();
      document.querySelector('.tab-btn[data-tab="calendrier"]')?.click();
      document.getElementById('calendrier')?.scrollIntoView({behavior:'smooth',block:'start'});
    };
    card.addEventListener('click',goToMonth);
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();goToMonth();}});
  });

  /* --- FORM --- */
  function isoKey(d){const p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;}
  function trackReservation(v){
    if(!RESA_TRACKER_URL)return;
    const a=arrival?parseKey(arrival):null;
    const dep=a?new Date(a):null; if(dep)dep.setDate(a.getDate()+nights);
    const body=new URLSearchParams({
      prenom:v('f-prenom'),nom:v('f-nom'),email:v('f-email'),tel:v('f-tel'),
      arrivee:v('f-date')||(a?fmtDate(a):''),depart:dep?fmtDate(dep):'',
      arrivee_iso:a?isoKey(a):'',depart_iso:dep?isoKey(dep):'',
      nuits:nights,voyageurs:v('f-voyageurs')
    });
    fetch(RESA_TRACKER_URL,{method:'POST',mode:'no-cors',body}).catch(()=>{});
  }
  document.getElementById('btn-wa-submit')?.addEventListener('click',()=>{
    const v=id=>document.getElementById(id)?.value||'';
    const requiredIds=['f-prenom','f-nom','f-tel','f-email','f-date','f-voyageurs'];
    for(const id of requiredIds){
      const el=document.getElementById(id);
      if(el && !el.checkValidity()){ el.reportValidity(); el.focus(); return; }
    }
    trackReservation(v);
    window.open(waUrl(`${t('wa_resa_greeting')}\n\n${t('label_name')} : ${v('f-prenom')} ${v('f-nom')}\n${t('label_phone')} : ${v('f-tel')}\n${t('label_email')} : ${v('f-email')}\n${t('label_arrival')} : ${v('f-date')||(arrival?fmtDate(parseKey(arrival)):t('label_tbd'))}\n${t('nights_word')} : ${nights}\n${t('label_travelers')} : ${v('f-voyageurs')}\n${t('label_message')} : ${v('f-msg')}`),'_blank');
  });
  document.getElementById('f-date')?.addEventListener('focus',function(){if(arrival)this.value=fmtDate(parseKey(arrival));});

  /* --- PAIEMENT EN LIGNE (Stripe : carte, Google Pay, Apple Pay, Klarna) --- */
  document.getElementById('btn-stripe-pay')?.addEventListener('click', async ()=>{
    const v=id=>document.getElementById(id)?.value||'';
    const statusEl=document.getElementById('stripe-status');
    const btn=document.getElementById('btn-stripe-pay');
    const label=btn?.querySelector('span');
    const showStatus=msg=>{ if(statusEl){statusEl.textContent=msg;statusEl.classList.add('show');} };

    const requiredIds=['f-prenom','f-nom','f-tel','f-email','f-voyageurs'];
    for(const id of requiredIds){
      const el=document.getElementById(id);
      if(el && !el.checkValidity()){ el.reportValidity(); el.focus(); return; }
    }
    if(!arrival){ showStatus(t('err_pick_date_first')); return; }

    if(statusEl){statusEl.classList.remove('show');statusEl.textContent='';}
    const amountType=document.querySelector('input[name="payment-type"]:checked')?.value||'acompte';
    const a=parseKey(arrival),dep=new Date(a);dep.setDate(a.getDate()+nights);

    if(btn){ btn.disabled=true; if(label){ label.dataset.orig=label.dataset.orig||label.textContent; label.textContent=t('checking_availability'); } }
    try{
      const res=await fetch(BOOKING_WORKER_URL+'/checkout',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          prenom:v('f-prenom'),nom:v('f-nom'),email:v('f-email'),tel:v('f-tel'),
          arrivee:fmtDate(a),depart:fmtDate(dep),
          arrivee_iso:isoKey(a),depart_iso:isoKey(dep),
          nuits:nights,voyageurs:v('f-voyageurs'),amountType
        })
      });
      const data=await res.json().catch(()=>({}));
      if(data.ok && data.url){ window.location.href=data.url; return; }
      showStatus(data.error==='unavailable' ? t('err_dates_unavailable') : t('err_payment_generic'));
    }catch(err){
      showStatus(t('err_payment_generic'));
    }finally{
      if(btn){ btn.disabled=false; if(label && label.dataset.orig) label.textContent=label.dataset.orig; }
    }
  });
  if(new URLSearchParams(location.search).get('paiement')==='annule'){
    const statusEl=document.getElementById('stripe-status');
    if(statusEl){ statusEl.textContent=t('payment_canceled_msg'); statusEl.classList.add('show'); }
  }
});
