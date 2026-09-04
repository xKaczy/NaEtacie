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
  waterColor: string;
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
    lightColor: '#fef08a',
    lightIntensity: 0.64,
    lightPosition: [1.5, 105, 22], // East-South-East morning sun, warm golden angles on Odra
    skyColor: '#fed7aa',
    horizonColor: '#fde047',
    fogColor: '#fefce8',
    waterColor: '#0e3d59',
    buildingBaseColor: '#475569',
    buildingTopColor: '#f59e0b',
    buildingOpacity: 0.88,
    ambientGlowColor: '#fbbf24',
  },
  day: {
    id: 'day',
    name: 'Jasny Dzień',
    icon: '☀️',
    lightColor: '#ffffff',
    lightIntensity: 0.58,
    lightPosition: [1.3, 210, 35], // Midday sun South-West high in sky
    skyColor: '#bae6fd',
    horizonColor: '#e0f2fe',
    fogColor: '#f8fafc',
    waterColor: '#0284c7',
    buildingBaseColor: '#334155',
    buildingTopColor: '#0284c7',
    buildingOpacity: 0.85,
    ambientGlowColor: '#38bdf8',
  },
  golden_hour: {
    id: 'golden_hour',
    name: 'Złota Godzina',
    icon: '🌅',
    lightColor: '#f59e0b',
    lightIntensity: 0.75,
    lightPosition: [1.6, 260, 68], // Low warm evening sun over Odra river & Łasztownia
    skyColor: '#fdba74',
    horizonColor: '#ea580c',
    fogColor: '#fff7ed',
    waterColor: '#1e3a5f',
    buildingBaseColor: '#292524',
    buildingTopColor: '#f59e0b',
    buildingOpacity: 0.9,
    ambientGlowColor: '#f97316',
  },
  sunset: {
    id: 'sunset',
    name: 'Zachód Słońca',
    icon: '🌆',
    lightColor: '#fb7185',
    lightIntensity: 0.68,
    lightPosition: [1.7, 280, 82], // Deep dusk twilight west of Szczecin
    skyColor: '#f43f5e',
    horizonColor: '#9f1239',
    fogColor: '#1c1917',
    waterColor: '#1e1b4b',
    buildingBaseColor: '#1e1b4b',
    buildingTopColor: '#e11d48',
    buildingOpacity: 0.92,
    ambientGlowColor: '#f43f5e',
  },
  night_cyberpunk: {
    id: 'night_cyberpunk',
    name: 'Nocny Szczecin (Neon 3D)',
    icon: '🌃',
    lightColor: '#38bdf8',
    lightIntensity: 0.45,
    lightPosition: [1.2, 340, 48], // Cool directional moonlit neon glow
    skyColor: '#020617',
    horizonColor: '#0369a1',
    fogColor: '#060a14',
    waterColor: '#03172e',
    buildingBaseColor: '#0b1329',
    buildingTopColor: '#06b6d4',
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
 * Applies dynamic 3D sunlight, directional shadows, fog atmosphere, and building shading
 * to an active MapLibre instance.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applySunlightToMap(map: any, mode: SunlightMode): void {
  if (!map) return;
  const preset = getSunlightPreset(mode);

  try {
    // 1. Set ambient & directional sunlight anchored geographically ('map')
    if (typeof map.setLight === 'function') {
      map.setLight({
        anchor: 'map', // Anchor to map coordinates for realistic geographical sun azimuth
        color: preset.lightColor,
        intensity: preset.lightIntensity,
        position: preset.lightPosition,
      });
    }

    // 2. Set dynamic atmospheric fog with depth blending
    if (typeof map.setFog === 'function') {
      map.setFog({
        color: preset.fogColor,
        'high-color': preset.skyColor,
        'horizon-blend': 0.2,
        'space-color': preset.skyColor,
        range: [0.5, 12],
      });
    }

    // 3. Dynamic Baltic Slate Water synchronization
    if (typeof map.getLayer === 'function' && map.getLayer('water')) {
      map.setPaintProperty('water', 'fill-color', preset.waterColor);
    }

    // 4. Adjust 3D building fill-extrusion colors and vertical lighting gradients
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
          120, preset.ambientGlowColor,
        ]);
        map.setPaintProperty(layerId, 'fill-extrusion-opacity', preset.buildingOpacity);
        try {
          map.setPaintProperty(layerId, 'fill-extrusion-vertical-gradient', true);
        } catch { /* ignored if unsupported in style */ }
      }
    });
  } catch {
    /* Non-fatal if map style is currently reloading or unsupported */
  }
}

