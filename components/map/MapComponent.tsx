'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MaskedAnnouncement } from '@/lib/types/announcement';
import { filterGeocodedAnnouncements, formatPrice, generateSpiderfyPositions } from './utils';
import { getAnnouncementExternalUrl, triggerHaptic } from '@/lib/utils';
import { SearchAreaButton } from './SearchAreaButton';
import { Map3DControlHub, Map3DState } from './Map3DControlHub';
import { SZCZECIN_MEGA_PROJECTS, MegaConstructionProject } from '@/lib/geo/szczecinMegaProjects';
import { SZCZECIN_LANDMARKS_3D, type SzczecinLandmark3D } from '@/lib/geo/szczecinLandmarks3D';
import { generateSzczecinIsochrone, SZCZECIN_COMMUTE_BASES } from '@/lib/geo/isochroneCalculator';
import { generateSalaryHexbinsGeoJSON } from '@/lib/geo/salaryHexbins';
import { applySunlightToMap, SunlightMode } from '@/lib/geo/sunlightEngine';
import { buildAnnouncementsGeoJSON, CLUSTER_LAYER_CONFIG } from '@/lib/geo/mapClustering';
import { buildDemandHeatmapGeoJSON, DEMAND_HEATMAP_LAYER_CONFIG } from '@/lib/geo/demandHeatmap';
import { FloatingCameraControls } from './FloatingCameraControls';
import { MegaProjectDetailModal } from './MegaProjectDetailModal';
import { LandmarkDetailModal } from './LandmarkDetailModal';

// Szczecin center coordinates [lng, lat]
const SZCZECIN_CENTER: [number, number] = [14.5528, 53.4285];
const DEFAULT_ZOOM = 12.5;
const DEFAULT_PITCH = 50; // 3D perspective angle

// Vector basemap styles
const CARTO_GL_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

