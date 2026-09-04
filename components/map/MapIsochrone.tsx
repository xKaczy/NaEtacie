'use client';

import { useState, useCallback, useEffect } from 'react';
import maplibregl from 'maplibre-gl';

export type TransportMode = 'car' | 'bike' | 'walk';

export interface MapIsochroneProps {
  map: maplibregl.Map | null;
  homeLat: number | null;
  homeLng: number | null;
  onIsochroneChange: (polygonCoords: Array<[number, number]> | null) => void;
  ui: {
    surface: string;
    border: string;
    text: string;
    shadow: string;
  };
  isOpen?: boolean;
  onClose?: () => void;
  hideTriggerButton?: boolean;
}

/**
 * Calculates estimated travel speed in km/h for different modes
 */
const SPEED_KMH: Record<TransportMode, number> = {
  walk: 4.8,  // ~5 km/h
  bike: 16.0, // ~16 km/h
  car: 38.0,  // ~38 km/h (city average)
};

/**
 * Generates an estimated Isochrone GeoJSON polygon based on travel time and speed.
 */
function generateIsochronePolygon(
  center: [number, number],
  minutes: number,
  mode: TransportMode,
  points = 48
): Array<[number, number]> {
  const [lng, lat] = center;
  if (!isFinite(lng) || !isFinite(lat)) return [];

  const safeMinutes = Math.max(1, Math.min(180, typeof minutes === 'number' && isFinite(minutes) ? minutes : 15));
  const speedKmh = SPEED_KMH[mode] || 38.0;
  const radiusKm = speedKmh * (safeMinutes / 60);

  const safeLat = Math.max(-89.5, Math.min(89.5, lat));
  const cosLat = Math.cos((safeLat * Math.PI) / 180);
  const safeCosLat = Math.abs(cosLat) < 1e-6 ? 1e-6 : Math.abs(cosLat);

  const coords: Array<[number, number]> = [];
  const distanceX = radiusKm / (111.32 * safeCosLat);
  const distanceY = radiusKm / 110.574;
  const numPoints = Math.max(12, Math.min(128, typeof points === 'number' && isFinite(points) ? points : 48));

  for (let i = 0; i < numPoints; i++) {
    const theta = (i / numPoints) * (2 * Math.PI);
    // Add subtle road factor variability
    const roadFactor = 0.85 + 0.15 * Math.sin(theta * 3);
    const x = distanceX * Math.cos(theta) * roadFactor;
    const y = distanceY * Math.sin(theta) * roadFactor;
    coords.push([Number((lng + x).toFixed(7)), Number((lat + y).toFixed(7))]);
  }

  return coords;
}

