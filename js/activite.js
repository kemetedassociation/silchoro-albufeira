/**
 * activite.js — Page détaillée par catégorie d'activité (?cat=plages|mer|nature|aventure|sports|culture)
 */
const ACTIVITE_DATA = {
  plages: {
    tag: 'Plages', title: 'Les plus belles plages', hero: 'ph09.webp',
    intro: "Albufeira s'étend le long d'un littoral spectaculaire, où les falaises ocre plongent dans des eaux turquoise. À quelques minutes de l'appartement, plusieurs plages parmi les plus belles de l'Algarve n'attendent que vous.",
    highlights: [
      { t: 'Praia da Oura', d: "La plage la plus animée d'Albufeira, bordée de bars et restaurants, à 5 minutes à pied de l'appartement." },
      { t: 'Praia da Falésia', d: "6 km de sable doré au pied de falaises rouges spectaculaires — l'une des plus belles plages du Portugal." },
      { t: 'Praia dos Olhos de Água', d: "Un charmant village de pêcheurs avec une plage familiale aux eaux calmes." },
      { t: 'Praia de São Rafael', d: "Petite crique intimiste entourée d'arches rocheuses, idéale pour la baignade et la plongée." },
    ],
    gallery: ['ph09.webp', 'ph06.webp', 'ph45.webp'],
  },
  mer: {
    tag: 'En mer', title: 'Excursions en bateau & dauphins', hero: 'ph67.webp',
    intro: "Prenez le large ! Depuis la marina d'Albufeira, à 10 minutes de l'appartement, embarquez pour des excursions inoubliables le long de la côte algarvienne.",
    highlights: [
      { t: 'Grottes de Benagil', d: "Excursion en bateau jusqu'aux formations rocheuses les plus photographiées d'Europe." },
      { t: 'Observation des dauphins', d: "Sorties en mer pour observer dauphins et parfois baleines au large de la côte." },
      { t: 'Pêche en mer', d: "Sessions de pêche accompagnées, en petit groupe ou privatisées." },
      { t: 'Coucher de soleil en mer', d: "Croisières au crépuscule, boissons à bord, ambiance inoubliable." },
    ],
    gallery: ['ph67.webp', 'ph10.webp', 'ph50.webp'],
  },
  nature: {
    tag: 'Nature', title: 'Couchers de soleil & promenades', hero: 'ph06.webp',
    intro: "Loin de l'agitation, la nature reprend ses droits sur les sentiers côtiers d'Albufeira. Falaises ocre, criques secrètes et couchers de soleil sur l'Atlantique — de quoi ralentir le temps.",
    highlights: [
      { t: 'Sentier des Sept Vallées Suspendues', d: "Randonnée côtière entre Vale do Lobo et Praia da Falésia, panoramas à couper le souffle." },
      { t: 'Miradouros (belvédères)', d: "Plusieurs points de vue le long de la côte, parfaits au coucher du soleil." },
      { t: 'Balade dans les jardins de la résidence', d: "Piscine, terrasses et jardins tropicaux à quelques pas de l'appartement." },
      { t: 'Faune locale', d: "Oiseaux marins et paysages préservés le long des falaises." },
    ],
    gallery: ['ph06.webp', 'ph15.webp', 'ph55.webp'],
  },
  aventure: {
    tag: 'Aventure', title: 'Grottes de Benagil & falaises', hero: 'ph50.webp',
    intro: "Les grottes de Benagil sont l'un des sites naturels les plus spectaculaires du Portugal — une immense cavité ouverte sur le ciel, accessible uniquement par la mer. À vivre en kayak, en SUP ou en bateau.",
    highlights: [
      { t: 'En kayak ou paddle', d: "L'option la plus authentique — pagayez à votre rythme jusqu'à la grotte, à partir de la plage de Benagil." },
      { t: 'En bateau rapide', d: "Excursions groupées ou privées au départ de la marina d'Albufeira, 20 minutes de trajet." },
      { t: 'Grottes voisines', d: "Algar de Benagil n'est qu'une des nombreuses grottes marines à explorer le long de la côte." },
      { t: 'Conseil', d: "Réservez tôt le matin pour éviter l'affluence et profiter d'une lumière idéale pour les photos." },
    ],
    gallery: ['ph50.webp', 'ph67.webp', 'ph10.webp'],
  },
  sports: {
    tag: 'Sports', title: 'Sports nautiques & sensations', hero: 'ph45.webp',
    intro: "L'Atlantique offre un terrain de jeu idéal pour les amateurs de sensations. À quelques minutes de l'appartement, plusieurs prestataires proposent tout l'équipement nécessaire.",
    highlights: [
      { t: 'Jet-ski', d: "Location ou sorties encadrées le long de la côte, sensations garanties." },
      { t: 'Parachute ascensionnel', d: "Survolez la baie d'Albufeira pour une vue imprenable." },
      { t: 'Surf & bodyboard', d: "Spots adaptés à tous niveaux, cours disponibles pour débutants." },
      { t: 'Paddle (SUP)', d: "Location à l'heure ou à la journée, idéal en famille comme entre amis." },
    ],
    gallery: ['ph45.webp', 'ph09.webp', 'ph55.webp'],
  },
  culture: {
    tag: 'Culture', title: 'Vieille ville & shopping', hero: 'ph15.webp',
    intro: "Le cœur historique d'Albufeira, blanchi à la chaux, mêle ruelles pittoresques, terrasses animées et vie nocturne réputée. Un contraste parfait avec la tranquillité de la résidence LUZDOSOL.",
    highlights: [
      { t: 'Vieille ville', d: "Ruelles pavées, façades blanches et places animées — à 8 minutes de l'appartement." },
      { t: 'Shopping', d: "Boutiques locales, marchés artisanaux et grandes enseignes le long de l'Avenida." },
      { t: 'Où manger', d: "Retrouvez nos adresses de restaurants préférées dans le guide du séjour." },
      { t: 'Sorties nocturnes', d: "La Strip d'Albufeira et ses bars animés — également détaillés dans le guide du séjour." },
    ],
    gallery: ['ph15.webp', 'ph35.webp', 'ph40.webp'],
    links: [
      { href: 'guide.html#restaurants', label: 'Voir les restaurants →' },
      { href: 'guide.html#nocturne', label: 'Voir la vie nocturne →' },
    ],
  },
};

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(location.search);
  const cat = params.get('cat');
  const data = ACTIVITE_DATA[cat] || ACTIVITE_DATA.plages;

  document.title = data.title + ' · Albufeira · LUZDOSOL';

  const heroImg = document.getElementById('act-hero-img');
  if (heroImg) heroImg.src = 'assets/images/' + data.hero;

  const tagEl = document.getElementById('act-tag');
  if (tagEl) tagEl.textContent = data.tag;

  const titleEl = document.getElementById('act-title');
  if (titleEl) titleEl.textContent = data.title;

  const introEl = document.getElementById('act-intro');
  if (introEl) introEl.textContent = data.intro;

  const highlightsEl = document.getElementById('act-highlights');
  if (highlightsEl) {
    highlightsEl.innerHTML = data.highlights.map(h => `
      <div class="reveal reveal-sc lift" style="background:#fff;border-radius:20px;padding:26px;border:1px solid #efe6d6;box-shadow:0 12px 30px rgba(13,36,56,.05)">
        <div style="font-size:16px;font-weight:700">${h.t}</div>
        <p style="margin-top:8px;font-size:14.5px;color:#5a6b78;line-height:1.55">${h.d}</p>
      </div>`).join('');
  }

  const galleryEl = document.getElementById('act-gallery');
  if (galleryEl) {
    galleryEl.innerHTML = data.gallery.map(img => `
      <div class="reveal reveal-sc lift gallery-item" style="border-radius:18px;overflow:hidden;height:260px;box-shadow:0 14px 34px rgba(13,36,56,.08);cursor:pointer">
        <img src="assets/images/${img}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover">
      </div>`).join('');
  }

  const linksEl = document.getElementById('act-links');
  if (linksEl && data.links) {
    linksEl.innerHTML = data.links.map(l =>
      `<a href="${l.href}" class="magnetic" data-magnetic style="background:#fff;color:var(--accent);border:1px solid #cfe4e8;padding:13px 24px;border-radius:40px;font-weight:700;font-size:14px">${l.label}</a>`
    ).join('');
  }
});
