'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

export interface CommuteRadiusProps {
  map: maplibregl.Map | null;
  homeLat: number;
  homeLng: number;
  radiusKm: number;
}

import { createGeoJsonCircle, isValidCoordinate } from './utils';

/**
 * Draws a translucent commute radius circle and a home pin on MapLibre GL JS map.
 */
export function CommuteRadius({
  map,
  homeLat,
  homeLng,
  radiusKm,
}: CommuteRadiusProps) {
  const homeMarkerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!map || !isValidCoordinate(homeLat, homeLng)) return;

    const sourceId = 'commute-radius-source';
    const fillLayerId = 'commute-radius-fill';
    const lineLayerId = 'commute-radius-line';

    const safeRadiusKm = Math.max(0.1, Math.min(200, Number.isFinite(radiusKm) ? radiusKm : 10));
    const circleData = createGeoJsonCircle([homeLng, homeLat], safeRadiusKm);

    try {
      // Add GeoJSON source for commute circle
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: circleData,
        });

        map.addLayer({
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': '#2563eb',
            'fill-opacity': 0.08,
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
      } else {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(circleData);
      }
    } catch (err) {
      console.warn('[CommuteRadius] Failed to add/update circle:', err);
    }

    // Home icon marker
    const homeEl = document.createElement('div');
    homeEl.innerHTML = '🏠';
    homeEl.style.fontSize = '20px';
    homeEl.style.lineHeight = '1';
    homeEl.style.cursor = 'default';

    const homeMarker = new maplibregl.Marker({ element: homeEl })
      .setLngLat([homeLng, homeLat])
      .addTo(map);

    homeMarkerRef.current = homeMarker;

    return () => {
      try {
        homeMarker.remove();
      } catch {}
      homeMarkerRef.current = null;

      try {
        if (map.getStyle()) {
          if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
          if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
        }
      } catch {}
    };
  }, [map, homeLat, homeLng, radiusKm]);

  return null;
}

