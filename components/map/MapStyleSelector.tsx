'use client';

import { useState, useRef, useEffect } from 'react';

export type MapStyleType =
  | 'baltic-slate'
  | 'emerald'
  | 'light'
  | 'dark'
  | 'satellite'
  | 'mapbox-standard'
  | 'mapbox-satellite';

export interface MapStyleOption {
  id: MapStyleType;
  label: string;
  icon: string;
  styleUrl: string;
}

const mapboxToken =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_MAPBOX_TOKEN) || '';

export const MAP_STYLE_OPTIONS: MapStyleOption[] = [
  {
    id: 'baltic-slate',
    label: '⚓ Baltic Slate (Szczecin 3D)',
    icon: '⚓',
    styleUrl: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  },
  {
    id: 'emerald',
    label: 'Zieleń Szmaragdowa',
    icon: '🌿',
    styleUrl: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  },
  {
    id: 'light',
    label: 'Jasny',
    icon: '☀️',
    styleUrl: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  },
  {
    id: 'dark',
    label: 'Ciemny',
    icon: '🌙',
    styleUrl: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  },
  {
    id: 'mapbox-standard',
    label: 'Mapbox Standard 3D',
    icon: '🏢',
    styleUrl: mapboxToken
      ? 'mapbox://styles/mapbox/standard'
      : 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  },
  {
    id: 'mapbox-satellite',
    label: 'Satelita HD Mapbox',
    icon: '🛰️',
    styleUrl: mapboxToken
      ? 'mapbox://styles/mapbox/satellite-streets-v12'
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  },
];

export interface MapStyleSelectorProps {
  currentStyle: MapStyleType;
  onSelectStyle: (style: MapStyleType) => void;
  ui: {
    surface: string;
    border: string;
    text: string;
    shadow: string;
  };
  top: number;
}

export function MapStyleSelector({
  currentStyle,
  onSelectStyle,
  ui,
  top,
}: MapStyleSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeOption = MAP_STYLE_OPTIONS.find((o) => o.id === currentStyle) || MAP_STYLE_OPTIONS[0];

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: `${top}px`,
        right: '10px',
        zIndex: 10,
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        title="Zmień motyw mapy (Zieleń / Ciemny / Jasny)"
        aria-label="Zmień motyw mapy"
        className="w-8 h-8 text-xs md:w-9 md:h-9 md:text-base rounded-lg transition-transform active:scale-90 shadow-sm"
        style={{
          background: ui.surface,
          border: `1px solid ${ui.border}`,
          boxShadow: ui.shadow,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: ui.text,
        }}
      >
        {activeOption.icon}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: '46px',
            background: ui.surface,
            border: `1px solid ${ui.border}`,
            borderRadius: '12px',
            boxShadow: ui.shadow,
            padding: '4px',
            display: 'flex',
            gap: '4px',
            whiteSpace: 'nowrap',
          }}
        >
          {MAP_STYLE_OPTIONS.map((opt) => {
            const isSelected = opt.id === activeOption.id;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  onSelectStyle(opt.id);
                  setOpen(false);
                }}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isSelected ? '#10b981' : 'transparent',
                  color: isSelected ? '#ffffff' : ui.text,
                  fontSize: '11px',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
