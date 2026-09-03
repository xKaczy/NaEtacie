/**
 * Resilient localStorage wrapper with in-memory fallback.
 * Prevents unhandled exceptions in Safari Private Browsing (QuotaExceededError)
 * and SSR environments where window is undefined.
 */

const memoryFallback = new Map<string, string>();

export function safeGetItem(key: string, defaultValue: string | null = null): string | null {
  if (typeof window === 'undefined') {
    return memoryFallback.has(key) ? (memoryFallback.get(key) ?? defaultValue) : defaultValue;
  }
  try {
    const val = window.localStorage.getItem(key);
    return val !== null ? val : (memoryFallback.has(key) ? (memoryFallback.get(key) ?? defaultValue) : defaultValue);
  } catch {
    return memoryFallback.has(key) ? (memoryFallback.get(key) ?? defaultValue) : defaultValue;
  }
}

export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') {
    memoryFallback.set(key, value);
    return true;
  }
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    // QuotaExceededError or security block
    memoryFallback.set(key, value);
    return false;
  }
}

export function safeRemoveItem(key: string): void {
  if (typeof window === 'undefined') {
    memoryFallback.delete(key);
    return;
  }
  try {
    window.localStorage.removeItem(key);
  } catch {
    memoryFallback.delete(key);
  }
}

export function safeClear(): void {
  memoryFallback.clear();
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.clear();
    } catch { /* ignore */ }
  }
}
