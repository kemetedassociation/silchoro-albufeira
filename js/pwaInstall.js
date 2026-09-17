/**
 * pwaInstall.js — petit bandeau "Installer l'application" (PWA).
 * Desktop/Android : capte beforeinstallprompt et propose l'installation native.
 * iOS (pas d'API d'installation) : explique le geste "Partager → Sur l'écran d'accueil".
 * Ne s'affiche jamais si déjà installé, ni plus d'une fois par session, ni
 * dans les 14 jours suivant une fermeture explicite.
 */
(function () {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isStandalone) return;

  const DISMISS_KEY = 'luzdosol_pwa_dismissed_at';
  const SESSION_KEY = 'luzdosol_pwa_shown';
  const DISMISS_DAYS = 14;

  function recentlyDismissed() {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (!raw) return false;
      return (Date.now() - parseInt(raw, 10)) < DISMISS_DAYS * 24 * 60 * 60 * 1000;
    } catch (e) { return false; }
  }
  function alreadyShownThisSession() {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) { return false; }
  }
  function markShown() {
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) {}
  }
  function markDismissed() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (e) {}
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  let deferredPrompt = null;

  const t = (key, fallback) => (window.luzdosolT ? window.luzdosolT(key) : fallback);

  function buildAndShow() {
    if (recentlyDismissed() || alreadyShownThisSession() || document.getElementById('pwa-install-banner')) return;
    markShown();

    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.className = 'pwa-install-banner';
    const descKey = isIOS ? 'pwa_desc_ios' : 'pwa_desc';
    const descFallback = isIOS
      ? "Appuyez sur Partager, puis « Sur l'écran d'accueil »."
      : "Accès plus rapide, comme une vraie application.";
    banner.innerHTML =
      '<button class="pwa-install-close" data-i18n-aria="pwa_close" aria-label="' + t('pwa_close', 'Fermer') + '">✕</button>' +
      '<img class="pwa-install-icon" src="assets/icons/icon-192.png" alt="">' +
      '<div class="pwa-install-text">' +
        '<div class="pwa-install-title" data-i18n="pwa_title">' + t('pwa_title', 'Installer LUZDOSOL') + '</div>' +
        '<div class="pwa-install-desc" data-i18n="' + descKey + '">' + t(descKey, descFallback) + '</div>' +
      '</div>' +
      (isIOS ? '' : '<div class="pwa-install-actions"><button class="pwa-install-btn" data-i18n="pwa_btn">' + t('pwa_btn', 'Télécharger') + '</button></div>');

    document.body.appendChild(banner);
    requestAnimationFrame(() => banner.classList.add('show'));

    banner.querySelector('.pwa-install-close').addEventListener('click', () => { markDismissed(); hideBanner(); });

    const btn = banner.querySelector('.pwa-install-btn');
    if (btn) {
      btn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        hideBanner();
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice.catch(() => null);
        if (choice && choice.outcome === 'dismissed') markDismissed();
        deferredPrompt = null;
      });
    }
  }

  function hideBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (!banner) return;
    banner.classList.remove('show');
    setTimeout(() => banner.remove(), 400);
  }

  function maybeShow() {
    if (!deferredPrompt && !isIOS) return; // aucun chemin d'installation possible sur ce navigateur
    setTimeout(buildAndShow, 2500);
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    maybeShow();
  });
  window.addEventListener('appinstalled', () => { markDismissed(); hideBanner(); });

  if (isIOS) maybeShow();
})();
