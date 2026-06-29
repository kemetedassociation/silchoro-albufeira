document.addEventListener('DOMContentLoaded', () => {
  const PHONE = '33777777777';
  const EMAIL = 'contact@silchoro-albufeira.com';
  const PRICE_FROM = 43;

  const isMobile = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent) || window.innerWidth <= 900;

  // ===== MOBILE MENU =====
  const burger = document.getElementById('nav-burger');
  const mobileMenu = document.getElementById('mobile-menu');
  if (burger && mobileMenu) {
    burger.addEventListener('click', () => {
      const opening = !mobileMenu.classList.contains('open');
      burger.classList.toggle('open');
      mobileMenu.classList.toggle('open');
      document.body.style.overflow = opening ? 'hidden' : '';
    });
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        burger.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // ===== SCROLLYTELLING ENGINE =====
  const scenes = document.querySelectorAll('.st-scene');
  const progressBar = document.querySelector('.st-progress');

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

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

      // === VIDEO CONTROL (desktop only — mobile autoplay handled separately) ===
      if (!isMobile) {
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
                  v.currentTime = lerp(videoTargets.get(v), target, 0.2);
                  videoTargets.set(v, v.currentTime);
                }
              } else {
                v.classList.remove('vid-active');
                if (!v.paused) v.pause();
                videoTargets.delete(v);
              }
            });
          } else if (!inView) {
            scene.querySelectorAll('.st-multi-video video').forEach(v => {
              v.classList.remove('vid-active');
              if (!v.paused) v.pause();
              videoTargets.delete(v);
            });
          }
        } else {
          const video = scene.querySelector(':scope > .st-video-wrap > video');
          if (video && inView) {
            if (video.paused && video.readyState >= 2) video.play().catch(() => {});
            if (video.duration && isFinite(video.duration)) {
              const target = progress * video.duration;
              if (!videoTargets.has(video)) videoTargets.set(video, video.currentTime);
              video.currentTime = lerp(videoTargets.get(video), target, 0.25);
              videoTargets.set(video, video.currentTime);
            }
          } else if (video && !inView) {
            if (!video.paused) video.pause();
            videoTargets.delete(video);
          }
        }
      }

      // === SCROLL-ZOOM IMAGE (works on both) ===
      const zoomImg = scene.querySelector('[data-scroll-zoom]');
      if (zoomImg && inView) {
        const scale = 1 + progress * 0.3;
        zoomImg.style.transform = `scale(${scale}) translateY(${-progress * 10}%)`;
      }

      // === TEXT PANELS — always scroll-driven (mobile + desktop) ===
      const panels = scene.querySelectorAll('.st-text');
      const count = panels.length;
      if (count === 0) return;

      panels.forEach((panel, i) => {
        const segSize = 1 / count;
        const center = (i + 0.5) * segSize;
        const halfWindow = segSize * 0.38;
        const fadeZone = segSize * 0.16;
        const dist = Math.abs(progress - center);
        let opacity, yOff;

        if (dist <= halfWindow - fadeZone) {
          opacity = 1; yOff = 0;
        } else if (dist <= halfWindow + fadeZone) {
          const t = clamp01((dist - (halfWindow - fadeZone)) / (fadeZone * 2));
          opacity = 1 - easeOutCubic(t);
          yOff = progress < center ? (1 - opacity) * 40 : -(1 - opacity) * 30;
        } else {
          opacity = 0;
          yOff = progress < center ? 50 : -30;
        }

        panel.style.opacity = opacity;
        panel.style.transform = `translateY(${yOff}px)`;
        panel.style.filter = opacity < 0.2 ? `blur(${(1 - opacity) * 6}px)` : 'none';

        const line = panel.querySelector('.st-line');
        if (line) line.style.width = opacity > 0.5 ? '80px' : '0px';
      });
    });
  }

  // ===== MOBILE VIDEO AUTOPLAY VIA INTERSECTION =====
  function setupMobileVideos() {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) e.target.play().catch(() => {});
        else e.target.pause();
      });
    }, { threshold: 0.15 });

    document.querySelectorAll('video').forEach(v => {
      v.muted = true;
      v.playsInline = true;
      v.loop = true;
      v.setAttribute('playsinline', '');
      v.setAttribute('webkit-playsinline', '');
      v.preload = 'metadata';
      obs.observe(v);
    });
  }

  // ===== CALENDAR =====
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let calY = today.getFullYear(), calM = today.getMonth(), arrival = null;

  const occupied = [];
  for (let i = 0; i < 5; i++) occupied.push(key(new Date(today.getFullYear(), today.getMonth(), 11 + i)));
  for (let i = 0; i < 6; i++) occupied.push(key(new Date(today.getFullYear(), today.getMonth() + 1, 8 + i)));

  function key(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function parseKey(k) { const [y, m, da] = k.split('-').map(Number); return new Date(y, m - 1, da); }
  function seasonStatus(d) {
    if (occupied.includes(key(d))) return 'occ';
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

  function renderCalendar() {
    const container = document.getElementById('cal-container');
    if (!container) return;
    const months = [{ y: calY, m: calM }];
    let nm = calM + 1, ny = calY;
    if (nm > 11) { nm = 0; ny++; }
    months.push({ y: ny, m: nm });
    let html = '';
    months.forEach(({ y, m }) => {
      const startDay = (new Date(y, m, 1).getDay() + 6) % 7;
      const total = new Date(y, m + 1, 0).getDate();
      const depKey = arrival ? (() => { const a = parseKey(arrival); a.setDate(a.getDate() + 6); return key(a); })() : null;
      html += `<div><div style="text-align:center;font-weight:700;font-size:19px;margin-bottom:16px">${monthName(y, m)}</div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-bottom:8px">
          ${['L','M','M','J','V','S','D'].map(d=>`<div style="text-align:center;font-size:11px;font-weight:700;color:#9aa7ad">${d}</div>`).join('')}
        </div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px">`;
      for (let i = 0; i < startDay; i++) html += '<div class="cal-day blank"></div>';
      for (let day = 1; day <= total; day++) {
        const date = new Date(y, m, day), k = key(date);
        let st = seasonStatus(date);
        if (date.getTime() < today.getTime()) st = 'occ';
        let cls = 'cal-day ' + st;
        if (arrival) { const a = parseKey(arrival), dep = new Date(a); dep.setDate(a.getDate()+6); if (date.getTime()>a.getTime()&&date.getTime()<dep.getTime()) cls+=' range'; }
        if (arrival === k) cls += ' sel';
        if (depKey === k) cls += ' dep';
        html += `<div class="${cls}" ${(st!=='occ'&&st!=='closed')?`data-pick="${k}"`:''}>${day}</div>`;
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
    const l = document.getElementById('stay-label'), p = document.getElementById('stay-price');
    if (!l||!p) return;
    if (!arrival) { l.textContent="Sélectionnez une date d'arrivée"; p.textContent='—'; return; }
    const a = parseKey(arrival), dep = new Date(a); dep.setDate(a.getDate()+6);
    const pr = nightlyPrice(a.getMonth());
    l.textContent = fmtDate(a)+' → '+fmtDate(dep)+' · 6 nuits';
    p.textContent = pr ? pr+' € / nuit' : 'Sur demande';
  }
  function updateDateInput() { const i=document.getElementById('f-date'); if(i&&arrival) i.value=fmtDate(parseKey(arrival)); }
  document.getElementById('cal-prev')?.addEventListener('click',()=>{calM--;if(calM<0){calM=11;calY--;}renderCalendar();});
  document.getElementById('cal-next')?.addEventListener('click',()=>{calM++;if(calM>11){calM=0;calY++;}renderCalendar();});

  // ===== PRICE + LINKS =====
  document.querySelectorAll('.price-from').forEach(el=>{el.textContent=PRICE_FROM;});
  const waText="Bonjour ! Je suis intéressé(e) par l'appartement Silchoro à Albufeira. Pouvez-vous m'indiquer les disponibilités et le meilleur tarif ?";
  document.querySelectorAll('.wa-link').forEach(el=>{el.href=waUrl(waText);});
  const ml=document.querySelector('.mail-link'); if(ml) ml.href='mailto:'+EMAIL;

  // ===== FORM =====
  document.getElementById('btn-wa-submit')?.addEventListener('click',()=>{
    const v=id=>document.getElementById(id)?.value||'';
    window.open(waUrl(`Bonjour ! Je souhaite réserver l'appartement Silchoro à Albufeira.\n\nNom : ${v('f-prenom')} ${v('f-nom')}\nTéléphone : ${v('f-tel')}\nEmail : ${v('f-email')}\nArrivée : ${v('f-date')||(arrival?fmtDate(parseKey(arrival)):'à définir')}\nVoyageurs : ${v('f-voyageurs')}\nMessage : ${v('f-msg')}`),'_blank');
  });
  document.getElementById('btn-stripe')?.addEventListener('click',()=>{
    window.open(waUrl('Bonjour, je souhaite régler un acompte via Stripe pour ma réservation à Albufeira.'),'_blank');
  });
  document.getElementById('f-date')?.addEventListener('focus',function(){if(arrival)this.value=fmtDate(parseKey(arrival));});

  // ===== REVEAL =====
  const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:0.08,rootMargin:'0px 0px -5% 0px'});
  function scanReveals(){document.querySelectorAll('.reveal,.reveal-sc,.reveal-bl,.reveal-l,.reveal-r').forEach(el=>{if(!el.dataset.io){el.dataset.io='1';io.observe(el);}});}
  scanReveals();setTimeout(scanReveals,400);setTimeout(scanReveals,1200);

  // ===== COUNT-UP =====
  const cio=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){countUp(e.target);cio.unobserve(e.target);}});},{threshold:0.4});
  document.querySelectorAll('[data-count]').forEach(el=>cio.observe(el));
  function countUp(el){const tgt=parseFloat(el.dataset.count)||0,sfx=el.dataset.suffix||'',dur=1500,t0=performance.now();function step(t){const p=Math.min(1,(t-t0)/dur);el.textContent=Math.round(tgt*(1-Math.pow(1-p,3)))+sfx;if(p<1)requestAnimationFrame(step);}requestAnimationFrame(step);}

  // ===== MASTER FRAME LOOP =====
  const nav=document.querySelector('.site-nav');
  const stickyBar=document.querySelector('.sticky-bar');
  function onFrame(){
    const y=window.scrollY;
    if(nav){if(y>40)nav.classList.add('scrolled');else nav.classList.remove('scrolled');}
    if(stickyBar){
      const show=y>window.innerHeight*1.5&&(y+window.innerHeight)<document.body.scrollHeight-360;
      stickyBar.style.transform=show?'translateY(0)':'translateY(140%)';
    }
    updateScrollytelling();
    requestAnimationFrame(onFrame);
  }
  requestAnimationFrame(onFrame);

  // ===== MAGNETIC + FLOAT (desktop) =====
  if(!isMobile){
    document.querySelectorAll('[data-magnetic]').forEach(el=>{
      el.addEventListener('mousemove',ev=>{const r=el.getBoundingClientRect();el.style.transform='translate('+((ev.clientX-r.left-r.width/2)*0.3)+'px,'+((ev.clientY-r.top-r.height/2)*0.4)+'px) scale(1.04)';});
      el.addEventListener('mouseleave',()=>{el.style.transform='translate(0,0) scale(1)';});
    });
    document.querySelectorAll('[data-float]').forEach(el=>{el.style.animation='floaty 4s ease-in-out infinite';});
    document.querySelectorAll('[data-pulse]').forEach(el=>{el.style.animation='pulseRing 2.2s ease-out infinite';});
  }

  // ===== CUSTOM CURSOR (desktop) =====
  if(!isMobile&&window.matchMedia('(min-width:901px)').matches){
    const dot=document.querySelector('.cursor-dot'),ring=document.querySelector('.cursor-ring');
    if(dot&&ring){
      let rx=0,ry=0,dx=0,dy=0;
      window.addEventListener('mousemove',e=>{dx=e.clientX;dy=e.clientY;dot.style.left=dx+'px';dot.style.top=dy+'px';});
      (function loop(){rx+=(dx-rx)*0.16;ry+=(dy-ry)*0.16;ring.style.left=rx+'px';ring.style.top=ry+'px';requestAnimationFrame(loop);})();
      document.querySelectorAll('a,button,.lift,[data-magnetic],.cal-day').forEach(el=>{
        el.addEventListener('mouseenter',()=>{ring.style.width='62px';ring.style.height='62px';ring.style.borderColor='rgba(25,182,201,.6)';dot.style.width='5px';dot.style.height='5px';});
        el.addEventListener('mouseleave',()=>{ring.style.width='40px';ring.style.height='40px';ring.style.borderColor='rgba(10,92,134,.35)';dot.style.width='9px';dot.style.height='9px';});
      });
    }
  }

  // ===== LIGHTBOX =====
  const lb=document.querySelector('.lb'),lbImg=document.getElementById('lb-img');
  document.querySelectorAll('.gallery-item').forEach(el=>{el.addEventListener('click',()=>{const img=el.querySelector('img');if(img&&lb&&lbImg){lbImg.src=img.src;lb.classList.add('on');}});});
  function closeLB(){if(lb)lb.classList.remove('on');}
  document.querySelector('.lb-x')?.addEventListener('click',closeLB);
  lb?.addEventListener('click',e=>{if(e.target===lb)closeLB();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeLB();});

  // ===== DESKTOP INLINE VIDEO AUTOPLAY =====
  if(!isMobile){
    const vo=new IntersectionObserver(es=>{es.forEach(e=>{const v=e.target.querySelector('video[data-autoplay]');if(!v)return;if(e.isIntersecting)v.play().catch(()=>{});else v.pause();});},{threshold:0.3});
    document.querySelectorAll('.gal-vid,.act-card').forEach(el=>vo.observe(el));
  }

  // ===== INIT =====
  renderCalendar();
  if(isMobile){
    setupMobileVideos();
  } else {
    scenes.forEach(scene=>{const v=scene.querySelector('video');if(v){v.preload='auto';v.muted=true;v.playsInline=true;}});
  }
});
