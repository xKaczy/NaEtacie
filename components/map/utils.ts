import { MaskedAnnouncement } from '@/lib/types/announcement';

/**
 * Filters announcements to only those with valid (non-null) coordinates.
 * Only announcements where both latitude AND longitude are non-null
 * should be rendered as map markers.
 *
 * This is extracted as a pure function for testability (Property 9).
 */
export function filterGeocodedAnnouncements<T extends { latitude?: number | null; longitude?: number | null }>(
  announcements: T[]
): T[] {
  if (!Array.isArray(announcements)) return [];
  return announcements.filter(
    (a) =>
      a != null &&
      a.latitude !== null &&
      a.latitude !== undefined &&
      typeof a.latitude === 'number' &&
      !isNaN(a.latitude) &&
      isFinite(a.latitude) &&
      a.latitude >= -90 &&
      a.latitude <= 90 &&
      a.longitude !== null &&
      a.longitude !== undefined &&
      typeof a.longitude === 'number' &&
      !isNaN(a.longitude) &&
      isFinite(a.longitude) &&
      a.longitude >= -180 &&
      a.longitude <= 180
  );
}

/**
 * Formats a price for display in map popups.
 * Returns "Cena niepodana" if price is null.
 */
export function formatPrice(price: number | null): string {
  if (price === null || price === undefined || isNaN(price) || !isFinite(price)) {
    return 'Cena niepodana';
  }
  return `${price.toLocaleString('pl-PL')} PLN`;
}

/**
 * Checks whether a 2D point [lat, lng] is inside a polygon defined by an array of vertex coordinates [[lng, lat]].
 * Features O(1) Axis-Aligned Bounding Box (AABB) pre-filtering to eliminate out-of-bounds candidates,
 * followed by classic Ray-casting with complete zero-division and NaN protection.
 */
