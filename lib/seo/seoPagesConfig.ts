import { SZCZECIN_OSIEDLA } from '@/lib/geo/szczecinMicroDistricts';

export interface SeoLandingPageDefinition {
  slug: string;
  title: string;
  metaDescription: string;
  h1: string;
  leadParagraph: string;
  districtName?: string;
  category?: string;
  keywords: string[];
}

export const SEO_TRADE_SLUGS: SeoLandingPageDefinition[] = [
  {
    slug: 'malarz-szczecin',
    title: 'Praca Malarz Szczecin – Oferty Pracy Malowanie i Gładzie',
    metaDescription: 'Aktualne oferty pracy dla malarzy i szpachlarzy w Szczecinie. Stawki godzinowe i akordowe, bezpośrednie telefony do majstrów.',
    h1: 'Praca Malarz / Szpachlarz – Szczecin 2026',
    leadParagraph: 'Szukasz zleceń lub stałej pracy przy malowaniu ścian, sufitów i szpachlowaniu bezpyłowym w Szczecinie? Sprawdź najnowsze oferty bezpośrednio od szczecińskich firm remontowych.',
    category: 'wykończenia',
    keywords: ['malarz', 'malowanie', 'gładzie', 'szpachlarz', 'agregat'],
  },
  {
    slug: 'glazurnik-szczecin',
    title: 'Praca Glazurnik Szczecin – Płytkarz Układanie Gresu',
    metaDescription: 'Zlecenia i praca dla glazurników w Szczecinie. Stawki za m² układania gresu, łazienek i tarasów. Bezpośredni kontakt.',
    h1: 'Praca Glazurnik / Płytkarz – Szczecin',
    leadParagraph: 'Układanie płytek wielkoformatowych, kompleksowe remonty łazienek i tarasów w Szczecinie i okolicach. Przejrzyj zweryfikowane zlecenia z gwarantowaną stawką.',
    category: 'wykończenia',
    keywords: ['glazurnik', 'płytkarz', 'gres', 'płytki', 'łazienka'],
  },
  {
    slug: 'elektryk-szczecin',
    title: 'Praca Elektryk Szczecin – Uprawnienia SEP Instalacje',
    metaDescription: 'Oferty pracy dla elektryków i elektromonterów z uprawnieniami SEP w Szczecinie. Montaż instalacji, rozdzielnic i pomiary.',
    h1: 'Praca Elektryk / Elektromonter – Szczecin',
    leadParagraph: 'Wakat dla samodzielnych elektryków i pomocników na budowach mieszkaniowych oraz przemysłowych w aglomeracji szczecińskiej.',
    category: 'instalacje',
    keywords: ['elektryk', 'sep', 'elektromonter', 'instalacje elektryczne', 'rozdzielnice'],
  },
  {
    slug: 'hydraulik-szczecin',
    title: 'Praca Hydraulik Szczecin – Monter Wod-Kan i C.O.',
    metaDescription: 'Praca dla hydraulików i instalatorów sanitarnych w Szczecinie. Montaż pomp ciepła, ogrzewania podłogowego i sieci wod-kan.',
    h1: 'Praca Hydraulik / Monter Instalacji Sanitarnych – Szczecin',
    leadParagraph: 'Zlecenia hydrauliczne, montaż kotłowni, pomp ciepła i białego montażu na szczecińskich inwestycjach deweloperskich.',
    category: 'instalacje',
    keywords: ['hydraulik', 'wod-kan', 'sanitarny', 'ogrzewanie', 'pompy ciepła'],
  },
  {
    slug: 'pomocnik-budowlany-szczecin',
    title: 'Praca Pomocnik Budowlany Szczecin – Bez Doświadczenia',
    metaDescription: 'Praca od zaraz dla pomocników budowlanych w Szczecinie. Tygodniówki, praca na budowach i przy wykończeniach wnętrz.',
    h1: 'Praca Pomocnik Budowlany – Szczecin (Od zaraz)',
    leadParagraph: 'Praca fizyczna na budowie w Szczecinie. Wypłaty tygodniowe, możliwość przyuczenia do zawodu cieśli, murarza lub zbrojarza.',
    category: 'budowa',
    keywords: ['pomocnik', 'fizyczny', 'od zaraz', 'tygodniówki', 'budowa'],
  },
];

export const SEO_DISTRICT_SLUGS: SeoLandingPageDefinition[] = SZCZECIN_OSIEDLA.slice(0, 15).map((osiedle) => ({
  slug: `praca-${osiedle.id}`,
  title: `Praca Budowlana Szczecin ${osiedle.name} – Oferty Pracy i Zlecenia`,
  metaDescription: `Szukasz pracy budowlanej na osiedlu ${osiedle.name} w Szczecinie (${osiedle.quarter})? Sprawdź aktualne budowy i zlecenia remontowe w Twojej okolicy.`,
  h1: `Praca Budowlana i Remontowa – Szczecin ${osiedle.name}`,
  leadParagraph: `Oferty zatrudnienia i fuchy remontowe zlokalizowane na terenie szczecińskiego osiedla ${osiedle.name} (${osiedle.quarter}). Oszczędzaj czas na dojazdach i pracuj blisko domu.`,
  districtName: osiedle.name,
  keywords: [osiedle.name.toLowerCase(), ...osiedle.keywords],
}));

export const ALL_SEO_PAGES: SeoLandingPageDefinition[] = [
  ...SEO_TRADE_SLUGS,
  ...SEO_DISTRICT_SLUGS,
];

export function getSeoPageBySlug(slug: string): SeoLandingPageDefinition | undefined {
  return ALL_SEO_PAGES.find((p) => p.slug === slug);
}
