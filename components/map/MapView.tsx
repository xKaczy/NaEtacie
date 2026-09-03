'use client';

/**
 * Interactive map integrated with the announcement list, powered by MapLibre GL JS (WebGL).
 * Features WebGL vector clustering, spiderfy spiral placement for overlapping points,
 * 3D buildings extrusions, WebGL heatmaps, commute radius, and bidirectional list syncing.
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { createRoot, type Root } from 'react-dom/client';
import { CATEGORIES, ALL_CATEGORY_KEYS, normalizeCategory, type CategoryKey } from '@/lib/data/categories';
import { jitteredPosition } from '@/lib/geo/jitter';
import { haversineKm } from '@/lib/matching/engine';
import type { DisplayAnnouncement } from '@/lib/types/display';
import { MapGeocoderSearch } from './MapGeocoderSearch';
import { MapStyleSelector, MAP_STYLE_OPTIONS, type MapStyleType } from './MapStyleSelector';
import { MapLassoDraw } from './MapLassoDraw';
import { MapIsochrone } from './MapIsochrone';
import { MapDistrictAnalytics } from './MapDistrictAnalytics';
import { MapGeoAlert } from './MapGeoAlert';
import { MobileBottomSheet } from './MobileBottomSheet';
import { DraggableJobModal } from './DraggableJobModal';
import { SearchAreaButton } from './SearchAreaButton';
import { MapWeatherWidget } from './MapWeatherWidget';
import { calculateCommuteEstimate } from './MapCommuteRoute';
import { getDistrictSalaryGeoJson } from './MapDistrictSalaryHeatmap';
import { triggerHaptic, formatShortPrice, ensureAbsoluteUrl, getAnnouncementExternalUrl } from '@/lib/utils';
import { isPointInPolygon } from './utils';
import { MapConstructionSites } from './MapConstructionSites';
import { MapTransitStops } from './MapTransitStops';
import { MapPogonSzczecin, POGON_STADIUM_COORDS } from './MapPogonSzczecin';
import { getQuickSmsHref, getZditmTransitUrl } from '@/lib/geo/transitRouting';


// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const SZCZECIN: [number, number] = [14.5528, 53.4285]; // [lng, lat] for MapLibre
const DEFAULT_ZOOM = 11;
const FLY_TO_ZOOM = 15;
const MIN_ZOOM = 8;
const MAX_ZOOM = 19;

const mapboxToken =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_MAPBOX_TOKEN) || '';

/** Vector style JSON configurations from CartoDB CDN and Mapbox */
const MAP_STYLES: Record<MapStyleType, string> = {
  emerald: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  satellite: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  'mapbox-standard': mapboxToken
    ? 'mapbox://styles/mapbox/standard'
    : 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  'mapbox-satellite': mapboxToken
    ? 'mapbox://styles/mapbox/satellite-streets-v12'
    : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
};

/** Raster tile fallback when vector style fails to load */
const FALLBACK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'osm-raster': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster',
      source: 'osm-raster',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

/** Style load timeout in milliseconds */
const STYLE_LOAD_TIMEOUT_MS = 3_500;

const UI = {
  light: {
    surface: '#ffffff', surfaceAlpha: 'rgba(255,255,255,0.95)', border: '#a7f3d0',
    text: '#064e3b', textMuted: '#047857', shadow: '0 2px 10px rgba(16,185,129,0.15)', mapBg: '#ecfdf5',
  },
  dark: {
    surface: '#022c22', surfaceAlpha: 'rgba(2,44,34,0.95)', border: '#059669',
    text: '#ecfdf5', textMuted: '#6ee7b7', shadow: '0 4px 20px rgba(16,185,129,0.35)', mapBg: '#011e17',
  },
};

// ═══════════════════════════════════════════════════════════════════
// GEOMETRY & SPIDERFY UTILITIES
// ═══════════════════════════════════════════════════════════════════

function createGeoJsonCircle(center: [number, number], radiusKm: number, points = 64) {
  const [lng, lat] = center;
  const coords = [];
  const distanceX = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const distanceY = radiusKm / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([lng + x, lat + y]);
  }
  coords.push(coords[0]);

  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [coords],
    },
    properties: {},
  };
}

/**
 * Calculates spiderfy positions for multiple overlapping pins at the same location.
 * Spreads pins along a spiral or circle ring around the origin center.
 */
function generateSpiderfyPositions(center: [number, number], count: number, zoom: number): Array<[number, number]> {
  if (count <= 1) return [center];

  const [lng, lat] = center;
  const positions: Array<[number, number]> = [];
  const pixelRadius = 38; 
  const metersPerPixel = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
  const radiusKm = (pixelRadius * metersPerPixel) / 1000;

  const distanceX = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const distanceY = radiusKm / 110.574;

  const angleStep = (2 * Math.PI) / count;

  for (let i = 0; i < count; i++) {
    const angle = i * angleStep;
    const rMult = count > 8 ? 1 + (i * 0.12) : 1;
    const x = lng + distanceX * Math.cos(angle) * rMult;
    const y = lat + distanceY * Math.sin(angle) * rMult;
    positions.push([x, y]);
  }

  return positions;
}

// ═══════════════════════════════════════════════════════════════════
// MARKER SVG GENERATOR
// ═══════════════════════════════════════════════════════════════════