const ESRI_SATELLITE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'esri-satellite': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: 'Tiles &copy; Esri World Imagery',
    },
  },
  layers: [
    {
      id: 'esri-satellite-layer',
      type: 'raster',
      source: 'esri-satellite',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

const FALLBACK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'osm-raster': {
      type: 'raster',
      tiles: [
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [
    {
      id: 'fallback-background',
      type: 'background',
      paint: { 'background-color': '#e2e8f0' },
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

export interface MapComponentProps {
  announcements: MaskedAnnouncement[];
  onMarkerClick?: (id: string) => void;
  onSearchArea?: (bounds: { south: number; west: number; north: number; east: number }) => void;
}

export default function MapComponent({
  announcements,
  onMarkerClick,
  onSearchArea,
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const craneMarkersRef = useRef<maplibregl.Marker[]>([]);
  const orbitFrameRef = useRef<number | null>(null);

  const [mapMoved, setMapMoved] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);
  const [selectedMegaProject, setSelectedMegaProject] = useState<MegaConstructionProject | null>(null);
  const [selectedLandmark, setSelectedLandmark] = useState<SzczecinLandmark3D | null>(null);
  const [isContextLost, setIsContextLost] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const landmarkMarkersRef = useRef<maplibregl.Marker[]>([]);

  // 3D Master State
  const [map3DState, setMap3DState] = useState<Map3DState>({
    show3DBuildings: true,
    showConstructionSites: true,
    showIsochrone: false,
    showSalaryPillars: false,
    showDemandHeatmap: false,
    showLandmarks3D: true,
    selectedLandmark: null,
    isDroneOrbiting: false,
    isochroneMinutes: 20,
    selectedBaseKey: 'centrum',
    selectedProject: null,
    sunlightMode: 'day',
  });

  const geocodedAnnouncements = filterGeocodedAnnouncements(announcements);

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
    setMapMoved(false);
  }, [onSearchArea]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let map: maplibregl.Map | null = null;
    let usedFallback = false;

    try {
      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: CARTO_GL_STYLE,
        center: SZCZECIN_CENTER,
        zoom: DEFAULT_ZOOM,
        pitch: DEFAULT_PITCH,
        bearing: -15,
        attributionControl: false,
      });
    } catch (err) {
      console.warn('[MapComponent] WebGL primary initialization failed, attempting fallback:', err);
      try {
        map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: FALLBACK_STYLE,
          center: SZCZECIN_CENTER,
          zoom: DEFAULT_ZOOM,
          pitch: 0,
          bearing: 0,
          attributionControl: false,
        });
        usedFallback = true;
      } catch (fallbackErr) {
        console.error('[MapComponent] All map initializations failed:', fallbackErr);
        setMapError('Brak wsparcia dla akceleracji WebGL w przeglądarce.');
        return;
      }
    }

    const canvas = map.getCanvas();
    const handleContextLost = (e: Event) => {
      e.preventDefault(); // Informs the browser that the web application will handle context recovery
      console.warn('[MapComponent] WebGL context lost.');
      setIsContextLost(true);
      if (orbitFrameRef.current) {
        cancelAnimationFrame(orbitFrameRef.current);
        orbitFrameRef.current = null;
      }
    };
    const handleContextRestored = () => {
      console.info('[MapComponent] WebGL context restored.');
      setIsContextLost(false);
    };

    if (canvas) {
      canvas.addEventListener('webglcontextlost', handleContextLost, false);
      canvas.addEventListener('webglcontextrestored', handleContextRestored, false);
    }

    map.on('webglcontextlost', () => setIsContextLost(true));
    map.on('webglcontextrestored', () => setIsContextLost(false));

    map.on('error', (e) => {
      console.warn('[MapComponent] MapLibre error:', e.error?.message || e);
      if (!usedFallback && map && !map.isStyleLoaded()) {
        usedFallback = true;
        try {
          map.setStyle(FALLBACK_STYLE);
        } catch {
          setMapError('Nie udało się załadować kafelków mapy.');
        }
      }
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    const handleMoveEnd = () => setMapMoved(true);
    map.on('moveend', handleMoveEnd);

    // Add 3D building extrusions & sunlight layer on style load
    map.on('style.load', () => {
      try {
        const layers = map.getStyle().layers || [];
        const labelLayerId = layers.find((l) => l.type === 'symbol' && l.layout?.['text-field'])?.id;

        if (!map.getLayer('3d-buildings') && map.getSource('carto')) {
          map.addLayer(
            {
              id: '3d-buildings',
              source: 'carto',
              'source-layer': 'building',
              filter: ['==', 'extrude', 'true'],
              type: 'fill-extrusion',
              minzoom: 13.5,
              paint: {
                'fill-extrusion-color': [
                  'interpolate',
                  ['linear'],
                  ['get', 'render_height'],
                  0, '#cbd5e1',
                  30, '#94a3b8',
                  70, '#2563eb',
                  120, '#1e3a8a',
                ],
                'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13.5, 0, 14, ['get', 'render_height']],
                'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 13.5, 0, 14, ['get', 'render_min_height']],
                'fill-extrusion-opacity': 0.82,
              },
            },
            labelLayerId
          );
        }

        applySunlightToMap(map, map3DState.sunlightMode);
      } catch {
        /* non-fatal fallback */
      }
    });

    mapRef.current = map;

    return () => {
      if (canvas) {
        canvas.removeEventListener('webglcontextlost', handleContextLost, false);
        canvas.removeEventListener('webglcontextrestored', handleContextRestored, false);
      }
      map?.off('moveend', handleMoveEnd);
      if (orbitFrameRef.current) cancelAnimationFrame(orbitFrameRef.current);
      markersRef.current.forEach((m) => { try { m.remove(); } catch {} });
      markersRef.current = [];
      craneMarkersRef.current.forEach((m) => { try { m.remove(); } catch {} });
      craneMarkersRef.current = [];
      landmarkMarkersRef.current.forEach((m) => { try { m.remove(); } catch {} });
      landmarkMarkersRef.current = [];
      try {
        map?.remove();
      } catch (err) {
        console.warn('[MapComponent] Error removing map:', err);
      }
      mapRef.current = null;
    };
  }, []);

  // Sunlight Mode Handler
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    applySunlightToMap(map, map3DState.sunlightMode);
  }, [map3DState.sunlightMode]);

  // 3D Buildings Visibility Handler
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    try {
      if (map.getLayer('3d-buildings')) {
        map.setLayoutProperty('3d-buildings', 'visibility', map3DState.show3DBuildings ? 'visible' : 'none');
      }
    } catch {
      /* ignore */
    }
  }, [map3DState.show3DBuildings]);

  // Demand Heatmap Layer Handler
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const { sourceId, heatmapLayerId, densityCircleLayerId } = DEMAND_HEATMAP_LAYER_CONFIG;

    if (!map3DState.showDemandHeatmap) {
      if (map.getLayer(densityCircleLayerId)) map.removeLayer(densityCircleLayerId);
      if (map.getLayer(heatmapLayerId)) map.removeLayer(heatmapLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      return;
    }

    const heatmapData = buildDemandHeatmapGeoJSON(geocodedAnnouncements);

    try {
      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(heatmapData);
      } else {
        map.addSource(sourceId, {
          type: 'geojson',
          data: heatmapData,
        });

        map.addLayer({
          id: heatmapLayerId,
          type: 'heatmap',
          source: sourceId,
          maxzoom: 15,
          paint: {
            'heatmap-weight': ['get', 'weight'],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 1, 15, 3],
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(0, 255, 255, 0)',
              0.2, '#06b6d4',
              0.4, '#10b981',
              0.6, '#f59e0b',
              0.8, '#ef4444',
              1.0, '#ec4899',
            ],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 15, 15, 30],
            'heatmap-opacity': 0.75,
          },
        });
      }
    } catch {
      /* ignore if style loading */
    }
  }, [map3DState.showDemandHeatmap, geocodedAnnouncements]);

  // Commute Isochrone Layer Handler
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sourceId = 'isochrone-source';
    const fillLayerId = 'isochrone-fill';
    const lineLayerId = 'isochrone-line';

    if (!map3DState.showIsochrone) {
      if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
      if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      return;
    }

    const baseCoords =
      SZCZECIN_COMMUTE_BASES[map3DState.selectedBaseKey]?.coords || SZCZECIN_CENTER;
    const isochroneData = generateSzczecinIsochrone(
      baseCoords[0],
      baseCoords[1],
      map3DState.isochroneMinutes,
      'car'
    );

    try {
      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(isochroneData);
      } else {
        map.addSource(sourceId, {
          type: 'geojson',
          data: isochroneData,
        });

        map.addLayer({
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': ['get', 'fillColor'],
            'fill-opacity': 0.18,
          },
        });

        map.addLayer({
          id: lineLayerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': ['get', 'fillColor'],
            'line-width': 2.5,
            'line-dasharray': [2, 1.5],
          },
        });
      }
    } catch {
      /* ignore if style not ready */
    }
  }, [map3DState.showIsochrone, map3DState.selectedBaseKey, map3DState.isochroneMinutes]);

  // 3D Salary Hexbin Columns Handler
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sourceId = 'salary-pillars-source';
    const layerId = 'salary-pillars-extrusion';

    if (!map3DState.showSalaryPillars) {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      return;
    }

    const salaryData = generateSalaryHexbinsGeoJSON();

    try {
      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(salaryData);
      } else {
        map.addSource(sourceId, {
          type: 'geojson',
          data: salaryData,
        });

        map.addLayer({
          id: layerId,
          type: 'fill-extrusion',
          source: sourceId,
          paint: {
            'fill-extrusion-color': ['get', 'color'],
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.85,
          },
        });
      }
    } catch {
      /* ignore */
    }
  }, [map3DState.showSalaryPillars, geocodedAnnouncements]);

  // Tower Cranes & Construction Sites
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    craneMarkersRef.current.forEach((m) => m.remove());
    craneMarkersRef.current = [];

    if (!map3DState.showConstructionSites) return;

    SZCZECIN_MEGA_PROJECTS.forEach((proj) => {
      const el = document.createElement('div');
      el.className = 'mega-crane-marker';
      el.innerHTML = `
        <div class="crane-icon-wrapper group cursor-pointer">
          <div class="crane-pulse-ring"></div>
          <div class="crane-badge">
            <span class="crane-emoji">🏗️</span>
            <span class="crane-count">${proj.towerCranesCount}</span>
          </div>
        </div>
      `;

      el.addEventListener('click', () => {
        triggerHaptic(12);
        setSelectedMegaProject(proj);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(proj.coordinates)
        .addTo(map);

      craneMarkersRef.current.push(marker);
    });
  }, [map3DState.showConstructionSites]);

  // Szczecin 3D Landmark Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    landmarkMarkersRef.current.forEach((m) => m.remove());
    landmarkMarkersRef.current = [];

    if (map3DState.showLandmarks3D === false) return;

    SZCZECIN_LANDMARKS_3D.forEach((lm) => {
      const el = document.createElement('div');
      el.className = 'szczecin-landmark-3d-node cursor-pointer select-none';
      el.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div style="position:relative;padding:4px 8px;background:rgba(9,13,22,0.92);backdrop-filter:blur(8px);border:1.5px solid ${lm.lightColor};border-radius:999px;display:flex;align-items:center;gap:4px;box-shadow:0 0 14px ${lm.glowColor};">
            <span style="font-size:13px;">${lm.icon}</span>
            <span style="font-size:10px;font-weight:800;color:#ffffff;">${lm.name.split(' ')[0]}</span>
            <span style="font-size:8px;font-weight:900;color:${lm.lightColor};background:rgba(255,255,255,0.1);padding:1px 3px;border-radius:3px;">${lm.heightMeters}m</span>
          </div>
          <div style="width:2px;height:10px;background:${lm.lightColor};box-shadow:0 0 6px ${lm.lightColor};"></div>
        </div>
      `;

      el.addEventListener('click', () => {
        triggerHaptic(12);
        setSelectedLandmark(lm);
        handleFlyTo(lm.coordinates[0], lm.coordinates[1], 16.2);
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
  }, [map3DState.showLandmarks3D]);

  // 360° Drone Cinematic Orbit Animation Loop
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (map3DState.isDroneOrbiting) {
      map.easeTo({ pitch: 65, duration: 1000 });

      let currentBearing = map.getBearing();
      const rotateCamera = () => {
        currentBearing = (currentBearing + 0.15) % 360;
        map.setBearing(currentBearing);
        orbitFrameRef.current = requestAnimationFrame(rotateCamera);
      };
      orbitFrameRef.current = requestAnimationFrame(rotateCamera);
    } else {
      if (orbitFrameRef.current) {
        cancelAnimationFrame(orbitFrameRef.current);
        orbitFrameRef.current = null;
      }
    }

    return () => {
      if (orbitFrameRef.current) cancelAnimationFrame(orbitFrameRef.current);
    };
  }, [map3DState.isDroneOrbiting]);

  // Update Announcement Markers & WebGL Clusters
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Group announcements by coordinates (~11m resolution: 4 decimal places)
    // to detect overlapping pins in Szczecin (e.g. central addresses) and fan them out
    const coordGroups = new Map<string, { center: [number, number]; ads: typeof geocodedAnnouncements }>();
    geocodedAnnouncements.forEach((ad) => {
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

    const zoom = map.getZoom();

    coordGroups.forEach(({ center, ads: group }) => {
      const isOverlapping = group.length > 1;
      const spiderPositions = isOverlapping
        ? generateSpiderfyPositions(center, group.length, zoom)
        : [center];

      group.forEach((announcement, idx) => {
        const targetCoords = isOverlapping ? spiderPositions[idx] || center : center;
        const price = announcement.price;
        let badgeColorClass = 'badge-slate';
        let priceLabel = 'Oferta';

        if (price) {
          priceLabel = `${Math.round(price).toLocaleString('pl-PL')} zł`;
          if (price >= 8500) badgeColorClass = 'badge-emerald';
          else if (price >= 6000) badgeColorClass = 'badge-gold';
          else badgeColorClass = 'badge-blue';
        } else {
          badgeColorClass = 'badge-purple';
          priceLabel = 'Estymacja AI';
        }

        const el = document.createElement('div');
        el.className = `map-price-pin ${badgeColorClass}`;
        el.innerHTML = `<div class="map-price-badge ${badgeColorClass}">${priceLabel}</div>`;

        const redirectUrl = getAnnouncementExternalUrl(announcement);
        const contactPhone = (announcement as { contact_info?: string | null }).contact_info;
        const phoneDigits = contactPhone ? contactPhone.replace(/\D/g, '') : null;
        const escapeHtml = (str: string | null | undefined): string => {
          if (!str) return '';
          return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        };

        const popupHtml = `
          <div class="map-popup p-3 max-w-xs bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700">
            <div class="flex items-center justify-between gap-2 mb-1">
              <span class="text-xs px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-medium capitalize">
                ${escapeHtml(announcement.source_portal)} • ${escapeHtml(announcement.category || 'budowa')}
              </span>
              <span class="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                🛡️ Bezpieczna
              </span>
            </div>

            <h3 class="map-popup__title font-bold text-sm text-slate-100 line-clamp-2 leading-snug mb-1">${escapeHtml(announcement.title)}</h3>
            <p class="map-popup__location text-xs text-slate-400 mb-2">📍 ${escapeHtml(announcement.location_text)}</p>
            <p class="map-popup__price text-base font-bold text-emerald-400 mb-3">${escapeHtml(formatPrice(announcement.price))}</p>

            <div class="flex flex-col gap-1.5">
              <a href="${escapeHtml(redirectUrl)}" target="_blank" rel="noopener noreferrer" class="w-full py-2 px-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs rounded-lg text-center shadow transition-transform active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer">
                <span>Otwórz aktualną ofertę</span>
                <span>🚀</span>
              </a>

              ${phoneDigits ? `
                <div class="grid grid-cols-2 gap-1.5 pt-1">
                  <a href="tel:+48${escapeHtml(phoneDigits)}" class="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-md text-center flex items-center justify-center gap-1">
                    <span>📞 Zadzwoń</span>
                  </a>
                  <a href="https://wa.me/48${escapeHtml(phoneDigits)}" target="_blank" rel="noopener noreferrer" class="py-1.5 px-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-md text-center flex items-center justify-center gap-1">
                    <span>💬 WhatsApp</span>
                  </a>
                </div>
              ` : ''}
            </div>
          </div>
        `;

        const popup = new maplibregl.Popup({ offset: 15, closeButton: false }).setHTML(popupHtml);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(targetCoords)
          .setPopup(popup)
          .addTo(map);

        el.addEventListener('click', () => {
          onMarkerClick?.(announcement.deduplication_key);
        });

        markersRef.current.push(marker);
      });
    });
  }, [geocodedAnnouncements, onMarkerClick]);

  // Camera preset actions for Floating Joystick
  const handleSetIsometric3D = () => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({ pitch: 48, bearing: -20, duration: 1000 });
  };

  const handleSetStreetLevel3D = () => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({ pitch: 65, zoom: 15.2, duration: 1200 });
  };

  const handleResetNorth = () => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({ bearing: 0, pitch: 0, duration: 800 });
  };

  const handleToggleDroneOrbit = () => {
    setMap3DState((prev) => ({ ...prev, isDroneOrbiting: !prev.isDroneOrbiting }));
  };

  const toggleSatelliteMode = () => {
    const map = mapRef.current;
    if (!map) return;
    const nextSat = !isSatellite;
    setIsSatellite(nextSat);
    map.setStyle(nextSat ? ESRI_SATELLITE_STYLE : CARTO_GL_STYLE);
  };

  const cycleSunlightMode = () => {
    const modes: SunlightMode[] = ['day', 'golden_hour', 'sunset', 'night_cyberpunk'];
    const currentIdx = modes.indexOf(map3DState.sunlightMode);
    const nextMode = modes[(currentIdx + 1) % modes.length];
    setMap3DState((prev) => ({ ...prev, sunlightMode: nextMode }));
  };

  const handleFlyTo = (lng: number, lat: number, zoom = 15) => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: [lng, lat],
      zoom,
      pitch: 60,
      bearing: -20,
      essential: true,
      duration: 2000,
    });
  };

  return (
    <div className="relative w-full h-full min-h-[450px]">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* WebGL Context Lost or Map Error Banner */}
      {(isContextLost || mapError) && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-amber-950/90 text-amber-200 border border-amber-500/50 rounded-xl px-4 py-2 shadow-xl flex items-center gap-2 text-xs font-semibold backdrop-blur-md">
          <span>⚠️</span>
          <span>{isContextLost ? 'Utracono kontekst WebGL (GPU). Oczekiwanie na przywrócenie...' : mapError}</span>
        </div>
      )}

      {/* Floating 3D Control Center Hub */}
      <Map3DControlHub
        state={map3DState}
        onChange={setMap3DState}
        onFlyToCoordinates={handleFlyTo}
        onOpenProjectModal={setSelectedMegaProject}
        onOpenLandmarkModal={setSelectedLandmark}
      />

      {/* Floating Quick Camera Controls Joystick */}
      <FloatingCameraControls
        onSetIsometric3D={handleSetIsometric3D}
        onSetStreetLevel3D={handleSetStreetLevel3D}
        onResetNorth={handleResetNorth}
        onToggleDroneOrbit={handleToggleDroneOrbit}
        isDroneOrbiting={map3DState.isDroneOrbiting}
        onToggleSatellite={toggleSatelliteMode}
        isSatellite={isSatellite}
        sunlightMode={map3DState.sunlightMode}
        onCycleSunlightMode={cycleSunlightMode}
        className="absolute bottom-[80px] md:bottom-6 right-3 z-30"
      />

      {/* Search this area floating button */}
      {mapMoved && <SearchAreaButton onClick={handleSearchAreaClick} />}

      {/* Strategic Mega Construction Project Radar Modal */}
      <MegaProjectDetailModal
        project={selectedMegaProject}
        onClose={() => setSelectedMegaProject(null)}
        onFlyTo={handleFlyTo}
      />

      {/* 3D Szczecin Landmark Detail Modal */}
      <LandmarkDetailModal
        landmark={selectedLandmark}
        onClose={() => setSelectedLandmark(null)}
        onStartDroneOrbit={(lm) => {
          handleFlyTo(lm.coordinates[0], lm.coordinates[1], 16.2);
          setMap3DState((p) => ({ ...p, isDroneOrbiting: true }));
        }}
        isDroneOrbiting={map3DState.isDroneOrbiting}
      />
    </div>
  );
}
