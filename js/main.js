/**
 * main.js — Orchestration: preloader → scrollytelling → page interactions
 */

/* ─────────────────────────────────────────────
   SCENE CONFIGURATION
   To add a scene: add entry here + matching HTML
   ───────────────────────────────────────────── */
// Standard single-sequence scenes
const STANDARD_SCENES = [
  { id: 'scene1', basePath: 'assets/frames/scene1', count: 251, scrollHeight: 3500 },
  { id: 'scene2', basePath: 'assets/frames/scene2', count: 251, scrollHeight: 3500 },
  { id: 'scene3', basePath: 'assets/frames/scene3', count: 251, scrollHeight: 2800 },
];

// Respirez: 3 sequences played end-to-end on ONE pinned canvas
// vv-a03 → vv-a08 → vv-a11
const RESPIREZ_SEQ = [
  { id: 'resp-a', basePath: 'assets/frames/resp-a', count: 251 },
  { id: 'resp-b', basePath: 'assets/frames/resp-b', count: 251 },
  { id: 'resp-d', basePath: 'assets/frames/resp-d', count: 251 },
];
const RESPIREZ_SCENE = {
  type           : 'multi-seq',
  wrapperId      : 'st-wrap-respirez',
  sequences      : RESPIREZ_SEQ,
  totalScrollHeight: 2800 * 3,   // 3 sequences × 2800px = 8400px total
};

const SCENE_CONFIG = [
  ...STANDARD_SCENES,
  RESPIREZ_SCENE,
];

const PHONE = '33622907584'; // Numéro WhatsApp de LUZDOSOL
const EMAIL = 'luzdosol351@gmail.com';
const PRICE_FROM = 43;
const RESA_TRACKER_URL = ''; // TODO: coller ici l'URL /exec du déploiement Google Apps Script (voir google-apps-script/Code.gs) pour activer l'email d'avis J+1
const isMobile = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent) || window.innerWidth <= 900;

