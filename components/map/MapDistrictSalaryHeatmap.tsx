/**
 * Szczecin District Salary Heatmap Overlay Data.
 * GeoJSON polygon zones with average monthly construction salaries per district.
 */

export interface DistrictSalaryZone {
  id: string;
  name: string;
  avgMonthlyPln: number;
  hourlyPln: number;
  demandLevel: 'high' | 'very_high' | 'standard';
  color: string;
  borderColor: string;
  coordinates: [number, number][];
}

export const SZCZECIN_DISTRICT_ZONES: DistrictSalaryZone[] = [
  {
    id: 'warszewo',
    name: 'Warszewo / Osów',
    avgMonthlyPln: 8900,
    hourlyPln: 52,
    demandLevel: 'very_high',
    color: '#10b981', // Szmaragd - wysokie wykończeniówka
    borderColor: '#059669',
    coordinates: [
      [14.50, 53.46],
      [14.56, 53.46],
      [14.56, 53.50],
      [14.50, 53.50],
      [14.50, 53.46],
    ],
  },
  {
    id: 'pogodno',
    name: 'Pogodno / Krzekowo',
    avgMonthlyPln: 8200,
    hourlyPln: 48,
    demandLevel: 'high',
    color: '#059669',
    borderColor: '#047857',
    coordinates: [
      [14.48, 53.43],
      [14.53, 53.43],
      [14.53, 53.46],
      [14.48, 53.46],
      [14.48, 53.43],
    ],
  },
  {
    id: 'gumience',
    name: 'Gumieńce / Mierzyn',
    avgMonthlyPln: 7800,
    hourlyPln: 46,
    demandLevel: 'standard',
    color: '#0284c7', // Błękit
    borderColor: '#0369a1',
    coordinates: [
      [14.47, 53.38],
      [14.53, 53.38],
      [14.53, 53.42],
      [14.47, 53.42],
      [14.47, 53.38],
    ],
  },
  {
    id: 'centrum',
    name: 'Śródmieście / Turzyn',
    avgMonthlyPln: 7600,
    hourlyPln: 45,
    demandLevel: 'standard',
    color: '#6366f1', // Indygo
    borderColor: '#4f46e5',
    coordinates: [
      [14.53, 53.41],
      [14.57, 53.41],
      [14.57, 53.45],
      [14.53, 53.45],
      [14.53, 53.41],
    ],
  },
  {
    id: 'lasztownia',
    name: 'Łasztownia / Port & Międzyodrze',
    avgMonthlyPln: 9400,
    hourlyPln: 56,
    demandLevel: 'very_high',
    color: '#f59e0b', // Bursztyn / Złoto - stoczniowe / spawalnicze
    borderColor: '#d97706',
    coordinates: [
      [14.56, 53.41],
      [14.61, 53.41],
      [14.61, 53.46],
      [14.56, 53.46],
      [14.56, 53.41],
    ],
  },
  {
    id: 'niebuszewo',
    name: 'Niebuszewo / Żelechowa',
    avgMonthlyPln: 7900,
    hourlyPln: 47,
    demandLevel: 'high',
    color: '#14b8a6', // Teal
    borderColor: '#0d9488',
    coordinates: [
      [14.53, 53.45],
      [14.58, 53.45],
      [14.58, 53.49],
      [14.53, 53.49],
      [14.53, 53.45],
    ],
  },
  {
    id: 'prawobrzeze',
    name: 'Prawobrzeże / Dąbie & Słoneczne',
    avgMonthlyPln: 8600,
    hourlyPln: 50,
    demandLevel: 'very_high',
    color: '#10b981',
    borderColor: '#059669',
    coordinates: [
      [14.61, 53.37],
      [14.70, 53.37],
      [14.70, 53.45],
      [14.61, 53.45],
      [14.61, 53.37],
    ],
  },
  {
    id: 'police',
    name: 'Police / Północ Przemysłowa',
    avgMonthlyPln: 8100,
    hourlyPln: 48,
    demandLevel: 'high',
    color: '#eab308',
    borderColor: '#ca8a04',
    coordinates: [
      [14.51, 53.51],
      [14.61, 53.51],
      [14.61, 53.58],
      [14.51, 53.58],
      [14.51, 53.51],
    ],
  },
  {
    id: 'goleniow',
    name: 'Goleniowski Park Przemysłowy',
    avgMonthlyPln: 9200,
    hourlyPln: 54,
    demandLevel: 'very_high',
    color: '#f97316', // Ciepły pomarańcz
    borderColor: '#ea580c',
    coordinates: [
      [14.75, 53.51],
      [14.88, 53.51],
      [14.88, 53.60],
      [14.75, 53.60],
      [14.75, 53.51],
    ],
  },
];

export function getDistrictSalaryGeoJson(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: SZCZECIN_DISTRICT_ZONES.map((z) => ({
      type: 'Feature',
      properties: {
        id: z.id,
        name: z.name,
        avgMonthlyPln: z.avgMonthlyPln,
        hourlyPln: z.hourlyPln,
        demandLevel: z.demandLevel,
        color: z.color,
        borderColor: z.borderColor,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [z.coordinates],
      },
    })),
  };
}
