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
import { isPointInPolygon, generateSpiderfyPositions, createGeoJsonCircle, isValidCoordinate, sanitizeFeatureCollection, matchesSalaryFilter, type MapSalaryFilter } from './utils';
import { MapConstructionSites } from './MapConstructionSites';
import { MapTransitStops } from './MapTransitStops';
import { MapPogonSzczecin, POGON_STADIUM_COORDS } from './MapPogonSzczecin';
import { getQuickSmsHref, getZditmTransitUrl } from '@/lib/geo/transitRouting';
import { findNearestSupplier, SZCZECIN_CONSTRUCTION_SUPPLIERS, type ConstructionSupplier } from '@/lib/geo/szczecinSuppliers';
import { isJobWithinRadar, loadSavedHomeBase, saveHomeBase } from '@/lib/geo/homeBaseRadar';
import { MapSuppliersModal } from './MapSuppliersModal';
import { MapHomeRadarModal } from './MapHomeRadarModal';
import { SZCZECIN_LANDMARKS_3D, getSzczecinLandmarks3DPolygonsGeoJson, type SzczecinLandmark3D } from '@/lib/geo/szczecinLandmarks3D';
import { LandmarkDetailModal } from './LandmarkDetailModal';
import { applySunlightToMap, getSunlightPreset, type SunlightMode } from '@/lib/geo/sunlightEngine';
import { MarkerPopup } from './MarkerPopup';
import { getMarkerHtml } from './markerUtils';
import { CategoryFilter } from './CategoryFilterBar';
import { MapStats } from './MapStats';
import { SZCZECIN_OSIEDLA, type SzczecinMicroDistrict } from '@/lib/geo/szczecinMicroDistricts';

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
  'baltic-slate': 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
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

