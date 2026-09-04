'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';
import { triggerHaptic } from '@/lib/utils';
import { playUiSound } from '@/lib/motion/soundEngine';

export function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [showRestored, setShowRestored] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      triggerHaptic(12);
      playUiSound('pop');
      setShowRestored(true);
      const timer = setTimeout(() => {
        setShowRestored(false);
        setWasOffline(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setShowRestored(false);
      triggerHaptic(20);
      playUiSound('toggle');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          key="offline-bar"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="bg-amber-600/95 dark:bg-amber-700/95 text-amber-50 px-3 py-1.5 text-xs font-semibold flex items-center justify-center gap-2 shadow-md z-50 relative border-b border-amber-500/40"
          role="alert"
        >
          <WifiOff className="w-3.5 h-3.5 shrink-0 animate-pulse" />
          <span>Brak zasięgu na budowie – przeglądasz oferty zapisane w pamięci telefonu</span>
        </motion.div>
      )}

      {isOnline && wasOffline && showRestored && (
        <motion.div
          key="restored-bar"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="bg-emerald-600/95 dark:bg-emerald-700/95 text-emerald-50 px-3 py-1.5 text-xs font-semibold flex items-center justify-center gap-2 shadow-md z-50 relative border-b border-emerald-500/40"
          role="status"
        >
          <Wifi className="w-3.5 h-3.5 shrink-0" />
          <span>Połączenie z siecią przywrócone – zaktualizowano listę ofert</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
