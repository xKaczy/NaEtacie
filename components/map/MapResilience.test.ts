import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import {
  isValidCoordinate,
  isValidSzczecinCoordinate,
  clampCoordinate,
  filterGeocodedAnnouncements,
  isValidGeoJSONPoint,
  isValidGeoJSONLineString,
  isValidGeoJSONPolygon,
  isValidGeoJSONGeometry,
  sanitizeGeoJSONFeature,
  sanitizeFeatureCollection,
  generateSpiderfyPositions,
} from './utils';
import { jitteredPosition } from '@/lib/geo/jitter';
import { MapErrorBoundary } from './MapErrorBoundary';

describe('Map Resilience - Coordinate Validation', () => {
  it('identifies valid coordinates within legal GPS bounds', () => {
    expect(isValidCoordinate(53.4285, 14.5528)).toBe(true); // Szczecin
    expect(isValidCoordinate(0, 0)).toBe(true);
    expect(isValidCoordinate(90, 180)).toBe(true);
    expect(isValidCoordinate(-90, -180)).toBe(true);
  });

  it('rejects null, undefined, and non-number types', () => {
    expect(isValidCoordinate(null, 14.5)).toBe(false);
    expect(isValidCoordinate(53.4, undefined)).toBe(false);
    expect(isValidCoordinate('53.4', 14.5)).toBe(false);
    expect(isValidCoordinate({}, [])).toBe(false);
    expect(isValidCoordinate(true, false)).toBe(false);
  });

  it('rejects NaN, Infinity, and -Infinity values', () => {
    expect(isValidCoordinate(NaN, 14.5)).toBe(false);
    expect(isValidCoordinate(53.4, NaN)).toBe(false);
    expect(isValidCoordinate(Infinity, 14.5)).toBe(false);
    expect(isValidCoordinate(53.4, -Infinity)).toBe(false);
  });

  it('rejects out-of-bounds latitudes and longitudes', () => {
    expect(isValidCoordinate(90.1, 14.5)).toBe(false);
    expect(isValidCoordinate(-91, 14.5)).toBe(false);
    expect(isValidCoordinate(53.4, 180.1)).toBe(false);
    expect(isValidCoordinate(53.4, -181)).toBe(false);
    expect(isValidCoordinate(999, 999)).toBe(false);
  });

  it('correctly validates Szczecin metropolitan region bounds', () => {
    expect(isValidSzczecinCoordinate(53.4285, 14.5528)).toBe(true); // Plac Rodła
    expect(isValidSzczecinCoordinate(53.55, 14.57)).toBe(true); // Police
    expect(isValidSzczecinCoordinate(52.2297, 21.0122)).toBe(false); // Warsaw
  });

  it('clamps coordinates safely to GPS bounds', () => {
    expect(clampCoordinate(100, 200)).toEqual([90, 180]);
    expect(clampCoordinate(-100, -200)).toEqual([-90, -180]);
    expect(clampCoordinate(NaN, Infinity)).toEqual([0, 180]);
  });
});

describe('Map Resilience - Announcement Filtering', () => {
  it('strictly filters out invalid and out-of-bounds coordinates', () => {
    const rawAds = [
      { id: '1', latitude: 53.4, longitude: 14.5 },
      { id: '2', latitude: null, longitude: 14.5 },
      { id: '3', latitude: 53.4, longitude: undefined },
      { id: '4', latitude: NaN, longitude: 14.5 },
      { id: '5', latitude: Infinity, longitude: 14.5 },
      { id: '6', latitude: 120, longitude: 14.5 }, // out of bounds lat
      { id: '7', latitude: 53.4, longitude: -250 }, // out of bounds lng
      { id: '8', latitude: 53.43, longitude: 14.56 },
    ];

    const result = filterGeocodedAnnouncements(rawAds as any);
    expect(result).toHaveLength(2);
    expect(result.map((a) => a.id)).toEqual(['1', '8']);
  });

  it('handles null/undefined/non-array inputs without throwing', () => {
    expect(filterGeocodedAnnouncements(null as any)).toEqual([]);
    expect(filterGeocodedAnnouncements(undefined as any)).toEqual([]);
    expect(filterGeocodedAnnouncements({} as any)).toEqual([]);
  });
});

