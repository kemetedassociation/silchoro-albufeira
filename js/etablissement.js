/**
 * etablissement.js — Fiche détaillée d'une adresse du guide
 * (?cat=restaurants|nocturne|villes&i=<index dans le tableau correspondant>)
 * Les données viennent de js/guide-data.js, chargé juste avant ce fichier.
 */
const ESTABLISSEMENT_LISTS = {
  restaurants: { data: () => GUIDE_RESTAURANTS, tagFallback: 'Restaurant', anchor: 'restaurants' },
  nocturne: { data: () => GUIDE_NOCTURNE, tagFallback: 'Sortie', anchor: 'nocturne' },
  villes: { data: () => GUIDE_VILLES, tagFallback: 'À visiter', anchor: 'villes' },
};

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(location.search);
  const cat = params.get('cat');
  const i = parseInt(params.get('i'), 10);
  const list = ESTABLISSEMENT_LISTS[cat];
  const item = list && !isNaN(i) ? list.data()[i] : null;

  if (!list || !item || !item.venue) {
    location.href = 'guide.html';
    return;
  }

  document.title = item.name + ' · Guide du séjour · LUZDOSOL';

  const heroImg = document.getElementById('est-hero-img');
  if (heroImg) { heroImg.src = 'assets/guide/' + item.img + '.webp'; heroImg.alt = item.name; }

  const tagEl = document.getElementById('est-tag');
  if (tagEl) tagEl.textContent = item.tag || list.tagFallback;

  const titleEl = document.getElementById('est-title');
  if (titleEl) titleEl.textContent = item.name;

  const whyEl = document.getElementById('est-why');
  if (whyEl) whyEl.textContent = item.why || item.desc;

  const mapsBtn = document.getElementById('est-maps-btn');
  if (mapsBtn) mapsBtn.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(item.mapsQuery || (item.name + ', Albufeira, Portugal'));

  const highlightsEl = document.getElementById('est-highlights');
  if (highlightsEl && item.highlights) {
    highlightsEl.innerHTML = item.highlights.map(h => `
      <div class="reveal reveal-sc lift" style="background:#fff;border-radius:18px;padding:22px;border:1px solid #efe6d6;box-shadow:0 12px 30px rgba(13,36,56,.05);display:flex;gap:12px;align-items:flex-start">
        <span style="width:8px;height:8px;border-radius:50%;background:var(--accent-2);margin-top:8px;flex-shrink:0"></span>
        <p style="font-size:14.5px;color:#3a4650;line-height:1.55">${h}</p>
      </div>`).join('');
  }

  const backLink = document.getElementById('est-back-link');
  if (backLink) backLink.href = 'guide.html#' + list.anchor;
});
