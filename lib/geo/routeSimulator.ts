/**
 * Szczecin 3D Commute Route Simulator & Fuel Cost Engine.
 * Generates realistic arterial transit polyline coordinates between major Szczecin district hubs and jobs.
 */

import { haversineKm } from '@/lib/matching/engine';

export interface CommuteEstimate {
  distanceKm: number;
  carMinutesRushHour: number;
  carMinutesOffPeak: number;
  transitMinutesZDiTM: number;
  monthlyFuelCostPln: number;
  recommendedRouteName: string;
}

export interface SimulatedRouteGeoJSON {
  type: 'Feature';
  geometry: {
    type: 'LineString';
    coordinates: Array<[number, number]>; // [lng, lat]
  };
  properties: CommuteEstimate;
}

// Major Szczecin Arterial Bridge / Traffic Corridors [lng, lat]
export const SZCZECIN_CORRIDORS: Record<string, Array<[number, number]>> = {
  trasa_zamkowa: [
    [14.5580, 53.4270], // Wały Chrobrego
    [14.5680, 53.4245], // Most Trasa Zamkowa
    [14.5850, 53.4150], // Energetyków
    [14.6100, 53.4050], // Gdańska Prawobrzeże
  ],
  most_pionierow: [
    [14.5350, 53.3950], // Pomorzany / Autostrada Poznańska
    [14.5600, 53.3850], // Most Pionierów
    [14.6200, 53.3800], // Zdroje / Struga
  ],
  al_wojska_polskiego: [
    [14.5530, 53.4285], // Plac Grunwaldzki
    [14.5380, 53.4420], // Pogodno / Rondo Olszewskiego
    [14.5100, 53.4680], // Głębokie / Osów
  ],
  struga_prawobrzeze: [
    [14.6100, 53.4050], // Basen Górniczy
    [14.6500, 53.3900], // Struga / Outlet Park
    [14.6800, 53.3750], // Dąbie / Kijewo
  ],
};

/**
 * Calculates commute metrics and fuel costs based on distance and rush hour.
 */
export function calculateCommuteEstimate(
  fromLngLat: [number, number],
  toLngLat: [number, number]
): CommuteEstimate {
  const directDistance = haversineKm(fromLngLat[1], fromLngLat[0], toLngLat[1], toLngLat[0]);
  // Road distance factor in Szczecin (approx 1.28x due to Odra river crossing & winding roads)
  const roadDistanceKm = Math.round(directDistance * 1.28 * 10) / 10;

  // Off-peak avg 42 km/h, rush-hour avg 24 km/h in Szczecin
  const carMinutesOffPeak = Math.max(3, Math.round((roadDistanceKm / 42) * 60));
  const carMinutesRushHour = Math.max(5, Math.round((roadDistanceKm / 24) * 60));

  // ZDiTM Transit Estimate (approx 18 km/h + 8 min wait/transfer)
  const transitMinutesZDiTM = Math.max(8, Math.round((roadDistanceKm / 18) * 60 + 8));

  // Monthly Fuel Cost: 21 workdays, round-trip, 8.0 L/100km avg, 6.75 PLN/L (Pb95/Diesel)
  const dailyKm = roadDistanceKm * 2;
  const monthlyKm = dailyKm * 21;
  const monthlyFuelLiters = (monthlyKm * 8.0) / 100;
  const monthlyFuelCostPln = Math.round(monthlyFuelLiters * 6.75);

  let recommendedRoute = 'Przez Centrum';
  if (fromLngLat[0] > 14.58 || toLngLat[0] > 14.58) {
    recommendedRoute = directDistance > 10 ? 'Trasa Zamkowa / Gdańska' : 'Most Pionierów / Autostrada Poznańska';
  } else if (fromLngLat[1] > 53.44 || toLngLat[1] > 53.44) {
    recommendedRoute = 'Al. Wojska Polskiego / Obwodnica Śródmiejska';
  }

  return {
    distanceKm: roadDistanceKm,
    carMinutesRushHour,
    carMinutesOffPeak,
    transitMinutesZDiTM,
    monthlyFuelCostPln,
    recommendedRouteName: recommendedRoute,
  };
}

/**
 * Builds a smooth interpolated route polyline GeoJSON with realistic curve waypoints.
 */
export function buildSimulatedCommuteRouteGeoJSON(
  fromLngLat: [number, number],
  toLngLat: [number, number]
): SimulatedRouteGeoJSON {
  const estimate = calculateCommuteEstimate(fromLngLat, toLngLat);

  // Generate intermediate waypoint nodes to avoid unrealistic straight lines through water/buildings
  const waypoints: Array<[number, number]> = [fromLngLat];

  // If crossing Odra river (Prawobrzeże <-> Lewobrzeże)
  const isCrossingOdra = (fromLngLat[0] < 14.58 && toLngLat[0] > 14.58) || (fromLngLat[0] > 14.58 && toLngLat[0] < 14.58);

  if (isCrossingOdra) {
    const isNorth = (fromLngLat[1] + toLngLat[1]) / 2 > 53.41;
    if (isNorth) {
      waypoints.push([14.5680, 53.4245]); // Trasa Zamkowa bridge
      waypoints.push([14.5950, 53.4120]); // Basen Górniczy
    } else {
      waypoints.push([14.5550, 53.3880]); // Most Pionierów
      waypoints.push([14.6150, 53.3820]); // Zdroje
    }
  } else {
    // Lewobrzeże north-south or west-east
    const midLng = (fromLngLat[0] + toLngLat[0]) / 2;
    const midLat = (fromLngLat[1] + toLngLat[1]) / 2;
    // Slight curvature
    waypoints.push([midLng + 0.003, midLat + 0.002]);
  }

  waypoints.push(toLngLat);

  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: waypoints,
    },
    properties: estimate,
  };
}
