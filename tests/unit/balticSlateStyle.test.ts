import { describe, it, expect } from 'vitest';
import {
  BALTIC_SLATE_STYLE,
  BALTIC_SLATE_PALETTE,
  BALTIC_SLATE_FALLBACK_URL,
} from '@/lib/geo/balticSlateStyle';

describe('Szczecin Baltic Slate MapLibre Vector Style', () => {
  it('has valid MapLibre StyleSpecification version 8 and metadata', () => {
    expect(BALTIC_SLATE_STYLE.version).toBe(8);
    expect(BALTIC_SLATE_STYLE.name).toContain('Szczecin Baltic Slate');
    expect(BALTIC_SLATE_STYLE.sources).toHaveProperty('carto');
    expect(BALTIC_SLATE_STYLE.layers.length).toBeGreaterThanOrEqual(10);
  });

  it('defines the Baltic Slate color palette correctly', () => {
    expect(BALTIC_SLATE_PALETTE.background).toBe('#090d16');
    expect(BALTIC_SLATE_PALETTE.waterOdra).toBe('#0369a1');
    expect(BALTIC_SLATE_PALETTE.roadMotorway).toBe('#f59e0b');
    expect(BALTIC_SLATE_PALETTE.highVisAccent).toBe('#10b981');
  });

  it('contains dedicated Odra water and 3D building layers', () => {
    const waterLayer = BALTIC_SLATE_STYLE.layers.find((l) => l.id === 'water-glow');
    expect(waterLayer).toBeDefined();
    expect(waterLayer?.type).toBe('fill');

    const buildingLayer = BALTIC_SLATE_STYLE.layers.find((l) => l.id === '3d-buildings-baltic');
    expect(buildingLayer).toBeDefined();
    expect(buildingLayer?.type).toBe('fill-extrusion');
  });

  it('provides a valid fallback URL', () => {
    expect(BALTIC_SLATE_FALLBACK_URL).toContain('cartocdn.com');
  });
});
