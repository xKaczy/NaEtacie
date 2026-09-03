/**
 * Catalog of Major Construction Megastores & Trade Wholesalers in Szczecin.
 * Used for proximity analysis on construction sites (where to get extra materials).
 */

export interface ConstructionSupplier {
  id: string;
  name: string;
  category: 'market_diy' | 'hurtownia_instalacyjna' | 'hurtownia_elektryczna' | 'sklad_ogolnobudowlany';
  address: string;
  district: string;
  lat: number;
  lng: number;
  openHours: string;
  phone?: string;
}

export const SZCZECIN_CONSTRUCTION_SUPPLIERS: ConstructionSupplier[] = [
  // DIY Megastores
  {
    id: 'castorama_poludniowa',
    name: 'Castorama Południowa',
    category: 'market_diy',
    address: 'ul. Południowa 31',
    district: 'Gumieńce',
    lat: 53.3985,
    lng: 14.4988,
    openHours: 'Pn-Sb: 06:30 - 21:00',
    phone: '91 810 21 00',
  },
  {
    id: 'castorama_ku_sloncu',
    name: 'Castorama Ku Słońcu',
    category: 'market_diy',
    address: 'ul. Ku Słońcu 67',
    district: 'Gumieńce / Pogodno',
    lat: 53.4116,
    lng: 14.5098,
    openHours: 'Pn-Sb: 06:30 - 21:00',
    phone: '91 480 81 00',
  },
  {
    id: 'leroy_golisza',
    name: 'Leroy Merlin Golisza',
    category: 'market_diy',
    address: 'ul. Golisza 10',
    district: 'Żelechowa / Północ',
    lat: 53.4542,
    lng: 14.5685,
    openHours: 'Pn-Sb: 06:30 - 21:00',
    phone: '91 469 81 00',
  },
  {
    id: 'leroy_kolbaskowo',
    name: 'Leroy Merlin Ustowo',
    category: 'market_diy',
    address: 'Ustowo 45 (Rondo Hakena)',
    district: 'Kołbaskowo / Ustowo',
    lat: 53.3820,
    lng: 14.4820,
    openHours: 'Pn-Sb: 06:30 - 21:00',
    phone: '91 880 71 00',
  },
  {
    id: 'bricoman_bialowieska',
    name: 'Bricoman Białowieska',
    category: 'sklad_ogolnobudowlany',
    address: 'ul. Białowieska 1',
    district: 'Pomorzany',
    lat: 53.4012,
    lng: 14.5385,
    openHours: 'Pn-Sb: 06:00 - 20:00 (Dla Fachowców od 6:00)',
    phone: '91 481 33 00',
  },
  {
    id: 'psb_mrowka_dabie',
    name: 'PSB Mrówka Dąbie',
    category: 'market_diy',
    address: 'ul. Pomorska 112',
    district: 'Dąbie / Prawobrzeże',
    lat: 53.3950,
    lng: 14.6850,
    openHours: 'Pn-Sb: 07:00 - 20:00',
    phone: '91 460 03 00',
  },

  // Trade Wholesalers (Instalacje & Elektryka)
  {
    id: 'bims_plus_cukrowa',
    name: 'Bims Plus Hurtownia Instalacyjna',
    category: 'hurtownia_instalacyjna',
    address: 'ul. Cukrowa 14',
    district: 'Gumieńce',
    lat: 53.3910,
    lng: 14.5040,
    openHours: 'Pn-Pt: 07:00 - 16:00',
    phone: '91 482 99 00',
  },
  {
    id: 'kopel_santocka',
    name: 'Kopel Hurtownia Elektryczna',
    category: 'hurtownia_elektryczna',
    address: 'ul. Santocka 39',
    district: 'Świerczewo / Turzyn',
    lat: 53.4240,
    lng: 14.5120,
    openHours: 'Pn-Pt: 07:00 - 16:30',
    phone: '91 484 20 00',
  },
  {
    id: 'marlin_struga',
    name: 'Marlin Hurtownia Budowlana',
    category: 'sklad_ogolnobudowlany',
    address: 'ul. Struga 71',
    district: 'Prawobrzeże',
    lat: 53.3850,
    lng: 14.6450,
    openHours: 'Pn-Pt: 06:30 - 17:00',
    phone: '91 464 45 00',
  },
];

/**
 * Calculates Haversine distance in km between two coordinate pairs.
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

export interface NearestSupplierResult {
  supplier: ConstructionSupplier;
  distanceKm: number;
  driveTimeMinutes: number;
}

/**
 * Finds the closest DIY megastore or trade wholesaler to a specific job location.
 */
export function findNearestSupplier(
  jobLat: number | null | undefined,
  jobLng: number | null | undefined
): NearestSupplierResult | null {
  if (jobLat == null || jobLng == null) return null;

  let bestSupplier: ConstructionSupplier | null = null;
  let minDistance = Infinity;

  for (const s of SZCZECIN_CONSTRUCTION_SUPPLIERS) {
    const dist = haversineDistance(jobLat, jobLng, s.lat, s.lng);
    if (dist < minDistance) {
      minDistance = dist;
      bestSupplier = s;
    }
  }

  if (!bestSupplier) return null;

  // Car transit in Szczecin: average 32 km/h + 2 min buffer
  const driveTimeMinutes = Math.max(3, Math.round((minDistance / 32) * 60 + 2));

  return {
    supplier: bestSupplier,
    distanceKm: minDistance,
    driveTimeMinutes,
  };
}

/**
 * Generates GeoJSON FeatureCollection for MapLibre layer.
 */
export function getSuppliersGeoJson(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: SZCZECIN_CONSTRUCTION_SUPPLIERS.map((s) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [s.lng, s.lat],
      },
      properties: {
        id: s.id,
        name: s.name,
        category: s.category,
        address: s.address,
        district: s.district,
        openHours: s.openHours,
        phone: s.phone || '',
      },
    })),
  };
}
