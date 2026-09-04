import { describe, it, expect, vi } from 'vitest';
import {
  resolveAutoSunlightMode,
  getSunlightPreset,
  applySunlightToMap,
  SUNLIGHT_PRESETS,
} from '@/lib/geo/sunlightEngine';

describe('3D Sunlight & Dynamic Shading Engine', () => {
  describe('resolveAutoSunlightMode', () => {
    it('resolves day mode during afternoon hours (e.g. 14:00)', () => {
      const afternoon = new Date('2026-08-25T14:00:00');
      expect(resolveAutoSunlightMode(afternoon)).toBe('day');
    });

    it('resolves golden hour in the early evening (e.g. 17:30)', () => {
      const evening = new Date('2026-08-25T17:30:00');
      expect(resolveAutoSunlightMode(evening)).toBe('golden_hour');
    });

    it('resolves sunset during dusk (e.g. 20:00)', () => {
      const dusk = new Date('2026-08-25T20:00:00');
      expect(resolveAutoSunlightMode(dusk)).toBe('sunset');
    });

    it('resolves night cyberpunk mode at night (e.g. 23:00 or 03:00)', () => {
      const night = new Date('2026-08-25T23:00:00');
      expect(resolveAutoSunlightMode(night)).toBe('night_cyberpunk');
    });
  });

  describe('getSunlightPreset', () => {
    it('returns valid presets for all sunlight modes', () => {
      const day = getSunlightPreset('day');
      expect(day.id).toBe('day');
      expect(day.lightColor).toBe('#ffffff');
      expect(day.lightIntensity).toBeGreaterThan(0);

      const golden = getSunlightPreset('golden_hour');
      expect(golden.id).toBe('golden_hour');
      expect(golden.lightColor).toBe('#f59e0b');

      const night = getSunlightPreset('night_cyberpunk');
      expect(night.id).toBe('night_cyberpunk');
      expect(night.lightColor).toBe('#38bdf8');
    });

    it('handles auto mode gracefully', () => {
      const preset = getSunlightPreset('auto', new Date('2026-08-25T12:00:00'));
      expect(preset.id).toBe('day');
    });
  });

  describe('applySunlightToMap', () => {
    it('applies viewport light and building extrusions to map instance without errors', () => {
      const setLightMock = vi.fn();
      const getLayerMock = vi.fn().mockReturnValue({ id: '3d-buildings' });
      const setPaintPropertyMock = vi.fn();

      const mockMap = {
        setLight: setLightMock,
        getLayer: getLayerMock,
        setPaintProperty: setPaintPropertyMock,
      };

      applySunlightToMap(mockMap, 'golden_hour');
      expect(setLightMock).toHaveBeenCalledWith(
        expect.objectContaining({
          anchor: 'map',
          color: '#f59e0b',
        })
      );
      expect(setPaintPropertyMock).toHaveBeenCalledWith('3d-buildings', 'fill-extrusion-color', expect.any(Array));
    });
  });
});