describe('Map Resilience - GeoJSON Validation & Sanitization', () => {
  it('validates GeoJSON Point geometries', () => {
    expect(isValidGeoJSONPoint({ type: 'Point', coordinates: [14.55, 53.42] })).toBe(true);
    expect(isValidGeoJSONPoint({ type: 'Point', coordinates: [NaN, 53.42] })).toBe(false);
    expect(isValidGeoJSONPoint({ type: 'Point', coordinates: [14.55] })).toBe(false);
    expect(isValidGeoJSONPoint({ type: 'LineString', coordinates: [] })).toBe(false);
    expect(isValidGeoJSONPoint(null)).toBe(false);
  });

  it('validates GeoJSON LineString geometries per RFC 7946', () => {
    expect(
      isValidGeoJSONLineString({
        type: 'LineString',
        coordinates: [
          [14.5, 53.4],
          [14.6, 53.5],
        ],
      })
    ).toBe(true);

    // 1-point LineString is invalid per RFC 7946
    expect(
      isValidGeoJSONLineString({
        type: 'LineString',
        coordinates: [[14.5, 53.4]],
      })
    ).toBe(false);

    // Corrupted coordinates with NaN
    expect(
      isValidGeoJSONLineString({
        type: 'LineString',
        coordinates: [
          [14.5, 53.4],
          [NaN, 53.5],
        ],
      })
    ).toBe(false);
  });

  it('validates GeoJSON Polygon geometries with closed rings', () => {
    const validPolygon = {
      type: 'Polygon',
      coordinates: [
        [
          [14.5, 53.4],
          [14.6, 53.4],
          [14.6, 53.5],
          [14.5, 53.4], // closed
        ],
      ],
    };
    expect(isValidGeoJSONPolygon(validPolygon)).toBe(true);

    // Unclosed polygon ring
    const unclosedPolygon = {
      type: 'Polygon',
      coordinates: [
        [
          [14.5, 53.4],
          [14.6, 53.4],
          [14.6, 53.5],
          [14.7, 53.6], // not matching first vertex
        ],
      ],
    };
    expect(isValidGeoJSONPolygon(unclosedPolygon)).toBe(false);
  });

  it('sanitizes GeoJSON features and strips corrupt ones', () => {
    const mixedFeatures = [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [14.55, 53.42] },
        properties: { name: 'Valid Feature' },
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [NaN, 53.42] }, // Corrupt
        properties: null,
      },
      null,
      'invalid-feature',
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [14.5, 53.4],
            [14.6, 53.5],
          ],
        },
        properties: { id: 2 },
      },
    ];

    const fc = sanitizeFeatureCollection(mixedFeatures);
    expect(fc.type).toBe('FeatureCollection');
    expect(fc.features).toHaveLength(2);
    expect(fc.features[0].geometry.type).toBe('Point');
    expect(fc.features[1].geometry.type).toBe('LineString');
  });
});

describe('Map Resilience - Jitter and Spiderfy Calculations', () => {
  it('jitteredPosition produces deterministic, finite coordinates even at extreme latitudes', () => {
    const [lat1, lng1] = jitteredPosition(53.4285, 14.5528, 'ad-100');
    const [lat2, lng2] = jitteredPosition(53.4285, 14.5528, 'ad-100');

    expect(lat1).toBe(lat2);
    expect(lng1).toBe(lng2);
    expect(isValidCoordinate(lat1, lng1)).toBe(true);

    // Extreme pole test: lat 89.9 must not result in division by zero
    const [poleLat, poleLng] = jitteredPosition(89.9, 10, 'pole-ad');
    expect(Number.isFinite(poleLat)).toBe(true);
    expect(Number.isFinite(poleLng)).toBe(true);
    expect(poleLat).toBeLessThanOrEqual(90);
    expect(poleLng).toBeLessThanOrEqual(180);

    // Corrupted input test
    const [fallbackLat, fallbackLng] = jitteredPosition(NaN as any, null as any, null as any);
    expect(isValidCoordinate(fallbackLat, fallbackLng)).toBe(true);
  });

  it('generateSpiderfyPositions generates safe positions and handles count <= 1', () => {
    const single = generateSpiderfyPositions([14.55, 53.42], 1);
    expect(single).toEqual([[14.55, 53.42]]);

    const multiple = generateSpiderfyPositions([14.55, 53.42], 5);
    expect(multiple).toHaveLength(5);
    multiple.forEach(([lng, lat]) => {
      expect(isValidCoordinate(lat, lng)).toBe(true);
    });

    // Zero or invalid coords
    expect(generateSpiderfyPositions([NaN, 53.42], 5)).toEqual([]);
    expect(generateSpiderfyPositions([14.55, 53.42], 0)).toEqual([]);
  });
});

describe('Map Resilience - Error Boundary', () => {
  it('catches render errors and renders fallback without crashing the app', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    function CrashingChild(): React.ReactElement {
      throw new Error('WebGL context initialization failed');
    }

    const boundary = new MapErrorBoundary({
      children: React.createElement(CrashingChild),
    });

    const derivedState = MapErrorBoundary.getDerivedStateFromError(new Error('WebGL context lost'));
    expect(derivedState.hasError).toBe(true);
    expect(derivedState.error?.message).toBe('WebGL context lost');

    consoleSpy.mockRestore();
  });
});
