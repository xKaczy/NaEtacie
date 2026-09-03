/**
 * Advanced Polish Construction Industry Rates & Pricing Parser.
 *
 * Accurately extracts and classifies specialized trade rates:
 * - Square meters (zł/m², zł/m2) for plaster, drywall, tiling, painting
 * - Linear meters (zł/mb) for baseboards, fences, piping
 * - Points (zł/punkt, zł/pkt) for electrical points and plumbing points
 * - Daily wages (dniówka, zł/dzień) for general laborers and helpers
 * - Hourly wages (zł/h, zł/godz)
 * - Monthly contracts (zł/miesiąc, zł/mc)
 * - Piecework & lump-sum projects (ryczałt, za całość)
 * - Tax modes: netto, na rękę, brutto, B2B (+VAT)
 */

import { SalaryRange, ConstructionUnit, TaxRateMode } from '@/lib/scraper/types';

export interface ParsedConstructionRate {
  priceText: string;
  salaryRange: SalaryRange;
}

export function parseConstructionRate(
  rawText: string | null | undefined
): ParsedConstructionRate | null {
  if (!rawText || typeof rawText !== 'string') return null;

  const text = rawText.trim();
  if (text.length === 0) return null;

  const lower = text.toLowerCase();

  // 1. Detect currency
  let currency: 'PLN' | 'EUR' | 'USD' | 'GBP' = 'PLN';
  if (lower.includes('€') || lower.includes('eur')) currency = 'EUR';
  else if (lower.includes('$') || lower.includes('usd')) currency = 'USD';
  else if (lower.includes('£') || lower.includes('gbp')) currency = 'GBP';

  // 2. Detect tax mode (netto vs brutto vs b2b vs na rękę)
  let rateMode: TaxRateMode = 'na_reke';
  let isGross = false;

  if (lower.includes('brutto')) {
    rateMode = 'brutto';
    isGross = true;
  } else if (lower.includes('b2b') || lower.includes('faktura') || lower.includes('+ vat') || lower.includes('+vat')) {
    rateMode = 'b2b_netto';
    isGross = false;
  } else if (lower.includes('na rękę') || lower.includes('na reke') || lower.includes('do ręki') || lower.includes('do reki') || lower.includes('do łapy') || lower.includes('do lapy') || lower.includes('na czysto')) {
    rateMode = 'na_reke';
    isGross = false;
  } else if (lower.includes('netto')) {
    rateMode = 'netto';
    isGross = false;
  }

  // 3. Extract numbers (min and max)
  // Clean separators like 6 000 or 6.000 into 6000
  const normalizedText = text
    .replace(/(\d)[\s.](\d{3})/g, '$1$2')
    .replace(/,/g, '.');

  const numbers = normalizedText
    .match(/\b\d+(?:\.\d+)?\b/g)
    ?.map(Number)
    .filter((n) => !isNaN(n) && n > 0 && n < 1_000_000);

  if (!numbers || numbers.length === 0) {
    return null;
  }

  const min = numbers[0];
  const max = numbers.length > 1 && numbers[1] >= numbers[0] ? numbers[1] : min;

  // 4. Classify construction unit
  let unit: ConstructionUnit = 'monthly';
  let unitLabel = 'zł/mies.';

  if (/m[2²]|metr\s*(?:kwadratowy|kw\b)/i.test(lower)) {
    unit = 'm2';
    unitLabel = `${currency === 'EUR' ? '€' : 'zł'}/m²`;
  } else if (/\bmb\b|metr\s*bieżący|metr\s*b\b/i.test(lower)) {
    unit = 'mb';
    unitLabel = `${currency === 'EUR' ? '€' : 'zł'}/mb`;
  } else if (/punkt|pkt/i.test(lower)) {
    unit = 'point';
    unitLabel = `${currency === 'EUR' ? '€' : 'zł'}/punkt`;
  } else if (/dniówk|dniowk|dzień|dziennie|\/dzień|\/dzien|\bna\s+dzień\b|\bna\s+dzien\b/i.test(lower)) {
    unit = 'daily';
    unitLabel = `${currency === 'EUR' ? '€' : 'zł'}/dzień`;
  } else if (/\/\s*h\b|\/\s*godz|\bza\s+godzin|godzinow|\bna\s+h\b|\bh\/netto\b|\bh\s*netto\b/i.test(lower)) {
    unit = 'hourly';
    unitLabel = `${currency === 'EUR' ? '€' : 'zł'}/h`;
  } else if (/ryczałt|ryczalt|za\s+całość|za\s+calosc|zlecenie\b/i.test(lower)) {
    unit = 'project';
    unitLabel = `${currency === 'EUR' ? '€' : 'zł'} (zlecenie)`;
  } else if (/akord/i.test(lower)) {
    unit = 'piecework';
    unitLabel = `${currency === 'EUR' ? '€' : 'zł'} (akord)`;
  } else {
    // If value is small (e.g. <= 120), in construction it's almost certainly hourly
    if (max <= 120) {
      unit = 'hourly';
      unitLabel = `${currency === 'EUR' ? '€' : 'zł'}/h`;
    } else if (max >= 150 && max <= 600) {
      // 150-600 is typical daily wage
      unit = 'daily';
      unitLabel = `${currency === 'EUR' ? '€' : 'zł'}/dzień`;
    } else {
      unit = 'monthly';
      unitLabel = `${currency === 'EUR' ? '€' : 'zł'}/mies.`;
    }
  }

  // 5. Calculate estimated monthly equivalent for market benchmarking
  let estimatedMonthly: number | null = null;
  let normMin: number | null = null;
  let normMax: number | null = null;

  if (unit === 'hourly') {
    // 168 hours per month
    normMin = Math.round(min * 168);
    normMax = Math.round(max * 168);
    estimatedMonthly = Math.round(((min + max) / 2) * 168);
  } else if (unit === 'daily') {
    // 21 working days per month
    normMin = Math.round(min * 21);
    normMax = Math.round(max * 21);
    estimatedMonthly = Math.round(((min + max) / 2) * 21);
  } else if (unit === 'monthly') {
    normMin = min;
    normMax = max;
    estimatedMonthly = Math.round((min + max) / 2);
  }

  const formattedPrice =
    min === max
      ? `${min} ${unitLabel}`
      : `${min}–${max} ${unitLabel}`;

  return {
    priceText: formattedPrice,
    salaryRange: {
      min,
      max,
      currency,
      type: unit,
      isGross,
      raw: text,
      unitLabel,
      rateMode,
      estimatedMonthlyEquivalent: estimatedMonthly,
      normalizedMonthlyMin: normMin,
      normalizedMonthlyMax: normMax,
    },
  };
}
