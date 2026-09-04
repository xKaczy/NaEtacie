/**
 * Szczecin Roadworks, Transit Bottlenecks & Van Access Constraints (2026).
 * 
 * Provides live-styled geospatial information regarding road reconstructions,
 * lane closures, weight limitations, and major transit delays affecting
 * construction vans, delivery trucks, and trade crews traveling in Szczecin.
 */

export interface TrafficImpediment {
  id: string;
  streetName: string;
  district: string;
  coordinates: [number, number]; // [lng, lat]
  severity: 'critical_closure' | 'heavy_delay' | 'narrowing';
  delayMinutes: number;
  vanAccessible: boolean;
  maxWeightTons?: number;
  description: string;
  recommendedAlternative: string;
}

export const SZCZECIN_TRAFFIC_IMPEDIMENTS: TrafficImpediment[] = [
  {
    id: 'imp_kolumba',
    streetName: 'ul. Krzysztofa Kolumba / Chmielewskiego',
    district: 'Pomorzany / Śródmieście',
    coordinates: [14.5458, 53.4147],
    severity: 'critical_closure',
    delayMinutes: 25,
    vanAccessible: false,
    maxWeightTons: 3.5,
    description: 'Generalna przebudowa torowiska i jezdni na Nabrzeżu Wieleckim i Kolumba. Ruch jednokierunkowy lub zamknięcia.',
    recommendedAlternative: 'Objazd przez al. Powstańców Wielkopolskich lub al. Piastów.',
  },
  {
    id: 'imp_energetykow',
    streetName: 'ul. Energetyków / Most Długi / Most Portowy',
    district: 'Międzyodrze',
    coordinates: [14.5685, 53.4243],
    severity: 'heavy_delay',
    delayMinutes: 15,
    vanAccessible: true,
    description: 'Zwężenie do jednego pasa w kierunku Prawobrzeża w godzinach szczytu. Zatory dla busów z materiałami.',
    recommendedAlternative: 'Trasa Zamkowa (Most im. Pionierów Szczecina).',
  },
  {
    id: 'imp_struga',
    streetName: 'ul. Andrzeja Struga / Wylot na S3/A6',
    district: 'Prawobrzeże (Dąbie)',
    coordinates: [14.6542, 53.3854],
    severity: 'narrowing',
    delayMinutes: 10,
    vanAccessible: true,
    description: 'Prace gwarancyjne na estakadach i pasach włączeniowych w stronę Kijewa.',
    recommendedAlternative: 'Objazd przez ul. Bagienną lub ul. Pomorską.',
  },
  {
    id: 'imp_pl_rodla',
    streetName: 'al. Wyzwolenia / Plac Żołnierza / Plac Rodła',
    district: 'Centrum',
    coordinates: [14.5552, 53.4312],
    severity: 'heavy_delay',
    delayMinutes: 12,
    vanAccessible: true,
    description: 'Spowolnienia na skrzyżowaniach tramwajowych, brak miejsc postojowych dla aut dostawczych.',
    recommendedAlternative: 'Użyj ul. Matejki lub Obwodnicy Śródmiejskiej (Wszystkich Świętych).',
  },
  {
    id: 'imp_poludniowa',
    streetName: 'Rondo Hakena / ul. Południowa',
    district: 'Gumieńce',
    coordinates: [14.4921, 53.3912],
    severity: 'heavy_delay',
    delayMinutes: 18,
    vanAccessible: true,
    description: 'Duże zatory przy zjazdach do hurtowni budowlanych (Castorama Południowa, Rondo Hakena).',
    recommendedAlternative: 'Dojazd od strony Przecławia przez DK13 lub ul. Cukrowniczą.',
  },
];

export const SEVERITY_CONFIG: Record<TrafficImpediment['severity'], { label: string; color: string; icon: string }> = {
  critical_closure: { label: 'Całkowite Zamknięcie / Objazd', color: '#ef4444', icon: '⛔' },
  heavy_delay: { label: 'Poważne Zatory (+15 min)', color: '#f59e0b', icon: '🚧' },
  narrowing: { label: 'Zwężenie Pasa / Prace Drogowe', color: '#3b82f6', icon: '⚠️' },
};

/**
 * Calculates transit risk and warning for a job location based on proximity to roadworks.
 */
export function evaluateJobTrafficImpact(jobLat?: number | null, jobLng?: number | null): {
  hasNearbyRoadworks: boolean;
  nearestImpediment?: TrafficImpediment;
  distanceKm?: number;
  warningText?: string;
} {
  if (!jobLat || !jobLng) {
    return { hasNearbyRoadworks: false };
  }

  let minDistance = Infinity;
  let closest: TrafficImpediment | undefined;

  for (const imp of SZCZECIN_TRAFFIC_IMPEDIMENTS) {
    const [impLng, impLat] = imp.coordinates;
    // Euclidean approximation for Szczecin latitude
    const dLat = (jobLat - impLat) * 111;
    const dLng = (jobLng - impLng) * 66.5;
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);

    if (dist < minDistance) {
      minDistance = dist;
      closest = imp;
    }
  }

  if (closest && minDistance <= 1.8) {
    return {
      hasNearbyRoadworks: true,
      nearestImpediment: closest,
      distanceKm: Math.round(minDistance * 10) / 10,
      warningText: `Utrudniony dojazd busem: ${closest.streetName} (~${closest.delayMinutes} min zatoru). ${closest.recommendedAlternative}`,
    };
  }

  return { hasNearbyRoadworks: false };
}
