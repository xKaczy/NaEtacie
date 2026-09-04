import { describe, it, expect } from 'vitest';
import {
  SZCZECIN_TRAFFIC_IMPEDIMENTS,
  evaluateJobTrafficImpact,
} from '@/lib/geo/szczecinTrafficImpediments';

describe('SzczecinTrafficImpediments - Van Logistics & Road Bottlenecks', () => {
  it('contains essential road reconstructions in Szczecin (Kolumba, Energetyków, Struga)', () => {
    const ids = SZCZECIN_TRAFFIC_IMPEDIMENTS.map((i) => i.id);
    expect(ids).toContain('imp_kolumba');
    expect(ids).toContain('imp_energetykow');
    expect(ids).toContain('imp_struga');
  });

  it('detects traffic bottleneck warning when job location is close to Kolumba', () => {
    // Coordinates near Kolumba / Dworzec Główny Szczecin: [14.5460, 53.4150]
    const impact = evaluateJobTrafficImpact(53.4150, 14.5460);

    expect(impact.hasNearbyRoadworks).toBe(true);
    expect(impact.nearestImpediment?.id).toBe('imp_kolumba');
    expect(impact.warningText).toContain('Kolumba');
    expect(impact.distanceKm).toBeLessThanOrEqual(0.5);
  });

  it('returns no roadworks when job location is far away (e.g. Police / Gryfino)', () => {
    // Police coordinates: [14.57, 53.55]
    const impact = evaluateJobTrafficImpact(53.55, 14.57);

    expect(impact.hasNearbyRoadworks).toBe(false);
    expect(impact.nearestImpediment).toBeUndefined();
  });
});
