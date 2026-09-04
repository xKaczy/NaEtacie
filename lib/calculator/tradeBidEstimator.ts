/**
 * Trade Bid & Labor Cost Estimator for Construction Jobs.
 * 
 * Analyzes job description, trade type, and scope metrics to calculate:
 * - Estimated man-hours
 * - Recommended labor quote range in PLN (Szczecin 2026 market benchmarks)
 * - Material cost estimations
 * - Formatted 1-click quotation SMS & WhatsApp drafts
 */

export interface ScopeMetric {
  type: 'area_m2' | 'linear_m' | 'points' | 'rooms' | 'bathrooms' | 'generic';
  quantity: number;
  unit: string;
}

export interface TradeRateBenchmark {
  trade: string;
  unit: string;
  minRatePLN: number;
  avgRatePLN: number;
  maxRatePLN: number;
  defaultScope: number;
  description: string;
}

export const SZCZECIN_TRADE_BENCHMARKS: Record<string, TradeRateBenchmark> = {
  elektryka_punkty: {
    trade: 'Elektryka (montaż punktów)',
    unit: 'pkt',
    minRatePLN: 80,
    avgRatePLN: 110,
    maxRatePLN: 150,
    defaultScope: 30,
    description: 'Montaż gniazd, włączników, oświetlenia i puszek',
  },
  glazura_plytki: {
    trade: 'Układanie płytek / glazura',
    unit: 'm²',
    minRatePLN: 100,
    avgRatePLN: 140,
    maxRatePLN: 190,
    defaultScope: 25,
    description: 'Układanie gresu, ceramiki, format 60x60 i standard',
  },
  gladzie_malowanie: {
    trade: 'Gładzie i malowanie',
    unit: 'm²',
    minRatePLN: 40,
    avgRatePLN: 60,
    maxRatePLN: 85,
    defaultScope: 120,
    description: 'Gładź 2x, szlifowanie bezpyłowe, gruntowanie, malowanie 2x',
  },
  hydraulika_punkty: {
    trade: 'Hydraulika (punkty wod-kan/c.o.)',
    unit: 'pkt',
    minRatePLN: 180,
    avgRatePLN: 240,
    maxRatePLN: 320,
    defaultScope: 6,
    description: 'Podejścia wod-kan, montaż stelaży podtynkowych, grzejniki',
  },
  remont_lazienki: {
    trade: 'Kompleksowy remont łazienki',
    unit: 'kpl',
    minRatePLN: 6500,
    avgRatePLN: 9000,
    maxRatePLN: 13000,
    defaultScope: 1,
    description: 'Hydroizolacja, hydraulika, płytki, biały montaż',
  },
  docieplenia_elewacje: {
    trade: 'Docieplenia i elewacje',
    unit: 'm²',
    minRatePLN: 85,
    avgRatePLN: 120,
    maxRatePLN: 160,
    defaultScope: 150,
    description: 'Styropian, siatka, klej, tynk strukturalny',
  },
  brukarstwo: {
    trade: 'Układanie kostki brukowej',
    unit: 'm²',
    minRatePLN: 70,
    avgRatePLN: 95,
    maxRatePLN: 130,
    defaultScope: 80,
    description: 'Korytowanie, podbudowa, układanie kostki, piaskowanie',
  },
  pokrycia_dachowe: {
    trade: 'Pokrycia dachowe / dekarstwo',
    unit: 'm²',
    minRatePLN: 90,
    avgRatePLN: 135,
    maxRatePLN: 180,
    defaultScope: 120,
    description: 'Łacenie, membrana, dachówka / blachodachówka',
  },
  murowanie: {
    trade: 'Murowanie ścian',
    unit: 'm²',
    minRatePLN: 55,
    avgRatePLN: 75,
    maxRatePLN: 105,
    defaultScope: 60,
    description: 'Bloczki silikatowe, ceramika, gazobeton na klej',
  },
};

export interface BidEstimationResult {
  tradeKey: string;
  tradeName: string;
  scopeQuantity: number;
  scopeUnit: string;
  laborMinPLN: number;
  laborAvgPLN: number;
  laborMaxPLN: number;
  estimatedHours: number;
  materialsEstimatedPLN: number;
  quotationDraftSms: string;
  quotationDraftWhatsApp: string;
}

/**
 * Automatically detects the trade category and estimates metric scope from text.
 */
