/**
 * activite.js — Page détaillée par catégorie d'activité (?cat=plages|mer|nature|aventure|sports|culture)
 * Les champs traduisibles (tag, title, intro, highlights[].t/.d, links[].label) sont
 * des objets {fr,en,es,pt} lus via L() (définie dans js/guide-data.js, chargé avant ce fichier).
 */
const ACTIVITE_DATA = {
  plages: {
    tag: { fr: 'Plages', en: 'Beaches', es: 'Playas', pt: 'Praias' },
    title: { fr: 'Les plus belles plages', en: 'The finest beaches', es: 'Las playas más bonitas', pt: 'As praias mais bonitas' },
    hero: 'ph09.webp',
    intro: { fr: "Albufeira s'étend le long d'un littoral spectaculaire, où les falaises ocre plongent dans des eaux turquoise. À quelques minutes de l'appartement, plusieurs plages parmi les plus belles de l'Algarve n'attendent que vous.",
      en: "Albufeira stretches along a spectacular coastline, where ochre cliffs plunge into turquoise waters. A few minutes from the apartment, several of the Algarve's finest beaches are waiting for you.",
      es: "Albufeira se extiende a lo largo de una costa espectacular, donde los acantilados ocres caen sobre aguas turquesas. A pocos minutos del apartamento, varias de las playas más bonitas del Algarve te esperan.",
      pt: "Albufeira estende-se ao longo de uma costa espetacular, onde as falésias ocre mergulham em águas turquesa. A poucos minutos do apartamento, várias das praias mais bonitas do Algarve esperam por si." },
    highlights: [
      { t: { fr: 'Praia da Oura', en: 'Praia da Oura', es: 'Praia da Oura', pt: 'Praia da Oura' },
        d: { fr: "La plage la plus animée d'Albufeira, bordée de bars et restaurants, à 5 minutes à pied de l'appartement.",
          en: "Albufeira's liveliest beach, lined with bars and restaurants, a 5-minute walk from the apartment.",
          es: "La playa más animada de Albufeira, bordeada de bares y restaurantes, a 5 minutos a pie del apartamento.",
          pt: "A praia mais animada de Albufeira, ladeada por bares e restaurantes, a 5 minutos a pé do apartamento." } },
      { t: { fr: 'Praia da Falésia', en: 'Praia da Falésia', es: 'Praia da Falésia', pt: 'Praia da Falésia' },
        d: { fr: "6 km de sable doré au pied de falaises rouges spectaculaires — l'une des plus belles plages du Portugal.",
          en: "6 km of golden sand at the foot of spectacular red cliffs — one of Portugal's most beautiful beaches.",
          es: "6 km de arena dorada al pie de espectaculares acantilados rojos: una de las playas más bonitas de Portugal.",
          pt: "6 km de areia dourada aos pés de falésias vermelhas espetaculares — uma das praias mais bonitas de Portugal." } },
      { t: { fr: 'Praia dos Olhos de Água', en: 'Praia dos Olhos de Água', es: 'Praia dos Olhos de Água', pt: 'Praia dos Olhos de Água' },
        d: { fr: "Un charmant village de pêcheurs avec une plage familiale aux eaux calmes.",
          en: "A charming fishing village with a family-friendly beach and calm waters.",
          es: "Un encantador pueblo de pescadores con una playa familiar de aguas tranquilas.",
          pt: "Uma encantadora aldeia piscatória com uma praia familiar de águas calmas." } },
      { t: { fr: 'Praia de São Rafael', en: 'Praia de São Rafael', es: 'Praia de São Rafael', pt: 'Praia de São Rafael' },
        d: { fr: "Petite crique intimiste entourée d'arches rocheuses, idéale pour la baignade et la plongée.",
          en: "A small, intimate cove surrounded by rock arches, ideal for swimming and diving.",
          es: "Pequeña cala íntima rodeada de arcos rocosos, ideal para el baño y el buceo.",
          pt: "Pequena enseada íntima rodeada de arcos rochosos, ideal para nadar e mergulhar." } },
    ],
    gallery: ['ph09.webp', 'ph06.webp', 'ph45.webp'],
  },
  mer: {
    tag: { fr: 'En mer', en: 'At sea', es: 'En el mar', pt: 'No mar' },
    title: { fr: 'Excursions en bateau & dauphins', en: 'Boat trips & dolphins', es: 'Excursiones en barco y delfines', pt: 'Passeios de barco e golfinhos' },
    hero: 'ph67.webp',
    intro: { fr: "Prenez le large ! Depuis la marina d'Albufeira, à 10 minutes de l'appartement, embarquez pour des excursions inoubliables le long de la côte algarvienne.",
      en: "Head out to sea! From Albufeira's marina, 10 minutes from the apartment, set off on unforgettable trips along the Algarve coast.",
      es: "¡Hazte a la mar! Desde el puerto deportivo de Albufeira, a 10 minutos del apartamento, embárcate en excursiones inolvidables por la costa del Algarve.",
      pt: "Faça-se ao mar! A partir da marina de Albufeira, a 10 minutos do apartamento, embarque em passeios inesquecíveis pela costa algarvia." },
    highlights: [
      { t: { fr: 'Grottes de Benagil', en: 'Benagil caves', es: 'Cuevas de Benagil', pt: 'Grutas de Benagil' },
        d: { fr: "Excursion en bateau jusqu'aux formations rocheuses les plus photographiées d'Europe.",
          en: "A boat trip to Europe's most photographed rock formations.",
          es: "Excursión en barco hasta las formaciones rocosas más fotografiadas de Europa.",
          pt: "Passeio de barco até às formações rochosas mais fotografadas da Europa." } },
      { t: { fr: 'Observation des dauphins', en: 'Dolphin watching', es: 'Avistamiento de delfines', pt: 'Observação de golfinhos' },
        d: { fr: "Sorties en mer pour observer dauphins et parfois baleines au large de la côte.",
          en: "Boat trips to spot dolphins, and sometimes whales, off the coast.",
          es: "Salidas al mar para observar delfines y, a veces, ballenas frente a la costa.",
          pt: "Saídas ao mar para observar golfinhos e, por vezes, baleias ao largo da costa." } },
      { t: { fr: 'Pêche en mer', en: 'Sea fishing', es: 'Pesca en el mar', pt: 'Pesca no mar' },
        d: { fr: "Sessions de pêche accompagnées, en petit groupe ou privatisées.",
          en: "Guided fishing sessions, in a small group or privately booked.",
          es: "Sesiones de pesca guiadas, en pequeño grupo o privadas.",
          pt: "Sessões de pesca acompanhadas, em pequeno grupo ou privadas." } },
      { t: { fr: 'Coucher de soleil en mer', en: 'Sunset cruise', es: 'Atardecer en el mar', pt: 'Pôr do sol no mar' },
        d: { fr: "Croisières au crépuscule, boissons à bord, ambiance inoubliable.",
          en: "Twilight cruises, drinks on board, an unforgettable atmosphere.",
          es: "Cruceros al atardecer, bebidas a bordo, ambiente inolvidable.",
          pt: "Cruzeiros ao entardecer, bebidas a bordo, ambiente inesquecível." } },
    ],
    gallery: ['ph67.webp', 'ph10.webp', 'ph50.webp'],
  },
  nature: {
    tag: { fr: 'Nature', en: 'Nature', es: 'Naturaleza', pt: 'Natureza' },
    title: { fr: 'Couchers de soleil & promenades', en: 'Sunsets & walks', es: 'Atardeceres y paseos', pt: 'Pôr do sol e passeios' },
    hero: 'ph06.webp',
    intro: { fr: "Loin de l'agitation, la nature reprend ses droits sur les sentiers côtiers d'Albufeira. Falaises ocre, criques secrètes et couchers de soleil sur l'Atlantique — de quoi ralentir le temps.",
      en: "Away from the hustle and bustle, nature takes over on Albufeira's coastal trails. Ochre cliffs, secret coves and Atlantic sunsets — the perfect way to slow down.",
      es: "Lejos del bullicio, la naturaleza recupera su espacio en los senderos costeros de Albufeira. Acantilados ocres, calas secretas y atardeceres sobre el Atlántico: todo para bajar el ritmo.",
      pt: "Longe da agitação, a natureza reina nos trilhos costeiros de Albufeira. Falésias ocre, enseadas secretas e pores do sol sobre o Atlântico — tudo para abrandar o ritmo." },
    highlights: [
      { t: { fr: 'Sentier des Sept Vallées Suspendues', en: 'Seven Hanging Valleys Trail', es: 'Sendero de los Siete Valles Suspendidos', pt: 'Trilho dos Sete Vales Suspensos' },
        d: { fr: "Randonnée côtière entre Vale do Lobo et Praia da Falésia, panoramas à couper le souffle.",
          en: "A coastal hike between Vale do Lobo and Praia da Falésia, with breathtaking panoramas.",
          es: "Senderismo costero entre Vale do Lobo y Praia da Falésia, panorámicas de vértigo.",
          pt: "Caminhada costeira entre Vale do Lobo e a Praia da Falésia, com panoramas de tirar o fôlego." } },
      { t: { fr: 'Miradouros (belvédères)', en: 'Miradouros (viewpoints)', es: 'Miradouros (miradores)', pt: 'Miradouros' },
        d: { fr: "Plusieurs points de vue le long de la côte, parfaits au coucher du soleil.",
          en: "Several viewpoints along the coast, perfect at sunset.",
          es: "Varios miradores a lo largo de la costa, perfectos al atardecer.",
          pt: "Vários miradouros ao longo da costa, perfeitos ao pôr do sol." } },
      { t: { fr: 'Balade dans les jardins de la résidence', en: 'A stroll through the residence gardens', es: 'Paseo por los jardines de la residencia', pt: 'Passeio pelos jardins da residência' },
        d: { fr: "Piscine, terrasses et jardins tropicaux à quelques pas de l'appartement.",
          en: "Pool, terraces and tropical gardens just steps from the apartment.",
          es: "Piscina, terrazas y jardines tropicales a pocos pasos del apartamento.",
          pt: "Piscina, terraços e jardins tropicais a poucos passos do apartamento." } },
      { t: { fr: 'Faune locale', en: 'Local wildlife', es: 'Fauna local', pt: 'Fauna local' },
        d: { fr: "Oiseaux marins et paysages préservés le long des falaises.",
          en: "Seabirds and unspoilt landscapes along the cliffs.",
          es: "Aves marinas y paisajes preservados a lo largo de los acantilados.",
          pt: "Aves marinhas e paisagens preservadas ao longo das falésias." } },
    ],
    gallery: ['ph06.webp', 'ph15.webp', 'ph55.webp'],
  },
  aventure: {
    tag: { fr: 'Aventure', en: 'Adventure', es: 'Aventura', pt: 'Aventura' },
    title: { fr: 'Grottes de Benagil & falaises', en: 'Benagil caves & cliffs', es: 'Cuevas de Benagil y acantilados', pt: 'Grutas de Benagil e falésias' },
    hero: 'ph50.webp',
    intro: { fr: "Les grottes de Benagil sont l'un des sites naturels les plus spectaculaires du Portugal — une immense cavité ouverte sur le ciel, accessible uniquement par la mer. À vivre en kayak, en SUP ou en bateau.",
      en: "The Benagil caves are one of Portugal's most spectacular natural sites — a huge cavity open to the sky, reachable only by sea. Experience it by kayak, paddleboard or boat.",
      es: "Las cuevas de Benagil son uno de los lugares naturales más espectaculares de Portugal: una enorme cavidad abierta al cielo, accesible solo por mar. Para vivirla en kayak, paddle surf o barco.",
      pt: "As grutas de Benagil são um dos locais naturais mais espetaculares de Portugal — uma enorme cavidade aberta ao céu, acessível apenas pelo mar. Para viver de caiaque, prancha SUP ou barco." },
    highlights: [
      { t: { fr: 'En kayak ou paddle', en: 'By kayak or paddleboard', es: 'En kayak o paddle surf', pt: 'De caiaque ou SUP' },
        d: { fr: "L'option la plus authentique — pagayez à votre rythme jusqu'à la grotte, à partir de la plage de Benagil.",
          en: "The most authentic option — paddle at your own pace to the cave, starting from Benagil beach.",
          es: "La opción más auténtica: rema a tu ritmo hasta la cueva, partiendo de la playa de Benagil.",
          pt: "A opção mais autêntica — reme ao seu ritmo até à gruta, a partir da praia de Benagil." } },
      { t: { fr: 'En bateau rapide', en: 'By speedboat', es: 'En barco rápido', pt: 'De barco rápido' },
        d: { fr: "Excursions groupées ou privées au départ de la marina d'Albufeira, 20 minutes de trajet.",
          en: "Group or private trips departing from Albufeira marina, a 20-minute ride.",
          es: "Excursiones en grupo o privadas desde el puerto deportivo de Albufeira, 20 minutos de trayecto.",
          pt: "Passeios em grupo ou privados a partir da marina de Albufeira, 20 minutos de viagem." } },
      { t: { fr: 'Grottes voisines', en: 'Nearby caves', es: 'Cuevas cercanas', pt: 'Grutas vizinhas' },
        d: { fr: "Algar de Benagil n'est qu'une des nombreuses grottes marines à explorer le long de la côte.",
          en: "Algar de Benagil is just one of many sea caves to explore along the coast.",
          es: "Algar de Benagil es solo una de las muchas cuevas marinas que se pueden explorar a lo largo de la costa.",
          pt: "O Algar de Benagil é apenas uma das muitas grutas marinhas a explorar ao longo da costa." } },
      { t: { fr: 'Conseil', en: 'Tip', es: 'Consejo', pt: 'Sugestão' },
        d: { fr: "Réservez tôt le matin pour éviter l'affluence et profiter d'une lumière idéale pour les photos.",
          en: "Book an early morning slot to avoid the crowds and enjoy ideal light for photos.",
          es: "Reserva a primera hora de la mañana para evitar aglomeraciones y disfrutar de una luz ideal para las fotos.",
          pt: "Reserve de manhã cedo para evitar as multidões e aproveitar uma luz ideal para fotografias." } },
    ],
    gallery: ['ph50.webp', 'ph67.webp', 'ph10.webp'],
  },
  sports: {
    tag: { fr: 'Sports', en: 'Sports', es: 'Deportes', pt: 'Desportos' },
    title: { fr: 'Sports nautiques & sensations', en: 'Watersports & thrills', es: 'Deportes acuáticos y emociones', pt: 'Desportos aquáticos e adrenalina' },
    hero: 'ph45.webp',
    intro: { fr: "L'Atlantique offre un terrain de jeu idéal pour les amateurs de sensations. À quelques minutes de l'appartement, plusieurs prestataires proposent tout l'équipement nécessaire.",
      en: "The Atlantic offers the perfect playground for thrill-seekers. A few minutes from the apartment, several operators provide all the gear you need.",
      es: "El Atlántico ofrece un terreno de juego ideal para los amantes de las emociones. A pocos minutos del apartamento, varios proveedores ofrecen todo el equipo necesario.",
      pt: "O Atlântico oferece um terreno de jogo ideal para os amantes de adrenalina. A poucos minutos do apartamento, vários operadores disponibilizam todo o equipamento necessário." },
    highlights: [
      { t: { fr: 'Jet-ski', en: 'Jet ski', es: 'Moto de agua', pt: 'Mota de água' },
        d: { fr: "Location ou sorties encadrées le long de la côte, sensations garanties.",
          en: "Rental or guided rides along the coast, thrills guaranteed.",
          es: "Alquiler o salidas guiadas a lo largo de la costa, emociones garantizadas.",
          pt: "Aluguer ou passeios acompanhados ao longo da costa, adrenalina garantida." } },
      { t: { fr: 'Parachute ascensionnel', en: 'Parasailing', es: 'Parasailing', pt: 'Paraquedismo ascensional' },
        d: { fr: "Survolez la baie d'Albufeira pour une vue imprenable.",
          en: "Soar over Albufeira bay for a stunning view.",
          es: "Sobrevuela la bahía de Albufeira para disfrutar de unas vistas impresionantes.",
          pt: "Sobrevoe a baía de Albufeira para uma vista deslumbrante." } },
      { t: { fr: 'Surf & bodyboard', en: 'Surf & bodyboard', es: 'Surf y bodyboard', pt: 'Surf e bodyboard' },
        d: { fr: "Spots adaptés à tous niveaux, cours disponibles pour débutants.",
          en: "Spots suited to all levels, lessons available for beginners.",
          es: "Spots aptos para todos los niveles, clases disponibles para principiantes.",
          pt: "Spots adequados a todos os níveis, aulas disponíveis para principiantes." } },
      { t: { fr: 'Paddle (SUP)', en: 'Paddleboarding (SUP)', es: 'Paddle surf (SUP)', pt: 'Stand-up paddle (SUP)' },
        d: { fr: "Location à l'heure ou à la journée, idéal en famille comme entre amis.",
          en: "Hourly or daily rental, great for families and friends alike.",
          es: "Alquiler por horas o por día, ideal en familia o entre amigos.",
          pt: "Aluguer por hora ou por dia, ideal em família ou entre amigos." } },
    ],
    gallery: ['ph45.webp', 'ph09.webp', 'ph55.webp'],
  },
  culture: {
    tag: { fr: 'Culture', en: 'Culture', es: 'Cultura', pt: 'Cultura' },
    title: { fr: 'Vieille ville & shopping', en: 'Old town & shopping', es: 'Casco antiguo y compras', pt: 'Zona histórica e compras' },
    hero: 'ph15.webp',
    intro: { fr: "Le cœur historique d'Albufeira, blanchi à la chaux, mêle ruelles pittoresques, terrasses animées et vie nocturne réputée. Un contraste parfait avec la tranquillité de la résidence LUZDOSOL.",
      en: "Albufeira's whitewashed historic heart blends picturesque lanes, lively terraces and a renowned nightlife. A perfect contrast to the calm of the LUZDOSOL residence.",
      es: "El corazón histórico de Albufeira, encalado en blanco, combina calles pintorescas, terrazas animadas y una vida nocturna reconocida. Un contraste perfecto con la tranquilidad de la residencia LUZDOSOL.",
      pt: "O coração histórico de Albufeira, caiado de branco, combina ruas pitorescas, esplanadas animadas e uma vida noturna reconhecida. Um contraste perfeito com a tranquilidade da residência LUZDOSOL." },
    highlights: [
      { t: { fr: 'Vieille ville', en: 'Old town', es: 'Casco antiguo', pt: 'Zona histórica' },
        d: { fr: "Ruelles pavées, façades blanches et places animées — à 8 minutes de l'appartement.",
          en: "Cobbled lanes, white façades and lively squares — 8 minutes from the apartment.",
          es: "Callejuelas empedradas, fachadas blancas y plazas animadas, a 8 minutos del apartamento.",
          pt: "Ruas de calçada, fachadas brancas e praças animadas — a 8 minutos do apartamento." } },
      { t: { fr: 'Shopping', en: 'Shopping', es: 'Compras', pt: 'Compras' },
        d: { fr: "Boutiques locales, marchés artisanaux et grandes enseignes le long de l'Avenida.",
          en: "Local boutiques, craft markets and big brands along the Avenida.",
          es: "Tiendas locales, mercados artesanales y grandes marcas a lo largo de la Avenida.",
          pt: "Lojas locais, mercados de artesanato e grandes marcas ao longo da Avenida." } },
      { t: { fr: 'Où manger', en: 'Where to eat', es: 'Dónde comer', pt: 'Onde comer' },
        d: { fr: "Retrouvez nos adresses de restaurants préférées dans le guide du séjour.",
          en: "Find our favourite restaurant picks in the stay guide.",
          es: "Descubre nuestros restaurantes favoritos en la guía de la estancia.",
          pt: "Descubra os nossos restaurantes preferidos no guia da estadia." } },
      { t: { fr: 'Sorties nocturnes', en: 'Nightlife', es: 'Vida nocturna', pt: 'Vida noturna' },
        d: { fr: "La Strip d'Albufeira et ses bars animés — également détaillés dans le guide du séjour.",
          en: "Albufeira's famous Strip and its lively bars — also covered in the stay guide.",
          es: "La Strip de Albufeira y sus bares animados, también detallados en la guía de la estancia.",
          pt: "A Strip de Albufeira e os seus bares animados — também detalhados no guia da estadia." } },
    ],
    gallery: ['ph15.webp', 'ph35.webp', 'ph40.webp'],
    links: [
      { href: 'guide.html#restaurants', label: { fr: 'Voir les restaurants →', en: 'See restaurants →', es: 'Ver restaurantes →', pt: 'Ver restaurantes →' } },
      { href: 'guide.html#nocturne', label: { fr: 'Voir la vie nocturne →', en: 'See nightlife →', es: 'Ver vida nocturna →', pt: 'Ver vida noturna →' } },
    ],
  },
};

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(location.search);
  const cat = params.get('cat');
  const data = ACTIVITE_DATA[cat] || ACTIVITE_DATA.plages;

  function render() {
    document.title = L(data.title) + ' · Albufeira · LUZDOSOL';

    const heroImg = document.getElementById('act-hero-img');
    if (heroImg) heroImg.src = 'assets/images/' + data.hero;

    const tagEl = document.getElementById('act-tag');
    if (tagEl) tagEl.textContent = L(data.tag);

    const titleEl = document.getElementById('act-title');
    if (titleEl) titleEl.textContent = L(data.title);

    const introEl = document.getElementById('act-intro');
    if (introEl) introEl.textContent = L(data.intro);

    const highlightsEl = document.getElementById('act-highlights');
    if (highlightsEl) {
      highlightsEl.innerHTML = data.highlights.map(h => `
        <div class="reveal reveal-sc lift" style="background:#fff;border-radius:20px;padding:26px;border:1px solid #efe6d6;box-shadow:0 12px 30px rgba(13,36,56,.05)">
          <div style="font-size:16px;font-weight:700">${L(h.t)}</div>
          <p style="margin-top:8px;font-size:14.5px;color:#5a6b78;line-height:1.55">${L(h.d)}</p>
        </div>`).join('');
      highlightsEl.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
    }

    const galleryEl = document.getElementById('act-gallery');
    if (galleryEl) {
      galleryEl.innerHTML = data.gallery.map(img => `
        <div class="reveal reveal-sc lift gallery-item" style="border-radius:18px;overflow:hidden;height:260px;box-shadow:0 14px 34px rgba(13,36,56,.08);cursor:pointer">
          <img src="assets/images/${img}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover">
        </div>`).join('');
      galleryEl.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
    }

    const linksEl = document.getElementById('act-links');
    if (linksEl && data.links) {
      linksEl.innerHTML = data.links.map(l =>
        `<a href="${l.href}" class="magnetic" data-magnetic style="background:#fff;color:var(--accent);border:1px solid #cfe4e8;padding:13px 24px;border-radius:40px;font-weight:700;font-size:14px">${L(l.label)}</a>`
      ).join('');
    }
  }

  render();
  window.addEventListener('luzdosol-lang-change', render);
});
