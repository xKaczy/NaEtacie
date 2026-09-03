/**
 * Home Base & Radius Radar Utility for Szczecin Workers.
 * Generates dynamic MapLibre circular boundary polygon and filters jobs within radar range.
 */

export const STORAGE_KEY_HOME_BASE = 'naetacie_home_base_coords';
export const STORAGE_KEY_RADAR_RADIUS = 'naetacie_radar_radius_km';
export const DEFAULT_RADAR_RADIUS_KM = 10;

/**
 * Calculates Haversine distance in kilometers.
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Generates a GeoJSON Polygon circle around center point with radius in kilometers.
 */
export function generateRadarGeoJsonCircle(
  center: [number, number], // [lng, lat]
  radiusKm: number,
  points = 64
): GeoJSON.Feature<GeoJSON.Polygon> {
  const [lng, lat] = center;
  const coords: Array<[number, number]> = [];

  const distanceX = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const distanceY = radiusKm / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = lng + distanceX * Math.cos(theta);
    const y = lat + distanceY * Math.sin(theta);
    coords.push([x, y]);
  }
  coords.push(coords[0]); // close loop

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
    properties: {
      radiusKm,
      centerLat: lat,
      centerLng: lng,
    },
  };
}

/**
 * Determines if a given job coordinate is within the radar radius.
 */
export function isJobWithinRadar(
  jobLat: number | null | undefined,
  jobLng: number | null | undefined,
  homeCenter: [number, number], // [lng, lat]
  radiusKm: number
): boolean {
  if (jobLat == null || jobLng == null) return false;
  const [homeLng, homeLat] = homeCenter;
  const dist = calculateDistanceKm(homeLat, homeLng, jobLat, jobLng);
  return dist <= radiusKm;
}

/**
 * Loads saved home base from localStorage.
 */
export function loadSavedHomeBase(): { coords: [number, number]; radiusKm: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const savedCoords = window.localStorage.getItem(STORAGE_KEY_HOME_BASE);
    const savedRadius = window.localStorage.getItem(STORAGE_KEY_RADAR_RADIUS);
    if (!savedCoords) return null;

    const parsed = JSON.parse(savedCoords) as [number, number];
    if (!Array.isArray(parsed) || parsed.length !== 2) return null;

    const radius = savedRadius ? Number(savedRadius) : DEFAULT_RADAR_RADIUS_KM;
    return { coords: parsed, radiusKm: radius || DEFAULT_RADAR_RADIUS_KM };
  } catch {
    return null;
  }
}

/**
 * Saves home base coordinates and radius to localStorage.
 */
export function saveHomeBase(coords: [number, number], radiusKm: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY_HOME_BASE, JSON.stringify(coords));
    window.localStorage.setItem(STORAGE_KEY_RADAR_RADIUS, String(radiusKm));
  } catch {
    // Non-fatal fallback
  }
}