export function inferTradeAndScope(title: string, description: string): { tradeKey: string; scope: ScopeMetric } {
  const combined = `${title} ${description}`.toLowerCase();

  // Scope detection (m2, mb, punkty, etc.)
  let quantity = 0;

  const m2Match = combined.match(/(\d+(?:[.,]\d+)?)\s*(?:m2|m²|metr[oó]w\s*kwadratowych)/i);
  const pktMatch = combined.match(/(\d+)\s*(?:punkt[oó]w|pkt|gniazd|włącznik[oó]w)/i);
  const bathMatch = combined.match(/(\d+)\s*(?:łazienk[aię]|toalet[ay])/i);

  if (m2Match) {
    quantity = parseFloat(m2Match[1].replace(',', '.'));
  } else if (pktMatch) {
    quantity = parseInt(pktMatch[1], 10);
  } else if (bathMatch) {
    quantity = parseInt(bathMatch[1], 10);
  }

  // Trade detection
  if (/łazienk|wc|toalet/i.test(combined) && /remont|kompleks/i.test(combined)) {
    return {
      tradeKey: 'remont_lazienki',
      scope: { type: 'bathrooms', quantity: quantity || 1, unit: 'kpl' },
    };
  }

  if (/elektry|instalacj.*elekt|gniazd|rozdzielnic|sep/i.test(combined)) {
    return {
      tradeKey: 'elektryka_punkty',
      scope: { type: 'points', quantity: quantity || SZCZECIN_TRADE_BENCHMARKS.elektryka_punkty.defaultScope, unit: 'pkt' },
    };
  }

  if (/glazur|płytk|gres|kafel/i.test(combined)) {
    return {
      tradeKey: 'glazura_plytki',
      scope: { type: 'area_m2', quantity: quantity || SZCZECIN_TRADE_BENCHMARKS.glazura_plytki.defaultScope, unit: 'm²' },
    };
  }

  if (/gładz|gładź|malowan|szpachl|regips/i.test(combined)) {
    return {
      tradeKey: 'gladzie_malowanie',
      scope: { type: 'area_m2', quantity: quantity || SZCZECIN_TRADE_BENCHMARKS.gladzie_malowanie.defaultScope, unit: 'm²' },
    };
  }

  if (/hydraulik|wod-kan|rur|odpływ|kanalizacj/i.test(combined)) {
    return {
      tradeKey: 'hydraulika_punkty',
      scope: { type: 'points', quantity: quantity || SZCZECIN_TRADE_BENCHMARKS.hydraulika_punkty.defaultScope, unit: 'pkt' },
    };
  }

  if (/elewacj|docieplen|styropian/i.test(combined)) {
    return {
      tradeKey: 'docieplenia_elewacje',
      scope: { type: 'area_m2', quantity: quantity || SZCZECIN_TRADE_BENCHMARKS.docieplenia_elewacje.defaultScope, unit: 'm²' },
    };
  }

  if (/bruk|kostk/i.test(combined)) {
    return {
      tradeKey: 'brukarstwo',
      scope: { type: 'area_m2', quantity: quantity || SZCZECIN_TRADE_BENCHMARKS.brukarstwo.defaultScope, unit: 'm²' },
    };
  }

  if (/dach|dekar|blachodach/i.test(combined)) {
    return {
      tradeKey: 'pokrycia_dachowe',
      scope: { type: 'area_m2', quantity: quantity || SZCZECIN_TRADE_BENCHMARKS.pokrycia_dachowe.defaultScope, unit: 'm²' },
    };
  }

  // Default fallback to murowanie / prace ogólnobudowlane
  return {
    tradeKey: 'murowanie',
    scope: { type: 'area_m2', quantity: quantity || SZCZECIN_TRADE_BENCHMARKS.murowanie.defaultScope, unit: 'm²' },
  };
}

/**
 * Calculates a complete trade estimation based on trade benchmark and scope quantity.
 */
export function calculateTradeBid(
  tradeKey: string,
  quantity: number,
  includeMaterials = false
): BidEstimationResult {
  const benchmark = SZCZECIN_TRADE_BENCHMARKS[tradeKey] || SZCZECIN_TRADE_BENCHMARKS.murowanie;
  const safeQty = Math.max(1, quantity);

  const laborMinPLN = Math.round(safeQty * benchmark.minRatePLN);
  const laborAvgPLN = Math.round(safeQty * benchmark.avgRatePLN);
  const laborMaxPLN = Math.round(safeQty * benchmark.maxRatePLN);

  // Approximate working hours
  const estimatedHours = Math.round(safeQty * (benchmark.unit === 'm²' ? 0.75 : benchmark.unit === 'pkt' ? 1.2 : 40));

  // Approximate materials factor (typically 40-70% of labor for standard finishes)
  const materialsEstimatedPLN = includeMaterials ? Math.round(laborAvgPLN * 0.6) : 0;

  const totalAvg = laborAvgPLN + materialsEstimatedPLN;

  const quotationDraftSms = `Dzień dobry! Odpowiadam na ogłoszenie. Szacunkowa wycena robocizny za zakres ${benchmark.trade} (${safeQty} ${benchmark.unit}) wynosi ok. ${laborAvgPLN} zł netto (${laborMinPLN}–${laborMaxPLN} zł). Posiadam własny profesjonalny sprzęt i doświadczenie. Chętnie umówię się na bezpłatną wizję lokalną. Pozdrawiam!`;

  const quotationDraftWhatsApp = `Dzień dobry! 👋\n\nNawiązując do Państwa ogłoszenia, przesyłam wstępną kalkulację:\n• Zakres: *${benchmark.trade}*\n• Szacowany obmiar: *${safeQty} ${benchmark.unit}*\n• Sugerowana robocizna: *${laborAvgPLN} zł* (przedział rynkowy Szczecin: ${laborMinPLN} - ${laborMaxPLN} zł)\n${includeMaterials ? `• Szacowane materiały: ok. *${materialsEstimatedPLN} zł*\n• Łącznie: *${totalAvg} zł*\n` : ''}• Realizacja: własne narzędzia, faktura/umowa, termin do uzgodnienia.\n\nCzy moglibyśmy umówić się na szybką wizję lokalną na budowie?`;

  return {
    tradeKey,
    tradeName: benchmark.trade,
    scopeQuantity: safeQty,
    scopeUnit: benchmark.unit,
    laborMinPLN,
    laborAvgPLN,
    laborMaxPLN,
    estimatedHours,
    materialsEstimatedPLN,
    quotationDraftSms,
    quotationDraftWhatsApp,
  };
}
