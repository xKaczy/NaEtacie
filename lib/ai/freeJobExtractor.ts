import { extractEquipment, DetectedEquipment } from './equipmentDetector';
import { analyzeJobFraud, FraudAnalysisResult } from './fraudDetector';

export interface ExtractedJobTraits {
  experience_level: 'Brak doświadczenia' | '1–3 lata' | 'Powyżej 3 lat';
  certifications: string[];
  benefits: string[];
  trade_tags?: string[];
  equipment_detected: DetectedEquipment[];
  fraud_analysis: FraudAnalysisResult;
  employment_type_normalized: string;
  salary_parsed: {
    min: number | null;
    max: number | null;
    currency: string;
    unit: 'hourly' | 'daily' | 'piecework' | 'monthly' | 'project';
    estimated_monthly_min?: number;
    estimated_monthly_max?: number;
  } | null;
  accommodation_provided: boolean;
  transport_provided: boolean;
}

const CERTIFICATION_PATTERNS: { name: string; rx: RegExp }[] = [
  { name: 'Uprawnienia SEP', rx: /\bsep\b|uprawnienia elektryczne|sep g1|sep g2|sep g3/i },
  { name: 'Uprawnienia UDT', rx: /\budt\b|uprawnienia udt|operator wózka|wózek widłowy/i },
  { name: 'Certyfikat F-gazowy', rx: /f-?gaz|f-?gazowy|certyfikat f-gaz/i },
  { name: 'Prawo jazdy kat. B', rx: /prawo jazdy kat\.?\s*b|prawo jazdy b/i },
  { name: 'Prawo jazdy kat. C / C+E', rx: /prawo jazdy kat\.?\s*c|kat\.?\s*c\+e|kierowca c/i },
  { name: 'Uprawnienia HDS', rx: /\bhds\b|operator hds/i },
  { name: 'Praca na wysokości', rx: /praca na wysokości|badania wysokościowe|brak lęku wysokości/i },
  { name: 'Uprawnienia spawalnicze', rx: /uprawnienia spawalnicze|spawacz mig|spawacz mag|spawacz tig/i },
  { name: 'Operator koparki / podestu', rx: /operator koparki|koparko-ładowarka|zwyżka|podest ruchomy/i },
  { name: 'Uprawnienia gazowe / CO', rx: /uprawnienia gazowe|g3|gazownik|kotły c\.?o\.?/i },
];

const BENEFIT_PATTERNS: { name: string; rx: RegExp }[] = [
  { name: 'Zakwaterowanie gratis', rx: /zakwaterowanie|darmowe mieszkanie|nocleg|zapewniamy nocleg/i },
  { name: 'Darmowy transport', rx: /dowóz|dojazd do pracy|darmowy transport|bus służbowy/i },
  { name: 'Narzędzia i odzież', rx: /narzędzia|odzież robocza|zapewniamy sprzęt|auto służbowe|samochód służbowy/i },
  { name: 'Płatne nadgodziny', rx: /nadgodziny|możliwość nadgodzin|płatne nadgodziny/i },
  { name: 'Premie i bonusy', rx: /premia|premie|prowizja|bonus/i },
  { name: 'Tygodniowe wypłaty', rx: /tygodniówka|rozliczenie tygodniowe|wypłata co tydzień/i },
  { name: 'Pakiety socjalne', rx: /multisport|opieka medyczna|posiłki|dieta|ubezpieczenie/i },
];