export function isPointInPolygon(
  point: [number, number] | null | undefined,
  vs: Array<[number, number]> | null | undefined
): boolean {
  if (!point || !Array.isArray(point) || point.length < 2) return false;
  if (!vs || !Array.isArray(vs) || vs.length < 3) return false;

  const [x, y] = point;
  if (typeof x !== 'number' || typeof y !== 'number' || !isFinite(x) || !isFinite(y)) {
    return false;
  }

  // 1. High-performance AABB (Axis-Aligned Bounding Box) pre-filter
  // Vertices are [[lng, lat]] -> vs[i][0] is lng (y-axis), vs[i][1] is lat (x-axis)
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  const validVertices: Array<[number, number]> = [];
  for (let i = 0; i < vs.length; i++) {
    const v = vs[i];
    if (!v || !Array.isArray(v) || v.length < 2) continue;
    const vy = v[0]; // lng
    const vx = v[1]; // lat
    if (typeof vx !== 'number' || typeof vy !== 'number' || !isFinite(vx) || !isFinite(vy)) continue;

    if (vx < minX) minX = vx;
    if (vx > maxX) maxX = vx;
    if (vy < minY) minY = vy;
    if (vy > maxY) maxY = vy;
    validVertices.push([vy, vx]);
  }

  if (validVertices.length < 3) return false;

  // Immediate O(1) rejection if candidate point is outside the polygon bounding box
  if (x < minX || x > maxX || y < minY || y > maxY) {
    return false;
  }

  // 2. Exact Ray-casting algorithm with zero-division safeguard
  let inside = false;
  for (let i = 0, j = validVertices.length - 1; i < validVertices.length; j = i++) {
    const yi = validVertices[i][0]; // lng
    const xi = validVertices[i][1]; // lat
    const yj = validVertices[j][0]; // lng
    const xj = validVertices[j][1]; // lat

    const dy = yj - yi;
    // Skip horizontal segments or coincident points to avoid division by zero
    if (Math.abs(dy) < 1e-12) continue;

    const intersect = (yi > y !== yj > y) && (x < ((xj - xi) * (y - yi)) / dy + xi);
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Formats numeric or string price into a compact badge label for map markers.
 * e.g., 12000 -> "12k", 8500 -> "8.5k", null -> "Oferta"
 */
export function formatMarkerBadgePrice(price: number | string | null): string {
  if (price === null || price === undefined) return 'Oferta';

  let numPrice: number | null = null;
  if (typeof price === 'number') {
    numPrice = price;
  } else if (typeof price === 'string') {
    const extracted = parseFloat(price.replace(/[^\d.]/g, ''));
    if (!isNaN(extracted) && extracted > 0) numPrice = extracted;
  }

  if (numPrice === null || numPrice <= 0) return 'Oferta';

  if (numPrice >= 1000) {
    const inK = numPrice / 1000;
    return `${Number.isInteger(inK) ? inK : inK.toFixed(1)}k`;
  }
  return `${numPrice} zł`;
}

/**
 * Determines price tier category for map pin styling.
 * - 'high': >= 10000 PLN (Green Glow)
 * - 'medium': 6000 - 9999 PLN (Blue Accent)
 * - 'normal': < 6000 PLN or unstated
 */
export function getMarkerPriceTier(price: number | string | null): 'high' | 'medium' | 'normal' {
  let numPrice: number | null = null;
  if (typeof price === 'number') {
    numPrice = price;
  } else if (typeof price === 'string') {
    const extracted = parseFloat(price.replace(/[^\d.]/g, ''));
    if (!isNaN(extracted) && extracted > 0) numPrice = extracted;
  }

  if (numPrice !== null) {
    if (numPrice >= 10000) return 'high';
    if (numPrice >= 6000) return 'medium';
  }
  return 'normal';
}

/**
 * Checks if latitude and longitude represent valid, finite geographical coordinates.
 * - Latitude must be between -90 and 90 degrees inclusive.
 * - Longitude must be between -180 and 180 degrees inclusive.
 */
export function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!isFinite(lat) || !isFinite(lng)) return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Checks if a coordinate pair falls within the greater Szczecin metropolitan bounding area
 * including Police, Gryfino, Stargard, Goleniów, and border zones.
 * Lat: [53.10, 53.75], Lng: [14.15, 15.05]
 */
export function isValidSzczecinCoordinate(lat: unknown, lng: unknown): boolean {
  if (!isValidCoordinate(lat, lng)) return false;
  const nLat = lat as number;
  const nLng = lng as number;
  return nLat >= 53.10 && nLat <= 53.75 && nLng >= 14.15 && nLng <= 15.05;
}

/**
 * Clamps coordinates to legal geographical bounds [-90, 90] for lat and [-180, 180] for lng.
 */
export function clampCoordinate(lat: number, lng: number): [number, number] {
  let safeLat = 0;
  if (!isNaN(lat)) {
    if (lat === Infinity) safeLat = 90;
    else if (lat === -Infinity) safeLat = -90;
    else safeLat = Math.max(-90, Math.min(90, lat));
  }

  let safeLng = 0;
  if (!isNaN(lng)) {
    if (lng === Infinity) safeLng = 180;
    else if (lng === -Infinity) safeLng = -180;
    else safeLng = Math.max(-180, Math.min(180, lng));
  }

  return [safeLat, safeLng];
}

/**
 * Computes Haversine great-circle distance between two GPS coordinates in kilometers.
 * Completely null-safe and resilient against corrupt or non-finite inputs.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    !isValidCoordinate(lat1, lon1) ||
    !isValidCoordinate(lat2, lon2)
  ) {
    return 0;
  }

  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(Math.max(0, Math.min(1, a))), Math.sqrt(Math.max(0, 1 - a)));
  return Number((R * c).toFixed(1));
}

/**
 * Generates a GeoJSON Polygon circle around center point with radius in kilometers.
 * Completely protected against division by zero at poles, NaN/Infinite coordinates, and negative radii.
 */
export function createGeoJsonCircle(
  center: [number, number] | null | undefined,
  radiusKm: number,
  points: number = 64
): GeoJSON.Feature<GeoJSON.Polygon> {
  const defaultFeature: GeoJSON.Feature<GeoJSON.Polygon> = {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [[]] },
    properties: {},
  };

  if (!center || !Array.isArray(center) || center.length < 2) return defaultFeature;
  const [lng, lat] = center;
  if (typeof lng !== 'number' || typeof lat !== 'number' || !isFinite(lng) || !isFinite(lat)) {
    return defaultFeature;
  }

  const safeRadius = Math.max(0, typeof radiusKm === 'number' && isFinite(radiusKm) ? radiusKm : 0);
  const safeLat = Math.max(-89.5, Math.min(89.5, lat));
  const cosLat = Math.cos((safeLat * Math.PI) / 180);
  const safeCosLat = Math.abs(cosLat) < 1e-6 ? 1e-6 : Math.abs(cosLat);

  const distanceX = safeRadius / (111.32 * safeCosLat);
  const distanceY = safeRadius / 110.574;
  const numPoints = Math.max(12, Math.min(128, typeof points === 'number' && isFinite(points) ? points : 64));

  const coords: Array<[number, number]> = [];
  for (let i = 0; i < numPoints; i++) {
    const theta = (i / numPoints) * (2 * Math.PI);
    const x = lng + distanceX * Math.cos(theta);
    const y = lat + distanceY * Math.sin(theta);
    coords.push([Number(x.toFixed(7)), Number(y.toFixed(7))]);
  }
  if (coords.length > 0) {
    coords.push(coords[0]); // close polygon loop
  }

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
    properties: {},
  };
}

