/**
 * 3D Iconic Architectural & Industrial Landmarks of Szczecin.
 * Integrated into MapLibre GL 3D perspective and Tactical HUD.
 */

export interface SzczecinLandmark3D {
  id: string;
  name: string;
  category: 'industrial' | 'skyscraper' | 'historic' | 'sports' | 'culture';
  coordinates: [number, number]; // [lng, lat]
  heightMeters: number;
  yearBuilt: string;
  icon: string;
  lightColor: string;
  glowColor: string;
  badge: string;
  description: string;
  architecturalHighlight: string;
  constructionContext: string;
}

export const SZCZECIN_LANDMARKS_3D: SzczecinLandmark3D[] = [
  {
    id: 'dzwigozaury',
    name: 'Dźwigozaury (Łasztownia)',
    category: 'industrial',
    coordinates: [14.5668, 53.4278],
    heightMeters: 38,
    yearBuilt: '1929 (iluminacja 2017)',
    icon: '🏗️',
    lightColor: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.45)',
    badge: 'Ikona Portowa Szczecina',
    description: 'Trzy zabytkowe żurawie bramowe z 1929 roku na Nabrzeżu Starówka na Łasztowni.',
    architecturalHighlight: 'Nocna dynamiczna iluminacja w barwach Floating Garden (turkus i zieleń).',
    constructionContext: 'Serce rewitalizacji postindustrialnej wyspy Łasztownia i nowych inwestycji nadrzecznych.',
  },
  {
    id: 'hanza-tower',
    name: 'Hanza Tower',
    category: 'skyscraper',
    coordinates: [14.5574, 53.4358],
    heightMeters: 104,
    yearBuilt: '2021',
    icon: '🏙️',
    lightColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.45)',
    badge: 'Drapacz Chmur (104 m)',
    description: 'Najwyższy wieżowiec mieszkalno-biurowy w Szczecinie przy Al. Wyzwolenia.',
    architecturalHighlight: 'Szklano-stalowa bryła z tarasem widokowym na wysokości 100 m i panoramą Odry.',
    constructionContext: 'Jedna z najbardziej skomplikowanych konstrukcji żelbetowo-stalowych na Pomorzu Zachodnim.',
  },
  {
    id: 'pazim',
    name: 'PAZIM Complex & Radisson Blu',
    category: 'skyscraper',
    coordinates: [14.5552, 53.4338],
    heightMeters: 83,
    yearBuilt: '1992',
    icon: '🏢',
    lightColor: '#3b82f6',
    glowColor: 'rgba(59, 130, 246, 0.45)',
    badge: 'Centrum Biznesu',
    description: 'Ikoniczny kompleks biurowy na Placu Rodła, symbol przemian gospodarczych Szczecina.',
    architecturalHighlight: 'Błękitna cylindryczna wieża z kawiarnią panoramiczną Cafe 22.',
    constructionContext: 'Węzeł komunikacyjny i klaster wykonawców instalacji komercyjnych.',
  },
  {
    id: 'zamek-ksiazat',
    name: 'Zamek Książąt Pomorskich',
    category: 'historic',
    coordinates: [14.5602, 53.4265],
    heightMeters: 45,
    yearBuilt: 'XIV-XVI w. (odbudowa 1980)',
    icon: '🏰',
    lightColor: '#e11d48',
    glowColor: 'rgba(225, 29, 72, 0.45)',
    badge: 'Renesansowa Twierdza',
    description: 'Historyczna siedziba rodu Gryfitów górująca nad Odrą ze Wzgórza Zamkowego.',
    architecturalHighlight: 'Wieża Zegarowa i Wieża Dzwonów z renesansowym dziedzińcem menniczym.',
    constructionContext: 'Kompleksowa modernizacja tarasów i wzmocnienia skarpy zamkowej o wartości >85 mln zł.',
  },
  {
    id: 'waly-chrobrego',
    name: 'Wały Chrobrego & Urząd Wojewódzki',
    category: 'historic',
    coordinates: [14.5650, 53.4300],
    heightMeters: 42,
    yearBuilt: '1902–1921',
    icon: '🏛️',
    lightColor: '#d97706',
    glowColor: 'rgba(217, 119, 6, 0.45)',
    badge: 'Monumentalny Taras Odry',
    description: '500-metrowy taras widokowy nad Odrą z monumentalnymi gmachami z piaskowca i czerwonej cegły.',
    architecturalHighlight: 'Wieże Urzędu Wojewódzkiego, Akademia Morska i Muzeum Narodowe.',
    constructionContext: 'Kluczowy punkt reprezentacyjny miasta i strefa konserwatorskich prac kamieniarskich.',
  },
  {
    id: 'stadion-pogon',
    name: 'Stadion Miejski im. Floriana Krygiera',
    category: 'sports',
    coordinates: [14.5152, 53.4385],
    heightMeters: 32,
    yearBuilt: '2022 (nowy)',
    icon: '⚽',
    lightColor: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.45)',
    badge: 'Arena Pogoni Szczecin (21 163)',
    description: 'Najnowocześniejszy stadion piłkarski na Pomorzu Zachodnim przy ul. Karłowicza.',
    architecturalHighlight: 'Cztery zamknięte trybuny o konstrukcji stalowej z podświetleniem granatowo-bordowym.',
    constructionContext: 'Zrealizowana inwestycja miejska o wartości 364 mln zł z centrum szkolenia młodzieży.',
  },
  {
    id: 'filharmonia',
    name: 'Filharmonia im. Mieczysława Karłowicza',
    category: 'culture',
    coordinates: [14.5595, 53.4290],
    heightMeters: 30,
    yearBuilt: '2014',
    icon: '🎼',
    lightColor: '#f8fafc',
    glowColor: 'rgba(248, 250, 252, 0.5)',
    badge: 'Mies van der Rohe Award',
    description: 'Światowej sławy budynek przypominający lodową bryłę ze strzelistymi szczytami.',
    architecturalHighlight: 'Szklana elewacja z tysiącami diod LED świecących białym lub wielobarwnym światłem.',
    constructionContext: 'Zwycięzca najważniejszej nagrody architektonicznej Unii Europejskiej w 2015 r.',
  },
  {
    id: 'morskie-centrum',
    name: 'Morskie Centrum Nauki',
    category: 'culture',
    coordinates: [14.5660, 53.4295],
    heightMeters: 22,
    yearBuilt: '2023',
    icon: '🚢',
    lightColor: '#0284c7',
    glowColor: 'rgba(2, 132, 199, 0.45)',
    badge: 'Kadłub Statku nad Odrą',
    description: 'Futurystyczny budynek w kształcie kadłuba statku z planetarium i tarasem na dachu.',
    architecturalHighlight: 'Cortenowo-szklana elewacja z widokiem na Wały Chrobrego.',
    constructionContext: 'Najnowsza inwestycja edukacyjno-turystyczna na Łasztowni za 160 mln zł.',
  },
];

/**
 * Returns GeoJSON FeatureCollection for Szczecin Landmarks 3D.
 */
export function getSzczecinLandmarksGeoJson(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: SZCZECIN_LANDMARKS_3D.map((lm) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: lm.coordinates,
      },
      properties: {
        id: lm.id,
        name: lm.name,
        category: lm.category,
        heightMeters: lm.heightMeters,
        yearBuilt: lm.yearBuilt,
        icon: lm.icon,
        lightColor: lm.lightColor,
        badge: lm.badge,
        description: lm.description,
        architecturalHighlight: lm.architecturalHighlight,
        constructionContext: lm.constructionContext,
      },
    })),
  };
}
