/**
 * venir.js — page "Comment venir" : prépare le trajet complet du visiteur
 * (domicile → aéroport → Faro → LUZDOSOL) sous forme de liens pré-remplis
 * vers Google Maps, les comparateurs de vols et les compagnies aériennes.
 * Les dates sont reprises de la sélection faite sur le calendrier (tarifs.html).
 */
(function () {
  const root = document.getElementById('venir-planner');
  if (!root) return;

  const t = (k, fb) => (window.luzdosolT ? window.luzdosolT(k) : null) || fb || k;
  const lang = () => window.LUZDOSOL_LANG || 'fr';
  const DEST = 'Silchoro, Albufeira, Portugal';
  const FARO = 'Aeroporto de Faro, Portugal';

  // Aéroports de départ fréquents (code IATA, nom pour l'itinéraire, coordonnées
  // pour proposer le plus proche à partir de la position du visiteur).
  const AIRPORTS = [
    ['CDG', 'Paris Charles de Gaulle', 49.009, 2.548], ['ORY', 'Paris Orly', 48.723, 2.379],
    ['BVA', 'Paris Beauvais', 49.454, 2.113], ['LYS', 'Lyon Saint-Exupéry', 45.726, 5.091],
    ['MRS', 'Marseille Provence', 43.439, 5.221], ['NCE', "Nice Côte d'Azur", 43.658, 7.216],
    ['BOD', 'Bordeaux Mérignac', 44.828, -0.715], ['TLS', 'Toulouse Blagnac', 43.629, 1.364],
    ['NTE', 'Nantes Atlantique', 47.153, -1.611], ['LIL', 'Lille Lesquin', 50.562, 3.089],
    ['SXB', 'Strasbourg Entzheim', 48.538, 7.628], ['MPL', 'Montpellier Méditerranée', 43.576, 3.963],
    ['BIQ', 'Biarritz Pays Basque', 43.468, -1.523], ['BSL', 'Bâle-Mulhouse EuroAirport', 47.590, 7.529],
    ['GVA', 'Genève', 46.238, 6.109], ['ZRH', 'Zurich', 47.458, 8.548],
    ['BRU', 'Bruxelles Zaventem', 50.901, 4.484], ['CRL', 'Bruxelles Charleroi', 50.459, 4.453],
    ['LUX', 'Luxembourg Findel', 49.626, 6.211], ['AMS', 'Amsterdam Schiphol', 52.310, 4.768],
    ['FRA', 'Francfort', 50.037, 8.562], ['LGW', 'Londres Gatwick', 51.148, -0.190],
    ['STN', 'Londres Stansted', 51.885, 0.235], ['MAN', 'Manchester', 53.354, -2.275],
    ['DUB', 'Dublin', 53.421, -6.270], ['MAD', 'Madrid Barajas', 40.472, -3.561],
    ['BCN', 'Barcelone El Prat', 41.297, 2.078], ['OPO', 'Porto', 41.248, -8.681],
    ['LIS', 'Lisbonne', 38.774, -9.134],
  ];

  // Villes sans aéroport adapté → aéroport conseillé le plus pratique.
  const CITIES = {
    besancon: 'BSL', mulhouse: 'BSL', colmar: 'BSL', belfort: 'BSL', montbeliard: 'BSL', bale: 'BSL', basel: 'BSL',
    dijon: 'LYS', grenoble: 'LYS', 'saint-etienne': 'LYS', chambery: 'LYS', 'clermont-ferrand': 'LYS', valence: 'LYS', macon: 'LYS',
    annecy: 'GVA', lausanne: 'GVA', geneve: 'GVA', geneva: 'GVA', berne: 'ZRH', bern: 'ZRH', lucerne: 'ZRH',
    metz: 'LUX', nancy: 'LUX', thionville: 'LUX', reims: 'CDG', troyes: 'ORY', amiens: 'BVA', rouen: 'BVA',
    caen: 'ORY', 'le havre': 'CDG', orleans: 'ORY', tours: 'ORY', poitiers: 'ORY', versailles: 'ORY',
    rennes: 'NTE', brest: 'NTE', angers: 'NTE', 'le mans': 'NTE', 'la rochelle': 'BOD', limoges: 'BOD',
    pau: 'BIQ', bayonne: 'BIQ', perpignan: 'TLS', nimes: 'MPL', avignon: 'MRS', 'aix-en-provence': 'MRS',
    toulon: 'MRS', cannes: 'NCE', monaco: 'NCE', liege: 'CRL', namur: 'CRL', anvers: 'BRU', antwerp: 'BRU',
    gand: 'BRU', gent: 'BRU', bruxelles: 'BRU', brussels: 'BRU', paris: 'ORY', londres: 'LGW', london: 'LGW',
  };
  const norm = (v) => v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  const $ = (id) => document.getElementById(id);
  const input = $('go-from'), list = $('go-airports'), arrEl = $('go-arr'), depEl = $('go-dep');
  const nearestEl = $('go-nearest'), locBtn = $('go-locate'), locMsg = $('go-loc-msg');
  let coords = null; // position GPS du visiteur, si partagée

  list.innerHTML = AIRPORTS.map(a => `<option value="${a[1]} (${a[0]})"></option>`).join('');

  // Dates choisies sur le calendrier
  try {
    const s = JSON.parse(localStorage.getItem('luzdosol_stay') || 'null');
    const today = new Date().toISOString().slice(0, 10);
    if (s && s.a >= today) { arrEl.value = s.a; depEl.value = s.d; $('go-dates-hint').hidden = false; }
  } catch (e) {}

  // Renvoie { ap, city } : ap = aéroport retenu, city = vrai lieu de départ saisi
  // (pour calculer le trajet en transports jusqu'à l'aéroport).
  function airportFromInput() {
    const v = input.value.trim();
    const code = (v.match(/\(([A-Z]{3})\)\s*$/) || v.match(/^([A-Za-z]{3})$/) || [])[1];
    if (code) return { ap: AIRPORTS.find(a => a[0] === code.toUpperCase()) || null, city: false };
    const n = norm(v);
    if (CITIES[n]) return { ap: AIRPORTS.find(a => a[0] === CITIES[n]), city: true };
    const ap = n.length >= 3 ? AIRPORTS.find(a => norm(a[1]).startsWith(n)) || null : null;
    return { ap, city: !!ap };
  }

  function dist(lat1, lon1, lat2, lon2) {
    const r = Math.PI / 180, x = (lon2 - lon1) * r * Math.cos((lat1 + lat2) / 2 * r), y = (lat2 - lat1) * r;
    return Math.sqrt(x * x + y * y) * 6371;
  }

  const enc = encodeURIComponent;
  const yymmdd = (iso) => iso.slice(2).replace(/-/g, '');
  const SKY = { fr: 'www.skyscanner.fr/transport/vols', en: 'www.skyscanner.net/transport/flights', es: 'www.skyscanner.es/transporte/vuelos', pt: 'www.skyscanner.pt/transporte/voos' };
  const KAYAK = { fr: 'www.kayak.fr', en: 'www.kayak.com', es: 'www.kayak.es', pt: 'www.kayak.pt' };
  const TRAIN = { fr: 'https://www.sncf-connect.com/', en: 'https://www.thetrainline.com/', es: 'https://www.thetrainline.com/es', pt: 'https://www.thetrainline.com/pt' };

  function setHref(id, url) { const a = $(id); if (a) a.href = url; }

  function update() {
    const { ap, city } = airportFromInput();
    const from = input.value.trim();
    const a = arrEl.value, d = depEl.value && depEl.value > a ? depEl.value : '';
    const L = lang();

    nearestEl.hidden = !ap;
    if (ap) nearestEl.querySelector('b').textContent = ap[1] + ' (' + ap[0] + ')';

    // 1. De chez vous à l'aéroport (transports en commun)
    const origin = coords ? coords.lat + ',' + coords.lon : (from && (!ap || city) ? from : '');
    const apName = ap ? 'Aéroport ' + ap[1] : (from ? 'aéroport ' + from : 'aéroport');
    setHref('go-s1-maps', 'https://www.google.com/maps/dir/?api=1' + (origin ? '&origin=' + enc(origin) : '') +
      '&destination=' + enc(apName) + '&travelmode=transit');
    setHref('go-s1-train', TRAIN[L] || TRAIN.en);

    // 2. Vols vers Faro
    const q = 'Flights to FAO from ' + (ap ? ap[0] : (from || '')) + (a ? ' on ' + a : '') + (a && d ? ' through ' + d : '');
    setHref('go-gflights', 'https://www.google.com/travel/flights?hl=' + L + '&q=' + enc(q.replace(/ from $| from (?= on)/, '')));
    // Skyscanner et Kayak ont besoin d'un code d'aéroport : sans lui, page d'accueil du comparateur.
    setHref('go-sky', ap
      ? `https://${SKY[L]}/${ap[0].toLowerCase()}/fao/` + (a ? yymmdd(a) + '/' + (d ? yymmdd(d) + '/' : '') : '')
      : 'https://' + SKY[L].split('/')[0] + '/');
    setHref('go-kayak', ap
      ? `https://${KAYAK[L]}/flights/${ap[0]}-FAO` + (a ? '/' + a + (d ? '/' + d : '') : '')
      : `https://${KAYAK[L]}/`);

    // 3. Faro → LUZDOSOL
    setHref('go-s3-route', 'https://www.google.com/maps/dir/?api=1&origin=' + enc(FARO) + '&destination=' + enc(DEST) + '&travelmode=driving');
    setHref('go-s3-bus', 'https://www.google.com/maps/dir/?api=1&origin=' + enc(FARO) + '&destination=' + enc(DEST) + '&travelmode=transit');
  }

  // Liaisons principales vers Faro et compagnies qui les assurent (vols directs
  // souvent saisonniers : les comparateurs montrent ce qui vole réellement aux dates).
  const ROUTES = [
    { city: 'Paris', label: 'Paris', sky: 'pari', kayak: 'PAR', gf: 'Paris', time: '2 h 35', airports: 'Orly, Charles de Gaulle, Beauvais',
      airlines: [['Transavia', 'https://www.transavia.com/', 'Orly', 1], ['easyJet', 'https://www.easyjet.com/', 'Roissy CDG', 1],
        ['Ryanair', 'https://www.ryanair.com/', 'Beauvais', 1], ['TAP Air Portugal', 'https://www.flytap.com/', '', 0]] },
    { city: 'Lyon', label: 'Lyon', sky: 'lys', kayak: 'LYS', gf: 'LYS', time: '2 h 20', airports: 'Saint-Exupéry',
      airlines: [['easyJet', 'https://www.easyjet.com/', '', 1], ['Transavia', 'https://www.transavia.com/', '', 1], ['TAP Air Portugal', 'https://www.flytap.com/', '', 0]] },
    { city: 'Genève', label: 'Genève', sky: 'gva', kayak: 'GVA', gf: 'GVA', time: '2 h 35', airports: 'Genève Cointrin',
      airlines: [['easyJet', 'https://www.easyjet.com/', '', 1], ['TAP Air Portugal', 'https://www.flytap.com/', '', 0]] },
    { city: 'Bâle-Mulhouse', label: 'Bâle-Mulhouse', sky: 'bsl', kayak: 'BSL', gf: 'BSL', time: '2 h 45', airports: 'EuroAirport Bâle-Mulhouse-Fribourg',
      airlines: [['easyJet', 'https://www.easyjet.com/', '', 1], ['TAP Air Portugal', 'https://www.flytap.com/', '', 0]] },
  ];
  const routesEl = $('go-routes');
  function renderRoutes() {
    if (!routesEl) return;
    const L = lang(), a = arrEl.value, d = depEl.value && depEl.value > a ? depEl.value : '';
    const esc = (x) => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    routesEl.innerHTML = ROUTES.map(r => {
      const gf = 'https://www.google.com/travel/flights?hl=' + L + '&q=' + enc('Flights to FAO from ' + r.gf + (a ? ' on ' + a : '') + (a && d ? ' through ' + d : ''));
      const sky = `https://${SKY[L]}/${r.sky}/fao/` + (a ? yymmdd(a) + '/' + (d ? yymmdd(d) + '/' : '') : '');
      const kayak = `https://${KAYAK[L]}/flights/${r.kayak}-FAO` + (a ? '/' + a + (d ? '/' + d : '') : '');
      const chips = r.airlines.map(([n, u, ap, direct]) =>
        `<a class="go-air" href="${u}" target="_blank" rel="noopener"><b>${esc(n)}</b><span class="${direct ? 'is-direct' : 'is-via'}">${direct ? t('go_direct', 'Vol direct') : t('go_via_lis', 'Escale à Lisbonne')}${ap ? ' (' + ap + ')' : ''}</span></a>`).join('');
      return `<article class="go-route">
        <div class="go-route-head"><div class="go-route-title">${esc(r.label)} <span>→</span> Faro</div><div class="go-route-time">≈ ${r.time} ${t('go_flight_time', 'de vol')}</div></div>
        <div class="go-route-ap">${t('go_airports', 'Aéroports')} : ${esc(r.airports)}</div>
        <div class="go-airs">${chips}</div>
        <div class="go-route-btns"><a class="go-btn" href="${gf}" target="_blank" rel="noopener">${t('go_compare', 'Comparer les prix')}</a><a class="go-btn go-btn-ghost" href="${sky}" target="_blank" rel="noopener">Skyscanner</a><a class="go-btn go-btn-ghost" href="${kayak}" target="_blank" rel="noopener">Kayak</a></div>
      </article>`;
    }).join('') + `<p class="go-route-note">${t('go_seasonal', 'Certains vols directs sont saisonniers : les comparateurs affichent les vols réellement disponibles à vos dates.')}</p>`;
  }

  input.addEventListener('input', () => { coords = null; update(); });
  [arrEl, depEl].forEach(el => el.addEventListener('change', () => {
    if (arrEl.value && depEl.value && depEl.value <= arrEl.value) depEl.value = '';
    update();
  }));

  locBtn.addEventListener('click', () => {
    if (!navigator.geolocation) { locMsg.textContent = t('go_loc_err'); return; }
    locMsg.textContent = t('go_locating');
    navigator.geolocation.getCurrentPosition(pos => {
      coords = { lat: pos.coords.latitude.toFixed(4), lon: pos.coords.longitude.toFixed(4) };
      let best = null, bd = Infinity;
      AIRPORTS.forEach(ap => { const dd = dist(+coords.lat, +coords.lon, ap[2], ap[3]); if (dd < bd) { bd = dd; best = ap; } });
      locMsg.textContent = '';
      if (best && bd < 600) input.value = best[1] + ' (' + best[0] + ')';
      update();
    }, () => { locMsg.textContent = t('go_loc_err'); }, { timeout: 10000, maximumAge: 600000 });
  });

  window.addEventListener('luzdosol-lang-change', () => { update(); renderRoutes(); });
  [arrEl, depEl].forEach(el => el.addEventListener('change', renderRoutes));
  update();
  renderRoutes();
})();