export const TRADE_PATTERNS: { name: string; rx: RegExp }[] = [
  { name: 'Tynki maszynowe', rx: /tynki\s+maszynow|tynkarz\s+maszynow|agregat\s+tynkarsk|pft\s+g4/i },
  { name: 'Szpachlowanie bezpyłowe', rx: /szpachlowanie\s+bezpyłow|gładzie\s+bezpyłow|szlifowanie\s+bezpyłow|żyrafa|festool\s+planex/i },
  { name: 'Pompy ciepła i HVAC', rx: /pomp[ay]\s+ciepła|hvac|klimatyzacj[ae]|wentylacj[ae]|rekuperacj/i },
  { name: 'Fotowoltaika (PV)', rx: /fotowoltaik|instalacje\s+pv|panele\s+fotowoltaiczne|monter\s+pv/i },
  { name: 'Instalacje wod-kan i CO', rx: /wod-?kan|instalacje\s+sanitarne|hydraulik|montaż\s+kotł|ogrzewanie\s+podłogowe/i },
  { name: 'Montaż stolarki i fasad', rx: /stolark[ia]|montaż\s+okien|montaż\s+drzwi|fasady\s+wentylowane|aladynki/i },
  { name: 'Gładzie i malowanie', rx: /malowanie\s+natryskowe|gładzie|malarz|tapetowanie/i },
  { name: 'Płytki i glazura', rx: /glazurnik|płytkarz|układanie\s+płytek|gres|wielki\s+format/i },
  { name: 'Brukarstwo i roboty ziemne', rx: /brukarz|układanie\s+kostki|roboty\s+ziemne|wykopy/i },
  { name: 'Cieśla i dekarz', rx: /dekarz|obróbki\s+blacharskie|krycie\s+dachu|więźba|cieśla/i },
  { name: 'Zbrojarz i betoniarz', rx: /zbrojarz|betoniarz|szalunki|szalowanie|doka|peri/i },
  { name: 'Sucha zabudowa (G-K)', rx: /regips|karton-?gips|sucha\s+zabudowa|ścianki\s+g-?k|sufity\s+podwieszane/i },
];

/**
 * Extracts structured traits from a job posting title and description.
 */