/**
 * Calculates spiderfy positions for multiple overlapping pins at the same location.
 * - For 2 to 8 overlapping markers: Evenly distributed circular ring.
 * - For > 8 overlapping markers: Archimedean multi-turn spiral with uniform arc separation
 *   to avoid overlapping pin badges in dense Szczecin central clusters (Brama Portowa, Plac Rodła).
 *
 * @param center - [lng, lat] coordinate of cluster center
 * @param count - number of overlapping markers
 * @param zoom - current map zoom level (default: 14)
 * @param pixelRadius - visual radius in screen pixels (default: 38)
 */
export function generateSpiderfyPositions(
  center: [number, number],
  count: number,
  zoom: number = 14,
  pixelRadius: number = 38
): Array<[number, number]> {
  if (count <= 0) return [];
  if (!center || !Array.isArray(center) || center.length < 2) return [];
  const [lng, lat] = center;
  if (
    typeof lng !== 'number' ||
    typeof lat !== 'number' ||
    isNaN(lng) ||
    isNaN(lat) ||
    !isFinite(lng) ||
    !isFinite(lat)
  ) {
    return [];
  }
  if (count === 1) return [[Number(lng.toFixed(7)), Number(lat.toFixed(7))]];

  const safeZoom = Math.max(0, Math.min(22, typeof zoom === 'number' && isFinite(zoom) ? zoom : 14));
  const safeLat = Math.max(-89.5, Math.min(89.5, lat));
  const cosLat = Math.cos((safeLat * Math.PI) / 180);
  const safeCosLat = Math.abs(cosLat) < 1e-6 ? 1e-6 : Math.abs(cosLat);

  // Web Mercator ground resolution in meters per pixel at this latitude and zoom
  const metersPerPixel = (156543.03392 * safeCosLat) / Math.pow(2, safeZoom);
  const metersPerDegLat = 110574;
  const metersPerDegLng = 111320 * safeCosLat;

  const positions: Array<[number, number]> = [];

  if (count <= 8) {
    // Single circular ring distribution for 2 to 8 overlapping markers
    const basePixelRadius = Math.max(30, typeof pixelRadius === 'number' && isFinite(pixelRadius) ? pixelRadius : 38);
    const ringRadiusPixels = basePixelRadius + (count - 2) * 3.5;
    const radiusMeters = ringRadiusPixels * metersPerPixel;
    const angleStep = (2 * Math.PI) / count;
    const startAngle = -Math.PI / 2; // Start at 12 o'clock for visual balance

    for (let i = 0; i < count; i++) {
      const angle = startAngle + i * angleStep;
      const dLng = (radiusMeters * Math.cos(angle)) / metersPerDegLng;
      const dLat = (radiusMeters * Math.sin(angle)) / metersPerDegLat;
      positions.push([Number((lng + dLng).toFixed(7)), Number((lat + dLat).toFixed(7))]);
    }
  } else {
    // Multi-turn Archimedean spiral: r(theta) = r0 + b * (theta - theta0)
    // Guarantees constant arc distance between neighboring pins along the spiral curve
    const initialPixelRadius = Math.max(28, (typeof pixelRadius === 'number' && isFinite(pixelRadius) ? pixelRadius : 38) * 0.85);
    const pinSeparationPixels = 36; // arc distance between successive pins along the spiral track
    const spiralPitchPixels = 30; // radial expansion per complete 360-degree turn
    const b = spiralPitchPixels / (2 * Math.PI); // radial growth rate per radian

    let currentAngle = -Math.PI / 2; // Start at 12 o'clock
    let currentRadiusPixels = initialPixelRadius;

    for (let i = 0; i < count; i++) {
      if (i > 0) {
        const dTheta = pinSeparationPixels / Math.max(15, currentRadiusPixels);
        currentAngle += dTheta;
        currentRadiusPixels = initialPixelRadius + b * (currentAngle - (-Math.PI / 2));
      }

      const radiusMeters = currentRadiusPixels * metersPerPixel;
      const dLng = (radiusMeters * Math.cos(currentAngle)) / metersPerDegLng;
      const dLat = (radiusMeters * Math.sin(currentAngle)) / metersPerDegLat;
      positions.push([Number((lng + dLng).toFixed(7)), Number((lat + dLat).toFixed(7))]);
    }
  }

  return positions;
}

/**
 * Safely parses a comma-separated bounding box string into numeric boundaries.
 * Format: "south_lat,west_lng,north_lat,east_lng"
 */
