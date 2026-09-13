/**
 * etablissement.js — Fiche détaillée d'une adresse du guide
 * (?cat=restaurants|nocturne|villes|services|supermarches&i=<index>)
 * Les données viennent de js/guide-data.js, chargé juste avant ce fichier.
 */
const ESTABLISSEMENT_LISTS = {
  restaurants: { data: () => GUIDE_RESTAURANTS, tagFallbackKey: 'est_fallback_restaurant', anchor: 'restaurants' },
  nocturne: { data: () => GUIDE_NOCTURNE, tagFallbackKey: 'est_fallback_night', anchor: 'nocturne' },
  villes: { data: () => GUIDE_VILLES, tagFallbackKey: 'est_fallback_city', anchor: 'villes' },
  services: { data: () => GUIDE_SERVICES, tagFallbackKey: 'est_fallback_service', anchor: 'decouvrir' },
  supermarches: { data: () => GUIDE_SUPER_DETAIL, tagFallbackKey: 'est_fallback_service', anchor: 'decouvrir' },
};

document.addEventListener('DOMContentLoaded', () => {
  const t = (key, fallback) => (window.luzdosolT ? window.luzdosolT(key) : fallback);
  const params = new URLSearchParams(location.search);
  const cat = params.get('cat');
  const i = parseInt(params.get('i'), 10);
  const list = ESTABLISSEMENT_LISTS[cat];
  const item = list && !isNaN(i) ? list.data()[i] : null;

  if (!list || !item || !item.venue) {
    location.href = 'guide.html';
    return;
  }

  // --- Carrousel hero (plusieurs photos, ex. Supermarchés) ---------------
  let heroCarouselTimer = null;
  function startHeroCarousel(images) {
    const heroImg = document.getElementById('est-hero-img');
    const dotsEl = document.getElementById('est-hero-dots');
    if (!heroImg) return;
    let idx = 0;
    const show = n => {
      idx = (n + images.length) % images.length;
      heroImg.src = 'assets/guide/' + images[idx] + '.webp';
      if (dotsEl) Array.from(dotsEl.children).forEach((d, di) => d.classList.toggle('active', di === idx));
    };
    if (dotsEl) {
      dotsEl.innerHTML = images.map((_, di) => `<span class="est-hero-dot" data-i="${di}"></span>`).join('');
      dotsEl.hidden = false;
      Array.from(dotsEl.children).forEach(d => d.addEventListener('click', () => { show(+d.dataset.i); restart(); }));
    }
    function restart() {
      if (heroCarouselTimer) clearInterval(heroCarouselTimer);
      heroCarouselTimer = setInterval(() => show(idx + 1), 3200);
    }
    show(0);
    restart();
  }

  function render() {
    if (heroCarouselTimer) { clearInterval(heroCarouselTimer); heroCarouselTimer = null; }
    const name = L(item.name);
    document.title = name + ' · ' + t('nav_guide', 'Guide du séjour') + ' · LUZDOSOL';

    const heroImg = document.getElementById('est-hero-img');
    if (heroImg) {
      heroImg.alt = name;
      heroImg.style.objectPosition = item.heroPos || 'center 30%';
      if (item.images && item.images.length > 1) {
        startHeroCarousel(item.images);
      } else {
        const dotsEl = document.getElementById('est-hero-dots');
        if (dotsEl) dotsEl.hidden = true;
        heroImg.src = 'assets/guide/' + item.img + '.webp';
      }
    }

    const tagEl = document.getElementById('est-tag');
    if (tagEl) tagEl.textContent = L(item.tag) || t(list.tagFallbackKey, 'Adresse');

    const titleEl = document.getElementById('est-title');
    if (titleEl) titleEl.textContent = name;

    const whyEl = document.getElementById('est-why');
    if (whyEl) whyEl.textContent = L(item.why) || L(item.desc);

    const mapsQuery = item.mapsQuery || (name + ', Albufeira, Portugal');
    const mapsBtn = document.getElementById('est-maps-btn');
    if (mapsBtn) mapsBtn.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(mapsQuery);

    // Carte intégrée (pas besoin de clé API pour ce format d'URL "embed").
    const mapFrame = document.getElementById('est-map-frame');
    if (mapFrame) mapFrame.src = 'https://www.google.com/maps?q=' + encodeURIComponent(mapsQuery) + '&output=embed';

    const highlightsEl = document.getElementById('est-highlights');
    if (highlightsEl && item.highlights) {
      highlightsEl.innerHTML = L(item.highlights).map(h => `
        <div class="reveal reveal-sc lift" style="background:#fff;border-radius:18px;padding:22px;border:1px solid #efe6d6;box-shadow:0 12px 30px rgba(13,36,56,.05);display:flex;gap:12px;align-items:flex-start">
          <span style="width:8px;height:8px;border-radius:50%;background:var(--accent-2);margin-top:8px;flex-shrink:0"></span>
          <p style="font-size:14.5px;color:#3a4650;line-height:1.55">${h}</p>
        </div>`).join('');
      // Le .reveal est déjà entré à l'écran quand on retraduit : révèle sans attendre l'IntersectionObserver.
      highlightsEl.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
    }

    const backLink = document.getElementById('est-back-link');
    if (backLink) backLink.href = 'guide.html#' + list.anchor;

    // Crédit photo (licence Creative Commons) quand la photo hero vient d'une
    // source externe (Wikimedia Commons) plutôt que de la banque d'images du site.
    const heroCreditEl = document.getElementById('est-hero-credit');
    if (heroCreditEl) {
      const credit = typeof GUIDE_PHOTO_CREDITS !== 'undefined' && GUIDE_PHOTO_CREDITS[item.img];
      heroCreditEl.textContent = credit || '';
      heroCreditEl.hidden = !credit;
    }

    // Galerie des spécialités portugaises (photos déjà showcasées dans le
    // carrousel restaurants) — affichée uniquement sur les fiches restaurant,
    // pour illustrer concrètement les plats évoqués dans le texte.
    if (cat === 'restaurants') {
      const dishes = GUIDE_RESTAURANTS.filter(r => !r.venue);
      const dishesEl = document.getElementById('est-dishes');
      const dishesSection = document.getElementById('est-dishes-section');
      if (dishesEl && dishes.length) {
        dishesEl.innerHTML = dishes.map(d => `
          <div class="reveal reveal-sc lift" style="border-radius:18px;overflow:hidden;box-shadow:0 14px 34px rgba(13,36,56,.1);background:#fff">
            <div style="aspect-ratio:4/3;overflow:hidden"><img src="assets/guide/${d.img}.webp" alt="${d.name}" loading="lazy" style="width:100%;height:100%;object-fit:cover"></div>
            <div style="padding:14px 16px">
              <div style="font-weight:700;font-size:14.5px">${d.name}</div>
              <div style="font-size:13px;color:#5a6b78;margin-top:3px">${L(d.desc)}</div>
            </div>
          </div>`).join('');
        dishesEl.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
        if (dishesSection) dishesSection.hidden = false;

        const creditsEl = document.getElementById('est-dishes-credits');
        if (creditsEl && typeof GUIDE_DISH_CREDITS !== 'undefined') {
          creditsEl.textContent = t('est_photo_credits', 'Crédits photos : ') + GUIDE_DISH_CREDITS.map(c => c.credit).join(' · ');
        }
      }
    }
  }

  render();
  window.addEventListener('luzdosol-lang-change', render);

  // --- Zoom (lightbox) sur la photo hero ----------------------------------
  const zoomBtn = document.getElementById('est-hero-zoom');
  const lb = document.querySelector('.lb');
  const lbImg = document.getElementById('lb-img');
  zoomBtn?.addEventListener('click', () => {
    const heroImg = document.getElementById('est-hero-img');
    if (heroImg && lb && lbImg) { lbImg.src = heroImg.src; lb.classList.add('on'); }
  });
  document.querySelector('.lb-x')?.addEventListener('click', () => lb?.classList.remove('on'));
  lb?.addEventListener('click', e => { if (e.target === lb) lb.classList.remove('on'); });
});
