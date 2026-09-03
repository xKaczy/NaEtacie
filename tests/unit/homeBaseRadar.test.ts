import { describe, it, expect } from 'vitest';
import {
  generateRadarGeoJsonCircle,
  isJobWithinRadar,
  calculateDistanceKm,
} from '@/lib/geo/homeBaseRadar';

describe('Home Base Radar Utility', () => {
  const homeSzczecinCentrum: [number, number] = [14.5528, 53.4285]; // [lng, lat]

  it('generates a closed GeoJSON polygon circle around home coordinates', () => {
    const geo = generateRadarGeoJsonCircle(homeSzczecinCentrum, 10, 32);
    expect(geo.type).toBe('Feature');
    expect(geo.geometry.type).toBe('Polygon');
    expect(geo.geometry.coordinates[0].length).toBe(33); // 32 + 1 to close
    expect(geo.properties.radiusKm).toBe(10);
  });

  it('identifies jobs within radar radius correctly', () => {
    // Pogodno (~3 km from centrum)
    const pogodnoLat = 53.442;
    const pogodnoLng = 14.515;
    expect(isJobWithinRadar(pogodnoLat, pogodnoLng, homeSzczecinCentrum, 5)).toBe(true);

    // Stargard (~32 km from centrum)
    const stargardLat = 53.336;
    const stargardLng = 15.050;
    expect(isJobWithinRadar(stargardLat, stargardLng, homeSzczecinCentrum, 10)).toBe(false);
    expect(isJobWithinRadar(stargardLat, stargardLng, homeSzczecinCentrum, 40)).toBe(true);
  });

  it('returns false when job coordinates are missing', () => {
    expect(isJobWithinRadar(null, null, homeSzczecinCentrum, 10)).toBe(false);
  });

  it('calculates Haversine distance with reasonable precision', () => {
    const dist = calculateDistanceKm(53.4285, 14.5528, 53.442, 14.515);
    expect(dist).toBeGreaterThan(2);
    expect(dist).toBeLessThan(4);
  });
});
