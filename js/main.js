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

// Respirez: 4 sequences played end-to-end on ONE pinned canvas
// vv-a03 → vv-a08 → vv-a10 → vv-a11
const RESPIREZ_SEQ = [
  { id: 'resp-a', basePath: 'assets/frames/resp-a', count: 251 },
  { id: 'resp-b', basePath: 'assets/frames/resp-b', count: 251 },
  { id: 'resp-c', basePath: 'assets/frames/resp-c', count: 251 },
  { id: 'resp-d', basePath: 'assets/frames/resp-d', count: 251 },
];
const RESPIREZ_SCENE = {
  type           : 'multi-seq',
  wrapperId      : 'st-wrap-respirez',
  sequences      : RESPIREZ_SEQ,
  totalScrollHeight: 2800 * 4,   // 4 sequences × 2800px = 11200px total
};

const SCENE_CONFIG = [
  ...STANDARD_SCENES,
  RESPIREZ_SCENE,
];

const PHONE = '33777777777';
const EMAIL = 'contact@silchoro-albufeira.com';
const PRICE_FROM = 43;
const isMobile = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent) || window.innerWidth <= 900;

// Mobile perf constants
// stride=2 → load f0001,f0003,…,f0251 (even coverage, half the requests)
// scrollHeight ×0.5 → page is 50% shorter on mobile (less exhausting to scroll)
const MOB_STRIDE = 2;
const MOB_COUNT  = 126;   // Math.ceil(251 / MOB_STRIDE)
const MOB_SCROLL = 0.5;   // scroll-height multiplier for mobile

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
  ].map(s => isMobile
    ? { ...s, count: MOB_COUNT, stride: MOB_STRIDE }
    : { ...s, stride: 1 }
  );

  const controllerScenes = isMobile
    ? SCENE_CONFIG.map(s => {
        if (s.type === 'multi-seq') {
          return {
            ...s,
            totalScrollHeight: Math.round(s.totalScrollHeight * MOB_SCROLL),
            sequences: s.sequences.map(seq => ({
              ...seq,
              count : MOB_COUNT,
              stride: MOB_STRIDE,
            })),
          };
        }
        return {
          ...s,
          count       : MOB_COUNT,
          stride      : MOB_STRIDE,
          scrollHeight: Math.round((s.scrollHeight || 3000) * MOB_SCROLL),
        };
      })
    : SCENE_CONFIG;

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
    document.getElementById('apt-prev')?.addEventListener('click', () => goTo(cur - perView));
    document.getElementById('apt-next')?.addEventListener('click', () => goTo(cur + perView));
    let tx = 0;
    track.parentElement.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
    track.parentElement.addEventListener('touchend', e => {
      const dx = tx - e.changedTouches[0].clientX;
      if (Math.abs(dx) > 40) goTo(dx > 0 ? cur + perView : cur - perView);
    }, { passive: true });
    window.addEventListener('resize', () => { buildDots(); goTo(cur); });
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
  const waText = "Bonjour ! Je suis intéressé(e) par l'appartement Silchoro à Albufeira. Pouvez-vous m'indiquer les disponibilités et le meilleur tarif ?";
  const waUrl = t => `https://wa.me/${PHONE}` + (t ? `?text=${encodeURIComponent(t)}` : '');
  document.querySelectorAll('.wa-link').forEach(el => { el.href = waUrl(waText); });
  const ml = document.querySelector('.mail-link');
  if (ml) ml.href = `mailto:${EMAIL}`;
  document.querySelectorAll('.price-from').forEach(el => { el.textContent = PRICE_FROM; });

  /* --- CALENDAR --- */
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let calY = today.getFullYear(), calM = today.getMonth(), arrival = null;
  const occ = [];
  for (let i = 0; i < 5; i++) occ.push(key(new Date(calY, calM, 11 + i)));
  for (let i = 0; i < 6; i++) occ.push(key(new Date(calY, calM + 1, 8 + i)));

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
  function fmtDate(d) { return d.toLocaleDateString('fr-FR',{day:'numeric',month:'long'}); }
  function monthName(y,m) { const s=new Date(y,m,1).toLocaleDateString('fr-FR',{month:'long',year:'numeric'}); return s[0].toUpperCase()+s.slice(1); }

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
    if(!arrival){l.textContent="Sélectionnez une date d'arrivée";p.textContent='—';return;}
    const a=parseKey(arrival),dep=new Date(a);dep.setDate(a.getDate()+6);
    const pr=nightlyPrice(a.getMonth());
    l.textContent=fmtDate(a)+' → '+fmtDate(dep)+' · 6 nuits';
    p.textContent=pr?pr+' € / nuit':'Sur demande';
  }
  function updateDateInput(){const i=document.getElementById('f-date');if(i&&arrival)i.value=fmtDate(parseKey(arrival));}
  document.getElementById('cal-prev')?.addEventListener('click',()=>{calM--;if(calM<0){calM=11;calY--;}renderCalendar();});
  document.getElementById('cal-next')?.addEventListener('click',()=>{calM++;if(calM>11){calM=0;calY++;}renderCalendar();});
  renderCalendar();

  /* --- FORM --- */
  document.getElementById('btn-wa-submit')?.addEventListener('click',()=>{
    const v=id=>document.getElementById(id)?.value||'';
    window.open(waUrl(`Bonjour ! Je souhaite réserver l'appartement Silchoro à Albufeira.\n\nNom : ${v('f-prenom')} ${v('f-nom')}\nTéléphone : ${v('f-tel')}\nEmail : ${v('f-email')}\nArrivée : ${v('f-date')||(arrival?fmtDate(parseKey(arrival)):'à définir')}\nVoyageurs : ${v('f-voyageurs')}\nMessage : ${v('f-msg')}`),'_blank');
  });
  document.getElementById('btn-stripe')?.addEventListener('click',()=>{
    window.open(waUrl('Bonjour, je souhaite régler un acompte via Stripe pour ma réservation à Albufeira.'),'_blank');
  });
  document.getElementById('f-date')?.addEventListener('focus',function(){if(arrival)this.value=fmtDate(parseKey(arrival));});
});
