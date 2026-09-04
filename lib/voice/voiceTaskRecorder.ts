/**
 * Construction Voice-to-Task & Audio Note Engine (Głosowy Dziennik / Rozliczenia Majstra).
 * 
 * Tailored for self-employed contractors with dusty/dirty hands on site:
 * - Uses Web Speech Recognition (SpeechRecognition / webkitSpeechRecognition)
 * - Automatically parses amounts (zł, pln), work scope (m², mb, punkty), materials, and client agreements
 * - Stores structured audio task logs per announcement
 */

export interface ParsedVoiceMetrics {
  amountPLN?: number;
  scopeQuantity?: number;
  scopeUnit?: string;
  category?: 'robocizna' | 'materialy' | 'zaliczka' | 'dodatkowe_prace' | 'usterka' | 'ogolne';
  keyPoints: string[];
}

export interface VoiceTaskEntry {
  id: string;
  adId: string;
  timestamp: string;
  dateFormatted: string;
  rawTranscript: string;
  parsed: ParsedVoiceMetrics;
}

const STORAGE_KEY_PREFIX = 'naetacie_voice_tasks_';

/**
 * Intelligent regex & NLP parser for Polish speech transcripts on construction sites.
 * Examples:
 * "Dzisiaj zrobione 45 metrów gładzi, inwestor dopłaca 600 zł za skucie starego tynku"
 * "Kupione 4 worki kleju za 180 zł, zaliczka pobrana 1500 zł"
 */
export function parseVoiceTranscript(text: string): ParsedVoiceMetrics {
  const lower = text.toLowerCase();
  const keyPoints: string[] = [];

  // 1. Detect Money / Amounts
  let amountPLN: number | undefined;
  const moneyMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:zł|złotych|pln|zeta|stów(?:ek)?)/i);
  if (moneyMatch) {
    let val = parseFloat(moneyMatch[1].replace(',', '.'));
    if (/stów/i.test(moneyMatch[0]) && !/zł|pln/.test(moneyMatch[0])) {
      val = val * 100;
    }
    amountPLN = Math.round(val);
    keyPoints.push(`Kwota: ${amountPLN} zł`);
  }

  // 2. Detect Work Scope (m2, mb, punkty, sztuki)
  let scopeQuantity: number | undefined;
  let scopeUnit: string | undefined;

  const areaMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:m2|m²|metr[oó]w\s*kwadratowych)/i);
  const linearMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:mb|metr[oó]w\s*bieżących|metr[oó]w)/i);
  const pointsMatch = lower.match(/(\d+)\s*(?:punkt[oó]w|gniazd|włącznik[oó]w|podejść)/i);
  const piecesMatch = lower.match(/(\d+)\s*(?:sztuk|work[oó]w|paczek)/i);

  if (areaMatch) {
    scopeQuantity = parseFloat(areaMatch[1].replace(',', '.'));
    scopeUnit = 'm²';
    keyPoints.push(`Obmiar: ${scopeQuantity} m²`);
  } else if (linearMatch) {
    scopeQuantity = parseFloat(linearMatch[1].replace(',', '.'));
    scopeUnit = 'mb';
    keyPoints.push(`Długość: ${scopeQuantity} mb`);
  } else if (pointsMatch) {
    scopeQuantity = parseInt(pointsMatch[1], 10);
    scopeUnit = 'pkt';
    keyPoints.push(`Punkty: ${scopeQuantity} pkt`);
  } else if (piecesMatch) {
    scopeQuantity = parseInt(piecesMatch[1], 10);
    scopeUnit = 'szt';
    keyPoints.push(`Ilość: ${scopeQuantity} szt`);
  }

  // 3. Detect Category
  let category: ParsedVoiceMetrics['category'] = 'ogolne';
  if (/zaliczk|wpłat/i.test(lower)) {
    category = 'zaliczka';
  } else if (/dodatkow|dopłac|dopłat|ponad\s*program|ekstra/i.test(lower)) {
    category = 'dodatkowe_prace';
  } else if (/usterk|poprawk|błąd|krzyw/i.test(lower)) {
    category = 'usterka';
  } else if (/materia|work[iów]|farb|profil|cegł/i.test(lower)) {
    category = 'materialy';
  } else if (/zrobion|położon|pomalowan|robocizn|gładz/i.test(lower)) {
    category = 'robocizna';
  }

  return {
    amountPLN,
    scopeQuantity,
    scopeUnit,
    category,
    keyPoints,
  };
}

export function getStoredVoiceTasks(adId: string): VoiceTaskEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${adId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredVoiceTasks(adId: string, tasks: VoiceTaskEntry[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${adId}`, JSON.stringify(tasks));
  } catch (err) {
    console.warn('Failed to save voice tasks to localStorage:', err);
  }
}

/**
 * Checks whether SpeechRecognition is available in the user's browser.
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition ||
    (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
  );
}
