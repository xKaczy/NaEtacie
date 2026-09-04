'use client';

/**
 * Offline detection and local data caching hook.
 * Saves announcement data to localStorage when online,
 * serves from cache when offline.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  cacheAnnouncementsOffline,
  getCachedAnnouncementsOffline,
} from '@/lib/offline/offlineStorage';

const CACHE_KEY = 'offline-announcements';
const CACHE_TIMESTAMP_KEY = 'offline-announcements-ts';

interface OfflineSyncResult {
  isOnline: boolean;
  isOfflineMode: boolean;
  cachedAt: Date | null;
  saveToCache: (data: unknown[]) => void;
  loadFromCache: () => unknown[];
  loadFromIndexedDB: <T>() => Promise<T[]>;
}

export function useOfflineSync(): OfflineSyncResult {
  const [isOnline, setIsOnline] = useState(true);
  const [cachedAt, setCachedAt] = useState<Date | null>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load cached timestamp
    const ts = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (ts) setCachedAt(new Date(parseInt(ts, 10)));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveToCache = useCallback((data: unknown[]) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data.slice(0, 100)));
      const now = Date.now();
      localStorage.setItem(CACHE_TIMESTAMP_KEY, String(now));
      setCachedAt(new Date(now));
      // Also write to IndexedDB asynchronously for robust large dataset storage
      if (Array.isArray(data) && data.length > 0) {
        cacheAnnouncementsOffline(data as Array<{ id: string }>).catch(() => {});
      }
    } catch {
      // localStorage full or unavailable - fall back to IndexedDB directly
      if (Array.isArray(data) && data.length > 0) {
        cacheAnnouncementsOffline(data as Array<{ id: string }>).catch(() => {});
      }
    }
  }, []);

  const loadFromCache = useCallback((): unknown[] => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  }, []);

  const loadFromIndexedDB = useCallback(async <T>(): Promise<T[]> => {
    try {
      const items = await getCachedAnnouncementsOffline<T>();
      return items;
    } catch {
      return [];
    }
  }, []);

  return {
    isOnline,
    isOfflineMode: !isOnline,
    cachedAt,
    saveToCache,
    loadFromCache,
    loadFromIndexedDB,
  };
}
