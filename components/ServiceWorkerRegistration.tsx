'use client';

import { useEffect } from 'react';

/**
 * Service Worker Registration for NaEtacie PWA.
 * In production, registers /sw.js with scope '/' to enable:
 * - Offline GIS & Announcement Caching
 * - PWA Installability on Mobile (Android TWA / iOS A2HS)
 * - Web Push Notifications for construction jobs in Szczecin
 *
 * In local development (localhost), unregisters any stale SW to avoid caching dev assets.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('.local');

    if (isLocalhost) {
      // In local development, unregister any active service workers to prevent cache collisions
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister();
        }
      });
      return;
    }

    // In production environments (naetacie.pl, Vercel preview), register /sw.js
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('[PWA] Service Worker registered successfully with scope:', registration.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    });
  }, []);

  return null;
}

