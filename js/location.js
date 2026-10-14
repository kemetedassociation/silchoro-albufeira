/**
 * location.js — page "Location de véhicule" : pré-remplit le comparateur
 * Kayak (voitures à l'aéroport de Faro) avec les dates du séjour choisies
 * sur le calendrier.
 */
(function () {
  const a = document.getElementById('car-kayak');
  if (!a) return;
  const KAYAK = { fr: 'www.kayak.fr', en: 'www.kayak.com', es: 'www.kayak.es', pt: 'www.kayak.pt' };
  function update() {
    const host = KAYAK[window.LUZDOSOL_LANG] || KAYAK.fr;
    let stay = null;
    try { stay = JSON.parse(localStorage.getItem('luzdosol_stay') || 'null'); } catch (e) {}
    const pad = (n) => String(n).padStart(2, '0'), d = new Date();
    const today = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    a.href = stay && stay.a >= today && stay.d > stay.a
      ? `https://${host}/cars/FAO/${stay.a}/${stay.d}`
      : `https://${host}/cars/FAO`;
  }
  window.addEventListener('luzdosol-lang-change', update);
  update();
})();
