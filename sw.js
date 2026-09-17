/**
 * sw.js — service worker minimal, uniquement pour rendre LUZDOSOL installable
 * (mobile : "Ajouter à l'écran d'accueil" ; PC : bouton "Installer" dans Chrome/Edge).
 * Ne met rien en cache : le site reste toujours à jour, pas de mode hors-ligne.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