export function extractJobTraits(title: string, description: string, price?: string | number | null, phone?: string | null): ExtractedJobTraits {
  const fullText = `${title} ${description}`;

  // 1. Certifications
  const certs: string[] = [];
  for (const cert of CERTIFICATION_PATTERNS) {
    if (cert.rx.test(fullText)) {
      certs.push(cert.name);
    }
  }

  // 2. Benefits
  const benefits: string[] = [];
  for (const ben of BENEFIT_PATTERNS) {
    if (ben.rx.test(fullText)) {
      benefits.push(ben.name);
    }
  }

  // 3. Trade specializations
  const tradeTags: string[] = [];
  for (const trade of TRADE_PATTERNS) {
    if (trade.rx.test(fullText)) {
      tradeTags.push(trade.name);
    }
  }

  // 3. Equipment & Tools
  const equipment_detected = extractEquipment(title, description);

  // 4. Fraud & Anti-Spam Analysis
  const fraud_analysis = analyzeJobFraud({ title, description, price, phone });

  // 5. Experience level
  let expLevel: 'Brak doświadczenia' | '1–3 lata' | 'Powyżej 3 lat' = '1–3 lata';
  if (/nie wymagamy doświadczenia|bez doświadczenia|przyuczymy|dla początkujących|pomocnik/i.test(fullText)) {
    expLevel = 'Brak doświadczenia';
  } else if (/min\.?\s*5 lat|ponad 5 lat|doświadczony kierownik|samodzielny brygadzista|min\.?\s*3 lata/i.test(fullText)) {
    expLevel = 'Powyżej 3 lat';
  }

  // 6. Accommodation & Transport & Immediate Start flags
  const accommodation = /zakwaterowanie|darmow[eay]\s+mieszkanie|nocleg|zapewniamy\s+nocleg/i.test(fullText);
  const transport = /dowóz|dojazd\s+do\s+pracy|darmowy\s+transport|bus\s+służbowy/i.test(fullText);
  if (/od\s+zaraz|od\s+dzisiaj|od\s+poniedziałku|pilnie\s+poszukuj/i.test(fullText)) {
    benefits.push('Praca od zaraz');
  }

  // 7. Employment type normalization
  let empType = 'Umowa o pracę';
  if (/b2b|działalność|faktura/i.test(fullText)) {
    empType = 'B2B';
  } else if (/zlecenie|umowa\s+zlecenie|dniówka/i.test(fullText)) {
    empType = 'Umowa zlecenie';
  } else if (/o\s+dzieło|umowa\s+o\s+dzieło/i.test(fullText)) {
    empType = 'Umowa o dzieło';
  }

  // 8. Enhanced multi-format Salary parsing (hourly, daily, monthly, piecework)
  let salaryParsed: ExtractedJobTraits['salary_parsed'] = null;

  const hourlyMatch =
    fullText.match(/(\d{2,3})\s*(?:–|-|do)\s*(\d{2,3})\s*zł\s*(?:\/|\s*na\s*)\s*(?:h|godz|godzinę)/i) ||
    fullText.match(/(\d{2,3})\s*zł\s*(?:\/|\s*na\s*)\s*(?:h|godz|godzinę)/i);

  const dailyMatch =
    fullText.match(/(\d{2,4})\s*(?:–|-|do)\s*(\d{2,4})\s*zł\s*(?:\/|\s*na\s*|\s*za\s*)\s*(?:dzień|dniówk[ae])/i) ||
    fullText.match(/(\d{2,4})\s*zł\s*(?:\/|\s*na\s*|\s*za\s*)\s*(?:dzień|dniówk[ae])/i);

  const pieceworkMatch =
    fullText.match(/(\d{2,3})\s*(?:–|-|do)\s*(\d{2,3})\s*zł\s*(?:\/|\s*za\s*)\s*(?:m2|m²|metr)/i) ||
    fullText.match(/(\d{2,3})\s*zł\s*(?:\/|\s*za\s*)\s*(?:m2|m²|metr)/i);

  const monthlyMatch =
    fullText.match(/(\d{4,5})\s*(?:–|-|do)\s*(\d{4,5})\s*(?:zł|pln)/i) ||
    fullText.match(/(\d{4,5})\s*(?:zł|pln)/i);

  if (hourlyMatch) {
    const min = parseInt(hourlyMatch[1], 10);
    const max = hourlyMatch[2] ? parseInt(hourlyMatch[2], 10) : min;
    salaryParsed = {
      min,
      max,
      currency: 'PLN',
      unit: 'hourly',
      estimated_monthly_min: Math.round(min * 168),
      estimated_monthly_max: Math.round(max * 168),
    };
  } else if (dailyMatch) {
    const min = parseInt(dailyMatch[1], 10);
    const max = dailyMatch[2] ? parseInt(dailyMatch[2], 10) : min;
    salaryParsed = {
      min,
      max,
      currency: 'PLN',
      unit: 'daily',
      estimated_monthly_min: Math.round(min * 21),
      estimated_monthly_max: Math.round(max * 21),
    };
  } else if (pieceworkMatch) {
    const min = parseInt(pieceworkMatch[1], 10);
    const max = pieceworkMatch[2] ? parseInt(pieceworkMatch[2], 10) : min;
    salaryParsed = { min, max, currency: 'PLN', unit: 'piecework' };
  } else if (monthlyMatch) {
    const min = parseInt(monthlyMatch[1], 10);
    const max = monthlyMatch[2] ? parseInt(monthlyMatch[2], 10) : min;
    salaryParsed = {
      min,
      max,
      currency: 'PLN',
      unit: 'monthly',
      estimated_monthly_min: min,
      estimated_monthly_max: max,
    };
  }

  return {
    experience_level: expLevel,
    certifications: certs,
    benefits,
    trade_tags: tradeTags,
    equipment_detected,
    fraud_analysis,
    employment_type_normalized: empType,
    salary_parsed: salaryParsed,
    accommodation_provided: accommodation,
    transport_provided: transport,
  };
}

import { unmaskPhoneNumber } from '@/lib/scraper/phoneUnmasker';

/**
 * Extracts normalized Polish phone numbers from job text (e.g. +48 501 234 567 -> 501-234-567).
 * Uses deep verbal unmasker for disguised and verbal contact numbers.
 */
export function extractPhoneNumber(text: string): string | null {
  return unmaskPhoneNumber(text);
}
