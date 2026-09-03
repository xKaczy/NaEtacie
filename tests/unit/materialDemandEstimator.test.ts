import { describe, it, expect } from 'vitest';
import {
  calculateDrywallMaterials,
  calculatePlasterAndPaintMaterials,
} from '@/lib/calculator/materialDemandEstimator';

describe('Material Demand Estimator for Construction Jobs', () => {
  it('calculates drywall boards, profiles, and screws accurately', () => {
    const res = calculateDrywallMaterials(50);
    expect(res.scopeM2).toBe(50);
    expect(res.materials.length).toBe(4);
    const boards = res.materials.find((m) => m.name.includes('Płyty G-K'));
    expect(boards).toBeDefined();
    expect(boards!.quantity).toBeGreaterThanOrEqual(16);
    expect(res.totalApproxCostPLN).toBeGreaterThan(500);
  });

  it('calculates plaster bags and paint buckets for painting', () => {
    const res = calculatePlasterAndPaintMaterials(100);
    expect(res.scopeM2).toBe(100);
    const plaster = res.materials.find((m) => m.name.includes('Gładź'));
    expect(plaster!.quantity).toBe(6); // 100 * 1.2 = 120kg / 20 = 6 bags
    expect(res.totalApproxCostPLN).toBeGreaterThan(400);
  });
});
