/**
 * pageTransition.js — logo animé à chaque navigation entre pages du site.
 * Léger et non bloquant : ~280ms en sortie, fondu en entrée.
 * Nécessite le markup #page-transition (voir index.html / guide.html).
 */
(function () {
  const OUT_MS = 280;

  function overlayEl() {
    return document.getElementById('page-transition');
  }

  function isInternalNavigable(a) {
    if (!a || !a.href) return false;
    if (a.target && a.target !== '' && a.target !== '_self') return false;
    if (a.hasAttribute('download')) return false;
    const href = a.getAttribute('href') || '';
    if (!href || href.startsWith('#')) return false;
    if (/^(mailto:|tel:|https:\/\/wa\.me|https:\/\/api\.whatsapp)/i.test(href)) return false;
    let url;
    try { url = new URL(a.href, location.href); } catch (e) { return false; }
    if (url.origin !== location.origin) return false;
    if (url.pathname === location.pathname && url.hash) return false; // same-page anchor
    return true;
  }

  function playOut(nextHref) {
    const ov = overlayEl();
    if (!ov) { location.href = nextHref; return; }
    ov.classList.add('pt-active');
    window.setTimeout(() => { location.href = nextHref; }, OUT_MS);
  }

  function playIn() {
    const ov = overlayEl();
    if (!ov) return;
    // If the big site-loader is present (homepage), let it own the entrance.
    if (document.getElementById('site-loader')) { ov.remove(); return; }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { ov.classList.remove('pt-active'); });
    });
    window.setTimeout(() => { ov.classList.add('pt-hidden'); }, 500);
  }

  // Exposé pour le chatbot (js/chatbot.js) : navigue vers une page du site
  // avec la même transition animée qu'un clic sur un lien interne.
  window.luzdosolNavigate = function (href) { playOut(href); };

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a');
    if (!isInternalNavigable(a)) return;
    e.preventDefault();
    playOut(a.href);
  });

  document.addEventListener('DOMContentLoaded', playIn);
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) { const ov = overlayEl(); if (ov) ov.classList.remove('pt-active'); }
  });
})();
