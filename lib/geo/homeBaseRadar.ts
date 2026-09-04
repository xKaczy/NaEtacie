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
  if (
    lat1 == null || lon1 == null || lat2 == null || lon2 == null ||
    typeof lat1 !== 'number' || typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' || typeof lon2 !== 'number' ||
    isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2) ||
    !isFinite(lat1) || !isFinite(lon1) || !isFinite(lat2) || !isFinite(lon2)
  ) {
    return 0;
  }

  const R = 6371; // Earth radius in km
  const clampedLat1 = Math.max(-90, Math.min(90, lat1));
  const clampedLat2 = Math.max(-90, Math.min(90, lat2));

  const dLat = ((clampedLat2 - clampedLat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((clampedLat1 * Math.PI) / 180) *
      Math.cos((clampedLat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const safeA = Math.max(0, Math.min(1, a));
  const c = 2 * Math.atan2(Math.sqrt(safeA), Math.sqrt(Math.max(0, 1 - safeA)));
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

  const safeLng = typeof lng === 'number' && isFinite(lng) ? lng : 14.5528;
  const safeLat = typeof lat === 'number' && isFinite(lat) ? Math.max(-89.5, Math.min(89.5, lat)) : 53.4285;
  const safeRadius = Math.max(0, typeof radiusKm === 'number' && isFinite(radiusKm) ? radiusKm : 0);

  const cosLat = Math.cos((safeLat * Math.PI) / 180);
  const safeCosLat = Math.abs(cosLat) < 1e-6 ? 1e-6 : Math.abs(cosLat);

  const distanceX = safeRadius / (111.32 * safeCosLat);
  const distanceY = safeRadius / 110.574;
  const numPoints = Math.max(12, Math.min(128, typeof points === 'number' && isFinite(points) ? points : 64));

  for (let i = 0; i < numPoints; i++) {
    const theta = (i / numPoints) * (2 * Math.PI);
    const x = safeLng + distanceX * Math.cos(theta);
    const y = safeLat + distanceY * Math.sin(theta);
    coords.push([Number(x.toFixed(7)), Number(y.toFixed(7))]);
  }
  if (coords.length > 0) {
    coords.push(coords[0]); // close loop
  }

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