export function parseBoundingBox(
  raw: string | null | undefined
): { south_lat: number; west_lng: number; north_lat: number; east_lng: number } | null {
  if (!raw || typeof raw !== 'string') return null;
  const parts = raw.split(',').map((p) => parseFloat(p.trim()));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || !isFinite(p))) return null;

  const [south_lat, west_lng, north_lat, east_lng] = parts;
  if (south_lat > north_lat || west_lng > east_lng) return null;
  if (!isValidCoordinate(south_lat, west_lng) || !isValidCoordinate(north_lat, east_lng)) return null;

  return { south_lat, west_lng, north_lat, east_lng };
}

/**
 * Validates whether an unknown object is a valid GeoJSON Point geometry.
 */
export function isValidGeoJSONPoint(geometry: unknown): boolean {
  if (!geometry || typeof geometry !== 'object') return false;
  const g = geometry as Record<string, unknown>;
  if (g.type !== 'Point' || !Array.isArray(g.coordinates) || g.coordinates.length < 2) return false;
  const [lng, lat] = g.coordinates;
  return isValidCoordinate(lat, lng);
}

/**
 * Validates whether an unknown object is a valid GeoJSON LineString geometry.
 * Requires at least 2 distinct valid coordinate pairs (RFC 7946 §3.1.4).
 */
export function isValidGeoJSONLineString(geometry: unknown): boolean {
  if (!geometry || typeof geometry !== 'object') return false;
  const g = geometry as Record<string, unknown>;
  if (g.type !== 'LineString' || !Array.isArray(g.coordinates) || g.coordinates.length < 2) return false;
  return g.coordinates.every(
    (pt) => Array.isArray(pt) && pt.length >= 2 && isValidCoordinate(pt[1], pt[0])
  );
}

/**
 * Validates whether an unknown object is a valid GeoJSON Polygon geometry.
 * Must have at least 1 linear ring with >= 4 positions where first and last match.
 */
export function isValidGeoJSONPolygon(geometry: unknown): boolean {
  if (!geometry || typeof geometry !== 'object') return false;
  const g = geometry as Record<string, unknown>;
  if (g.type !== 'Polygon' || !Array.isArray(g.coordinates) || g.coordinates.length === 0) return false;

  return g.coordinates.every((ring) => {
    if (!Array.isArray(ring) || ring.length < 4) return false;
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (!Array.isArray(first) || !Array.isArray(last)) return false;
    if (Math.abs(first[0] - last[0]) > 1e-7 || Math.abs(first[1] - last[1]) > 1e-7) return false;
    return ring.every((pt) => Array.isArray(pt) && pt.length >= 2 && isValidCoordinate(pt[1], pt[0]));
  });
}

/**
 * Validates whether an unknown object is a safe, valid GeoJSON geometry.
 */
export function isValidGeoJSONGeometry(geometry: unknown): boolean {
  if (!geometry || typeof geometry !== 'object') return false;
  const type = (geometry as Record<string, unknown>).type;
  switch (type) {
    case 'Point':
      return isValidGeoJSONPoint(geometry);
    case 'LineString':
      return isValidGeoJSONLineString(geometry);
    case 'Polygon':
      return isValidGeoJSONPolygon(geometry);
    default:
      return false;
  }
}

/**
 * Sanitizes a candidate GeoJSON Feature.
 * Returns null if the feature or its geometry is corrupted or contains NaN/Infinity/out-of-bounds coordinates.
 */
export function sanitizeGeoJSONFeature(feature: unknown): GeoJSON.Feature | null {
  if (!feature || typeof feature !== 'object') return null;
  const f = feature as Record<string, unknown>;
  if (f.type !== 'Feature') return null;
  if (!isValidGeoJSONGeometry(f.geometry)) return null;

  return {
    type: 'Feature',
    geometry: f.geometry as GeoJSON.Geometry,
    properties: (f.properties && typeof f.properties === 'object' ? f.properties : {}) as GeoJSON.GeoJsonProperties,
  };
}

/**
 * Filters and sanitizes an array of features into a guaranteed valid GeoJSON FeatureCollection.
 * Strips out corrupted features, nulls, and coordinates with NaN/Infinity to guarantee MapLibre WebGL stability.
 */
export function sanitizeFeatureCollection(features: unknown[]): GeoJSON.FeatureCollection {
  if (!Array.isArray(features)) {
    return { type: 'FeatureCollection', features: [] };
  }

  const validFeatures: GeoJSON.Feature[] = [];
  for (let i = 0; i < features.length; i++) {
    const sanitized = sanitizeGeoJSONFeature(features[i]);
    if (sanitized) {
      validFeatures.push(sanitized);
    }
  }

  return {
    type: 'FeatureCollection',
    features: validFeatures,
  };
}



