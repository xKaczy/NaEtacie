import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  filterGeocodedAnnouncements,
  formatMarkerBadgePrice,
  getMarkerPriceTier,
  isValidCoordinate,
  calculateDistanceKm,
  generateSpiderfyPositions,
} from './utils';
import { MaskedAnnouncement, SourcePortal } from '@/lib/types/announcement';

/**
 * Feature: construction-ads-aggregator, Property 9: Map marker coordinate filtering
 * Validates: Requirements 7.2
 */
describe('Property 9: Map marker coordinate filtering', () => {
  const sourcePortalArb: fc.Arbitrary<SourcePortal> = fc.constantFrom('olx', 'oferteo', 'fixly');

  const maskedAnnouncementArb: fc.Arbitrary<MaskedAnnouncement> = fc.record({
    deduplication_key: fc.string({ minLength: 1 }),
    title: fc.string(),
    description: fc.string(),
    source_portal: sourcePortalArb,
    category: fc.string(),
    location_text: fc.string(),
    latitude: fc.option(fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }), { nil: null }),
    longitude: fc.option(fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }), { nil: null }),
    price: fc.option(fc.double({ min: 0, max: 1000000, noNaN: true, noDefaultInfinity: true }), { nil: null }),
    scraped_at: fc.date(),
    published_at: fc.option(fc.date(), { nil: null }),
    source_url: fc.option(fc.webUrl(), { nil: undefined }),
    contact_info: fc.option(fc.string(), { nil: null }),
  });

  const announcementListArb = fc.array(maskedAnnouncementArb, { minLength: 0, maxLength: 50 });

  it('returns only announcements where both latitude and longitude are non-null', () => {
    fc.assert(
      fc.property(announcementListArb, (announcements) => {
        const result = filterGeocodedAnnouncements(announcements);

        for (const item of result) {
          expect(item.latitude).not.toBeNull();
          expect(item.longitude).not.toBeNull();
        }
      }),
      { numRuns: 100 }
    );
  });

  it('no announcement with null latitude appears in the output', () => {
    fc.assert(
      fc.property(announcementListArb, (announcements) => {
        const result = filterGeocodedAnnouncements(announcements);

        const hasNullLat = result.some((a) => a.latitude === null);
        expect(hasNullLat).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('no announcement with null longitude appears in the output', () => {
    fc.assert(
      fc.property(announcementListArb, (announcements) => {
        const result = filterGeocodedAnnouncements(announcements);

        const hasNullLng = result.some((a) => a.longitude === null);
        expect(hasNullLng).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('all announcements with both non-null coordinates are included in the output', () => {
    fc.assert(
      fc.property(announcementListArb, (announcements) => {
        const result = filterGeocodedAnnouncements(announcements);
        const expected = announcements.filter(
          (a) => a.latitude !== null && a.longitude !== null
        );

        expect(result.length).toBe(expected.length);

        for (let i = 0; i < result.length; i++) {
          expect(result[i]).toBe(expected[i]);
        }
      }),
      { numRuns: 100 }
    );
  });
});

describe('formatMarkerBadgePrice & getMarkerPriceTier helpers', () => {
  it('formats numeric prices into compact k-suffix strings', () => {
    expect(formatMarkerBadgePrice(12000)).toBe('12k');
    expect(formatMarkerBadgePrice(8500)).toBe('8.5k');
    expect(formatMarkerBadgePrice(null)).toBe('Oferta');

    expect(getMarkerPriceTier(12000)).toBe('high');
    expect(getMarkerPriceTier(7500)).toBe('medium');
    expect(getMarkerPriceTier(4000)).toBe('normal');
  });
});

describe('Property: Geographic coordinate validation & distance', () => {
  const latArb = fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true });
  const lngArb = fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true });

  it('isValidCoordinate accepts all numbers within [-90, 90] x [-180, 180]', () => {
    fc.assert(
      fc.property(latArb, lngArb, (lat, lng) => {
        expect(isValidCoordinate(lat, lng)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('calculateDistanceKm is symmetric, non-negative, and bounded by Earth circumference', () => {
    fc.assert(
      fc.property(latArb, lngArb, latArb, lngArb, (lat1, lon1, lat2, lon2) => {
        const d1 = calculateDistanceKm(lat1, lon1, lat2, lon2);
        const d2 = calculateDistanceKm(lat2, lon2, lat1, lon1);

        expect(d1).toBeGreaterThanOrEqual(0);
        expect(d1).toBe(d2); // Symmetry
        expect(d1).toBeLessThanOrEqual(20038); // Half circumference of Earth (~20,015 km)
      }),
      { numRuns: 100 }
    );
  });

  it('calculateDistanceKm identity: distance to same point is always 0', () => {
    fc.assert(
      fc.property(latArb, lngArb, (lat, lon) => {
        expect(calculateDistanceKm(lat, lon, lat, lon)).toBe(0);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property: Spiderfy placement algorithm', () => {
  const latArb = fc.double({ min: -80, max: 80, noNaN: true, noDefaultInfinity: true });
  const lngArb = fc.double({ min: -170, max: 170, noNaN: true, noDefaultInfinity: true });
  const countArb = fc.integer({ min: 1, max: 30 });
  const zoomArb = fc.integer({ min: 5, max: 20 });

  it('always produces exactly N finite coordinates for count N >= 1', () => {
    fc.assert(
      fc.property(lngArb, latArb, countArb, zoomArb, (lng, lat, count, zoom) => {
        const positions = generateSpiderfyPositions([lng, lat], count, zoom);
        expect(positions).toHaveLength(count);

        for (const [x, y] of positions) {
          expect(Number.isFinite(x)).toBe(true);
          expect(Number.isFinite(y)).toBe(true);
          expect(Number.isNaN(x)).toBe(false);
          expect(Number.isNaN(y)).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });
});

