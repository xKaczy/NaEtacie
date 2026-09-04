'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';

export interface MapLassoDrawProps {
  map: maplibregl.Map | null;
  onPolygonChange: (polygonCoords: Array<[number, number]> | null) => void;
  ui: {
    surface: string;
    border: string;
    text: string;
    shadow: string;
  };
  isDrawingActive?: boolean;
  onToggleDrawing?: () => void;
  hideTriggerButton?: boolean;
}

/**
 * Custom Lasso / Polygon Drawing tool for MapLibre GL JS.
 * Allows users to draw custom boundaries on the map to filter announcements.
 */
export function MapLassoDraw({
  map,
  onPolygonChange,
  ui,
  isDrawingActive: controlledDrawing,
  onToggleDrawing,
  hideTriggerButton = false,
}: MapLassoDrawProps) {
  const [internalDrawing, setInternalDrawing] = useState(false);
  const isDrawing = controlledDrawing !== undefined ? controlledDrawing : internalDrawing;
  const setIsDrawing = (val: boolean) => {
    setInternalDrawing(val);
    if (onToggleDrawing && val !== isDrawing) onToggleDrawing();
  };
  const [points, setPoints] = useState<Array<[number, number]>>([]);
  const pointsRef = useRef<Array<[number, number]>>([]);

  const updateSourceAndLayers = useCallback(
    (currentPoints: Array<[number, number]>) => {
      if (!map) return;

      const sourceId = 'lasso-draw-source';
      const fillLayerId = 'lasso-draw-fill';
      const lineLayerId = 'lasso-draw-line';

      let features: GeoJSON.Feature[] = [];
      if (currentPoints.length >= 3) {
        features = [
          {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [[...currentPoints, currentPoints[0]]],
            },
            properties: {},
          },
        ];
      } else if (currentPoints.length === 2) {
        features = [
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: currentPoints,
            },
            properties: {},
          },
        ];
      } else if (currentPoints.length === 1) {
        features = [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: currentPoints[0],
            },
            properties: {},
          },
        ];
      }

      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features,
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
            filter: ['==', '$type', 'Polygon'],
            paint: {
              'fill-color': '#10b981',
              'fill-opacity': 0.15,
            },
          });

          map.addLayer({
            id: lineLayerId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': '#10b981',
              'line-width': 2.5,
              'line-dasharray': [2, 2],
            },
          });
        } else {
          (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson);
        }
      } catch (err) {
        console.warn('[MapLassoDraw] Failed to update source/layers:', err);
      }
    },
    [map]
  );

  // Clean up lasso source and layers on component unmount
  useEffect(() => {
    return () => {
      if (map) {
        try {
          if (map.getLayer('lasso-draw-fill')) map.removeLayer('lasso-draw-fill');
          if (map.getLayer('lasso-draw-line')) map.removeLayer('lasso-draw-line');
          if (map.getSource('lasso-draw-source')) map.removeSource('lasso-draw-source');
        } catch {}
      }
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;

    const handleMapClick = (e: maplibregl.MapMouseEvent) => {
      if (!isDrawing) return;

      const newPoint: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      const nextPoints = [...pointsRef.current, newPoint];
      pointsRef.current = nextPoints;
      setPoints(nextPoints);
      updateSourceAndLayers(nextPoints);
    };

    if (isDrawing) {
      map.getCanvas().style.cursor = 'crosshair';
      map.on('click', handleMapClick);
    } else {
      map.getCanvas().style.cursor = '';
    }

    return () => {
      map.off('click', handleMapClick);
      map.getCanvas().style.cursor = '';
    };
  }, [map, isDrawing, updateSourceAndLayers]);

  const handleStartDrawing = () => {
    setIsDrawing(true);
    setPoints([]);
    pointsRef.current = [];
    updateSourceAndLayers([]);
    onPolygonChange(null);
  };

  const handleFinishDrawing = () => {
    setIsDrawing(false);
    if (points.length >= 3) {
      onPolygonChange(points);
    } else {
      onPolygonChange(null);
    }
  };

  const handleClearDrawing = () => {
    setIsDrawing(false);
    setPoints([]);
    pointsRef.current = [];
    updateSourceAndLayers([]);
    onPolygonChange(null);
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: isDrawing ? '110px' : '238px',
        left: isDrawing ? '50%' : undefined,
        right: isDrawing ? undefined : '10px',
        transform: isDrawing ? 'translateX(-50%)' : undefined,
        zIndex: 22,
        display: isDrawing || !hideTriggerButton ? 'flex' : 'none',
        flexDirection: 'column',
        gap: '6px',
        alignItems: 'center',
      }}
    >
      {!hideTriggerButton && !isDrawing && points.length === 0 && (
        <button
          onClick={handleStartDrawing}
          title="Narysuj własny obszar na mapie"
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
          ✏️
        </button>
      )}

      {isDrawing && (
        <div
          style={{
            background: ui.surface,
            border: `1.5px solid ${ui.border}`,
            borderRadius: '12px',
            boxShadow: ui.shadow,
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: ui.text,
          }}
        >
          <span>Kliknij punkty na mapie ({points.length})</span>
          {points.length >= 3 && (
            <button
              onClick={handleFinishDrawing}
              style={{
                padding: '4px 10px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Zastosuj
            </button>
          )}
          <button
            onClick={handleClearDrawing}
            style={{
              padding: '4px 8px',
              background: 'transparent',
              color: '#ef4444',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Anuluj
          </button>
        </div>
      )}

      {!isDrawing && points.length >= 3 && (
        <button
          onClick={handleClearDrawing}
          style={{
            padding: '6px 12px',
            background: ui.surface,
            border: `1.5px solid #ef4444`,
            borderRadius: '20px',
            boxShadow: ui.shadow,
            fontSize: '12px',
            fontWeight: 600,
            color: '#ef4444',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          🗑️ Usuń obszar
        </button>
      )}
    </div>
  );
}
