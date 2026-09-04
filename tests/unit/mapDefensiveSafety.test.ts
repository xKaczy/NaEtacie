import { describe, it, expect } from 'vitest';
import {
  filterGeocodedAnnouncements,
  formatPrice,
  isPointInPolygon,
  formatMarkerBadgePrice,
  getMarkerPriceTier,
  isValidCoordinate,
  isValidSzczecinCoordinate,
  clampCoordinate,
  calculateDistanceKm,
  generateSpiderfyPositions,
  parseBoundingBox,
  createGeoJsonCircle,
} from '@/components/map/utils';
import { haversineKm } from '@/lib/matching/engine';
import type { MaskedAnnouncement } from '@/lib/types/announcement';

describe('Map Defensive & Error Resilience Engine', () => {
  describe('filterGeocodedAnnouncements', () => {
    it('handles null, undefined, empty, and corrupt inputs safely', () => {
      // @ts-expect-error test invalid inputs
      expect(filterGeocodedAnnouncements(null)).toEqual([]);
      // @ts-expect-error test invalid inputs
      expect(filterGeocodedAnnouncements(undefined)).toEqual([]);
      expect(filterGeocodedAnnouncements([])).toEqual([]);

      const corruptList = [
        { id: '1', latitude: NaN, longitude: 14.5 } as unknown as MaskedAnnouncement,
        { id: '2', latitude: 53.4, longitude: undefined } as unknown as MaskedAnnouncement,
        { id: '3', latitude: 53.42, longitude: 14.55 } as unknown as MaskedAnnouncement,
      ];

      const valid = filterGeocodedAnnouncements(corruptList);
      expect(valid).toHaveLength(1);
      expect(valid[0].id).toBe('3');
    });
  });

  describe('formatPrice', () => {
    it('formats null, undefined, and NaN prices without crashing', () => {
      expect(formatPrice(null)).toBe('Cena niepodana');
      // @ts-expect-error test invalid inputs
      expect(formatPrice(undefined)).toBe('Cena niepodana');
      expect(formatPrice(NaN)).toBe('Cena niepodana');
      expect(formatPrice(8500)).toContain('8');
    });
  });

  describe('isPointInPolygon', () => {
    const polygon: Array<[number, number]> = [
      [14.50, 53.40],
      [14.60, 53.40],
      [14.60, 53.50],
      [14.50, 53.50],
    ];

    it('detects points inside polygon', () => {
      // [lat, lng] inside
      expect(isPointInPolygon([53.45, 14.55], polygon)).toBe(true);
      // [lat, lng] outside
      expect(isPointInPolygon([53.60, 14.55], polygon)).toBe(false);
    });

    it('returns false for corrupt polygon or corrupt point safely', () => {
      expect(isPointInPolygon(null, polygon)).toBe(false);
      expect(isPointInPolygon([53.45, 14.55], null)).toBe(false);
      expect(isPointInPolygon([53.45, 14.55], [])).toBe(false);
      expect(isPointInPolygon([NaN, 14.55], polygon)).toBe(false);
    });
  });

  describe('formatMarkerBadgePrice & getMarkerPriceTier', () => {
    it('formats badge prices correctly', () => {
      expect(formatMarkerBadgePrice(null)).toBe('Oferta');
      expect(formatMarkerBadgePrice('12000')).toBe('12k');
      expect(formatMarkerBadgePrice(8500)).toBe('8.5k');
    });

    it('resolves price tiers accurately', () => {
      expect(getMarkerPriceTier(12000)).toBe('high');
      expect(getMarkerPriceTier(7500)).toBe('medium');
      expect(getMarkerPriceTier(4000)).toBe('normal');
      expect(getMarkerPriceTier(null)).toBe('normal');
    });
  });

  describe('Geographic Coordinate Validation & Clamping', () => {
    it('validates global GPS bounds [-90, 90] and [-180, 180]', () => {
      expect(isValidCoordinate(53.4285, 14.5528)).toBe(true); // Szczecin
      expect(isValidCoordinate(0, 0)).toBe(true);
      expect(isValidCoordinate(90, 180)).toBe(true);
      expect(isValidCoordinate(-90, -180)).toBe(true);

      // Out of bounds
      expect(isValidCoordinate(90.1, 14.5)).toBe(false);
      expect(isValidCoordinate(-90.1, 14.5)).toBe(false);
      expect(isValidCoordinate(53.4, 180.1)).toBe(false);
      expect(isValidCoordinate(53.4, -180.1)).toBe(false);

      // Corrupted / invalid types
      expect(isValidCoordinate(NaN, 14.5)).toBe(false);
      expect(isValidCoordinate(53.4, NaN)).toBe(false);
      expect(isValidCoordinate(Infinity, 14.5)).toBe(false);
      expect(isValidCoordinate(null, 14.5)).toBe(false);
      expect(isValidCoordinate('53.4', 14.5)).toBe(false);
      expect(isValidCoordinate(undefined, undefined)).toBe(false);
    });

    it('validates Szczecin metropolitan region coordinates specifically', () => {
      // Inside Szczecin metropolitan area
      expect(isValidSzczecinCoordinate(53.4285, 14.5528)).toBe(true); // Centrum
      expect(isValidSzczecinCoordinate(53.3973, 14.5064)).toBe(true); // Gumieńce
      expect(isValidSzczecinCoordinate(53.5513, 14.5692)).toBe(true); // Police
      expect(isValidSzczecinCoordinate(53.2500, 14.4800)).toBe(true); // Gryfino

      // Outside Szczecin area
      expect(isValidSzczecinCoordinate(52.2297, 21.0122)).toBe(false); // Warsaw
      expect(isValidSzczecinCoordinate(52.5200, 13.4050)).toBe(false); // Berlin
      expect(isValidSzczecinCoordinate(35.6762, 139.6503)).toBe(false); // Tokyo
      expect(isValidSzczecinCoordinate(NaN, 14.55)).toBe(false);
    });

    it('clamps coordinates safely within valid GPS range', () => {
      expect(clampCoordinate(53.4, 14.5)).toEqual([53.4, 14.5]);
      expect(clampCoordinate(95, 190)).toEqual([90, 180]);
      expect(clampCoordinate(-100, -200)).toEqual([-90, -180]);
      expect(clampCoordinate(NaN, 14.5)).toEqual([0, 14.5]);
    });
  });

  describe('Haversine Distance Calculation & Resilience', () => {
    it('calculates exact 0 km distance between identical points', () => {
      expect(calculateDistanceKm(53.4285, 14.5528, 53.4285, 14.5528)).toBe(0);
    });

    it('calculates realistic distances in Szczecin region with symmetry', () => {
      // Centrum (53.4285, 14.5528) to Dąbie (53.398, 14.672) ~8.5 km
      const d1 = calculateDistanceKm(53.4285, 14.5528, 53.398, 14.672);
      const d2 = calculateDistanceKm(53.398, 14.672, 53.4285, 14.5528);

      expect(d1).toBeGreaterThan(7.0);
      expect(d1).toBeLessThan(10.0);
      expect(d1).toBe(d2); // Symmetry
    });

    it('calculates long-range distance accurately (Szczecin to Berlin ~130-140 km)', () => {
      const dist = calculateDistanceKm(53.4285, 14.5528, 52.5200, 13.4050);
      expect(dist).toBeGreaterThan(120);
      expect(dist).toBeLessThan(160);
    });

    it('returns 0 safely for corrupted or out-of-range inputs', () => {
      expect(calculateDistanceKm(NaN, 14.5, 53.4, 14.6)).toBe(0);
      expect(calculateDistanceKm(53.4, 14.5, 100, 14.6)).toBe(0);
      // @ts-expect-error testing null input resilience
      expect(calculateDistanceKm(null, 14.5, 53.4, 14.6)).toBe(0);
    });
  });

  describe('Spiderfy Spiral / Circle Placement Algorithm', () => {
    const center: [number, number] = [14.5528, 53.4285]; // [lng, lat]

    it('returns empty array when count is 0 or negative', () => {
      expect(generateSpiderfyPositions(center, 0)).toEqual([]);
      expect(generateSpiderfyPositions(center, -1)).toEqual([]);
    });

    it('returns single position unchanged when count is 1', () => {
      const positions = generateSpiderfyPositions(center, 1);
      expect(positions).toHaveLength(1);
      expect(positions[0]).toEqual(center);
    });

    it('spreads 4 overlapping pins evenly in a circular ring', () => {
      const count = 4;
      const positions = generateSpiderfyPositions(center, count, 14);

      expect(positions).toHaveLength(count);

      // None of the points should be exactly at the center
      for (const pos of positions) {
        expect(pos).not.toEqual(center);
        expect(pos[0]).toBeGreaterThan(14.0);
        expect(pos[1]).toBeGreaterThan(53.0);
      }

      // All 4 points must be distinct
      const uniqueKeys = new Set(positions.map((p) => `${p[0]},${p[1]}`));
      expect(uniqueKeys.size).toBe(count);
    });

    it('spreads large clusters (>8 items) in an expanding spiral', () => {
      const count = 12;
      const positions = generateSpiderfyPositions(center, count, 14);

      expect(positions).toHaveLength(count);

      // The last item in the spiral should have a larger distance from the center than the first
      const distFirst = Math.hypot(positions[0][0] - center[0], positions[0][1] - center[1]);
      const distLast = Math.hypot(positions[11][0] - center[0], positions[11][1] - center[1]);

      expect(distLast).toBeGreaterThan(distFirst);
    });

    it('scales offset distance inversely with map zoom level', () => {
      // Zoom 10 (zoomed out): each pixel represents more km -> larger degree offset
      const lowZoomPositions = generateSpiderfyPositions(center, 4, 10);
      // Zoom 18 (zoomed in): each pixel represents fewer km -> smaller degree offset
      const highZoomPositions = generateSpiderfyPositions(center, 4, 18);

      const offsetLow = Math.hypot(lowZoomPositions[0][0] - center[0], lowZoomPositions[0][1] - center[1]);
      const offsetHigh = Math.hypot(highZoomPositions[0][0] - center[0], highZoomPositions[0][1] - center[1]);

      expect(offsetLow).toBeGreaterThan(offsetHigh);
    });

    it('handles corrupt coordinates or NaN gracefully without throwing', () => {
      // @ts-expect-error test invalid center
      expect(generateSpiderfyPositions(null, 5)).toEqual([]);
      // @ts-expect-error test incomplete center
      expect(generateSpiderfyPositions([14.5], 5)).toEqual([]);
      expect(generateSpiderfyPositions([NaN, 53.4], 5)).toEqual([]);
      expect(generateSpiderfyPositions([14.5, NaN], 5)).toEqual([]);
    });
  });

  describe('Safe BoundingBox Parser', () => {
    it('parses valid comma-separated bounding box coordinates', () => {
      const raw = '53.3,14.4,53.5,14.7';
      const bbox = parseBoundingBox(raw);

      expect(bbox).toEqual({
        south_lat: 53.3,
        west_lng: 14.4,
        north_lat: 53.5,
        east_lng: 14.7,
      });
    });

    it('rejects inverted or corrupt bounding boxes safely', () => {
      // south > north
      expect(parseBoundingBox('53.5,14.4,53.3,14.7')).toBeNull();
      // west > east
      expect(parseBoundingBox('53.3,14.7,53.5,14.4')).toBeNull();
      // corrupt string
      expect(parseBoundingBox('not,a,valid,bbox')).toBeNull();
      expect(parseBoundingBox('')).toBeNull();
      expect(parseBoundingBox(null)).toBeNull();
      expect(parseBoundingBox(undefined)).toBeNull();
      expect(parseBoundingBox('53.3,14.4,53.5')).toBeNull(); // Only 3 parts
    });
  });

  describe('createGeoJsonCircle defensive geometry generation', () => {
    const center: [number, number] = [14.5528, 53.4285];

    it('generates a valid closed Polygon GeoJSON', () => {
      const circle = createGeoJsonCircle(center, 5, 32);
      expect(circle.type).toBe('Feature');
      expect(circle.geometry.type).toBe('Polygon');
      expect(circle.geometry.coordinates).toHaveLength(1);
      const ring = circle.geometry.coordinates[0];
      expect(ring.length).toBe(33); // 32 points + 1 closing point
      // First and last point must match to close the polygon loop
      expect(ring[0]).toEqual(ring[ring.length - 1]);
    });

    it('handles negative or zero radius safely without throwing', () => {
      const zeroCircle = createGeoJsonCircle(center, 0);
      expect(zeroCircle.geometry.type).toBe('Polygon');

      const negCircle = createGeoJsonCircle(center, -5);
      expect(negCircle.geometry.type).toBe('Polygon');
    });

    it('handles NaN coordinates or corrupt inputs safely', () => {
      // @ts-expect-error test invalid center
      const corrupt1 = createGeoJsonCircle(null, 5);
      expect(corrupt1.geometry.coordinates).toEqual([[]]);

      const corrupt2 = createGeoJsonCircle([NaN, 53.4], 5);
      expect(corrupt2.geometry.coordinates).toEqual([[]]);
    });
  });

  describe('Archimedean multi-turn spiderfy in Szczecin center', () => {
    const bramaPortowa: [number, number] = [14.5528, 53.4285];

    it('distributes 25 dense offers in central Szczecin without colliding positions', () => {
      const count = 25;
      const positions = generateSpiderfyPositions(bramaPortowa, count, 14);

      expect(positions).toHaveLength(count);

      // Verify all positions are unique and finite numbers
      const uniqueKeys = new Set(positions.map((p) => `${p[0]},${p[1]}`));
      expect(uniqueKeys.size).toBe(count);

      // Verify each position is valid within Szczecin region
      for (const pos of positions) {
        expect(isFinite(pos[0])).toBe(true);
        expect(isFinite(pos[1])).toBe(true);
        expect(isValidSzczecinCoordinate(pos[1], pos[0])).toBe(true);
      }

      // Verify radial expansion: spiral outermost point has greater radius than inner ring
      const innerDist = Math.hypot(positions[1][0] - bramaPortowa[0], positions[1][1] - bramaPortowa[1]);
      const outerDist = Math.hypot(positions[24][0] - bramaPortowa[0], positions[24][1] - bramaPortowa[1]);
      expect(outerDist).toBeGreaterThan(innerDist);
    });
  });

  describe('Haversine defensive math resilience', () => {
    it('handles NaN and non-finite values safely in haversineKm', () => {
      expect(haversineKm(NaN, 14.5, 53.4, 14.6)).toBe(0);
      expect(haversineKm(53.4, NaN, 53.4, 14.6)).toBe(0);
      expect(haversineKm(Infinity, 14.5, 53.4, 14.6)).toBe(0);
      // @ts-expect-error test null inputs
      expect(haversineKm(null, null, null, null)).toBe(0);
    });

    it('computes accurate distance for identical and known points', () => {
      expect(haversineKm(53.4285, 14.5528, 53.4285, 14.5528)).toBeCloseTo(0, 5);
      // Szczecin to Police ~ 14km
      const d = haversineKm(53.4285, 14.5528, 53.5513, 14.5692);
      expect(d).toBeGreaterThan(12);
      expect(d).toBeLessThan(16);
    });
  });
});

