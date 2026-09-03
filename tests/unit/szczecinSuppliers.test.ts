import { describe, it, expect } from 'vitest';
import {
  SZCZECIN_CONSTRUCTION_SUPPLIERS,
  findNearestSupplier,
  getSuppliersGeoJson,
} from '@/lib/geo/szczecinSuppliers';

describe('Szczecin Construction Suppliers & DIY Megastores', () => {
  it('contains major stores including Castorama, Leroy Merlin, and Bricoman', () => {
    const names = SZCZECIN_CONSTRUCTION_SUPPLIERS.map((s) => s.name.toLowerCase());
    expect(names.some((n) => n.includes('castorama'))).toBe(true);
    expect(names.some((n) => n.includes('leroy'))).toBe(true);
    expect(names.some((n) => n.includes('bricoman'))).toBe(true);
    expect(SZCZECIN_CONSTRUCTION_SUPPLIERS.length).toBeGreaterThanOrEqual(8);
  });

  it('correctly calculates the nearest supplier for a job site in Gumieńce', () => {
    // Coordinates near ul. Południowa / Cukrowa
    const result = findNearestSupplier(53.3980, 14.4990);
    expect(result).toBeDefined();
    expect(result?.supplier.name).toContain('Castorama Południowa');
    expect(result?.distanceKm).toBeLessThan(1.0);
    expect(result?.driveTimeMinutes).toBeLessThanOrEqual(5);
  });

  it('correctly calculates the nearest supplier for a job site on Warszewo / Żelechowa', () => {
    // Coordinates on Warszewo
    const result = findNearestSupplier(53.4650, 14.5500);
    expect(result).toBeDefined();
    expect(result?.supplier.name).toContain('Leroy Merlin Golisza');
    expect(result?.distanceKm).toBeLessThan(3.0);
  });

  it('returns valid GeoJSON FeatureCollection', () => {
    const geo = getSuppliersGeoJson();
    expect(geo.type).toBe('FeatureCollection');
    expect(geo.features.length).toBe(SZCZECIN_CONSTRUCTION_SUPPLIERS.length);
    expect(geo.features[0].geometry.type).toBe('Point');
  });

  it('returns null for missing coordinates', () => {
    expect(findNearestSupplier(null, null)).toBeNull();
  });
});
