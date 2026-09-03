import { describe, it, expect } from 'vitest';
import {
  SZCZECIN_LANDMARKS_3D,
  getSzczecinLandmarksGeoJson,
  type SzczecinLandmark3D,
} from '@/lib/geo/szczecinLandmarks3D';

describe('Szczecin 3D Iconic Landmarks Registry & GeoJSON', () => {
  it('contains verified key landmarks of Szczecin with 3D height data and coordinates', () => {
    expect(SZCZECIN_LANDMARKS_3D.length).toBe(8);

    // 1. Dźwigozaury na Łasztowni
    const dzwigi = SZCZECIN_LANDMARKS_3D.find((lm) => lm.id === 'dzwigozaury');
    expect(dzwigi).toBeDefined();
    expect(dzwigi?.name).toContain('Dźwigozaury');
    expect(dzwigi?.category).toBe('industrial');
    expect(dzwigi?.heightMeters).toBe(38);
    expect(dzwigi?.coordinates[0]).toBeCloseTo(14.5668, 3);
    expect(dzwigi?.coordinates[1]).toBeCloseTo(53.4278, 3);

    // 2. Hanza Tower
    const hanza = SZCZECIN_LANDMARKS_3D.find((lm) => lm.id === 'hanza-tower');
    expect(hanza).toBeDefined();
    expect(hanza?.heightMeters).toBe(104);
    expect(hanza?.category).toBe('skyscraper');

    // 3. Pazim Tower
    const pazim = SZCZECIN_LANDMARKS_3D.find((lm) => lm.id === 'pazim');
    expect(pazim).toBeDefined();
    expect(pazim?.heightMeters).toBe(83);

    // 4. Zamek Książąt Pomorskich
    const zamek = SZCZECIN_LANDMARKS_3D.find((lm) => lm.id === 'zamek-ksiazat');
    expect(zamek).toBeDefined();
    expect(zamek?.category).toBe('historic');

    // 5. Stadion Pogoni Szczecin
    const stadion = SZCZECIN_LANDMARKS_3D.find((lm) => lm.id === 'stadion-pogon');
    expect(stadion).toBeDefined();
    expect(stadion?.category).toBe('sports');
    expect(stadion?.badge).toContain('Pogoni Szczecin');

    // 6. Filharmonia
    const filharmonia = SZCZECIN_LANDMARKS_3D.find((lm) => lm.id === 'filharmonia');
    expect(filharmonia).toBeDefined();
    expect(filharmonia?.badge).toContain('Mies van der Rohe');
  });

  it('generates valid GeoJSON FeatureCollection for MapLibre layer rendering', () => {
    const geojson = getSzczecinLandmarksGeoJson();

    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features).toHaveLength(8);

    geojson.features.forEach((feature) => {
      expect(feature.type).toBe('Feature');
      expect(feature.geometry.type).toBe('Point');
      expect(feature.geometry.coordinates).toHaveLength(2);
      expect(feature.properties).toHaveProperty('id');
      expect(feature.properties).toHaveProperty('heightMeters');
      expect(feature.properties).toHaveProperty('badge');
      expect(feature.properties?.heightMeters).toBeGreaterThan(0);
    });
  });
});
