/**
 * German Border Region (Przygranicze Niemieckie / Vorpommern-Greifswald & Uckermark)
 * Geocoding, Commute Analysis and EUR/PLN Currency Converter for Szczecin Workers.
 */

export interface GermanBorderTown {
  id: string;
  name: string;
  germanState: 'Mecklenburg-Vorpommern' | 'Brandenburg';
  distanceFromSzczecinKm: number;
  commuteMinutesCar: number;
  lat: number;
  lng: number;
  description: string;
  keywords: string[];
}

export const GERMAN_BORDER_TOWNS: GermanBorderTown[] = [
  {
    id: 'locknitz',
    name: 'Löcknitz',
    germanState: 'Mecklenburg-Vorpommern',
    distanceFromSzczecinKm: 25,
    commuteMinutesCar: 25,
    lat: 53.452,
    lng: 14.215,
    description: '25 km od granicy Lubieszyn. Bezpośrednie pociągi ze Szczecina Głównego (22 min).',
    keywords: ['löcknitz', 'locknitz', 'lubieszyn'],
  },
  {
    id: 'pasewalk',
    name: 'Pasewalk',
    germanState: 'Mecklenburg-Vorpommern',
    distanceFromSzczecinKm: 42,
    commuteMinutesCar: 40,
    lat: 53.507,
    lng: 13.991,
    description: 'Centrum logistyczno-przemysłowe i duże projekty budowlane przy autostradzie A20.',
    keywords: ['pasewalk', 'a20'],
  },
  {
    id: 'schwedt',
    name: 'Schwedt / Oder',
    germanState: 'Brandenburg',
    distanceFromSzczecinKm: 52,
    commuteMinutesCar: 45,
    lat: 53.064,
    lng: 14.286,
    description: 'Ośrodek przemysłowy i petrochemiczny (PCK Schwedt), ciągłe zapotrzebowanie na spawaczy, monterów i budowlańców.',
    keywords: ['schwedt', 'krajnik dolny'],
  },
  {
    id: 'prenzlau',
    name: 'Prenzlau',
    germanState: 'Brandenburg',
    distanceFromSzczecinKm: 55,
    commuteMinutesCar: 50,
    lat: 53.313,
    lng: 13.861,
    description: 'Miasto powiatowe Uckermark, budownictwo mieszkaniowe i farmy fotowoltaiczne/wiatrowe.',
    keywords: ['prenzlau'],
  },
  {
    id: 'grambow',
    name: 'Grambow',
    germanState: 'Mecklenburg-Vorpommern',
    distanceFromSzczecinKm: 15,
    commuteMinutesCar: 18,
    lat: 53.407,
    lng: 14.358,
    description: 'Pierwsza stacja kolejowa za przejściem granicznym Gumieńce / Kołbaskowo.',
    keywords: ['grambow', 'kołbaskowo'],
  },
];

/** Standard default conversion rate EUR to PLN (approximate NBP benchmark) */
export const DEFAULT_EUR_PLN_RATE = 4.30;

/**
 * Converts hourly Euro rate to estimated Polish Złoty rate (e.g. 18 €/h -> ~77.40 zł/h).
 */
export function convertEurToPln(eurRate: number, exchangeRate: number = DEFAULT_EUR_PLN_RATE): number {
  return Math.round(eurRate * exchangeRate * 100) / 100;
}

/**
 * Checks whether an offer text refers to the German border zone.
 */
export function isGermanBorderOffer(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  const markers = [
    'niemcy', 'deutschland', 'löcknitz', 'locknitz', 'pasewalk',
    'schwedt', 'prenzlau', 'euro', 'eur/h', '€/h', 'przygranicz', 'diety', 'a20'
  ];
  return markers.some((m) => lower.includes(m));
}
