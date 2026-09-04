'use client';

import { useEffect } from 'react';

export interface DesktopShortcutsHandlers {
  onNextOffer?: () => void;
  onPrevOffer?: () => void;
  onToggleFavorite?: () => void;
  onOpenPitch?: () => void;
  onToggleCompare?: () => void;
  onToggleSplitView?: () => void;
  onOpenEstimator?: () => void;
  onOpenShortcutsModal?: () => void;
  onFocusSearch?: () => void;
}

/**
 * useDesktopShortcuts - Global keyboard listener for desktop power-users.
 * Ignores keystrokes when typing in inputs/textareas.
 */
export function useDesktopShortcuts(handlers: DesktopShortcutsHandlers, enabled = true) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if active element is an input, textarea, or contentEditable
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      switch (key) {
        case 'j':
        case 'arrowdown': {
          e.preventDefault();
          handlers.onNextOffer?.();
          break;
        }

        case 'k':
        case 'arrowup': {
          e.preventDefault();
          handlers.onPrevOffer?.();
          break;
        }

        case 'f': {
          e.preventDefault();
          handlers.onToggleFavorite?.();
          break;
        }

        case 's': {
          e.preventDefault();
          handlers.onOpenPitch?.();
          break;
        }

        case 'c': {
          e.preventDefault();
          handlers.onToggleCompare?.();
          break;
        }

        case 'm': {
          e.preventDefault();
          handlers.onToggleSplitView?.();
          break;
        }

        case 'w': {
          e.preventDefault();
          handlers.onOpenEstimator?.();
          break;
        }

        case '?': {
          e.preventDefault();
          handlers.onOpenShortcutsModal?.();
          break;
        }

        case '/': {
          e.preventDefault();
          handlers.onFocusSearch?.();
          break;
        }

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers, enabled]);
}
