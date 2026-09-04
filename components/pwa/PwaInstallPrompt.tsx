'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share, PlusSquare, Sparkles } from 'lucide-react';
import { triggerHaptic } from '@/lib/utils';
import { playUiSound } from '@/lib/motion/soundEngine';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'pwa_prompt_dismissed_time';
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days cooldown

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showAndroidPrompt, setShowAndroidPrompt] = useState(false);
  const [showIosPrompt, setShowIosPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if running as standalone PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) return;

    // Check cooldown
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const timeSince = Date.now() - parseInt(dismissedAt, 10);
      if (timeSince < COOLDOWN_MS) return;
    }

    // Android / Chromium beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Wait 3 seconds after page load before showing prompt so it does not distract the user immediately
      const timer = setTimeout(() => {
        setShowAndroidPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // iOS Safari detection
    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome/.test(ua);

    if (isIos && isSafari && !isStandalone) {
      const timer = setTimeout(() => {
        setShowIosPrompt(true);
      }, 4000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    triggerHaptic(15);
    playUiSound('pop');

    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setShowAndroidPrompt(false);
        setDeferredPrompt(null);
      } else {
        handleDismiss();
      }
    } catch {
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    triggerHaptic(8);
    setShowAndroidPrompt(false);
    setShowIosPrompt(false);
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {
      // ignore
    }
  };

  if (!showAndroidPrompt && !showIosPrompt) return null;

  return (
    <AnimatePresence>
      <motion.aside
        aria-label="Powiadomienie o instalacji aplikacji"
        initial={{ y: 80, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 80, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="fixed bottom-20 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50 pointer-events-auto"
      >
        <div className="relative rounded-2xl bg-zinc-950/95 border border-amber-500/40 p-4 shadow-2xl backdrop-blur-2xl ring-1 ring-amber-500/20 text-white">
          {/* Close button */}
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute top-2.5 right-2.5 p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            aria-label="Zamknij"
          >
            <X className="w-4 h-4" />
          </button>

          {showAndroidPrompt && (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400">
                <Download className="w-5 h-5" />
              </div>
              <div className="flex-1 pr-6">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold text-white">Zainstaluj NaEtacie</h4>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Aplikacja
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Błyskawiczny dostęp z pulpitu, praca w trybie offline i powiadomienia o nowych zleceniach w Szczecinie.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 transition active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Zainstaluj na telefonie</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="py-2 px-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
                  >
                    Później
                  </button>
                </div>
              </div>
            </div>
          )}

          {showIosPrompt && (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1 pr-6">
                <h4 className="text-sm font-bold text-white">Dodaj NaEtacie do ekranu</h4>
                <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                  Zainstaluj aplikację na iPhone:
                </p>
                <ol className="text-xs text-zinc-400 mt-2 space-y-1.5 list-decimal list-inside">
                  <li>
                    Stuknij przycisk <Share className="w-3.5 h-3.5 inline text-amber-400 mx-1" /> <strong>Udostępnij</strong> w Safari
                  </li>
                  <li>
                    Wybierz <PlusSquare className="w-3.5 h-3.5 inline text-amber-400 mx-1" /> <strong>Do ekranu początkowego</strong>
                  </li>
                </ol>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="mt-3 w-full py-1.5 px-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition text-center"
                >
                  Rozumiem, zamknij
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