/** Resilient raster tile fallback when vector style fails to load */
const FALLBACK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'osm-raster': {
      type: 'raster',
      tiles: [
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [
    {
      id: 'fallback-background',
      type: 'background',
      paint: {
        'background-color': '#e2e8f0',
      },
    },
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
  hoveredId?: string | null;
  onMarkerHover?: (id: string | null) => void;
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
  hoveredId = null,
  onMarkerHover,
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
  const activePopupRootRef = useRef<{ id: string; root: Root } | null>(null);
  const spiderMarkersRef = useRef<maplibregl.Marker[]>([]);
  const geoMarkerRef = useRef<maplibregl.Marker | null>(null);
  const isDarkRef = useRef(false);

  const cleanupActivePopupRoot = useCallback(() => {
    if (activePopupRootRef.current) {
      const { root } = activePopupRootRef.current;
      activePopupRootRef.current = null;
      try {
        root.unmount();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const [isDark, setIsDark] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyleType>('emerald');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showDistrictAnalytics, setShowDistrictAnalytics] = useState(false);
  const [sheetSnapState, setSheetSnapState] = useState<'collapsed' | 'medium' | 'expanded'>('medium');
  const [moved, setMoved] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [tilesLoading, setTilesLoading] = useState(true);
  const [mapEpoch, setMapEpoch] = useState(0);
  const [isContextLost, setIsContextLost] = useState(false);
  const [isOffline, setIsOffline] = useState(() => (typeof navigator !== 'undefined' ? !navigator.onLine : false));
  const tileErrorsRef = useRef(0);

  // Monitor network connectivity changes for map tiles
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => {
      setIsOffline(false);
      tileErrorsRef.current = 0;
      if (mapRef.current) {
        try {
          mapRef.current.triggerRepaint();
        } catch {}
      }
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
        cleanupActivePopupRoot();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cleanupActivePopupRoot]);

  const [lassoPolygon, setLassoPolygon] = useState<Array<[number, number]> | null>(null);
  const [isochronePolygon, setIsochronePolygon] = useState<Array<[number, number]> | null>(null);
  const [quickFilter, setQuickFilter] = useState<'all' | 'high_pay' | 'remote' | 'recent' | 'budowa' | 'instalacje'>('all');
  const [salaryFilter, setSalaryFilter] = useState<MapSalaryFilter>('all');
  const [showSalaryHeatmap, setShowSalaryHeatmap] = useState(false);
  const [showConstructionSites, setShowConstructionSites] = useState(false);
  const [showTransitStops, setShowTransitStops] = useState(false);
  const [showPogonHub, setShowPogonHub] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isMapMenuOpen, setIsMapMenuOpen] = useState(false);
  const [detailedModalAdId, setDetailedModalAdId] = useState<string | null>(null);
  const [showIsochroneModal, setShowIsochroneModal] = useState(false);
  const [showGeoAlertModal, setShowGeoAlertModal] = useState(false);
  const [isLassoDrawing, setIsLassoDrawing] = useState(false);
  const [showSuppliersModal, setShowSuppliersModal] = useState(false);
  const [showHomeRadarModal, setShowHomeRadarModal] = useState(false);
  const [isRadarActive, setIsRadarActive] = useState(false);
  const [radarRadiusKm, setRadarRadiusKm] = useState(10);
  const [isPickingHomeOnMap, setIsPickingHomeOnMap] = useState(false);
  const [homeBaseCoords, setHomeBaseCoords] = useState<[number, number] | null>(() => {
    const saved = loadSavedHomeBase();
    return saved ? saved.coords : [14.5528, 53.4285];
  });
  const supplierMarkersRef = useRef<maplibregl.Marker[]>([]);
  const homeBaseMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [selectedLandmark, setSelectedLandmark] = useState<SzczecinLandmark3D | null>(null);
  const [showLandmarks3D, setShowLandmarks3D] = useState(true);
  const [isDroneOrbiting, setIsDroneOrbiting] = useState(false);
  const [sunlightMode, setSunlightMode] = useState<SunlightMode>('auto');
  const [cameraPitchMode, setCameraPitchMode] = useState<'flat' | 'cinematic'>('cinematic');
  const [currentZoom, setCurrentZoom] = useState<number>(DEFAULT_ZOOM);
  const landmarkMarkersRef = useRef<maplibregl.Marker[]>([]);
  const droneOrbitAnimRef = useRef<number | null>(null);

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
    let base = visibleAds.filter(
      (ad) =>
        ad != null &&
        ad.latitude !== null &&
        ad.latitude !== undefined &&
        typeof ad.latitude === 'number' &&
        !isNaN(ad.latitude) &&
        isFinite(ad.latitude) &&
        ad.latitude >= -90 &&
        ad.latitude <= 90 &&
        ad.longitude !== null &&
        ad.longitude !== undefined &&
        typeof ad.longitude === 'number' &&
        !isNaN(ad.longitude) &&
        isFinite(ad.longitude) &&
        ad.longitude >= -180 &&
        ad.longitude <= 180
    );
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
    if (salaryFilter !== 'all') {
      base = base.filter((ad) => matchesSalaryFilter(salaryFilter, ad.price, ad.title, ad.description));
    }
    if (lassoPolygon && lassoPolygon.length >= 3) {
      base = base.filter((ad) => isPointInPolygon([ad.latitude!, ad.longitude!], lassoPolygon));
    }
    if (isochronePolygon && isochronePolygon.length >= 3) {
      base = base.filter((ad) => isPointInPolygon([ad.latitude!, ad.longitude!], isochronePolygon));
    }
    if (isRadarActive && homeBaseCoords) {
      base = base.filter((ad) => isJobWithinRadar(ad.latitude, ad.longitude, homeBaseCoords, radarRadiusKm));
    }
    return base;
  }, [visibleAds, quickFilter, salaryFilter, lassoPolygon, isochronePolygon, isRadarActive, homeBaseCoords, radarRadiusKm]);

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
    let canvas: HTMLCanvasElement | null = null;
    let handleContextLost: ((e: Event) => void) | null = null;
    let handleContextRestored: (() => void) | null = null;

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

      // ─── WEBGL CONTEXT LOSS & RECOVERY ──────────────────────────────
      canvas = map.getCanvas();
      handleContextLost = (e: Event) => {
        e.preventDefault(); // Informs browser that application will manage WebGL context restoration
        console.warn('[MapView] WebGL context lost.');
        setIsContextLost(true);
        if (droneOrbitAnimRef.current) {
          cancelAnimationFrame(droneOrbitAnimRef.current);
          droneOrbitAnimRef.current = null;
        }
      };
      handleContextRestored = () => {
        console.info('[MapView] WebGL context restored. Recreating map instance...');
        setIsContextLost(false);
        setMapEpoch((prev) => prev + 1);
      };

      if (canvas) {
        canvas.addEventListener('webglcontextlost', handleContextLost, false);
        canvas.addEventListener('webglcontextrestored', handleContextRestored, false);
      }

      map.on('webglcontextlost', () => setIsContextLost(true));
      map.on('webglcontextrestored', () => {
        setIsContextLost(false);
        setMapEpoch((prev) => prev + 1);
      });

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
        if (map) setCurrentZoom(map.getZoom());
      });

      // ─── ERROR HANDLING & FALLBACK ─────────────────────────────────
      map.on('error', (e) => {
        const msg = e.error?.message || (typeof e === 'string' ? e : '');
        console.warn('[MapView] MapLibre error:', msg || e);

        const isTileError =
          /tile|status 404|status 503|fetch|network/i.test(msg) ||
          e.error?.status === 404 ||
          e.error?.status === 503;

        if (isTileError) {
          tileErrorsRef.current += 1;
        }

        if (!usedFallback && map && (!map.isStyleLoaded() || tileErrorsRef.current >= 4)) {
          usedFallback = true;
          console.warn('[MapView] Vector style failed/degraded — falling back to OSM raster tiles');
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
        if (!map) return;
        if (styleLoadTimer) { clearTimeout(styleLoadTimer); styleLoadTimer = null; }
        setMapLoaded(true);
        setTilesLoading(false);

        const dark = isDarkRef.current;

        if (mapStyle === 'baltic-slate') {
          try {
            if (map.getLayer('water')) {
              map.setPaintProperty('water', 'fill-color', '#0284c7');
            }
          } catch { /* non-fatal */ }
        }

        // ─── 1. WEBGL 3D BUILDINGS LAYER ──────────────────────────────
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
                  minzoom: 13.5,
                  paint: {
                    'fill-extrusion-color': dark ? '#1e293b' : '#cbd5e1',
                    'fill-extrusion-height': [
                      'interpolate', ['linear'], ['zoom'],
                      13.5, 0,
                      15, ['get', 'render_height']
                    ],
                    'fill-extrusion-base': [
                      'interpolate', ['linear'], ['zoom'],
                      13.5, 0,
                      15, ['get', 'render_min_height']
                    ],
                    'fill-extrusion-opacity': 0.85,
                    'fill-extrusion-vertical-gradient': true
                  }
                },
                labelLayerId
              );
            }
          } catch (err) {
            console.warn('Failed to add 3d-buildings layer:', err);
          }
        }

        // ─── 1B. NATIVE WEBGL 3D SZCZECIN LANDMARKS EXTRUSION ──────────
        try {
          if (!map.getSource('szczecin-landmarks-3d-source')) {
            map.addSource('szczecin-landmarks-3d-source', {
              type: 'geojson',
              data: getSzczecinLandmarks3DPolygonsGeoJson(),
            });
          }

          if (!map.getLayer('szczecin-landmarks-ground-glow')) {
            map.addLayer(
              {
                id: 'szczecin-landmarks-ground-glow',
                type: 'circle',
                source: 'szczecin-landmarks-3d-source',
                minzoom: 11,
                paint: {
                  'circle-radius': 36,
                  'circle-color': ['get', 'glowColor'],
                  'circle-blur': 0.85,
                  'circle-opacity': 0.45,
                },
              },
              labelLayerId
            );
          }

          if (!map.getLayer('szczecin-landmarks-3d-extrusion')) {
            map.addLayer(
              {
                id: 'szczecin-landmarks-3d-extrusion',
                type: 'fill-extrusion',
                source: 'szczecin-landmarks-3d-source',
                minzoom: 11.5,
                paint: {
                  'fill-extrusion-color': ['get', 'lightColor'],
                  'fill-extrusion-height': ['get', 'heightMeters'],
                  'fill-extrusion-base': 0,
                  'fill-extrusion-opacity': 0.9,
                  'fill-extrusion-vertical-gradient': true,
                },
              },
              labelLayerId
            );
          }
        } catch (err) {
          console.warn('Failed to add szczecin landmarks 3d layer:', err);
        }

        // Apply dynamic sunlight, shadows, fog, water & building shaders
        applySunlightToMap(map, sunlightMode);


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

    const markers = markersRef.current;

    return () => {
      if (initTimer) clearTimeout(initTimer);
      if (styleLoadTimer) clearTimeout(styleLoadTimer);

      globalActiveMaps = Math.max(0, globalActiveMaps - 1);

      cleanupActivePopupRoot();

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
      landmarkMarkersRef.current.forEach(m => m.remove());
      landmarkMarkersRef.current = [];
      if (droneOrbitAnimRef.current) {
        cancelAnimationFrame(droneOrbitAnimRef.current);
        droneOrbitAnimRef.current = null;
      }

      if (canvas && handleContextLost && handleContextRestored) {
        canvas.removeEventListener('webglcontextlost', handleContextLost, false);
        canvas.removeEventListener('webglcontextrestored', handleContextRestored, false);
      }

      if (homeBaseMarkerRef.current) {
        try { homeBaseMarkerRef.current.remove(); } catch {}
        homeBaseMarkerRef.current = null;
      }
      supplierMarkersRef.current.forEach((m) => { try { m.remove(); } catch {} });
      supplierMarkersRef.current = [];
      if (activePopupRef.current) {
        try { activePopupRef.current.remove(); } catch {}
        activePopupRef.current = null;
      }

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
  }, [mapEpoch]);

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
          'fill-opacity': showSalaryHeatmap ? 0.38 : 0,
        },
      });
    } else {
      map.setPaintProperty('district-salary-layer', 'fill-opacity', showSalaryHeatmap ? 0.38 : 0);
    }

    if (!map.getLayer('district-salary-outline')) {
      map.addLayer({
        id: 'district-salary-outline',
        type: 'line',
        source: 'district-salary-source',
        paint: {
          'line-color': ['get', 'borderColor'],
          'line-width': 2,
          'line-dasharray': [2, 1],
          'line-opacity': showSalaryHeatmap ? 0.85 : 0,
        },
      });
    } else {
      map.setPaintProperty('district-salary-outline', 'line-opacity', showSalaryHeatmap ? 0.85 : 0);
    }
  }, [showSalaryHeatmap, mapLoaded]);

  // Sync GeoJSON data to WebGL Cluster Source & Heatmap Source
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const clusterSource = map.getSource('jobs-cluster-source') as maplibregl.GeoJSONSource;
    const heatmapSource = map.getSource('heatmap-source') as maplibregl.GeoJSONSource;

    const rawFeatures = geocodedAds
      .filter((ad) => isValidCoordinate(ad.latitude, ad.longitude))
      .map((ad) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [ad.longitude!, ad.latitude!],
        },
        properties: {
          id: ad.id,
          category: ad.category,
          title: ad.title,
          price: ad.price ?? '',
        },
      }));

    const featureCollection = sanitizeFeatureCollection(rawFeatures);

    if (clusterSource) {
      try {
        clusterSource.setData(featureCollection);
      } catch (err) {
        console.warn('[MapView] clusterSource.setData failed:', err);
      }
    }
    if (heatmapSource) {
      try {
        heatmapSource.setData(featureCollection);
      } catch (err) {
        console.warn('[MapView] heatmapSource.setData failed:', err);
      }
    }
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

  // Map click listener for picking Home Base location
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !isPickingHomeOnMap) return;

    map.getCanvas().style.cursor = 'crosshair';

    const handleMapClick = (e: maplibregl.MapMouseEvent) => {
      const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      setHomeBaseCoords(coords);
      saveHomeBase(coords, radarRadiusKm);
      setIsPickingHomeOnMap(false);
      setIsRadarActive(true);
      setShowHomeRadarModal(true);
      map.getCanvas().style.cursor = '';
      triggerHaptic(20);
    };

    map.once('click', handleMapClick);

    return () => {
      if (map) {
        map.off('click', handleMapClick);
        map.getCanvas().style.cursor = '';
      }
    };
  }, [isPickingHomeOnMap, mapLoaded, radarRadiusKm]);

  // Home Base Radar Polygon & Draggable Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const sourceId = 'home-radar-source';
    const fillLayerId = 'home-radar-fill';
    const lineLayerId = 'home-radar-line';

    if (homeBaseMarkerRef.current) {
      homeBaseMarkerRef.current.remove();
      homeBaseMarkerRef.current = null;
    }

    if (!isRadarActive || !homeBaseCoords) {
      if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
      if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      return;
    }

    const circleGeoJson = createGeoJsonCircle(homeBaseCoords, radarRadiusKm);

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
          'fill-color': '#0d9488',
          'fill-opacity': 0.1,
        },
      });

      map.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#14b8a6',
          'line-width': 2.5,
          'line-dasharray': [4, 3],
        },
      });
    }

    // Draggable Home Base Marker
    const el = document.createElement('div');
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;filter:drop-shadow(0 4px 10px rgba(13,148,136,0.6));">
        <div style="padding:5px 9px;background:#0d9488;color:#ffffff;border:2px solid #ffffff;border-radius:999px;font-size:11px;font-weight:900;display:flex;align-items:center;gap:4px;">
          <span>🏠</span> Baza (${radarRadiusKm} km)
        </div>
        <div style="width:2px;height:10px;background:#0d9488;"></div>
      </div>
    `;

    const marker = new maplibregl.Marker({ element: el, draggable: true })
      .setLngLat(homeBaseCoords)
      .addTo(map);

    marker.on('dragend', () => {
      const lngLat = marker.getLngLat();
      const newCoords: [number, number] = [lngLat.lng, lngLat.lat];
      setHomeBaseCoords(newCoords);
      saveHomeBase(newCoords, radarRadiusKm);
      triggerHaptic(15);
    });

    homeBaseMarkerRef.current = marker;

    return () => {
      if (homeBaseMarkerRef.current) {
        homeBaseMarkerRef.current.remove();
        homeBaseMarkerRef.current = null;
      }
    };
  }, [isRadarActive, homeBaseCoords, radarRadiusKm, mapLoaded]);

  // Suppliers Pins on Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    supplierMarkersRef.current.forEach((m) => m.remove());
    supplierMarkersRef.current = [];

    if (!showSuppliersModal) return;

    SZCZECIN_CONSTRUCTION_SUPPLIERS.forEach((s) => {
      const el = document.createElement('div');
      el.innerHTML = `
        <div style="display:flex;align-items:center;gap:4px;padding:4px 8px;background:#18181b;color:#f59e0b;border:1.5px solid #f59e0b;border-radius:12px;font-size:11px;font-weight:800;box-shadow:0 4px 12px rgba(0,0,0,0.5);cursor:pointer;transform:translate(-50%, -50%);">
          <span>🏪</span>
          <span>${s.name.split(' ')[0]}</span>
        </div>
      `;
      el.onclick = () => {
        triggerHaptic(10);
        map.flyTo({ center: [s.lng, s.lat], zoom: 15 });
      };

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([s.lng, s.lat])
        .addTo(map);

      supplierMarkersRef.current.push(marker);
    });

    return () => {
      supplierMarkersRef.current.forEach((m) => m.remove());
      supplierMarkersRef.current = [];
    };
  }, [showSuppliersModal, mapLoaded]);

  // ─── 3D SZCZECIN LANDMARK BEACONS & WEBGL EXTRUSIONS ───────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    landmarkMarkersRef.current.forEach((m) => m.remove());
    landmarkMarkersRef.current = [];

    // Toggle native WebGL 3D Landmark Extrusion Layers
    try {
      if (map.getLayer('szczecin-landmarks-3d-extrusion')) {
        map.setLayoutProperty('szczecin-landmarks-3d-extrusion', 'visibility', showLandmarks3D ? 'visible' : 'none');
      }
      if (map.getLayer('szczecin-landmarks-ground-glow')) {
        map.setLayoutProperty('szczecin-landmarks-ground-glow', 'visibility', showLandmarks3D ? 'visible' : 'none');
      }
    } catch {
      /* non-fatal */
    }

    if (!showLandmarks3D) return;

    SZCZECIN_LANDMARKS_3D.forEach((lm) => {
      const el = document.createElement('div');
      el.className = 'szczecin-3d-landmark-marker';
      el.style.cursor = 'pointer';
      el.style.userSelect = 'none';

      el.innerHTML = `
        <div class="tactical-pill-wrapper" style="display:flex;flex-direction:column;align-items:center;transform:translateY(-6px);will-change:transform;contain:layout style;">
          <div style="position:relative;">
            <!-- Pulsing Beacon Halo -->
            <div style="position:absolute;inset:-6px;border-radius:50%;background:${lm.glowColor};animation:marker-pulse 2.2s infinite;filter:blur(3px);will-change:transform,opacity;pointer-events:none;"></div>
            
            <!-- Beacon Badge Capsule -->
            <div style="position:relative;padding:4px 9px;background:rgba(8,14,26,0.94);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1.5px solid ${lm.lightColor};border-radius:999px;display:flex;align-items:center;gap:5px;box-shadow:0 4px 16px rgba(0,0,0,0.6), 0 0 14px ${lm.glowColor};">
              <span style="font-size:13px;line-height:1;">${lm.icon}</span>
              <span style="font-size:10.5px;font-weight:800;color:#ffffff;white-space:nowrap;letter-spacing:-0.01em;">${lm.name.split(' ')[0]}</span>
              <span style="font-size:8px;font-weight:900;color:${lm.lightColor};background:rgba(255,255,255,0.1);padding:1px 4px;border-radius:4px;line-height:1;font-variant-numeric:tabular-nums;">${lm.heightMeters}m</span>
            </div>
          </div>
          
          <!-- Downward Precision Laser Beam -->
          <div style="width:2px;height:12px;background:linear-gradient(to bottom, ${lm.lightColor}, transparent);box-shadow:0 0 8px ${lm.lightColor};"></div>
        </div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerHaptic(12);
        setSelectedLandmark(lm);
        map.flyTo({
          center: lm.coordinates,
          zoom: 16.2,
          pitch: 58,
          bearing: -22,
          essential: true,
          duration: prefersReducedMotion ? 0 : 1500,
        });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(lm.coordinates)
        .addTo(map);

      landmarkMarkersRef.current.push(marker);
    });

    return () => {
      landmarkMarkersRef.current.forEach((m) => m.remove());
      landmarkMarkersRef.current = [];
    };
  }, [showLandmarks3D, mapLoaded, prefersReducedMotion]);


  // ─── 360° DRONE ORBIT ENGINE ─────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isDroneOrbiting) {
      if (droneOrbitAnimRef.current) {
        cancelAnimationFrame(droneOrbitAnimRef.current);
        droneOrbitAnimRef.current = null;
      }
      return;
    }

    let lastTimestamp = performance.now();
    const orbitSpeedDegPerSec = 10; // Smooth 10°/sec rotation

    const orbitFrame = (timestamp: number) => {
      const elapsedSec = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      if (map) {
        const newBearing = (map.getBearing() + orbitSpeedDegPerSec * elapsedSec) % 360;
        map.setBearing(newBearing);
      }
      droneOrbitAnimRef.current = requestAnimationFrame(orbitFrame);
    };

    droneOrbitAnimRef.current = requestAnimationFrame(orbitFrame);

    return () => {
      if (droneOrbitAnimRef.current) {
        cancelAnimationFrame(droneOrbitAnimRef.current);
        droneOrbitAnimRef.current = null;
      }
    };
  }, [isDroneOrbiting]);

  // ─── DYNAMIC 3D SUNLIGHT & ATMOSPHERE SYNC ────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    applySunlightToMap(map, sunlightMode);
  }, [sunlightMode, mapLoaded]);

  // Open Popup function
  const openPopup = useCallback((ad: DisplayAnnouncement, coordinates: [number, number]) => {
    const map = mapRef.current;
    if (!map) return;

    // On mobile screens, MobileBottomSheet acts as the bottom preview card.
    // We suppress the MapLibre popup on mobile to prevent occlusion of the pin and gestures.
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (isMobile) {
      if (activePopupRef.current) {
        activePopupRef.current.remove();
        activePopupRef.current = null;
      }
      cleanupActivePopupRoot();
      return;
    }

    // Clean up any previously active popup & React root
    cleanupActivePopupRoot();
    if (activePopupRef.current) {
      activePopupRef.current.remove();
      activePopupRef.current = null;
    }

    const popupContainer = document.createElement('div');
    popupContainer.className = 'maplibre-popup-content';
    const root = createRoot(popupContainer);
    activePopupRootRef.current = { id: ad.id, root };

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
          onOpenDetails={() => setDetailedModalAdId(ad.id)}
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
      cleanupActivePopupRoot();
      if (activePopupRef.current === popup) {
        activePopupRef.current = null;
      }
    });
  }, [cleanupActivePopupRoot, isFavorite, onToggleFavorite, onShowInList, isDark, homeLat, homeLng]);

  // ─── SPIDERFY & UNCLUSTERED MARKER SYNC ──────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Group items by coordinate to detect overlapping pins in Szczecin (e.g. Brama Portowa, Plac Rodła)
    // 4 decimal places gives ~11m latitude and ~6.6m longitude precision
    const coordGroups = new Map<string, { center: [number, number]; ads: DisplayAnnouncement[] }>();
    geocodedAds.forEach(ad => {
      const key = `${ad.latitude!.toFixed(4)},${ad.longitude!.toFixed(4)}`;
      const existing = coordGroups.get(key);
      if (existing) {
        existing.ads.push(ad);
      } else {
        coordGroups.set(key, {
          center: [ad.longitude!, ad.latitude!],
          ads: [ad],
        });
      }
    });

    const currentIds = new Set(geocodedAds.map(ad => ad.id));
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
        if (activePopupRootRef.current?.id === id) {
          cleanupActivePopupRoot();
        }
      }
    });

    // Clear previous spider legs
    spiderMarkersRef.current.forEach(m => m.remove());
    spiderMarkersRef.current = [];
    const spiderLegFeatures: GeoJSON.Feature[] = [];

    const zoom = map.getZoom();

    coordGroups.forEach(({ center, ads: group }) => {
      const isOverlapping = group.length > 1;
      const spiderPositions = isOverlapping
        ? generateSpiderfyPositions(center, group.length, zoom)
        : [center];

      group.forEach((ad, idx) => {
        const targetCoords = isOverlapping ? spiderPositions[idx] || center : center;

        if (isOverlapping) {
          // Draw connecting line leg feature from true center to spider pin
          spiderLegFeatures.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [center, targetCoords]
            },
            properties: {}
          });
        }

        const isDimmed = (homeLat != null && homeLng != null && maxDistanceKm != null)
          ? haversineKm(homeLat, homeLng, ad.latitude!, ad.longitude!) > maxDistanceKm
          : false;

        const isFav = isFavorite(ad.id);
        const isSelected = ad.id === selectedId;
        const isHovered = ad.id === hoveredId;
        const isUrgent = /cito|piln|od zaraz|natychmiast/i.test(ad.title || '');
        const isFresh = ad.scraped_at ? (Date.now() - new Date(ad.scraped_at).getTime() < 6 * 3600 * 1000) : false;

        const shouldShowMarker = !showHeatmap && (isSelected || zoom >= 12.5);

        let marker = markersRef.current.get(ad.id);

        if (!marker) {
          const el = document.createElement('div');
          el.className = 'job-marker';
          el.style.display = shouldShowMarker ? 'block' : 'none';
          el.innerHTML = getMarkerHtml(ad.category, isFav, isSelected, isDimmed, ad.price, isUrgent, isFresh, isHovered);

          marker = new maplibregl.Marker({ element: el })
            .setLngLat(targetCoords)
            .addTo(map);

          el.addEventListener('mouseenter', () => {
            onMarkerHover?.(ad.id);
          });
          el.addEventListener('mouseleave', () => {
            onMarkerHover?.(null);
          });

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
            el.innerHTML = getMarkerHtml(ad.category, isFav, isSelected, isDimmed, ad.price, isUrgent, isFresh, isHovered);
            el.style.display = shouldShowMarker ? 'block' : 'none';
          }
          marker.setLngLat(targetCoords);
        }
      });
    });

    // Dynamic Level-Of-Detail zoom listener to cull non-selected DOM markers at overview zoom
    const handleZoomVisibility = () => {
      if (!map) return;
      const currentZ = map.getZoom();
      markersRef.current.forEach((m, id) => {
        const el = m.getElement();
        if (el) {
          const visible = !showHeatmap && (id === selectedId || currentZ >= 12.5);
          el.style.display = visible ? 'block' : 'none';
        }
      });
    };

    map.on('zoom', handleZoomVisibility);

    // Update Spider Legs Source
    const spiderLegsSource = map.getSource('spider-legs-source') as maplibregl.GeoJSONSource;
    if (spiderLegsSource) {
      const sanitizedLegs = sanitizeFeatureCollection(spiderLegFeatures);
      try {
        spiderLegsSource.setData(sanitizedLegs);
      } catch (err) {
        console.warn('[MapView] spiderLegsSource.setData failed:', err);
      }
    }

    return () => {
      map.off('zoom', handleZoomVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geocodedAds, selectedId, hoveredId, isFavorite, mapLoaded, currentZoom, showHeatmap]);


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
      pitch: 52,
      bearing: -15,
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
        pitch: 52,
        bearing: -15,
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

      {/* WebGL Context Loss Recovery Banner */}
      {isContextLost && (
        <div
          role="alert"
          style={{
            position: 'absolute',
            top: '52px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 40,
            padding: '10px 20px',
            background: '#450a0a',
            border: '1px solid #dc2626',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#fecaca',
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            maxWidth: '92%',
          }}
        >
          <span>⚡</span>
          <span>Utracono połączenie z kartą graficzną (WebGL).</span>
          <button
            type="button"
            onClick={() => {
              setIsContextLost(false);
              setMapEpoch((prev) => prev + 1);
            }}
            style={{
              padding: '4px 10px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Przywróć mapę
          </button>
        </div>
      )}

      {/* Offline Mode Status Indicator */}
      {isOffline && (
        <div
          role="status"
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '12px',
            zIndex: 25,
            padding: '6px 12px',
            background: 'rgba(24, 24, 27, 0.92)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(245, 158, 11, 0.5)',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#fbbf24',
            boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
          <span>Tryb offline: kafelki z pamięci podręcznej</span>
        </div>
      )}

      {/* 🧭 Master Enlarged Collapsible Map Menu (Lewa Strona) */}
      <div className="absolute top-3 left-3 z-30 flex flex-col items-start gap-1.5 pointer-events-auto">
        {/* Backdrop overlay to close menu on click outside */}
        {isMapMenuOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/25 backdrop-blur-[1px]"
            onClick={() => setIsMapMenuOpen(false)}
          />
        )}

        {/* Main Trigger Toggle Pill */}
        <button
          onClick={() => {
            triggerHaptic(15);
            setIsMapMenuOpen(!isMapMenuOpen);
          }}
          className="relative z-30 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-950/90 hover:bg-zinc-900 border border-white/10 hover:border-emerald-500/40 shadow-xl backdrop-blur-2xl text-xs font-black text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer group min-h-[40px] touch-manipulation"
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

                {/* Zaopatrzenie & Markety Budowlane */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic(10);
                    setShowSuppliersModal(!showSuppliersModal);
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer text-xs font-semibold border ${
                    showSuppliersModal
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                      : 'text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/20'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">🏪</span>
                    <span>Hurtownie & Markety</span>
                  </span>
                  <span className={`w-2 h-2 rounded-full ${showSuppliersModal ? 'bg-amber-400 animate-pulse' : 'bg-zinc-600'}`} />
                </button>

                {/* Baza Sprzętowa / Radar */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic(10);
                    setShowHomeRadarModal(!showHomeRadarModal);
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer text-xs font-semibold border ${
                    isRadarActive || showHomeRadarModal
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 shadow-sm'
                      : 'text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/20'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">🏠</span>
                    <span>Baza Domowa (Radar {radarRadiusKm}km)</span>
                  </span>
                  <span className={`w-2 h-2 rounded-full ${isRadarActive ? 'bg-teal-400 animate-pulse' : 'bg-zinc-600'}`} />
                </button>

                {/* ⚓ Landmarki 3D Szczecina */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic(10);
                    setShowLandmarks3D(!showLandmarks3D);
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer text-xs font-semibold border ${
                    showLandmarks3D
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 shadow-sm'
                      : 'text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/20'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">⚓</span>
                    <span>Landmarki 3D Szczecina</span>
                  </span>
                  <span className={`w-2 h-2 rounded-full ${showLandmarks3D ? 'bg-teal-400 animate-pulse' : 'bg-zinc-600'}`} />
                </button>

                {/* 🛸 Przelot Drona 360° */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic(12);
                    setIsDroneOrbiting(!isDroneOrbiting);
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer text-xs font-semibold border ${
                    isDroneOrbiting
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm'
                      : 'text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/20'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">🛸</span>
                    <span>Przelot Drona 360°</span>
                  </span>
                  <span className={`w-2 h-2 rounded-full ${isDroneOrbiting ? 'bg-rose-400 animate-pulse' : 'bg-zinc-600'}`} />
                </button>
              </div>
            </div>

            {/* Section 3: Szybki Skok do Dzielnicy (Kinowa Kamera 2.5D) */}
            <div className="space-y-1">
              <div className="text-[9px] font-bold uppercase text-zinc-400 px-1 tracking-wider">
                Dzielnice Szczecina (Kamera 2.5D)
              </div>
              <div className="grid grid-cols-2 gap-1 max-h-[140px] overflow-y-auto custom-scrollbar pr-0.5">
                {[
                  { name: 'Centrum', lat: 53.4285, lng: 14.5528, pitch: 58, bearing: -20 },
                  { name: 'Łasztownia', lat: 53.4241, lng: 14.5612, pitch: 62, bearing: 140 },
                  { name: 'Prawobrzeże', lat: 53.382, lng: 14.665, pitch: 52, bearing: 35 },
                  { name: 'Warszewo', lat: 53.468, lng: 14.542, pitch: 54, bearing: -15 },
                  { name: 'Pogodno', lat: 53.442, lng: 14.515, pitch: 50, bearing: -30 },
                  { name: 'Gumieńce', lat: 53.409, lng: 14.502, pitch: 50, bearing: 20 },
                  { name: 'Dąbie', lat: 53.398, lng: 14.672, pitch: 56, bearing: 45 },
                  { name: 'Pomorzany', lat: 53.402, lng: 14.532, pitch: 52, bearing: -10 },
                ].map((d) => (
                  <button
                    key={d.name}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic(10);
                      mapRef.current?.flyTo({
                        center: [d.lng, d.lat],
                        zoom: 14.8,
                        pitch: d.pitch,
                        bearing: d.bearing,
                        duration: prefersReducedMotion ? 0 : 1300,
                        essential: true,
                      });
                      setIsMapMenuOpen(false);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-left text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all cursor-pointer text-[11px] font-semibold truncate"
                  >
                    <span className="text-xs shrink-0">📍</span>
                    <span className="truncate">{d.name}</span>
                  </button>
                ))}
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

      {/* 🏪 Construction Suppliers Modal */}
      <MapSuppliersModal
        isVisible={showSuppliersModal}
        onClose={() => setShowSuppliersModal(false)}
        onFlyToSupplier={(supplier) => {
          mapRef.current?.flyTo({ center: [supplier.lng, supplier.lat], zoom: 15 });
        }}
      />

      {/* 🏠 Home Base Radar Modal */}
      <MapHomeRadarModal
        isVisible={showHomeRadarModal}
        onClose={() => setShowHomeRadarModal(false)}
        homeBaseCoords={homeBaseCoords}
        radarRadiusKm={radarRadiusKm}
        isRadarActive={isRadarActive}
        onSetRadarActive={(active) => {
          setIsRadarActive(active);
          triggerHaptic(15);
        }}
        onUpdateRadiusKm={(km) => {
          setRadarRadiusKm(km);
          if (homeBaseCoords) saveHomeBase(homeBaseCoords, km);
        }}
        onPickHomeOnMap={() => {
          setIsPickingHomeOnMap(true);
          setShowHomeRadarModal(false);
        }}
        onUseCurrentGps={() => {
          if (!navigator.geolocation) return;
          navigator.geolocation.getCurrentPosition((pos) => {
            const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
            setHomeBaseCoords(coords);
            saveHomeBase(coords, radarRadiusKm);
            setIsRadarActive(true);
            mapRef.current?.flyTo({ center: coords, zoom: 13 });
          });
        }}
        matchingOffersCount={geocodedAds.length}
      />

      {/* Live Construction Weather Widget */}
      <MapWeatherWidget ui={ui} isDark={isDark} />

      {/* 🕐 Freshness Indicator (Pod Pogodą na Górze po Prawej) */}
      <div className="absolute top-14 right-3 z-20 hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950/85 backdrop-blur-xl border border-zinc-800 text-[11px] font-bold text-zinc-300 shadow-lg">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-zinc-400">Aktualizacja:</span>
        <span className="text-emerald-400 font-semibold">przed chwilą</span>
      </div>

      {/* 🏠 Active Radar Floating Badge */}
      {isRadarActive && (
        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            setShowHomeRadarModal(true);
          }}
          className="absolute top-24 right-3 z-20 flex items-center gap-2 px-3 py-1 rounded-full bg-teal-950/90 backdrop-blur-xl border border-teal-500/50 text-[11px] font-bold text-teal-300 shadow-xl cursor-pointer hover:bg-teal-900 transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          <span>Radar: {radarRadiusKm} km ({geocodedAds.length} ofert)</span>
        </button>
      )}

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

      {/* Mobile Snap Bottom Sheet (Always Mounted for Mobile, touch targets >= 44px) */}
      <div className="md:hidden">
        <MobileBottomSheet
          ads={geocodedAds}
          selectedAd={geocodedAds.find((a) => a.id === selectedId) || null}
          selectedId={selectedId}
          onSelectAd={(id: string) => {
            onMarkerClick?.(id);
            const ad = geocodedAds.find((a) => a.id === id);
            if (ad && mapRef.current) {
              const pos = jitteredPosition(ad.latitude!, ad.longitude!, ad.id);
              mapRef.current.flyTo({
                center: [pos[1], pos[0]],
                zoom: Math.max(mapRef.current.getZoom(), FLY_TO_ZOOM),
                padding: { top: 60, bottom: 220, left: 0, right: 0 },
                essential: true,
                duration: prefersReducedMotion ? 0 : 1000,
              });
            }
          }}
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
          onShowOnMap={(id: string) => {
            onMarkerClick?.(id);
            const ad = geocodedAds.find((a) => a.id === id);
            if (ad && mapRef.current) {
              const pos = jitteredPosition(ad.latitude!, ad.longitude!, ad.id);
              mapRef.current.flyTo({
                center: [pos[1], pos[0]],
                zoom: Math.max(mapRef.current.getZoom(), FLY_TO_ZOOM),
                padding: { top: 60, bottom: 220, left: 0, right: 0 },
                essential: true,
                duration: prefersReducedMotion ? 0 : 1000,
              });
            }
          }}
          onSnapStateChange={setSheetSnapState}
          ui={ui}
          isDark={isDark}
        />
      </div>

      {/* 🚀 Detailed Job Modal (Opened on demand via 'QR / Narzędzia', not obscuring the map by default) */}
      {detailedModalAdId && (
        <DraggableJobModal
          ad={geocodedAds.find((a) => a.id === detailedModalAdId) || null}
          onClose={() => setDetailedModalAdId(null)}
          onShowInList={() => {
            const ad = geocodedAds.find((a) => a.id === detailedModalAdId);
            if (ad) onShowInList?.(ad.id);
          }}
          isFavorite={detailedModalAdId ? isFavorite(detailedModalAdId) : false}
          onToggleFavorite={() => {
            if (detailedModalAdId) onToggleFavorite(detailedModalAdId);
          }}
          ui={ui}
          isDark={isDark}
          homeLat={homeLat}
          homeLng={homeLng}
        />
      )}

      {/* 🏛️ Szczecin 3D Landmark Detail Modal */}
      <LandmarkDetailModal
        landmark={selectedLandmark}
        onClose={() => setSelectedLandmark(null)}
        onStartDroneOrbit={(lm) => {
          mapRef.current?.flyTo({
            center: lm.coordinates,
            zoom: 16.2,
            pitch: 58,
            bearing: -22,
            essential: true,
            duration: 1200,
          });
          setIsDroneOrbiting((prev) => !prev);
        }}
        isDroneOrbiting={isDroneOrbiting}
        onFilterNearbyJobs={(lm) => {
          mapRef.current?.flyTo({
            center: lm.coordinates,
            zoom: 15,
            pitch: 45,
          });
        }}
      />

      {/* 🧭 Tactical HUD Camera & Navigation Dock (Unified, Touch Targets >= 44px) */}
      <div className="absolute top-14 right-3 md:top-auto md:bottom-8 md:right-3.5 z-20 flex flex-col items-center gap-1.5 p-1.5 rounded-2xl bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800/80 text-zinc-100 shadow-2xl select-none pointer-events-auto">
        {/* Zoom In (+) */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            mapRef.current?.zoomIn({ duration: 250 });
          }}
          className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-xl hover:bg-zinc-800 active:scale-90 text-zinc-200 transition-all cursor-pointer touch-manipulation"
          title="Przybliż widok mapy (+)"
          aria-label="Przybliż"
        >
          +
        </button>

        {/* Zoom Out (−) */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            mapRef.current?.zoomOut({ duration: 250 });
          }}
          className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-xl hover:bg-zinc-800 active:scale-90 text-zinc-200 transition-all cursor-pointer touch-manipulation border-b border-zinc-800/60 pb-0.5"
          title="Oddal widok mapy (−)"
          aria-label="Oddal"
        >
          −
        </button>

        {/* Pitch 2D / 3D Toggle */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            const map = mapRef.current;
            if (!map) return;
            if (cameraPitchMode === 'flat') {
              setCameraPitchMode('cinematic');
              map.easeTo({ pitch: 52, bearing: -15, duration: 900 });
            } else {
              setCameraPitchMode('flat');
              map.easeTo({ pitch: 0, bearing: 0, duration: 900 });
            }
          }}
          className={`w-11 h-11 rounded-xl flex items-center justify-center text-xs font-black font-mono transition-all cursor-pointer touch-manipulation ${
            cameraPitchMode === 'cinematic' ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-zinc-800 text-zinc-300'
          }`}
          title={cameraPitchMode === 'cinematic' ? 'Przełącz na widok płaski 2D (0°)' : 'Włącz widok kinowy 3D (52°)'}
          aria-label="Kąt kamery 3D"
        >
          {cameraPitchMode === 'cinematic' ? '3D' : '2D'}
        </button>

        {/* Reset North Compass */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            mapRef.current?.easeTo({ bearing: 0, duration: 600 });
          }}
          className="w-11 h-11 rounded-xl flex items-center justify-center hover:bg-zinc-800 active:scale-90 text-cyan-400 transition-all cursor-pointer touch-manipulation"
          title="Zorientuj na Północ (0°)"
          aria-label="Północ"
        >
          <span className="text-base">🧭</span>
        </button>

        {/* 360° Drone Orbit */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(12);
            setIsDroneOrbiting((p) => !p);
          }}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer touch-manipulation ${
            isDroneOrbiting ? 'bg-rose-600 text-white animate-pulse shadow-md' : 'hover:bg-zinc-800 text-zinc-300'
          }`}
          title={isDroneOrbiting ? 'Zatrzymaj przelot drona' : 'Uruchom kinowy obieg dronem 360°'}
          aria-label="Obieg dronem 360°"
        >
          <span className="text-base">🛸</span>
        </button>

        {/* Sunlight Cycler */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            setSunlightMode((prev) => {
              const modes: SunlightMode[] = ['day', 'morning', 'golden_hour', 'sunset', 'night_cyberpunk'];
              const curIdx = modes.indexOf(prev);
              return modes[(curIdx + 1) % modes.length];
            });
          }}
          className="w-11 h-11 rounded-xl flex items-center justify-center hover:bg-zinc-800 active:scale-90 text-amber-400 transition-all cursor-pointer touch-manipulation"
          title={`Oświetlenie 3D: ${sunlightMode}`}
          aria-label="Oświetlenie 3D"
        >
          <span className="text-base">
            {sunlightMode === 'night_cyberpunk' ? '🌃' : sunlightMode === 'sunset' ? '🌆' : sunlightMode === 'golden_hour' ? '🌅' : sunlightMode === 'morning' ? '☕' : '☀️'}
          </span>
        </button>

        {/* 3D Landmarks Toggle */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            setShowLandmarks3D((p) => !p);
          }}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer touch-manipulation ${
            showLandmarks3D ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' : 'hover:bg-zinc-800 text-zinc-500'
          }`}
          title={showLandmarks3D ? 'Ukryj ikony 3D Szczecina' : 'Pokaż ikony 3D Szczecina'}
          aria-label="Landmarki 3D"
        >
          <span className="text-base">⚓</span>
        </button>

        {/* 📊 District Salary Heatmap Toggle */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            setShowSalaryHeatmap((p) => !p);
          }}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer touch-manipulation ${
            showSalaryHeatmap ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm' : 'hover:bg-zinc-800 text-zinc-500'
          }`}
          title={showSalaryHeatmap ? 'Ukryj heatmapę zarobków w dzielnicach' : 'Włącz heatmapę stawek w dzielnicach Szczecina'}
          aria-label="Heatmapa zarobków"
        >
          <span className="text-base">🔥</span>
        </button>

        {/* 📡 Radar Zasięgu od Domu Majstra */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            setShowHomeRadarModal(true);
          }}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer touch-manipulation ${
            isRadarActive ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 shadow-sm' : 'hover:bg-zinc-800 text-zinc-500'
          }`}
          title={isRadarActive ? `Radar aktywny: ${radarRadiusKm}km od bazy` : 'Ustaw radar dojazdu od bazy/domu'}
          aria-label="Radar bazy majstra"
        >
          <span className="text-base">📡</span>
        </button>
      </div>

      {/* 🎯 Centered Action Stack: Search in Area & Active Spatial Region Pill */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none">
        <div className="pointer-events-auto">
          <SearchAreaButton
            visible={Boolean(onSearchArea && moved)}
            onClick={handleSearchAreaClick}
            ui={ui}
          />
        </div>

        {(lassoPolygon || isochronePolygon) && (
          <div className="pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-600/95 backdrop-blur-md text-white text-xs font-bold shadow-lg border border-emerald-400/40 animate-in fade-in zoom-in-95">
            <span>✨ Wycięta strefa: {geocodedAds.length} ofert</span>
            <button
              type="button"
              onClick={() => { setLassoPolygon(null); setIsochronePolygon(null); }}
              className="w-4 h-4 rounded-full bg-black/25 hover:bg-black/40 flex items-center justify-center text-[10px] cursor-pointer"
              title="Wyczyść wyciętą strefę"
            >
              ✕
            </button>
          </div>
        )}

        {/* 🔥 Glass HUD: District Salary Legend */}
        {showSalaryHeatmap && (
          <div className="pointer-events-auto flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-zinc-950/90 backdrop-blur-xl text-zinc-100 text-xs font-bold shadow-2xl border border-emerald-500/30 animate-in fade-in slide-in-from-top-2">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Średnie Stawki w Dzielnicach</span>
            </span>
            <span className="text-zinc-500">|</span>
            <span className="text-zinc-300 font-mono text-[11px]">
              Łasztownia (56 zł/h) • Warszewo (52 zł/h) • Prawobrzeże (50 zł/h)
            </span>
            <button
              type="button"
              onClick={() => setShowSalaryHeatmap(false)}
              className="ml-1 text-zinc-400 hover:text-zinc-200 text-xs cursor-pointer"
              title="Zamknij podgląd heatmapy"
            >
              ✕
            </button>
          </div>
        )}
        {/* 📡 Glass HUD: Active Commute Radar */}
        {isRadarActive && (
          <div className="pointer-events-auto flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-zinc-950/90 backdrop-blur-xl text-zinc-100 text-xs font-bold shadow-2xl border border-indigo-500/30 animate-in fade-in slide-in-from-top-2">
            <span className="flex items-center gap-1.5 text-indigo-400">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              <span>Radar Bazy: {radarRadiusKm} km</span>
            </span>
            <span className="text-zinc-500">|</span>
            <span className="text-zinc-300 font-mono text-[11px]">
              {geocodedAds.length} ofert w Twoim zasięgu
            </span>
            <button
              type="button"
              onClick={() => setIsRadarActive(false)}
              className="ml-1 text-zinc-400 hover:text-zinc-200 text-xs cursor-pointer"
              title="Wyłącz radar zasięgu"
            >
              ✕
            </button>
          </div>
        )}

        {/* ☀️ Glass HUD: Dynamic 3D Sunlight Mode */}
        {sunlightMode !== 'day' && (
          <div className="pointer-events-auto flex items-center gap-2.5 px-4 py-1.5 rounded-2xl bg-zinc-950/90 backdrop-blur-xl text-zinc-100 text-xs font-bold shadow-2xl border border-amber-500/30 animate-in fade-in slide-in-from-top-2">
            <span className="flex items-center gap-1.5 text-amber-400">
              <span>{getSunlightPreset(sunlightMode).icon}</span>
              <span>{getSunlightPreset(sunlightMode).name}</span>
            </span>
            <span className="text-zinc-500">|</span>
            <span className="text-zinc-400 font-mono text-[11px]">
              Cienie 3D & Refrakcja Odry
            </span>
            <button
              type="button"
              onClick={() => setSunlightMode('day')}
              className="ml-1 text-zinc-400 hover:text-zinc-200 text-xs cursor-pointer"
              title="Przywróć standardowe światło dzienne"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Category filter bar (Desktop top toolbar with Rate Mode Filters) */}
      <CategoryFilter
        active={activeCategories}
        onChange={onCategoryChange}
        salaryFilter={salaryFilter}
        onSalaryFilterChange={setSalaryFilter}
        ui={ui}
        top={12}
        left={235}
        right={140}
      />

      {/* Tactical HUD Map Stats overlay */}
      <MapStats
        ads={geocodedAds}
        total={ads.length}
        visible={geocodedAds.length}
        ui={ui}
        isDark={isDark}
      />

      {geocodedAds.length === 0 && (
        <EmptyOverlay
          ui={ui}
          hasAny={visibleAds.length > 0 || ads.length > 0}
          onReset={() => {
            onCategoryChange(new Set(ALL_CATEGORY_KEYS));
            setSalaryFilter('all');
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
        
        /* High-Vis Tactical Pill GPU styling & appearance */
        .job-marker {
          contain: layout style;
        }

        .job-marker .tactical-pill-wrapper {
          animation: marker-fade-in 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);
          transform-origin: bottom center;
        }

        @keyframes marker-fade-in {
          0% {
            opacity: 0;
            transform: translate3d(0, 10px, 0) scale(0.65);
          }
          100% {
            opacity: 1;
          }
        }

        /* Pulse ring for selected landmark / beacons */
        @keyframes marker-pulse {
          0% {
            transform: translate3d(-50%, -50%, 0) scale(0.85);
            opacity: 0.9;
          }
          70% {
            transform: translate3d(-50%, -50%, 0) scale(1.6);
            opacity: 0.15;
          }
          100% {
            transform: translate3d(-50%, -50%, 0) scale(1.6);
            opacity: 0;
          }
        }

        /* High-Vis Primary Sonar Wave Radar animation */
        @keyframes sonar-wave {
          0% {
            transform: translate3d(-50%, -50%, 0) scale(0.7);
            opacity: 0.9;
          }
          60% {
            transform: translate3d(-50%, -50%, 0) scale(2.0);
            opacity: 0.25;
          }
          100% {
            transform: translate3d(-50%, -50%, 0) scale(2.7);
            opacity: 0;
          }
        }

        /* Secondary Echo Radar Ripple */
        @keyframes sonar-wave-echo {
          0% {
            transform: translate3d(-50%, -50%, 0) scale(0.5);
            opacity: 0.75;
          }
          55% {
            transform: translate3d(-50%, -50%, 0) scale(1.8);
            opacity: 0.18;
          }
          100% {
            transform: translate3d(-50%, -50%, 0) scale(2.4);
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