function getMarkerHtml(
  category: string,
  isFavorite: boolean,
  isSelected: boolean,
  dimmed: boolean = false,
  price?: string | number | null
): string {
  const cat = CATEGORIES[normalizeCategory(category)];
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const scaleFactor = isMobile ? 0.67 : 1.0; // Scaled down by 1/3 (67% size) on mobile
  const w = Math.round(34 * scaleFactor);
  const h = Math.round(42 * scaleFactor);
  const opacity = dimmed ? '0.35' : '1';
  const scale = isSelected ? 'scale(1.22)' : 'scale(1)';
  const glow = isSelected
    ? `filter: drop-shadow(0 3px 10px ${cat.color}cc) drop-shadow(0 1px 2px rgba(0,0,0,0.4));`
    : 'filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35));';

  const shortPrice = price ? formatShortPrice(price) : null;
  const priceFontSize = isMobile ? '8px' : '10px';
  const pricePadding = isMobile ? '1px 5px' : '1.5px 7px';
  const priceBottom = isMobile ? '-14px' : '-18px';

  const numPrice = typeof price === 'number' ? price : (typeof price === 'string' ? parseFloat(price.replace(/[^\d.]/g, '')) : null);
  const isHighPay = numPrice !== null && numPrice >= 10000;

  const badgeBg = isSelected
    ? 'linear-gradient(135deg, #059669, #047857)'
    : isHighPay
    ? 'linear-gradient(135deg, #10b981, #059669)'
    : '#0f172a';

  const badgeBorder = isSelected || isHighPay ? '#34d399' : 'rgba(255,255,255,0.25)';
  const badgeShadow = isHighPay
    ? '0 2px 8px rgba(16,185,129,0.5), 0 0 10px rgba(16,185,129,0.3)'
    : '0 2px 6px rgba(0,0,0,0.35)';

  const priceBadgeHtml = shortPrice
    ? `<div style="position:absolute;bottom:${priceBottom};left:50%;transform:translateX(-50%);background:${badgeBg};color:#ffffff;font-size:${priceFontSize};font-weight:900;padding:${pricePadding};border-radius:10px;white-space:nowrap;box-shadow:${badgeShadow};border:1px solid ${badgeBorder};">${isHighPay ? '🔥 ' : ''}${shortPrice}</div>`
    : '';

  const pulseSize = isMobile ? '30px' : '44px';
  const pulseRing = isSelected
    ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-65%);width:${pulseSize};height:${pulseSize};border-radius:50%;border:2px solid ${cat.color};animation:marker-pulse 1.5s cubic-bezier(0.4,0,0.6,1) infinite;pointer-events:none;"></div>`
    : '';

  const heartSize = isMobile ? '11px' : '15px';
  const heartFontSize = isMobile ? '6px' : '8px';
  const heartBadge = isFavorite
    ? `<div style="position:absolute;top:-4px;right:-4px;width:${heartSize};height:${heartSize};background:linear-gradient(135deg,#ef4444,#dc2626);border-radius:50%;border:1.5px solid white;display:flex;align-items:center;justify-content:center;font-size:${heartFontSize};line-height:1;color:white;box-shadow:0 1px 4px rgba(239,68,68,0.6);">♥</div>`
    : '';

  const gradId = `mg-${cat.color.replace('#','')}`;
  const iconFontSize = isMobile ? '9' : '12';

  return `
    <div style="position:relative;width:${w}px;height:${h}px;cursor:pointer;transform:${scale};transition:transform 0.25s cubic-bezier(0.34,1.56,0.64,1);opacity:${opacity};">
      ${pulseRing}
      <div style="${glow}">
        <svg width="${w}" height="${h}" viewBox="0 0 34 42" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="${gradId}" cx="40%" cy="30%" r="70%">
              <stop offset="0%" stop-color="${cat.color}" stop-opacity="1"/>
              <stop offset="100%" stop-color="${cat.color}" stop-opacity="0.75"/>
            </radialGradient>
          </defs>
          <path d="M17 0C7.611 0 0 7.611 0 17c0 12.625 17 25 17 25S34 29.625 34 17C34 7.611 26.389 0 17 0z"
            fill="url(#${gradId})" stroke="white" stroke-width="2"
          />
          <circle cx="17" cy="16" r="10" fill="rgba(255,255,255,0.95)"/>
          <text x="17" y="20.5" text-anchor="middle" font-size="${iconFontSize}" dominant-baseline="middle">${cat.icon}</text>
        </svg>
      </div>
      ${priceBadgeHtml}
      ${heartBadge}
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════
// FLOATING INTERFACE COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function ControlButton({
  onClick, title, ariaLabel, top, ui, children,
}: {
  onClick: () => void;
  title: string;
  ariaLabel: string;
  top: number;
  ui: typeof UI.light;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      className="w-7 h-7 text-[10px] md:w-9 md:h-9 md:text-base rounded-lg transition-transform active:scale-90 shadow-sm"
      style={{
        position: 'absolute',
        top: `calc(${top}px + 44px)`,
        right: '10px',
        zIndex: 10,
        background: ui.surface,
        border: `1px solid ${ui.border}`,
        boxShadow: ui.shadow,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: ui.text,
      }}
      onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.92)'; }}
      onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
    >
      {children}
    </button>
  );
}

function MapStats({ ads, total, visible, ui, isDark }: {
  ads: DisplayAnnouncement[]; total: number; visible: number; ui: typeof UI.light; isDark: boolean;
}) {
  const avgPrice = useMemo(() => {
    const prices = ads.filter(a => typeof a.price === 'number' && a.price > 0).map(a => a.price as number);
    if (prices.length === 0) return null;
    return Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
  }, [ads]);

  const newestLabel = useMemo(() => {
    const dates = ads.map(a => a.scraped_at).filter(Boolean).sort((a, b) => b.getTime() - a.getTime());
    if (dates.length === 0) return null;
    const diffH = Math.floor((Date.now() - dates[0].getTime()) / 3600000);
    if (diffH < 1) return 'przed chwilą';
    if (diffH < 24) return `${diffH}h temu`;
    return `${Math.floor(diffH / 24)}d temu`;
  }, [ads]);

  const catCounts = useMemo(() =>
    ALL_CATEGORY_KEYS
      .map(k => ({ key: k, count: ads.filter(a => normalizeCategory(a.category) === k).length, color: CATEGORIES[k].color }))
      .filter(c => c.count > 0),
  [ads]);

  return (
    <div
      className="hidden md:flex flex-col gap-1 text-xs backdrop-blur-md rounded-xl p-2.5 shadow-md pointer-events-none max-w-[220px]"
      style={{
        position: 'absolute', bottom: '116px', left: '10px', zIndex: 10,
        background: ui.surfaceAlpha, border: `1px solid ${ui.border}`,
        color: ui.text,
      }}
    >
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
          <strong>{visible}</strong>
          <span style={{ color: ui.textMuted }}>widoczne w Szczecinie</span>
        </span>
        <span style={{ color: ui.border }}>│</span>
        <span style={{ color: ui.textMuted }}>{total} łącznie</span>
      </div>
      {(avgPrice !== null || newestLabel) && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {avgPrice !== null && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <span>💰</span>
              <span style={{ fontWeight: 600 }}>~{avgPrice.toLocaleString('pl-PL')} zł</span>
            </span>
          )}
          {newestLabel && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: ui.textMuted }}>
              <span>🕐</span>
              <span>{newestLabel}</span>
            </span>
          )}
        </div>
      )}
      {catCounts.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {catCounts.map(c => (
            <span key={c.key} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%', background: c.color, display: 'inline-block',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
              }} />
              <span style={{ fontWeight: 600, fontSize: '10px' }}>{c.count}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryFilter({
  active, onChange, ui, top = 50,
}: {
  active: Set<CategoryKey>;
  onChange: (cats: Set<CategoryKey>) => void;
  ui: typeof UI.light;
  top?: number;
}) {
  const allSelected = active.size === ALL_CATEGORY_KEYS.length;

  return (
    <div
      className="hidden md:flex no-scrollbar"
      style={{
        position: 'absolute', top: `${top}px`, left: '10px', right: '110px', zIndex: 20,
        gap: '4px', overflowX: 'auto', paddingBottom: '2px',
      }}
    >
      <button
        onClick={() => onChange(allSelected ? new Set() : new Set(ALL_CATEGORY_KEYS))}
        style={{
          flexShrink: 0, padding: '6px 12px', borderRadius: '20px',
          border: `1.5px solid ${ui.border}`, background: ui.surfaceAlpha, backdropFilter: 'blur(6px)',
          color: ui.textMuted, fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          boxShadow: ui.shadow, whiteSpace: 'nowrap',
        }}
      >
        {allSelected ? 'Odznacz wszystko' : 'Wybierz wszystko'}
      </button>
      {ALL_CATEGORY_KEYS.map((key) => {
        const cat = CATEGORIES[key];
        const isActive = active.has(key);
        return (
          <button
            key={key}
            onClick={() => {
              const next = new Set(active);
              if (isActive) next.delete(key); else next.add(key);
              onChange(next);
            }}
            style={{
              flexShrink: 0, pointerEvents: 'auto', padding: '6px 13px', borderRadius: '20px',
              border: `1.5px solid ${isActive ? cat.color : ui.border}`,
              background: isActive ? `${cat.color}20` : ui.surfaceAlpha,
              backdropFilter: 'blur(6px)',
              color: isActive ? cat.color : ui.textMuted,
              fontSize: '12px', fontWeight: isActive ? 700 : 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap',
              boxShadow: ui.shadow, transition: 'all 0.15s ease',
            }}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// POPUP CONTENT COMPONENT
// ═══════════════════════════════════════════════════════════════════

function MarkerPopup({
  ad, isFavorite, onToggleFavorite, onShowInList, isDark, homeLat, homeLng,
}: {
  ad: DisplayAnnouncement;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onShowInList: () => void;
  isDark: boolean;
  homeLat?: number | null;
  homeLng?: number | null;
}) {
  const cat = CATEGORIES[normalizeCategory(ad.category)];
  const priceDisplay = ad.price
    ? (typeof ad.price === 'number' ? `${ad.price.toLocaleString('pl-PL')} zł${ad.price < 500 ? '/m²' : ''}` : ad.price)
    : null;

  const distKm = useMemo(() => {
    if (homeLat != null && homeLng != null && ad.latitude != null && ad.longitude != null) {
      const d = haversineKm(homeLat, homeLng, ad.latitude, ad.longitude);
      return Math.round(d * 10) / 10;
    }
    return null;
  }, [homeLat, homeLng, ad.latitude, ad.longitude]);

  const estDriveMin = distKm != null ? Math.max(2, Math.round((distKm / 35) * 60)) : null;

  const bg = isDark ? '#09090b' : '#ffffff';
  const textPrimary = isDark ? '#f4f4f5' : '#111827';
  const textMuted = isDark ? '#a1a1aa' : '#6b7280';
  const chipBg = isDark ? 'rgba(39,39,42,0.85)' : 'rgba(244,244,245,0.95)';
  const divider = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  return (
    <div style={{
      minWidth: '240px', maxWidth: '280px',
      fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
      background: bg, overflow: 'hidden', borderRadius: '12px',
      boxShadow: '0 12px 36px rgba(0,0,0,0.35)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
    }}>

      {/* ── Category Header Bar ── */}
      <div style={{
        background: `linear-gradient(135deg, ${cat.color}25 0%, ${cat.color}08 100%)`,
        borderBottom: `1px solid ${cat.color}35`,
        padding: '8px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: '3px 8px', borderRadius: '999px',
          background: `${cat.color}20`, border: `1px solid ${cat.color}45`,
          color: cat.color, fontSize: '10px', fontWeight: 800, letterSpacing: '0.04em',
        }}>
          <span style={{ fontSize: '12px' }}>{cat.icon}</span>
          {cat.label.toUpperCase()}
        </span>
        <button
          onClick={onToggleFavorite}
          aria-label={isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
          style={{
            border: 'none', background: isFavorite ? 'rgba(239,68,68,0.15)' : 'transparent',
            cursor: 'pointer', fontSize: '15px', lineHeight: 1, padding: '4px 6px',
            borderRadius: '6px', color: isFavorite ? '#ef4444' : textMuted,
            transition: 'all 0.2s ease',
          }}
        >
          {isFavorite ? '♥' : '♡'}
        </button>
      </div>

      {/* ── Main Content ── */}
      <div style={{ padding: '10px 12px' }}>
        <h3 style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 800, lineHeight: 1.3, color: textPrimary }}>
          {ad.title}
        </h3>

        {ad.description && (
          <p style={{
            margin: '0 0 8px', fontSize: '11px', color: textMuted, lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {ad.description}
          </p>
        )}

        {/* ── Info chips ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
          <span style={{
            fontSize: '10px', background: chipBg, color: textPrimary,
            padding: '3px 8px', borderRadius: '999px', fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: '4px',
          }}>
            <span>📍</span> {ad.location_text}
          </span>
          {distKm != null && (
            <span style={{
              fontSize: '10px', background: isDark ? 'rgba(16,185,129,0.18)' : '#d1fae5',
              color: isDark ? '#34d399' : '#047857',
              border: `1px solid ${isDark ? 'rgba(16,185,129,0.35)' : '#a7f3d0'}`,
              padding: '3px 8px', borderRadius: '999px', fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              fontVariantNumeric: 'tabular-nums',
            }}>
              <span>🚗</span> {distKm} km (~{estDriveMin}m)
            </span>
          )}
          {priceDisplay && (
            <span style={{
              fontSize: '10px', padding: '3px 8px', borderRadius: '999px', fontWeight: 800,
              background: isDark ? 'rgba(16,185,129,0.2)' : '#ecfdf5',
              color: isDark ? '#10b981' : '#059669',
              border: `1px solid ${isDark ? 'rgba(16,185,129,0.4)' : '#a7f3d0'}`,
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              fontVariantNumeric: 'tabular-nums',
            }}>
              <span>💰</span> {priceDisplay}
            </span>
          )}
        </div>

        {/* ── Phone & 1-Tap Quick SMS ── */}
        {ad.phone && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
            <a href={`tel:${ad.phone.replace(/\s+/g, '')}`} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
              padding: '7px 8px',
              background: isDark ? 'rgba(16,185,129,0.18)' : 'rgba(220,252,231,0.95)',
              border: `1px solid ${isDark ? 'rgba(16,185,129,0.4)' : '#86efac'}`,
              borderRadius: '8px', fontSize: '11px', color: isDark ? '#34d399' : '#15803d',
              fontWeight: 800, textDecoration: 'none', fontVariantNumeric: 'tabular-nums',
            }}>
              <span>📞</span> Zadzwoń
            </a>
            <a
              href={getQuickSmsHref({ phone: ad.phone, title: ad.title, district: ad.location_text }) || `sms:${ad.phone}`}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                padding: '7px 8px',
                background: isDark ? 'rgba(59,130,246,0.18)' : 'rgba(219,234,254,0.95)',
                border: `1px solid ${isDark ? 'rgba(59,130,246,0.4)' : '#93c5fd'}`,
                borderRadius: '8px', fontSize: '11px', color: isDark ? '#60a5fa' : '#1d4ed8',
                fontWeight: 800, textDecoration: 'none',
              }}
            >
              <span>💬</span> Szybki SMS
            </a>
          </div>
        )}

        {/* ── Divider ── */}
        <div style={{ height: '1px', background: divider, marginBottom: '8px' }} />

        {/* ── Action Buttons ── */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
          <button
            onClick={onShowInList}
            style={{
              flex: 1, textAlign: 'center', padding: '6px 8px',
              background: chipBg, color: textPrimary,
              border: `1px solid ${divider}`,
              borderRadius: '8px', fontSize: '10px', fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = isDark ? '#27272a' : '#e4e4e7'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = chipBg; }}
          >
            📋 Na liście
          </button>
          <a
            href={getAnnouncementExternalUrl(ad)}
            target="_blank"
            rel="noopener noreferrer"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{
              flex: 1, textAlign: 'center', padding: '6px 8px',
              background: `linear-gradient(135deg, ${cat.color}, ${cat.color}dd)`,
              color: 'white', borderRadius: '8px', fontSize: '10px',
              fontWeight: 800, textDecoration: 'none',
              boxShadow: `0 2px 8px ${cat.color}50`,
              cursor: 'pointer',
            }}
          >
            Otwórz →
          </a>
        </div>

        {/* ── Commute & Navigation ── */}
        {ad.latitude != null && ad.longitude != null && (
          <div style={{ display: 'flex', gap: '5px' }}>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${ad.latitude},${ad.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Dojazd samochodem"
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
                padding: '5px 4px', borderRadius: '8px', fontSize: '10px', fontWeight: 700,
                textDecoration: 'none', color: isDark ? '#93c5fd' : '#1d4ed8',
                background: isDark ? 'rgba(30,41,59,0.7)' : 'rgba(241,245,249,0.9)',
                border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                transition: 'opacity 0.15s ease',
              }}
            >
              🚗 Auto
            </a>
            <a
              href={getZditmTransitUrl(ad.latitude, ad.longitude)}
              target="_blank"
              rel="noopener noreferrer"
              title="Dojazd tramwajem / autobusem ZDiTM Szczecin na 6:30 rano"
              style={{
                flex: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
                padding: '5px 4px', borderRadius: '8px', fontSize: '10px', fontWeight: 700,
                textDecoration: 'none', color: isDark ? '#f472b6' : '#be185d',
                background: isDark ? 'rgba(80,7,36,0.35)' : 'rgba(253,242,248,0.95)',
                border: `1px solid ${isDark ? '#831843' : '#fbcfe8'}`,
                transition: 'opacity 0.15s ease',
              }}
            >
              🚌 ZDiTM 6:30
            </a>
            <a
              href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${ad.latitude},${ad.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Zobacz widok sferyczny Google Street View"
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
                padding: '5px 4px', borderRadius: '8px', fontSize: '10px', fontWeight: 700,
                textDecoration: 'none', color: isDark ? '#34d399' : '#047857',
                background: isDark ? 'rgba(6,78,59,0.25)' : 'rgba(209,250,229,0.9)',
                border: `1px solid ${isDark ? 'rgba(52,211,153,0.3)' : '#a7f3d0'}`,
                transition: 'opacity 0.15s ease',
              }}
            >
              🌐 Widok
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CAROUSEL OF OFFERS
// ═══════════════════════════════════════════════════════════════════

interface ResultsCarouselProps {
  ads: DisplayAnnouncement[];
  selectedId: string | null;
  ui: typeof UI.light;
  isDark: boolean;
  isFavorite: (id: string) => boolean;
  onSelect: (id: string) => void;
}

function ResultsCarousel(_props: ResultsCarouselProps) {
  return null;
}

function EmptyOverlay({ ui, hasAny, onReset }: { ui: typeof UI.light; hasAny: boolean; onReset?: () => void }) {
  return (
    <div
      style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 9, background: ui.surfaceAlpha, backdropFilter: 'blur(8px)',
        border: `1px solid ${ui.border}`, borderRadius: '14px', padding: '20px 28px',
        textAlign: 'center', boxShadow: ui.shadow, maxWidth: '260px',
      }}
    >
      <div style={{ fontSize: '28px', marginBottom: '6px' }}>🧭</div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: ui.text, marginBottom: '2px' }}>
        {hasAny ? 'Brak ogłoszeń w tych kategoriach' : 'Brak ogłoszeń do wyświetlenia'}
      </div>
      <div style={{ fontSize: '11px', color: ui.textMuted, marginBottom: onReset && hasAny ? '8px' : '0' }}>
        {hasAny ? 'Włącz więcej kategorii u góry mapy' : 'Spróbuj odświeżyć listę'}
      </div>
      {onReset && hasAny && (
        <button
          onClick={onReset}
          style={{
            marginTop: '10px', padding: '6px 14px', background: '#2563eb', color: 'white',
            border: 'none', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
            cursor: 'pointer', display: 'inline-block', transition: 'background-color 0.2s',
          }}
          onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1d4ed8'; }}
          onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#2563eb'; }}
        >
          Resetuj filtry
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN MAP COMPONENT
// ═══════════════════════════════════════════════════════════════════

export interface MapViewProps {
  ads: DisplayAnnouncement[];
  totalCount?: number;
  activeCategories: Set<CategoryKey>;
  onCategoryChange: (cats: Set<CategoryKey>) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  selectedId?: string | null;
  flyToken?: number;
  onMarkerClick?: (id: string) => void;
  onShowInList?: (id: string) => void;
  onSearchArea?: (bounds: { south: number; west: number; north: number; east: number }) => void;
  homeLat?: number | null;
  homeLng?: number | null;
  maxDistanceKm?: number | null;
}

// Global tracker to prevent WebGL Context overloading during Fast Refresh / StrictMode
let globalActiveMaps = 0;

export default function MapView({
  ads,
  totalCount,
  activeCategories,
  onCategoryChange,
  isFavorite,
  onToggleFavorite,
  selectedId = null,
  flyToken = 0,
  onMarkerClick,
  onShowInList,
  onSearchArea,
  homeLat = null,
  homeLng = null,
  maxDistanceKm = null,
}: MapViewProps) {
  const prefersReducedMotion = useReducedMotion();
  const activePopupRef = useRef<maplibregl.Popup | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const homeMarkerRef = useRef<maplibregl.Marker | null>(null);
  const popupRootsRef = useRef<Map<string, Root>>(new Map());
  const spiderMarkersRef = useRef<maplibregl.Marker[]>([]);
  const geoMarkerRef = useRef<maplibregl.Marker | null>(null);
  const isDarkRef = useRef(false);

  const [isDark, setIsDark] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyleType>('emerald');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showDistrictAnalytics, setShowDistrictAnalytics] = useState(false);
  const [sheetSnapState, setSheetSnapState] = useState<'collapsed' | 'medium' | 'expanded'>('medium');
  const [moved, setMoved] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [tilesLoading, setTilesLoading] = useState(true);

  const handleSelectGeocoderLocation = useCallback((lat: number, lng: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: [lng, lat],
      zoom: 13,
      duration: prefersReducedMotion ? 0 : 1200,
    });
  }, [prefersReducedMotion]);

  const handleSelectStyle = useCallback((style: MapStyleType) => {
    setMapStyle(style);
    const map = mapRef.current;
    if (!map) return;
    const opt = MAP_STYLE_OPTIONS.find((o) => o.id === style);
    if (opt) {
      setMapLoaded(false);
      map.setStyle(opt.styleUrl, { diff: false });
    }
  }, []);

  // Global escape key listener to close map popups
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activePopupRef.current) {
        activePopupRef.current.remove();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [lassoPolygon, setLassoPolygon] = useState<Array<[number, number]> | null>(null);
  const [isochronePolygon, setIsochronePolygon] = useState<Array<[number, number]> | null>(null);
  const [quickFilter, setQuickFilter] = useState<'all' | 'high_pay' | 'remote' | 'recent' | 'budowa' | 'instalacje'>('all');
  const [showSalaryHeatmap, setShowSalaryHeatmap] = useState(false);
  const [showConstructionSites, setShowConstructionSites] = useState(false);
  const [showTransitStops, setShowTransitStops] = useState(false);
  const [showPogonHub, setShowPogonHub] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isMapMenuOpen, setIsMapMenuOpen] = useState(false);
  const [showIsochroneModal, setShowIsochroneModal] = useState(false);
  const [showGeoAlertModal, setShowGeoAlertModal] = useState(false);
  const [isLassoDrawing, setIsLassoDrawing] = useState(false);

  const handleNearMeClick = useCallback(() => {
    triggerHaptic(12);
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const map = mapRef.current;
        if (map) {
          map.flyTo({ center: [lng, lat], zoom: 13, duration: 1000 });
        }
      },
      () => {},
      { timeout: 5000 }
    );
  }, []);

  const visibleAds = useMemo(
    () => ads.filter((ad) => activeCategories.has(normalizeCategory(ad.category))),
    [ads, activeCategories]
  );

  const geocodedAds = useMemo(() => {
    let base = visibleAds.filter((ad) => ad.latitude !== null && ad.longitude !== null);
    if (quickFilter === 'high_pay') {
      base = base.filter((ad) => typeof ad.price === 'number' && ad.price >= 10000);
    } else if (quickFilter === 'remote') {
      base = base.filter((ad) => (ad.location_text && ad.location_text.toLowerCase().includes('zdaln')) || ad.title.toLowerCase().includes('zdaln'));
    } else if (quickFilter === 'recent') {
      const now = Date.now();
      base = base.filter((ad) => ad.scraped_at && (now - ad.scraped_at.getTime() <= 24 * 3600000));
    } else if (quickFilter === 'budowa') {
      base = base.filter((ad) => normalizeCategory(ad.category) === 'budowa');
    } else if (quickFilter === 'instalacje') {
      base = base.filter((ad) => normalizeCategory(ad.category) === 'instalacje');
    }
    if (lassoPolygon && lassoPolygon.length >= 3) {
      base = base.filter((ad) => isPointInPolygon([ad.latitude!, ad.longitude!], lassoPolygon));
    }
    if (isochronePolygon && isochronePolygon.length >= 3) {
      base = base.filter((ad) => isPointInPolygon([ad.latitude!, ad.longitude!], isochronePolygon));
    }
    return base;
  }, [visibleAds, quickFilter, lassoPolygon, isochronePolygon]);

  // Detect app-level dark mode
  useEffect(() => {
    const readDark = () =>
      document.documentElement.classList.contains('dark') ||
      document.documentElement.getAttribute('data-theme') === 'dark';

    const dark = readDark();
    setIsDark(dark);
    isDarkRef.current = dark;

    let timeout: ReturnType<typeof setTimeout> | null = null;
    const observer = new MutationObserver(() => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        const d = readDark();
        setIsDark(d);
        isDarkRef.current = d;
      }, 50);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });

    return () => { observer.disconnect(); if (timeout) clearTimeout(timeout); };
  }, []);

  const ui = isDark ? UI.dark : UI.light;

  // Initialize MapLibre Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let map: maplibregl.Map | null = null;
    let styleLoadTimer: ReturnType<typeof setTimeout> | null = null;
    let initTimer: ReturnType<typeof setTimeout> | null = null;
    let usedFallback = false;

    // Parse initial parameters from URL if present
    let initialCenter = SZCZECIN;
    let initialZoom = DEFAULT_ZOOM;

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlLat = parseFloat(params.get('lat') || '');
      const urlLng = parseFloat(params.get('lng') || '');
      const urlZoom = parseFloat(params.get('zoom') || '');

      if (!isNaN(urlLat) && !isNaN(urlLng)) {
        initialCenter = [urlLng, urlLat];
      }
      if (!isNaN(urlZoom)) {
        initialZoom = urlZoom;
      }
    }

    // Delay instantiation if another map instance is active or was recently active.
    // This allows the browser's WebGL context to fully garbage collect.
    const delay = globalActiveMaps > 0 ? 250 : 30;

    initTimer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      try {
        map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: MAP_STYLES[mapStyle] || MAP_STYLES.emerald,
          center: initialCenter,
          zoom: initialZoom,
          minZoom: MIN_ZOOM,
          maxZoom: MAX_ZOOM,
          attributionControl: false,
          cooperativeGestures: false,
        });
      } catch (err) {
        console.warn('[MapView] Primary WebGL map creation failed, trying raster fallback:', err);
        try {
          map = new maplibregl.Map({
            container: mapContainerRef.current,
            style: FALLBACK_STYLE,
            center: initialCenter,
            zoom: initialZoom,
            minZoom: MIN_ZOOM,
            maxZoom: MAX_ZOOM,
            attributionControl: false,
          });
        } catch (fallbackErr) {
          console.error('[MapView] All map initializations failed:', fallbackErr);
          setMapError('Brak wsparcia dla WebGL w przeglądarce. Przełącz na zakładkę "Lista".');
          setTilesLoading(false);
          return;
        }
      }

      mapRef.current = map;

      // Add Google Maps-style navigation controls in bottom-right (3D pitch compass + smooth zoom)
      map.addControl(
        new maplibregl.NavigationControl({
          visualizePitch: true,
          showCompass: true,
          showZoom: true,
        }),
        'bottom-right'
      );

      // Update URL query parameters on map move
      const updateUrlParams = () => {
        if (!map) return;
        const center = map.getCenter();
        const z = map.getZoom();
        const params = new URLSearchParams(window.location.search);
        params.set('lat', center.lat.toFixed(5));
        params.set('lng', center.lng.toFixed(5));
        params.set('zoom', z.toFixed(1));
        window.history.replaceState(null, '', `?${params.toString()}`);
      };

      map.on('moveend', () => {
        setMoved(true);
        updateUrlParams();
      });
      map.on('zoomend', () => {
        setMoved(true);
        updateUrlParams();
      });

      // ─── ERROR HANDLING & FALLBACK ─────────────────────────────────
      map.on('error', (e) => {
        console.warn('[MapView] MapLibre error:', e.error?.message || e);
        if (!usedFallback && map && !map.isStyleLoaded()) {
          usedFallback = true;
          console.warn('[MapView] Vector style failed — falling back to OSM raster tiles');
          setMapError('Kafelki wektorowe niedostępne — używam mapy zastępczej.');
          try {
            map.setStyle(FALLBACK_STYLE);
          } catch {
            setMapError('Nie udało się załadować mapy. Sprawdź połączenie z internetem.');
          }
        }
      });

      // Timeout: if style doesn't load within STYLE_LOAD_TIMEOUT_MS, fall back
      styleLoadTimer = setTimeout(() => {
        if (map && !map.isStyleLoaded() && !usedFallback) {
          usedFallback = true;
          console.warn('[MapView] Style load timeout — falling back to OSM raster tiles');
          setMapError('Ładowanie kafelków trwa zbyt długo — używam mapy zastępczej.');
          try {
            map.setStyle(FALLBACK_STYLE);
          } catch {
            setMapError('Nie udało się załadować mapy. Sprawdź połączenie z internetem.');
          }
        }
      }, STYLE_LOAD_TIMEOUT_MS);

      // ─── STYLE LOAD HANDLER ──────────────────────────────────────────
      map.on('style.load', () => {
        if (styleLoadTimer) { clearTimeout(styleLoadTimer); styleLoadTimer = null; }
        setMapLoaded(true);
        setTilesLoading(false);

        const dark = isDarkRef.current;

        // ─── 1. WEBGL 3D BUILDINGS LAYER ──────────────────────────────
        if (!map) return;
        const layers = map.getStyle().layers;
        const labelLayerId = layers?.find(layer => layer.type === 'symbol' && layer.layout?.['text-field'])?.id;

        const hasOpenMapTiles = !!map.getSource('openmaptiles');
        const hasCarto = !!map.getSource('carto');
        const sourceId = hasOpenMapTiles ? 'openmaptiles' : (hasCarto ? 'carto' : null);

        if (sourceId) {
          try {
            if (!map.getLayer('3d-buildings')) {
              map.addLayer(
                {
                  id: '3d-buildings',
                  source: sourceId,
                  'source-layer': 'building',
                  type: 'fill-extrusion',
                  minzoom: 15,
                  paint: {
                    'fill-extrusion-color': dark ? '#2e3b4e' : '#cbd5e1',
                    'fill-extrusion-height': [
                      'interpolate', ['linear'], ['zoom'],
                      15, 0,
                      15.05, ['get', 'render_height']
                    ],
                    'fill-extrusion-base': [
                      'interpolate', ['linear'], ['zoom'],
                      15, 0,
                      15.05, ['get', 'render_min_height']
                    ],
                    'fill-extrusion-opacity': 0.65
                  }
                },
                labelLayerId
              );
            }
          } catch (err) {
            console.warn('Failed to add 3d-buildings layer:', err);
          }
        }

        // ─── 2. NATIVE WEBGL GEOJSON CLUSTERING SOURCE & LAYERS ─────────
        if (!map.getSource('jobs-cluster-source')) {
          map.addSource('jobs-cluster-source', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
            cluster: true,
            clusterMaxZoom: 14, // Max zoom to cluster points
            clusterRadius: 45,  // Radius of each cluster in pixels
          });
        }

        const isMobileScreen = typeof window !== 'undefined' && window.innerWidth < 768;

        // Cluster Circle Outer (halo/glow ring)
        if (!map.getLayer('cluster-halo')) {
          map.addLayer({
            id: 'cluster-halo',
            type: 'circle',
            source: 'jobs-cluster-source',
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': [
                'step', ['get', 'point_count'],
                '#10b981', 5,
                '#3b82f6', 15,
                '#f59e0b', 30,
                '#ef4444'
              ],
              'circle-radius': isMobileScreen
                ? ['step', ['get', 'point_count'], 17, 5, 21, 15, 25, 30, 30]
                : ['step', ['get', 'point_count'], 26, 5, 32, 15, 38, 30, 46],
              'circle-opacity': 0.18,
              'circle-stroke-width': 0,
            }
          });
        }

        // Cluster Circle Inner Layer
        if (!map.getLayer('clusters')) {
          map.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'jobs-cluster-source',
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': [
                'step',
                ['get', 'point_count'],
                '#10b981', 5,   // < 5 jobs: Emerald green
                '#3b82f6', 15,  // < 15 jobs: Vibrant blue
                '#f59e0b', 30,  // < 30 jobs: Warm amber
                '#ef4444'       // >= 30 jobs: Coral red
              ],
              'circle-radius': isMobileScreen
                ? ['step', ['get', 'point_count'], 12, 5, 15, 15, 18, 30, 22]
                : ['step', ['get', 'point_count'], 18, 5, 22, 15, 26, 30, 32],
              'circle-stroke-width': isMobileScreen ? 2 : 3,
              'circle-stroke-color': dark ? 'rgba(255, 255, 255, 0.9)' : '#ffffff',
              'circle-opacity': 0.95,
            }
          });
        }

        // Cluster Text Count Symbol Layer
        if (!map.getLayer('cluster-count')) {
          map.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'jobs-cluster-source',
            filter: ['has', 'point_count'],
            layout: {
              'text-field': '{point_count_abbreviated}',
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
              'text-size': isMobileScreen ? 9 : 12
            },
            paint: {
              'text-color': '#ffffff'
            }
          });
        }

        // Spiderfy connector leg lines source & layer
        if (!map.getSource('spider-legs-source')) {
          map.addSource('spider-legs-source', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
          });
        }

        if (!map.getLayer('spider-legs-layer')) {
          map.addLayer({
            id: 'spider-legs-layer',
            type: 'line',
            source: 'spider-legs-source',
            paint: {
              'line-color': dark ? '#60a5fa' : '#2563eb',
              'line-width': 2,
              'line-dasharray': [2, 2]
            }
          });
        }

        // Click on cluster -> Fly and expand
        map.on('click', 'clusters', async (e) => {
          if (!map) return;
          const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
          if (!features.length) return;

          const clusterId = features[0].properties.cluster_id;
          const source = map.getSource('jobs-cluster-source') as maplibregl.GeoJSONSource;

          try {
            const zoom = await source.getClusterExpansionZoom(clusterId);
            if (zoom == null) return;

            const geometry = features[0].geometry as GeoJSON.Point;
            map.easeTo({
              center: geometry.coordinates as [number, number],
              zoom: Math.min(zoom + 0.5, MAX_ZOOM),
              duration: 600,
            });
          } catch {
            // Cluster may have been removed during async operation
          }
        });

        // Change cursor on cluster hover
        map.on('mouseenter', 'clusters', () => { if (map) map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'clusters', () => { if (map) map.getCanvas().style.cursor = ''; });
        map.on('mouseenter', 'cluster-halo', () => { if (map) map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'cluster-halo', () => { if (map) map.getCanvas().style.cursor = ''; });

        // ─── 3. HEATMAP SOURCE & LAYER ─────────────────────────────────
        if (!map.getSource('heatmap-source')) {
          map.addSource('heatmap-source', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
          });
        }

        if (!map.getLayer('heatmap-layer')) {
          map.addLayer({
            id: 'heatmap-layer',
            type: 'heatmap',
            source: 'heatmap-source',
            maxzoom: 15,
            paint: {
              'heatmap-weight': 1,
              'heatmap-intensity': [
                'interpolate', ['linear'], ['zoom'],
                0, 1, 15, 3
              ],
              'heatmap-color': [
                'interpolate', ['linear'], ['heatmap-density'],
                0, 'rgba(6, 182, 212, 0)',
                0.15, 'rgba(6, 182, 212, 0.2)',
                0.35, 'rgba(34, 211, 238, 0.45)',
                0.5, 'rgba(52, 211, 153, 0.65)',
                0.65, 'rgba(251, 191, 36, 0.8)',
                0.8, 'rgba(249, 115, 22, 0.9)',
                1, 'rgba(239, 68, 68, 0.95)'
              ],
              'heatmap-radius': [
                'interpolate', ['linear'], ['zoom'],
                0, 2, 15, 30
              ],
              'heatmap-opacity': 0.8
            }
          });
        }

        map.setLayoutProperty('heatmap-layer', 'visibility', showHeatmap ? 'visible' : 'none');
      });
    }, delay);

    const popupRoots = popupRootsRef.current;
    const markers = markersRef.current;

    return () => {
      if (initTimer) clearTimeout(initTimer);
      if (styleLoadTimer) clearTimeout(styleLoadTimer);

      globalActiveMaps = Math.max(0, globalActiveMaps - 1);

      // Defer unmounts to avoid synchronous unmount during React render (Fast Refresh)
      const rootsToUnmount = new Map(popupRoots);
      popupRoots.clear();
      setTimeout(() => {
        rootsToUnmount.forEach(root => { try { root.unmount(); } catch { /* ignore */ } });
      }, 0);

      markers.forEach((marker) => marker.remove());
      markers.clear();
      if (homeMarkerRef.current) {
        homeMarkerRef.current.remove();
        homeMarkerRef.current = null;
      }
      if (geoMarkerRef.current) {
        geoMarkerRef.current.remove();
        geoMarkerRef.current = null;
      }
      spiderMarkersRef.current.forEach(m => m.remove());
      spiderMarkersRef.current = [];

      setMapLoaded(false);
      
      // Detach event listeners and release WebGL context explicitly
      if (mapRef.current) {
        try {
          mapRef.current.off('style.load', () => {});
          mapRef.current.off('click', 'clusters', () => {});
          mapRef.current.off('mouseenter', 'clusters', () => {});
          mapRef.current.off('mouseleave', 'clusters', () => {});
          mapRef.current.off('moveend', () => {});
          mapRef.current.off('zoomend', () => {});
          mapRef.current.off('error', () => {});
          mapRef.current.remove();
        } catch (err) {
          console.warn('Error during MapLibre instance cleanup:', err);
        }
      }
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle theme style switching without recreating the map instance/WebGL context
  const lastTheme = useRef(isDark);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || isDark === lastTheme.current) return;
    lastTheme.current = isDark;
    setMapLoaded(false);
    map.setStyle(MAP_STYLES[mapStyle] || MAP_STYLES.emerald, { diff: false });
  }, [isDark, mapStyle]);

  // Handle Heatmap Visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    map.setLayoutProperty('heatmap-layer', 'visibility', showHeatmap ? 'visible' : 'none');
    if (map.getLayer('clusters')) {
      map.setLayoutProperty('clusters', 'visibility', showHeatmap ? 'none' : 'visible');
      map.setLayoutProperty('cluster-count', 'visibility', showHeatmap ? 'none' : 'visible');
    }
    if (map.getLayer('cluster-halo')) {
      map.setLayoutProperty('cluster-halo', 'visibility', showHeatmap ? 'none' : 'visible');
    }

    markersRef.current.forEach(marker => {
      const el = marker.getElement();
      if (el) el.style.display = showHeatmap ? 'none' : 'block';
    });
  }, [showHeatmap, mapLoaded]);

  // Handle District Salary Heatmap Layer Sync
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (!map.getSource('district-salary-source')) {
      map.addSource('district-salary-source', {
        type: 'geojson',
        data: getDistrictSalaryGeoJson(),
      });
    }

    if (!map.getLayer('district-salary-layer')) {
      map.addLayer({
        id: 'district-salary-layer',
        type: 'fill',
        source: 'district-salary-source',
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': showSalaryHeatmap ? 0.35 : 0,
        },
      });
    } else {
      map.setPaintProperty('district-salary-layer', 'fill-opacity', showSalaryHeatmap ? 0.35 : 0);
    }
  }, [showSalaryHeatmap, mapLoaded]);

  // Sync GeoJSON data to WebGL Cluster Source & Heatmap Source
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const clusterSource = map.getSource('jobs-cluster-source') as maplibregl.GeoJSONSource;
    const heatmapSource = map.getSource('heatmap-source') as maplibregl.GeoJSONSource;

    const featureCollection: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: geocodedAds.map(ad => {
        const pos = jitteredPosition(ad.latitude!, ad.longitude!, ad.id);
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [pos[1], pos[0]] // [lng, lat]
          },
          properties: {
            id: ad.id,
            category: ad.category,
            title: ad.title,
            price: ad.price ?? '',
          }
        };
      })
    };

    if (clusterSource) clusterSource.setData(featureCollection);
    if (heatmapSource) heatmapSource.setData(featureCollection);
  }, [geocodedAds, mapLoaded]);

  // Commute Radius Circle & Home Marker Integration
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const sourceId = 'commute-radius';
    const fillLayerId = 'commute-radius-fill';
    const lineLayerId = 'commute-radius-line';

    if (homeMarkerRef.current) {
      homeMarkerRef.current.remove();
      homeMarkerRef.current = null;
    }

    if (homeLat == null || homeLng == null || maxDistanceKm == null) {
      if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
      if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      return;
    }

    const circleGeoJson = createGeoJsonCircle([homeLng, homeLat], maxDistanceKm);

    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(circleGeoJson);
    } else {
      map.addSource(sourceId, {
        type: 'geojson',
        data: circleGeoJson,
      });

      map.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': '#2563eb',
          'fill-opacity': 0.05,
        },
      });

      map.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#2563eb',
          'line-width': 2,
          'line-dasharray': [3, 2],
        },
      });
    }

    const homeEl = document.createElement('div');
    homeEl.style.width = '24px';
    homeEl.style.height = '24px';
    homeEl.style.display = 'flex';
    homeEl.style.alignItems = 'center';
    homeEl.style.justifyContent = 'center';
    homeEl.style.fontSize = '16px';
    homeEl.innerHTML = '🏠';

    const homeMarker = new maplibregl.Marker({ element: homeEl })
      .setLngLat([homeLng, homeLat])
      .addTo(map);

    homeMarkerRef.current = homeMarker;
  }, [homeLat, homeLng, maxDistanceKm, mapLoaded]);

  // Open Popup function
  const openPopup = useCallback((ad: DisplayAnnouncement, coordinates: [number, number]) => {
    const map = mapRef.current;
    if (!map) return;

    // Defer unmount of existing root to avoid "synchronous unmount during render" React warning
    const existingRoot = popupRootsRef.current.get(ad.id);
    if (existingRoot) {
      popupRootsRef.current.delete(ad.id);
      setTimeout(() => { try { existingRoot.unmount(); } catch { /* ignore */ } }, 0);
    }

    // Remove any previously active popup
    if (activePopupRef.current) {
      activePopupRef.current.remove();
      activePopupRef.current = null;
    }

    const popupContainer = document.createElement('div');
    popupContainer.className = 'maplibre-popup-content';
    const root = createRoot(popupContainer);
    popupRootsRef.current.set(ad.id, root);

    const renderPopupContent = () => {
      root.render(
        <MarkerPopup
          ad={ad}
          isFavorite={isFavorite(ad.id)}
          onToggleFavorite={() => {
            onToggleFavorite(ad.id);
            setTimeout(renderPopupContent, 10);
          }}
          onShowInList={() => onShowInList?.(ad.id)}
          isDark={isDark}
          homeLat={homeLat}
          homeLng={homeLng}
        />
      );
    };

    renderPopupContent();

    const popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      offset: [0, -42],
      maxWidth: '320px',
    })
      .setLngLat(coordinates)
      .setDOMContent(popupContainer)
      .addTo(map);

    activePopupRef.current = popup;

    popup.on('close', () => {
      popupRootsRef.current.delete(ad.id);
      if (activePopupRef.current === popup) {
        activePopupRef.current = null;
      }
      // Defer unmount to avoid synchronous unmount during React render cycle
      setTimeout(() => { try { root.unmount(); } catch { /* ignore */ } }, 0);
    });
  }, [isFavorite, onToggleFavorite, onShowInList, isDark, homeLat, homeLng]);

  // ─── SPIDERFY & UNCLUSTERED MARKER SYNC ──────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Group items by coordinate to detect overlapping pins
    const coordGroups = new Map<string, DisplayAnnouncement[]>();
    geocodedAds.forEach(ad => {
      const pos = jitteredPosition(ad.latitude!, ad.longitude!, ad.id);
      const key = `${pos[1].toFixed(5)},${pos[0].toFixed(5)}`;
      const existing = coordGroups.get(key) || [];
      existing.push(ad);
      coordGroups.set(key, existing);
    });

    const currentIds = new Set(geocodedAds.map(ad => ad.id));
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Clear previous spider legs
    spiderMarkersRef.current.forEach(m => m.remove());
    spiderMarkersRef.current = [];
    const spiderLegFeatures: GeoJSON.Feature[] = [];

    const zoom = map.getZoom();

    coordGroups.forEach((group, key) => {
      const [lng, lat] = key.split(',').map(Number);
      const spiderPositions = generateSpiderfyPositions([lng, lat], group.length, zoom);

      group.forEach((ad, idx) => {
        const targetCoords = group.length > 1 ? spiderPositions[idx] : [lng, lat] as [number, number];

        if (group.length > 1) {
          // Draw connecting line leg feature
          spiderLegFeatures.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [[lng, lat], targetCoords]
            },
            properties: {}
          });
        }

        const isDimmed = (homeLat != null && homeLng != null && maxDistanceKm != null)
          ? haversineKm(homeLat, homeLng, ad.latitude!, ad.longitude!) > maxDistanceKm
          : false;

        const isFav = isFavorite(ad.id);
        const isSelected = ad.id === selectedId;

        let marker = markersRef.current.get(ad.id);

        if (!marker) {
          const el = document.createElement('div');
          el.className = 'job-marker';
          el.style.display = showHeatmap ? 'none' : 'block';
          el.innerHTML = getMarkerHtml(ad.category, isFav, isSelected, isDimmed, ad.price);

          marker = new maplibregl.Marker({ element: el })
            .setLngLat(targetCoords)
            .addTo(map);

          el.addEventListener('click', (e) => {
            e.stopPropagation();
            triggerHaptic(10);
            onMarkerClick?.(ad.id);
            openPopup(ad, targetCoords);
          });

          markersRef.current.set(ad.id, marker);
        } else {
          const el = marker.getElement();
          if (el) {
            el.innerHTML = getMarkerHtml(ad.category, isFav, isSelected, isDimmed, ad.price);
            el.style.display = showHeatmap ? 'none' : 'block';
          }
          marker.setLngLat(targetCoords);
        }
      });
    });

    // Update Spider Legs Source
    const spiderLegsSource = map.getSource('spider-legs-source') as maplibregl.GeoJSONSource;
    if (spiderLegsSource) {
      spiderLegsSource.setData({
        type: 'FeatureCollection',
        features: spiderLegFeatures
      });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geocodedAds, selectedId, isFavorite, mapLoaded]);

  // FlyTo on external selectedId (e.g. "Pokaż na mapie" click)
  const lastFlyToken = useRef(-1);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || flyToken === lastFlyToken.current || !selectedId) return;
    lastFlyToken.current = flyToken;

    const ad = geocodedAds.find(a => a.id === selectedId);
    if (!ad) return;

    const position = jitteredPosition(ad.latitude!, ad.longitude!, ad.id);
    const coordinates: [number, number] = [position[1], position[0]];

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const bottomPadding = isMobile
      ? sheetSnapState === 'expanded'
        ? window.innerHeight * 0.85
        : sheetSnapState === 'medium'
        ? window.innerHeight * 0.42
        : 90
      : 0;

    map.flyTo({
      center: coordinates,
      zoom: Math.max(map.getZoom(), FLY_TO_ZOOM),
      padding: { top: 60, bottom: bottomPadding, left: 0, right: 0 },
      essential: true,
      duration: prefersReducedMotion ? 0 : 1200,
    });
    openPopup(ad, coordinates);
  }, [selectedId, flyToken, geocodedAds, mapLoaded, prefersReducedMotion, sheetSnapState, openPopup]);

  const handleCarouselSelect = useCallback((id: string) => {
    onMarkerClick?.(id);
    const ad = geocodedAds.find(a => a.id === id);
    if (ad && mapRef.current) {
      const position = jitteredPosition(ad.latitude!, ad.longitude!, ad.id);
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const bottomPadding = isMobile
        ? sheetSnapState === 'expanded'
          ? window.innerHeight * 0.85
          : sheetSnapState === 'medium'
          ? window.innerHeight * 0.42
          : 90
        : 0;

      mapRef.current.flyTo({
        center: [position[1], position[0]],
        zoom: Math.max(mapRef.current.getZoom(), FLY_TO_ZOOM),
        padding: { top: 60, bottom: bottomPadding, left: 0, right: 0 },
        essential: true,
        duration: prefersReducedMotion ? 0 : 1000,
      });
      openPopup(ad, [position[1], position[0]]);
    }
  }, [geocodedAds, onMarkerClick, openPopup, prefersReducedMotion, sheetSnapState]);

  // Search Area button click handler
  const handleSearchAreaClick = useCallback(() => {
    const map = mapRef.current;
    if (!map || !onSearchArea) return;

    const b = map.getBounds();
    onSearchArea({
      south: b.getSouth(),
      west: b.getWest(),
      north: b.getNorth(),
      east: b.getEast(),
    });
    setMoved(false);
  }, [onSearchArea]);

  // Geolocation trigger
  const [locating, setLocating] = useState(false);
  const handleLocateClick = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!navigator.geolocation) {
      setMapError('Geolokalizacja nie jest wspierana przez Twoją przeglądarkę.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        map.flyTo({ center: coords, zoom: 14, duration: prefersReducedMotion ? 0 : 1400 });

        const accuracy = pos.coords.accuracy;
        const sourceId = 'user-accuracy';
        const circleGeoJson = createGeoJsonCircle(coords, accuracy / 1000);

        if (map.getSource(sourceId)) {
          (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(circleGeoJson);
        } else {
          map.addSource(sourceId, { type: 'geojson', data: circleGeoJson });
          map.addLayer({
            id: 'user-accuracy-layer',
            type: 'fill',
            source: sourceId,
            paint: { 'fill-color': '#2563eb', 'fill-opacity': 0.1 }
          });
        }

        // Remove previous geolocation marker if exists
        if (geoMarkerRef.current) {
          geoMarkerRef.current.remove();
        }

        const dot = document.createElement('div');
        dot.style.width = '16px';
        dot.style.height = '16px';
        dot.style.background = '#2563eb';
        dot.style.borderRadius = '50%';
        dot.style.border = '3px solid white';
        dot.style.boxShadow = '0 2px 8px rgba(37,99,235,0.5)';

        geoMarkerRef.current = new maplibregl.Marker({ element: dot })
          .setLngLat(coords)
          .addTo(map);

        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setMapError('Brak uprawnień do geolokalizacji. Zezwól na dostęp w ustawieniach przeglądarki.');
        } else if (err.code === err.TIMEOUT) {
          setMapError('Nie udało się pobrać lokalizacji — przekroczono czas oczekiwania.');
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [prefersReducedMotion]);


  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', background: ui.mapBg }}>
      {/* MapLibre Container */}
      <div ref={mapContainerRef} style={{ height: '100%', width: '100%', background: ui.mapBg }} />

      {/* Loading indicator while tiles are loading */}
      {tilesLoading && !mapError && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
          background: ui.surfaceAlpha, backdropFilter: 'blur(10px)', borderRadius: '16px',
          padding: '24px 32px', boxShadow: ui.shadow, border: `1px solid ${ui.border}`,
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            borderWidth: '3px',
            borderStyle: 'solid',
            borderLeftColor: ui.border,
            borderRightColor: ui.border,
            borderBottomColor: ui.border,
            borderTopColor: '#2563eb',
            animation: 'map-loader-spin 0.8s linear infinite',
          }} />
          <span style={{ fontSize: '13px', color: ui.textMuted, fontWeight: 500 }}>Ładowanie mapy…</span>
        </div>
      )}

      {/* Error / fallback notification banner */}
      {mapError && (
        <div style={{
          position: 'absolute', top: '52px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 20, padding: '8px 18px', background: '#fef3c7', border: '1px solid #f59e0b',
          borderRadius: '10px', fontSize: '12px', fontWeight: 600, color: '#92400e',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '8px',
          maxWidth: '90%', whiteSpace: 'nowrap',
        }}>
          <span>⚠️</span>
          <span>{mapError}</span>
          <button
            onClick={() => setMapError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#92400e', padding: '0 2px', lineHeight: 1 }}
            aria-label="Zamknij"
          >✕</button>
        </div>
      )}

      {/* 🧭 Master Enlarged Collapsible Map Menu (Lewa Strona) */}
      <div className="absolute top-14 left-3 z-20 flex flex-col items-start gap-1.5 pointer-events-auto">
        {/* Main Trigger Toggle Pill */}
        <button
          onClick={() => {
            triggerHaptic(15);
            setIsMapMenuOpen(!isMapMenuOpen);
          }}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-zinc-950/90 hover:bg-zinc-900/95 border border-white/10 hover:border-emerald-500/40 shadow-2xl shadow-black/60 backdrop-blur-2xl text-xs font-black text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer group"
          title="Zwiń / Rozwiń menu narzędzi mapy"
        >
          <span className="text-base group-hover:scale-110 transition-transform">🗺️</span>
          <span className="font-black tracking-wide text-zinc-100">Narzędzia i Warstwy</span>
          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[10px] text-emerald-400 font-mono font-bold">
            {geocodedAds.length}
          </span>
          <span className="text-zinc-400 text-[11px] font-bold group-hover:text-emerald-400 transition-colors">{isMapMenuOpen ? '▲' : '▼'}</span>
        </button>

        {/* Expanded Floating Palette (Modern Ergonomic Design) */}
        {isMapMenuOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="p-2.5 rounded-2xl bg-zinc-950/95 backdrop-blur-2xl border border-white/15 shadow-2xl shadow-black/80 w-64 sm:w-72 max-h-[70vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-3 custom-scrollbar z-30 select-none"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-1 pb-1.5 border-b border-white/10 shrink-0">
              <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                <span>🧭</span> Narzędzia Mapy Szczecina
              </span>
              <span className="text-zinc-400 font-mono text-[10px] font-bold">
                {geocodedAds.length} ofert
              </span>
            </div>

            {/* Section 1: Nawigacja i Widok 3D */}
            <div className="space-y-1">
              <div className="text-[9px] font-bold uppercase text-zinc-400 px-1 tracking-wider">
                Nawigacja & Widok
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {/* Moja Pozycja */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLocateClick();
                  }}
                  title="Moja lokalizacja"
                  className="flex items-center gap-2 p-2 rounded-xl text-left text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all cursor-pointer text-xs font-semibold"
                >
                  <span className="text-base leading-none">{locating ? '⏳' : '📍'}</span>
                  <span className="truncate">Lokalizacja</span>
                </button>

                {/* Centrum Szczecina */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic(10);
                    mapRef.current?.flyTo({ center: SZCZECIN, zoom: DEFAULT_ZOOM, duration: prefersReducedMotion ? 0 : undefined });
                  }}
                  title="Powrót do Centrum Szczecina"
                  className="flex items-center gap-2 p-2 rounded-xl text-left text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all cursor-pointer text-xs font-semibold"
                >
                  <span className="text-base leading-none">🏠</span>
                  <span className="truncate">Centrum</span>
                </button>

                {/* 3D Tilt */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic(10);
                    const map = mapRef.current;
                    if (!map) return;
                    const is3d = map.getPitch() > 10;
                    map.easeTo({
                      pitch: is3d ? 0 : 55,
                      bearing: is3d ? 0 : -18,
                      duration: prefersReducedMotion ? 0 : 800
                    });
                  }}
                  title="Przełącz perspektywę trójwymiarową"
                  className="flex items-center gap-2 p-2 rounded-xl text-left text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all cursor-pointer text-xs font-semibold"
                >
                  <span className="text-base leading-none">🧊</span>
                  <span className="truncate">Widok 3D</span>
                </button>

                {/* Wały Chrobrego */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const map = mapRef.current;
                    if (!map) return;
                    triggerHaptic(12);
                    map.flyTo({
                      center: [14.565, 53.429],
                      zoom: 15.5,
                      pitch: 62,
                      bearing: 135,
                      duration: prefersReducedMotion ? 0 : 1500,
                    });
                  }}
                  title="Panorama Wałów Chrobrego & Łasztowni"
                  className="flex items-center gap-2 p-2 rounded-xl text-left text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all cursor-pointer text-xs font-semibold"
                >
                  <span className="text-base leading-none">🌊</span>
                  <span className="truncate">Wały & Odra</span>
                </button>

                {/* Motyw Mapy */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = mapStyle === 'emerald' ? 'dark' : mapStyle === 'dark' ? 'light' : 'emerald';
                    handleSelectStyle(next);
                    triggerHaptic(10);
                  }}
                  title={`Zmień motyw mapy (obecny: ${mapStyle})`}
                  className="flex items-center gap-2 p-2 rounded-xl text-left text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all cursor-pointer text-xs font-semibold"
                >
                  <span className="text-base leading-none">{mapStyle === 'dark' ? '🌙' : mapStyle === 'light' ? '☀️' : '🌿'}</span>
                  <span className="truncate capitalize">{mapStyle}</span>
                </button>

                {/* Oświetlenie Słońca */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic(10);
                    const map = mapRef.current;
                    if (!map) return;
                    const currentHour = new Date().getHours();
                    const isNight = currentHour < 6 || currentHour >= 21;
                    const isGolden = currentHour >= 17 && currentHour < 21;
                    try {
                      map.setLight({
                        anchor: 'viewport',
                        color: isNight ? '#38bdf8' : isGolden ? '#fbbf24' : '#ffffff',
                        intensity: isNight ? 0.45 : 0.65,
                        position: isNight ? [1.1, 0, 45] : [1.5, 240, 50],
                      });
                    } catch {
                      /* non-fatal */
                    }
                  }}
                  title="Dynamiczne Oświetlenie Słońca Szczecina"
                  className="flex items-center gap-2 p-2 rounded-xl text-left text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all cursor-pointer text-xs font-semibold"
                >
                  <span className="text-base leading-none">☀️</span>
                  <span className="truncate">Światło</span>
                </button>
              </div>
            </div>

            {/* Section 2: Warstwy & Analizy Przestrzenne */}
            <div className="space-y-1">
              <div className="text-[9px] font-bold uppercase text-zinc-400 px-1 tracking-wider">
                Warstwy & Analizy
              </div>
              <div className="flex flex-col gap-1">
                {/* Blisko Mnie */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNearMeClick();
                  }}
                  title="Praca blisko mnie (5km)"
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all cursor-pointer text-xs font-semibold"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">🎯</span>
                    <span>W promieniu 5 km</span>
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">GPS</span>
                </button>

                {/* Duże Budowy */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic(10);
                    setShowConstructionSites(!showConstructionSites);
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer text-xs font-semibold border ${
                    showConstructionSites
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                      : 'text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/20'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">🏗️</span>
                    <span>Wielkie Inwestycje</span>
                  </span>
                  <span className={`w-2 h-2 rounded-full ${showConstructionSites ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                </button>

                {/* Zarobki & Stawki */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic(10);
                    setShowSalaryHeatmap(!showSalaryHeatmap);
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer text-xs font-semibold border ${
                    showSalaryHeatmap
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 shadow-sm'
                      : 'text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/20'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">💰</span>
                    <span>Stawki Dzielnicowe</span>
                  </span>
                  <span className={`w-2 h-2 rounded-full ${showSalaryHeatmap ? 'bg-teal-400 animate-pulse' : 'bg-zinc-600'}`} />
                </button>

                {/* Statystyki Dzielnic */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic(10);
                    setShowDistrictAnalytics(!showDistrictAnalytics);
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer text-xs font-semibold border ${
                    showDistrictAnalytics
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                      : 'text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/20'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">📊</span>
                    <span>Statystyki Dzielnic</span>
                  </span>
                  <span className={`w-2 h-2 rounded-full ${showDistrictAnalytics ? 'bg-amber-400 animate-pulse' : 'bg-zinc-600'}`} />
                </button>

                {/* Przystanki ZTM */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic(10);
                    setShowTransitStops(!showTransitStops);
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer text-xs font-semibold border ${
                    showTransitStops
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/50 shadow-sm'
                      : 'text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/20'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">🚏</span>
                    <span>Węzły ZTM Szczecin</span>
                  </span>
                  <span className={`w-2 h-2 rounded-full ${showTransitStops ? 'bg-blue-400 animate-pulse' : 'bg-zinc-600'}`} />
                </button>

                {/* Pogoń Szczecin */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic(10);
                    setShowPogonHub(!showPogonHub);
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer text-xs font-semibold border ${
                    showPogonHub
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-sm'
                      : 'text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/20'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">⚓</span>
                    <span>Pogoń Szczecin (Miejsca)</span>
                  </span>
                  <span className={`w-2 h-2 rounded-full ${showPogonHub ? 'bg-indigo-400 animate-pulse' : 'bg-zinc-600'}`} />
                </button>

                {/* Lasso / Własny obszar */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic(10);
                    setIsLassoDrawing(!isLassoDrawing);
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer text-xs font-semibold border ${
                    isLassoDrawing || lassoPolygon
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                      : 'text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/20'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">✏️</span>
                    <span>Rysuj Obszar (Lasso)</span>
                  </span>
                  <span className={`w-2 h-2 rounded-full ${isLassoDrawing || lassoPolygon ? 'bg-amber-400 animate-pulse' : 'bg-zinc-600'}`} />
                </button>

                {/* Izochrona czasu dojazdu */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic(10);
                    setShowIsochroneModal(!showIsochroneModal);
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer text-xs font-semibold border ${
                    showIsochroneModal || isochronePolygon
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/50 shadow-sm'
                      : 'text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/20'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">⏱️</span>
                    <span>Strefa Dojazdu (Izochrona)</span>
                  </span>
                  <span className={`w-2 h-2 rounded-full ${showIsochroneModal || isochronePolygon ? 'bg-blue-400 animate-pulse' : 'bg-zinc-600'}`} />
                </button>

                {/* Geo-Alerty */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic(10);
                    setShowGeoAlertModal(!showGeoAlertModal);
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer text-xs font-semibold border ${
                    showGeoAlertModal
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-sm'
                      : 'text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/20'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">🔔</span>
                    <span>Alerty Przestrzenne</span>
                  </span>
                  <span className={`w-2 h-2 rounded-full ${showGeoAlertModal ? 'bg-purple-400 animate-pulse' : 'bg-zinc-600'}`} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Construction Sites, Transit & Pogoń Overlays */}
      <MapConstructionSites
        isVisible={showConstructionSites}
        onToggleVisible={() => setShowConstructionSites(false)}
        onSelectSite={(site) => {
          mapRef.current?.flyTo({ center: [site.lng, site.lat], zoom: 14 });
        }}
      />
      <MapTransitStops
        isVisible={showTransitStops}
        onClose={() => setShowTransitStops(false)}
      />
      <MapPogonSzczecin
        isVisible={showPogonHub}
        onClose={() => setShowPogonHub(false)}
        onNavigateToStadium={() => {
          mapRef.current?.flyTo({ center: POGON_STADIUM_COORDS, zoom: 15 });
        }}
      />

      {/* Live Construction Weather Widget */}
      <MapWeatherWidget ui={ui} isDark={isDark} />

      {/* 🕐 Freshness Indicator (Pod Pogodą na Górze po Prawej) */}
      <div className="absolute top-14 right-3 z-20 hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950/85 backdrop-blur-xl border border-zinc-800 text-[11px] font-bold text-zinc-300 shadow-lg">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-zinc-400">Aktualizacja:</span>
        <span className="text-emerald-400 font-semibold">przed chwilą</span>
      </div>

      {/* Custom Lasso Polygon Drawing Tool */}
      <MapLassoDraw
        map={mapRef.current}
        onPolygonChange={setLassoPolygon}
        ui={ui}
        isDrawingActive={isLassoDrawing}
        onToggleDrawing={() => setIsLassoDrawing(!isLassoDrawing)}
        hideTriggerButton={true}
      />

      {/* Travel Time Isochrone Overlay */}
      <MapIsochrone
        map={mapRef.current}
        homeLat={homeLat}
        homeLng={homeLng}
        onIsochroneChange={setIsochronePolygon}
        ui={ui}
        isOpen={showIsochroneModal}
        onClose={() => setShowIsochroneModal(false)}
        hideTriggerButton={true}
      />

      {/* Spatial District Analytics Overlay */}
      <MapDistrictAnalytics
        map={mapRef.current}
        ads={geocodedAds}
        visible={showDistrictAnalytics}
        ui={ui}
        isDark={isDark}
      />

      {/* Geo-Alerts Spatial Notifications Overlay */}
      <MapGeoAlert
        map={mapRef.current}
        ui={ui}
        isOpen={showGeoAlertModal}
        onClose={() => setShowGeoAlertModal(false)}
        hideTriggerButton={true}
      />

      {/* Mobile Snap Bottom Sheet (Hidden when a specific job modal is active) */}
      {!selectedId && (
        <MobileBottomSheet
          ads={geocodedAds}
          selectedAd={geocodedAds.find((a) => a.id === selectedId) || null}
          selectedId={selectedId}
          onSelectAd={(id: string) => onMarkerClick?.(id)}
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
          onShowOnMap={(id: string) => onMarkerClick?.(id)}
          onSnapStateChange={setSheetSnapState}
          ui={ui}
          isDark={isDark}
        />
      )}

      {/* 🚀 Draggable Centered Job Modal */}
      {selectedId && (
        <DraggableJobModal
          ad={geocodedAds.find((a) => a.id === selectedId) || null}
          onClose={() => onMarkerClick?.('')}
          onShowInList={() => {
            const ad = geocodedAds.find((a) => a.id === selectedId);
            if (ad) onShowInList?.(ad.id);
          }}
          isFavorite={selectedId ? isFavorite(selectedId) : false}
          onToggleFavorite={() => {
            if (selectedId) onToggleFavorite(selectedId);
          }}
          ui={ui}
          isDark={isDark}
          homeLat={homeLat}
          homeLng={homeLng}
        />
      )}

      {/* "Search in this area" button */}
      <SearchAreaButton
        visible={Boolean(onSearchArea && moved)}
        onClick={handleSearchAreaClick}
        ui={ui}
      />

      {/* 🎯 Active Spatial Filter Region Pill */}
      {(lassoPolygon || isochronePolygon) && (
        <div style={{
          position: 'absolute', top: '96px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 15, background: '#10b981', color: 'white', fontSize: '12px',
          fontWeight: 700, padding: '6px 14px', borderRadius: '20px', boxShadow: '0 4px 14px rgba(16,185,129,0.4)',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span>✨ Wycięta strefa: {geocodedAds.length} ofert</span>
          <button
            onClick={() => { setLassoPolygon(null); setIsochronePolygon(null); }}
            style={{ background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: '50%', width: '18px', height: '18px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', cursor: 'pointer' }}
            title="Wyczyść wyciętą strefę"
          >✕</button>
        </div>
      )}

      {/* Category filter bar */}
      <CategoryFilter active={activeCategories} onChange={onCategoryChange} ui={ui} top={12} />

      {/* Bottom announcement cards carousel */}
      {!showHeatmap && (
        <ResultsCarousel
          ads={geocodedAds}
          selectedId={selectedId}
          ui={ui}
          isDark={isDark}
          isFavorite={isFavorite}
          onSelect={handleCarouselSelect}
        />
      )}

      {geocodedAds.length === 0 && (
        <EmptyOverlay
          ui={ui}
          hasAny={visibleAds.length > 0 || ads.length > 0}
          onReset={() => {
            onCategoryChange(new Set(ALL_CATEGORY_KEYS));
            setLassoPolygon(null);
            setIsochronePolygon(null);
          }}
        />
      )}

      {/* Premium UI adjustments for MapLibre Popups */}
      <style>{`
        .maplibre-popup-content {
          padding: 0 !important;
        }
        .maplibregl-popup-content {
          background: ${isDark ? '#111827' : '#ffffff'} !important;
          color: ${ui.text} !important;
          border-radius: 14px !important;
          box-shadow: 0 16px 48px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.12) !important;
          border: 1px solid ${ui.border} !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
        .maplibregl-popup-tip {
          border-top-color: ${isDark ? '#111827' : '#ffffff'} !important;
          border-bottom-color: ${isDark ? '#111827' : '#ffffff'} !important;
        }
        .maplibregl-popup-close-button {
          color: ${ui.textMuted} !important;
          font-size: 18px !important;
          width: 28px !important;
          height: 28px !important;
          top: 6px !important;
          right: 6px !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: ${isDark ? 'rgba(55,65,81,0.7)' : 'rgba(243,244,246,0.9)'} !important;
          line-height: 1 !important;
          z-index: 2 !important;
          transition: background 0.15s ease !important;
        }
        .maplibregl-popup-close-button:hover {
          background: ${isDark ? 'rgba(75,85,99,0.9)' : 'rgba(229,231,235,1)'} !important;
        }
        .maplibregl-ctrl-top-right {
          top: 198px !important;
        }
        .maplibregl-ctrl-group {
          background: ${ui.surface} !important;
          border: 1px solid ${ui.border} !important;
          box-shadow: ${ui.shadow} !important;
          border-radius: 10px !important;
        }
        .maplibregl-ctrl-group button {
          color: ${ui.text} !important;
          transition: background-color 0.15s ease !important;
        }
        .maplibregl-ctrl-group button:hover {
          background-color: ${isDark ? '#374151' : '#f3f4f6'} !important;
        }
        
        /* Smooth marker appearance animation */
        .job-marker > div {
          animation: marker-fade-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          transform-origin: bottom center;
        }

        @keyframes marker-fade-in {
          0% {
            opacity: 0;
            transform: scale(0.5) translateY(12px);
          }
          70% {
            opacity: 1;
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        /* Pulse ring for selected marker */
        @keyframes marker-pulse {
          0% {
            transform: translate(-50%, -65%) scale(0.8);
            opacity: 0.9;
          }
          70% {
            transform: translate(-50%, -65%) scale(1.5);
            opacity: 0;
          }
          100% {
            transform: translate(-50%, -65%) scale(1.5);
            opacity: 0;
          }
        }

        @keyframes map-loader-spin { to { transform: rotate(360deg); } }

        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
