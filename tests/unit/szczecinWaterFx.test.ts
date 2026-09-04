import { describe, it, expect, vi } from 'vitest';
import { generateWaterPatternSvg, applySzczecinWaterFx } from '@/lib/geo/szczecinWaterFx';
import { applySunlightToMap, getSunlightPreset } from '@/lib/geo/sunlightEngine';

describe('Szczecin Water FX & Dynamic Sunlight Shading', () => {
  it('generates valid SVG data URI pattern for Odra water ripple', () => {
    const uri = generateWaterPatternSvg('#0e3d59', '#38bdf8');
    expect(uri).toContain('data:image/svg+xml;charset=utf-8');
    expect(uri).toContain('0e3d59');
    expect(uri).toContain('38bdf8');
  });

  it('applies water styling and shoreline highlights to MapLibre layers', () => {
    const mockLayers: Record<string, any> = {
      water: { id: 'water' },
      'water-outline': { id: 'water-outline' },
    };
    const setPaintProperty = vi.fn();

    const mockMap = {
      getLayer: (id: string) => mockLayers[id] || null,
      setPaintProperty,
    };

    applySzczecinWaterFx(mockMap, '#03172e', true);

    expect(setPaintProperty).toHaveBeenCalledWith('water', 'fill-color', '#03172e');
    expect(setPaintProperty).toHaveBeenCalledWith('water', 'fill-opacity', 0.95);
    expect(setPaintProperty).toHaveBeenCalledWith('water-outline', 'line-color', '#06b6d4');
  });

  it('correctly synchronizes sunlight presets and applies directional lighting & fog', () => {
    const setLight = vi.fn();
    const setFog = vi.fn();
    const setPaintProperty = vi.fn();

    const mockMap = {
      setLight,
      setFog,
      getLayer: (id: string) => (id === 'water' ? { id: 'water' } : null),
      setPaintProperty,
    };

    applySunlightToMap(mockMap, 'morning');

    expect(setLight).toHaveBeenCalledWith(
      expect.objectContaining({
        anchor: 'map',
        color: '#fef08a',
        intensity: 0.64,
      })
    );

    expect(setFog).toHaveBeenCalled();
    const preset = getSunlightPreset('morning');
    expect(preset.name).toBe('Poranek Fachowca (06:30)');
  });
});