// Perf constants
// stride=2 → load f0001,f0003,…,f0251 (even coverage, half the requests) — applied
// on both desktop and mobile so the whole site is visually ready much faster.
// scrollHeight ×0.5 → additionally, page is 50% shorter on mobile (less exhausting to scroll)
const FRAME_STRIDE = 2;
const FRAME_COUNT  = 126;   // Math.ceil(251 / FRAME_STRIDE)
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

  startLoaderMsgs();

  /* --- PRELOADER + SCENE CONFIG --- */
  const preloader = new FramePreloader();

  const allSeqs = [
    ...STANDARD_SCENES,
    ...RESPIREZ_SEQ,
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
    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      burger.classList.remove('open');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    }));
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

  /* --- NAV SCROLL STYLE --- */
  const nav = document.querySelector('.site-nav');
  const stickyBar = document.querySelector('.sticky-bar');
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (nav) nav.classList.toggle('scrolled', y > 40);
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
  let calY = today.getFullYear(), calM = today.getMonth(), arrival = null;
  const occ = [];
  // Dates réellement occupées, synchronisées depuis Booking.com (voir .github/workflows/sync-booking-calendar.yml)
  fetch('data/booked-dates.json').then(r => r.ok ? r.json() : null).then(d => {
    if (d && Array.isArray(d.bookedDates)) {
      occ.length = 0;
      d.bookedDates.forEach(k => occ.push(k));
      renderCalendar();
    }
  }).catch(() => {});

  function key(d) { return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }
  function parseKey(k) { const [y,m,da]=k.split('-').map(Number); return new Date(y,m-1,da); }
  function seasonStatus(d) {
    if (occ.includes(key(d))) return 'occ';
    const m = d.getMonth();
    if ([11,2,3].includes(m)) return 'promo';
    if (m>=5&&m<=8) return 'high';
    if (m<=1) return 'closed';
    return 'low';
  }
  function nightlyPrice(m) {
    if (m>=5&&m<=8) return 65;
    if ([11,2,3].includes(m)) return 43;
    if ([9,10,4].includes(m)) return 50;
    return null;
  }
  const calLocale = () => (window.LUZDOSOL_LOCALE_MAP && window.LUZDOSOL_LOCALE_MAP[window.LUZDOSOL_LANG]) || 'fr-FR';
  function fmtDate(d) { return d.toLocaleDateString(calLocale(),{day:'numeric',month:'long'}); }
  function monthName(y,m) { const s=new Date(y,m,1).toLocaleDateString(calLocale(),{month:'long',year:'numeric'}); return s[0].toUpperCase()+s.slice(1); }

  function renderCalendar() {
    const cont = document.getElementById('cal-container');
    if (!cont) return;
    const months=[{y:calY,m:calM}];
    let nm=calM+1,ny=calY; if(nm>11){nm=0;ny++;} months.push({y:ny,m:nm});
    let html='';
    months.forEach(({y,m})=>{
      const startDay=(new Date(y,m,1).getDay()+6)%7;
      const total=new Date(y,m+1,0).getDate();
      const depKey=arrival?(()=>{const a=parseKey(arrival);a.setDate(a.getDate()+6);return key(a);})():null;
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
        if(arrival){const a=parseKey(arrival),dep=new Date(a);dep.setDate(a.getDate()+6);if(date>a&&date<dep)cls+=' range';}
        if(arrival===k)cls+=' sel';
        if(depKey===k)cls+=' dep';
        html+=`<div class="${cls}" ${(st!=='occ'&&st!=='closed')?`data-pick="${k}"`:''}>${day}</div>`;
      }
      html+='</div></div>';
    });
    cont.innerHTML=html;
    cont.querySelectorAll('[data-pick]').forEach(el=>{
      el.addEventListener('click',()=>{arrival=el.dataset.pick;renderCalendar();updateStay();updateDateInput();});
    });
    updateStay();
  }
  function updateStay(){
    const l=document.getElementById('stay-label'),p=document.getElementById('stay-price');
    if(!l||!p)return;
    if(!arrival){l.textContent=t('stay_default');l.dataset.set='0';p.textContent='—';return;}
    l.dataset.set='1';
    const a=parseKey(arrival),dep=new Date(a);dep.setDate(a.getDate()+6);
    const pr=nightlyPrice(a.getMonth());
    l.textContent=fmtDate(a)+' → '+fmtDate(dep)+' · 6 '+t('nights_word');
    p.textContent=pr?pr+t('per_night'):t('on_request');
  }
  function updateDateInput(){const i=document.getElementById('f-date');if(i&&arrival)i.value=fmtDate(parseKey(arrival));}
  document.getElementById('cal-prev')?.addEventListener('click',()=>{calM--;if(calM<0){calM=11;calY--;}renderCalendar();});
  document.getElementById('cal-next')?.addEventListener('click',()=>{calM++;if(calM>11){calM=0;calY++;}renderCalendar();});
  renderCalendar();

  /* --- FORM --- */
  function trackReservation(v){
    if(!RESA_TRACKER_URL)return;
    const depart=arrival?(()=>{const a=parseKey(arrival);a.setDate(a.getDate()+6);return fmtDate(a);})():'';
    const body=new URLSearchParams({
      prenom:v('f-prenom'),nom:v('f-nom'),email:v('f-email'),tel:v('f-tel'),
      arrivee:v('f-date')||(arrival?fmtDate(parseKey(arrival)):''),depart,voyageurs:v('f-voyageurs')
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
    window.open(waUrl(`${t('wa_resa_greeting')}\n\n${t('label_name')} : ${v('f-prenom')} ${v('f-nom')}\n${t('label_phone')} : ${v('f-tel')}\n${t('label_email')} : ${v('f-email')}\n${t('label_arrival')} : ${v('f-date')||(arrival?fmtDate(parseKey(arrival)):t('label_tbd'))}\n${t('label_travelers')} : ${v('f-voyageurs')}\n${t('label_message')} : ${v('f-msg')}`),'_blank');
  });
  document.getElementById('btn-paypal')?.addEventListener('click',()=>{
    window.open(waUrl(t('wa_paypal_msg')),'_blank');
  });
  document.getElementById('f-date')?.addEventListener('focus',function(){if(arrival)this.value=fmtDate(parseKey(arrival));});
});
