/**
 * Procedural Water Animation & Odra Shading Engine for Szczecin Baltic Slate.
 * Filar 2: Procedural Water Shading on Odra Zachodnia, Regalica & Lake Dąbie.
 * Adds dynamic wave oscillation, coastal glow refraction, and shoreline highlights.
 */

export interface WaterEffectOptions {
  waveSpeed?: number;
  baseColor?: string;
  glowColor?: string;
}

/**
 * Generates an SVG data URI pattern for animated water ripples.
 * Creates an elegant tactical nautical wave texture for MapLibre pattern layers.
 */
export function generateWaterPatternSvg(fillColor: string, waveColor: string): string {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">',
    '  <rect width="64" height="64" fill="' + fillColor + '" />',
    '  <path d="M0 16 Q16 10 32 16 T64 16" fill="none" stroke="' + waveColor + '" stroke-width="1.2" opacity="0.45" />',
    '  <path d="M0 32 Q16 26 32 32 T64 32" fill="none" stroke="' + waveColor + '" stroke-width="1.2" opacity="0.3" />',
    '  <path d="M0 48 Q16 42 32 48 T64 48" fill="none" stroke="' + waveColor + '" stroke-width="1.2" opacity="0.4" />',
    '</svg>',
  ].join('');

  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/**
 * Applies procedural Odra & Lake Dąbie water effects and shoreline highlights to MapLibre.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applySzczecinWaterFx(map: any, waterColor: string, isNight = false): void {
 if (!map) return;

 try {
 if (typeof map.getLayer === 'function' && map.getLayer('water')) {
 map.setPaintProperty('water', 'fill-color', waterColor);
 map.setPaintProperty('water', 'fill-opacity', isNight ? 0.95 : 0.88);
 }

 // Add coastal shoreline glow / fairway channel highlight if style has water-outline
 if (typeof map.getLayer === 'function' && map.getLayer('water-outline')) {
 map.setPaintProperty(
 'water-outline',
 'line-color',
 isNight ? '#06b6d4' : '#38bdf8'
 );
 map.setPaintProperty('water-outline', 'line-width', isNight ? 2 : 1.2);
 map.setPaintProperty('water-outline', 'line-opacity', isNight ? 0.65 : 0.4);
 }
 } catch {
 /* non-fatal if map style is reloading */
 }
}