export function MapIsochrone({
  map,
  homeLat,
  homeLng,
  onIsochroneChange,
  ui,
  isOpen: controlledOpen,
  onClose,
  hideTriggerButton = false,
}: MapIsochroneProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isPanelOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const [minutes, setMinutes] = useState<number>(15);
  const [mode, setMode] = useState<TransportMode>('car');
  const [activeIsochrone, setActiveIsochrone] = useState<Array<[number, number]> | null>(null);

  const applyIsochrone = useCallback(
    (targetMinutes: number, targetMode: TransportMode) => {
      if (!map || homeLat == null || homeLng == null) return;

      const coords = generateIsochronePolygon([homeLng, homeLat], targetMinutes, targetMode);
      setActiveIsochrone(coords);
      onIsochroneChange(coords);

      if (!coords || coords.length < 3) return;

      const sourceId = 'isochrone-source';
      const fillLayerId = 'isochrone-fill';
      const lineLayerId = 'isochrone-line';

      const polygonCoords = [[...coords, coords[0]]];
      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: polygonCoords,
            },
            properties: {},
          },
        ],
      };

      try {
        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, {
            type: 'geojson',
            data: geojson,
          });

          map.addLayer({
            id: fillLayerId,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': targetMode === 'car' ? '#3b82f6' : targetMode === 'bike' ? '#10b981' : '#f59e0b',
              'fill-opacity': 0.12,
            },
          });

          map.addLayer({
            id: lineLayerId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': targetMode === 'car' ? '#2563eb' : targetMode === 'bike' ? '#059669' : '#d97706',
              'line-width': 2,
              'line-dasharray': [4, 2],
            },
          });
        } else {
          (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson);
        }
      } catch (err) {
        console.warn('[MapIsochrone] Failed to set isochrone data:', err);
      }
    },
    [map, homeLat, homeLng, onIsochroneChange]
  );

  const clearIsochrone = useCallback(() => {
    setActiveIsochrone(null);
    onIsochroneChange(null);

    if (map) {
      const sourceId = 'isochrone-source';
      const fillLayerId = 'isochrone-fill';
      const lineLayerId = 'isochrone-line';

      try {
        if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
        if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {}
    }
  }, [map, onIsochroneChange]);

  // Clean up isochrone layers and source on component unmount
  useEffect(() => {
    return () => {
      if (map) {
        try {
          if (map.getLayer('isochrone-fill')) map.removeLayer('isochrone-fill');
          if (map.getLayer('isochrone-line')) map.removeLayer('isochrone-line');
          if (map.getSource('isochrone-source')) map.removeSource('isochrone-source');
        } catch {}
      }
    };
  }, [map]);

  return (
    <div
      style={{
        position: 'absolute',
        top: '120px',
        left: '12px',
        zIndex: 22,
        display: isPanelOpen || !hideTriggerButton ? 'flex' : 'none',
        flexDirection: 'column',
        alignItems: 'flex-start',
      }}
    >
      {!hideTriggerButton && (
        <button
          onClick={() => {
            if (onClose && isPanelOpen) onClose();
            else setInternalOpen(!internalOpen);
          }}
          title="Strefa czasu dojazdu (Izochrona)"
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
          ⏱️
        </button>
      )}

      {isPanelOpen && (
        <div
          style={{
            background: ui.surface,
            border: `1.5px solid ${ui.border}`,
            borderRadius: '16px',
            boxShadow: ui.shadow,
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            width: '240px',
            fontSize: '12px',
            color: ui.text,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: '13px' }}>
            <span>⏱️ Strefa dojazdu</span>
            <button
              onClick={() => {
                if (onClose) onClose();
                setInternalOpen(false);
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#9ca3af' }}
              title="Zamknij"
            >
              ✕
            </button>
          </div>

          {homeLat == null || homeLng == null ? (
            <div style={{ fontSize: '11px', color: '#f59e0b', lineHeight: 1.4 }}>
              ⚠️ Ustaw swoją lokalizację domową w filtrach preferences, aby obliczyć izochronę.
            </div>
          ) : (
            <>
              {/* Transport mode switcher */}
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => {
                    setMode('car');
                    if (activeIsochrone) applyIsochrone(minutes, 'car');
                  }}
                  style={{
                    flex: 1,
                    padding: '6px',
                    borderRadius: '8px',
                    border: 'none',
                    background: mode === 'car' ? '#3b82f6' : 'rgba(156,163,175,0.15)',
                    color: mode === 'car' ? 'white' : ui.text,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  🚗 Auto
                </button>
                <button
                  onClick={() => {
                    setMode('bike');
                    if (activeIsochrone) applyIsochrone(minutes, 'bike');
                  }}
                  style={{
                    flex: 1,
                    padding: '6px',
                    borderRadius: '8px',
                    border: 'none',
                    background: mode === 'bike' ? '#10b981' : 'rgba(156,163,175,0.15)',
                    color: mode === 'bike' ? 'white' : ui.text,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  🚲 Rower
                </button>
                <button
                  onClick={() => {
                    setMode('walk');
                    if (activeIsochrone) applyIsochrone(minutes, 'walk');
                  }}
                  style={{
                    flex: 1,
                    padding: '6px',
                    borderRadius: '8px',
                    border: 'none',
                    background: mode === 'walk' ? '#f59e0b' : 'rgba(156,163,175,0.15)',
                    color: mode === 'walk' ? 'white' : ui.text,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  🚶 Pieszo
                </button>
              </div>

              {/* Time selector buttons */}
              <div style={{ display: 'flex', gap: '4px' }}>
                {[10, 15, 20, 30].map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setMinutes(m);
                      applyIsochrone(m, mode);
                    }}
                    style={{
                      flex: 1,
                      padding: '5px 0',
                      borderRadius: '6px',
                      border: minutes === m && activeIsochrone ? '1.5px solid #2563eb' : '1px solid transparent',
                      background: minutes === m && activeIsochrone ? 'rgba(37,99,235,0.15)' : 'rgba(156,163,175,0.1)',
                      color: minutes === m && activeIsochrone ? '#2563eb' : ui.text,
                      fontWeight: minutes === m ? 700 : 500,
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    {m} min
                  </button>
                ))}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                <button
                  onClick={() => applyIsochrone(minutes, mode)}
                  style={{
                    flex: 1,
                    padding: '6px',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Pokaż strefę
                </button>
                {activeIsochrone && (
                  <button
                    onClick={clearIsochrone}
                    style={{
                      padding: '6px 10px',
                      background: 'transparent',
                      color: '#ef4444',
                      border: '1px solid #ef4444',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Wyczyść
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
