/**
 * Job matching engine — pure, deterministic scoring functions.
 *
 * Scoring model (weights sum to 100 when all criteria are set):
 * - Keyword match:        up to 40 pts (title matches weigh double vs description)
 * - Category match:       up to 20 pts
 * - Salary meets minimum: up to 20 pts (graduated, not binary)
 * - Employment type:      up to 10 pts
 * - Distance within max:  up to 10 pts (closer = more points)
 *
 * If a preference dimension is unset, its weight is redistributed so the
 * score always normalizes to 0-100 and empty preferences => everything is
 * a neutral ~100% (nothing to filter against).
 */

import { normalizeCategory } from '@/lib/data/categories';
import type { DisplayAnnouncement } from '@/lib/types/display';
import type { JobPreferences, MatchResult, MatchReason } from './types';

/** Haversine distance between two lat/lng points, in kilometers. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  if (
    lat1 == null || lng1 == null || lat2 == null || lng2 == null ||
    typeof lat1 !== 'number' || typeof lng1 !== 'number' ||
    typeof lat2 !== 'number' || typeof lng2 !== 'number' ||
    isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2) ||
    !isFinite(lat1) || !isFinite(lng1) || !isFinite(lat2) || !isFinite(lng2)
  ) {
    return 0;
  }

  const R = 6371;
  const clampedLat1 = Math.max(-90, Math.min(90, lat1));
  const clampedLat2 = Math.max(-90, Math.min(90, lat2));

  const dLat = ((clampedLat2 - clampedLat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((clampedLat1 * Math.PI) / 180) * Math.cos((clampedLat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const safeA = Math.max(0, Math.min(1, a));
  return R * 2 * Math.atan2(Math.sqrt(safeA), Math.sqrt(Math.max(0, 1 - safeA)));
}

/**
 * Realistic road distance in Szczecin factoring in Odra/Regalica river crossings and road winding.
 * Cross-river transit (Lewobrzeże <-> Prawobrzeże) adds additional detour distance for bridge access.
 */
export function szczecinRoadDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const straightLine = haversineKm(lat1, lng1, lat2, lng2);
  if (!isFinite(straightLine) || straightLine <= 0) return 0;
  const crossesOdra = (lng1 < 14.57 && lng2 > 14.59) || (lng1 > 14.59 && lng2 < 14.57);
  const roadFactor = crossesOdra ? 1.45 : 1.25;
  return Math.round(straightLine * roadFactor * 10) / 10;
}

/** Extract a numeric monthly salary from the price field. */
function numericSalary(price: string | number | null): number | null {
  if (price === null) return null;
  if (typeof price === 'number') return price;
  const m = price.replace(/\s/g, '').match(/(\d+(?:[.,]\d+)?)/);
  return m ? parseFloat(m[1].replace(',', '.')) : null;
}

/** True if a preferences object has no active criteria. */
export function hasNoPreferences(p: JobPreferences): boolean {
  return (
    p.categories.length === 0 &&
    p.keywords.length === 0 &&
    p.minSalary === null &&
    p.employmentTypes.length === 0 &&
    (p.homeLat === null || p.homeLng === null || p.maxDistanceKm === null)
  );
}

export function scoreMatch(ad: DisplayAnnouncement, prefs: JobPreferences): MatchResult {
  // No preferences => neutral full score, no reasons.
  if (hasNoPreferences(prefs)) {
    return { score: 100, reasons: [], distanceKm: null };
  }

  const reasons: MatchReason[] = [];
  let earned = 0;
  let possible = 0;

  const haystackTitle = ad.title.toLowerCase();
  const haystackBody = `${ad.description} ${ad.company ?? ''}`.toLowerCase();

  // --- Keywords (up to 40) ---
  if (prefs.keywords.length > 0) {
    possible += 40;
    let hits = 0;
    const matched: string[] = [];
    for (const kw of prefs.keywords) {
      const k = kw.toLowerCase().trim();
      if (!k) continue;
      if (haystackTitle.includes(k)) { hits += 2; matched.push(kw); }
      else if (haystackBody.includes(k)) { hits += 1; matched.push(kw); }
    }
    const maxHits = prefs.keywords.length * 2;
    const kwScore = maxHits > 0 ? Math.min(40, (hits / maxHits) * 40) : 0;
    earned += kwScore;
    if (matched.length > 0) {
      reasons.push({ label: `Słowa kluczowe: ${matched.join(', ')}`, positive: true, weight: Math.round(kwScore) });
    } else {
      reasons.push({ label: 'Brak dopasowania słów kluczowych', positive: false, weight: 0 });
    }
  }

  // --- Category (up to 20) ---
  if (prefs.categories.length > 0) {
    possible += 20;
    const adCat = normalizeCategory(ad.category);
    if (prefs.categories.includes(adCat)) {
      earned += 20;
      reasons.push({ label: 'Pasująca kategoria', positive: true, weight: 20 });
    } else {
      reasons.push({ label: 'Inna kategoria', positive: false, weight: 0 });
    }
  }

  // --- Salary (up to 20, graduated) ---
  if (prefs.minSalary !== null) {
    possible += 20;
    const sal = numericSalary(ad.price);
    if (sal === null) {
      reasons.push({ label: 'Brak podanego wynagrodzenia', positive: false, weight: 0 });
    } else if (sal >= prefs.minSalary) {
      earned += 20;
      reasons.push({ label: `Wynagrodzenie ${sal} zł ≥ ${prefs.minSalary} zł`, positive: true, weight: 20 });
    } else {
      // Partial credit if within 20% below minimum
      const ratio = sal / prefs.minSalary;
      const partial = ratio >= 0.8 ? (ratio - 0.8) / 0.2 * 10 : 0;
      earned += partial;
      reasons.push({ label: `Wynagrodzenie poniżej oczekiwań`, positive: false, weight: Math.round(partial) });
    }
  }

  // --- Employment type (up to 10) ---
  if (prefs.employmentTypes.length > 0) {
    possible += 10;
    const adType = (ad.employment_type ?? '').toLowerCase();
    const match = prefs.employmentTypes.some((t) => adType.includes(t.toLowerCase()));
    if (match) {
      earned += 10;
      reasons.push({ label: 'Pasujący typ umowy', positive: true, weight: 10 });
    } else {
      reasons.push({ label: 'Inny typ umowy', positive: false, weight: 0 });
    }
  }

  // --- Distance (up to 10, closer = better) ---
  let distanceKm: number | null = null;
  if (prefs.homeLat !== null && prefs.homeLng !== null && prefs.maxDistanceKm !== null) {
    possible += 10;
    if (ad.latitude !== null && ad.longitude !== null) {
      distanceKm = haversineKm(prefs.homeLat, prefs.homeLng, ad.latitude, ad.longitude);
      if (distanceKm <= prefs.maxDistanceKm) {
        const closeness = 1 - distanceKm / prefs.maxDistanceKm;
        const distScore = 5 + closeness * 5; // 5-10 pts within range
        earned += distScore;
        reasons.push({ label: `${distanceKm.toFixed(1)} km od domu`, positive: true, weight: Math.round(distScore) });
      } else {
        reasons.push({ label: `${distanceKm.toFixed(1)} km — za daleko`, positive: false, weight: 0 });
      }
    }
  }

  const score = possible > 0 ? Math.round((earned / possible) * 100) : 100;
  return { score, reasons, distanceKm };
}
