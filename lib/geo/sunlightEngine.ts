/**
 * Real-Time Sunlight & Dynamic 3D Shading Engine for Szczecin (53.4285° N, 14.5528° E).
 * Senior Geospatial Graphics Architecture for NaEtacie 3D & Baltic Slate.
 */

export type SunlightMode = 'day' | 'golden_hour' | 'sunset' | 'night_cyberpunk' | 'morning' | 'auto';

export interface SunlightPreset {
  id: SunlightMode;
  name: string;
  icon: string;
  lightColor: string;
  lightIntensity: number;
  lightPosition: [number, number, number]; // [radial distance, azimuthal angle, polar angle]
  skyColor: string;
  horizonColor: string;
  fogColor: string;
  buildingBaseColor: string;
  buildingTopColor: string;
  buildingOpacity: number;
  ambientGlowColor: string;
}

export const SUNLIGHT_PRESETS: Record<Exclude<SunlightMode, 'auto'>, SunlightPreset> = {
  morning: {
    id: 'morning',
    name: 'Poranek Fachowca (06:30)',
    icon: '☕',
    lightColor: '#fde68a',
    lightIntensity: 0.62,
    lightPosition: [1.6, 105, 18], // Low East angle, long morning shadows for external crews
    skyColor: '#fef3c7',
    horizonColor: '#fcd34d',
    fogColor: '#fffbeb',
    buildingBaseColor: '#64748b',
    buildingTopColor: '#f59e0b',
    buildingOpacity: 0.88,
    ambientGlowColor: '#fbbf24',
  },
  day: {
    id: 'day',
    name: 'Jasny Dzień',
    icon: '☀️',
    lightColor: '#ffffff',
    lightIntensity: 0.55,
    lightPosition: [1.25, 210, 30], // midday sun south-west
    skyColor: '#e2e8f0',
    horizonColor: '#bae6fd',
    fogColor: '#f0f9ff',
    buildingBaseColor: '#cbd5e1',
    buildingTopColor: '#2563eb',
    buildingOpacity: 0.85,
    ambientGlowColor: '#3b82f6',
  },
  golden_hour: {
    id: 'golden_hour',
    name: 'Złota Godzina',
    icon: '🌅',
    lightColor: '#fbbf24',
    lightIntensity: 0.7,
    lightPosition: [1.5, 260, 70], // low warm evening sun over Odra river
    skyColor: '#fed7aa',
    horizonColor: '#f97316',
    fogColor: '#ffedd5',
    buildingBaseColor: '#78716c',
    buildingTopColor: '#f59e0b',
    buildingOpacity: 0.9,
    ambientGlowColor: '#f59e0b',
  },
  sunset: {
    id: 'sunset',
    name: 'Zachód Słońca',
    icon: '🌆',
    lightColor: '#f43f5e',
    lightIntensity: 0.65,
    lightPosition: [1.7, 280, 80],
    skyColor: '#fda4af',
    horizonColor: '#be123c',
    fogColor: '#ffe4e6',
    buildingBaseColor: '#475569',
    buildingTopColor: '#e11d48',
    buildingOpacity: 0.92,
    ambientGlowColor: '#e11d48',
  },
  night_cyberpunk: {
    id: 'night_cyberpunk',
    name: 'Nocny Szczecin (Neon 3D)',
    icon: '🌃',
    lightColor: '#38bdf8',
    lightIntensity: 0.4,
    lightPosition: [1.1, 0, 45],
    skyColor: '#0f172a',
    horizonColor: '#0369a1',
    fogColor: '#090d16',
    buildingBaseColor: '#090d16',
    buildingTopColor: '#0284c7',
    buildingOpacity: 0.95,
    ambientGlowColor: '#10b981',
  },
};

/**
 * Resolves current local sunlight mode dynamically based on local clock in Szczecin.
 */
export function resolveAutoSunlightMode(date = new Date()): Exclude<SunlightMode, 'auto'> {
  const hour = date.getHours();
  if (hour >= 6 && hour < 8) return 'morning';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 19) return 'golden_hour';
  if (hour >= 19 && hour < 21) return 'sunset';
  return 'night_cyberpunk';
}

/**
 * Retrieves the exact preset specification for any sunlight mode.
 */
export function getSunlightPreset(mode: SunlightMode, date = new Date()): SunlightPreset {
  if (mode === 'auto') {
    const resolved = resolveAutoSunlightMode(date);
    return SUNLIGHT_PRESETS[resolved];
  }
  return SUNLIGHT_PRESETS[mode] || SUNLIGHT_PRESETS.day;
}

/**
 * Applies dynamic 3D sunlight, fog atmosphere, and building shading to an active MapLibre instance.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applySunlightToMap(map: any, mode: SunlightMode): void {
  if (!map) return;
  const preset = getSunlightPreset(mode);

  try {
    // 1. Set ambient viewport light
    if (typeof map.setLight === 'function') {
      map.setLight({
        anchor: 'viewport',
        color: preset.lightColor,
        intensity: preset.lightIntensity,
        position: preset.lightPosition,
      });
    }

    // 2. Set dynamic fog / atmosphere if supported by MapLibre GL
    if (typeof map.setFog === 'function') {
      map.setFog({
        color: preset.fogColor,
        'high-color': preset.skyColor,
        'horizon-blend': 0.15,
        range: [0.5, 10],
      });
    }

    // 3. Adjust 3D building fill-extrusion colors if layer exists
    const buildingLayers = ['3d-buildings', '3d-buildings-baltic'];
    buildingLayers.forEach((layerId) => {
      if (typeof map.getLayer === 'function' && map.getLayer(layerId)) {
        map.setPaintProperty(layerId, 'fill-extrusion-color', [
          'interpolate',
          ['linear'],
          ['get', 'render_height'],
          0, preset.buildingBaseColor,
          35, preset.buildingBaseColor,
          70, preset.buildingTopColor,
          130, preset.ambientGlowColor,
        ]);
        map.setPaintProperty(layerId, 'fill-extrusion-opacity', preset.buildingOpacity);
      }
    });
  } catch {
    /* Non-fatal if map style is currently reloading or unsupported */
  }
}
