'use client';

import { useCallback } from 'react';

export interface SearchAreaButtonProps {
  visible?: boolean;
  onClick: () => void;
  ui?: { surface: string; border: string; text: string; shadow: string };
  top?: string | number;
  className?: string;
}

/**
 * "Szukaj w tym obszarze" button that appears after the user pans or zooms the map.
 * Triggers area filtering callback when clicked.
 */
export function SearchAreaButton({
  visible = true,
  onClick,
  ui = {
    surface: '#ffffff',
    border: '#e5e7eb',
    text: '#1f2937',
    shadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  top,
  className = '',
}: SearchAreaButtonProps) {
  const handleClick = useCallback(() => {
    onClick();
  }, [onClick]);

  if (!visible) return null;

  const isExplicitlyPositioned = top !== undefined;

  return (
    <button
      onClick={handleClick}
      className={`px-4 py-2 rounded-full border text-xs font-bold shadow-lg transition-all active:scale-95 flex items-center gap-1.5 whitespace-nowrap cursor-pointer touch-manipulation min-h-[40px] ${className}`}
      style={{
        ...(isExplicitlyPositioned
          ? {
              position: 'absolute',
              top: typeof top === 'number' ? `${top}px` : top,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 15,
            }
          : {}),
        background: ui.surface,
        borderColor: ui.border,
        boxShadow: ui.shadow,
        color: ui.text,
      }}
    >
      <span>🔍</span>
      <span>Szukaj w tym obszarze</span>
    </button>
  );
}

