/**
 * BLIK & Instant Payment Engine for Polish Trade Platform "Na Etacie"
 * Handles 6-digit BLIK codes, transaction lifecycles, timer countdowns,
 * bank push confirmation state machines, and tier entitlement provisioning.
 */

export type PaymentProductType =
  | 'PRO_MONTHLY_SUB'
  | 'PRO_YEARLY_SUB'
  | 'BOOST_AD_3D'
  | 'PDF_CONTRACT_PACK'
  | 'INSTANT_SOS_CREDIT';

export interface PaymentProduct {
  id: PaymentProductType;
  title: string;
  subtitle: string;
  priceGrossPln: number;
  vatRatePercent: number;
  badge?: string;
  features: string[];
}

export const MONETIZATION_PRODUCTS: Record<PaymentProductType, PaymentProduct> = {
  PRO_MONTHLY_SUB: {
    id: 'PRO_MONTHLY_SUB',
    title: 'Abonament Majster PRO',
    subtitle: 'Miesięczny dostęp do pełnego pakietu narzędzi',
    priceGrossPln: 79.0,
    vatRatePercent: 23,
    badge: 'NAJPOPULARNIEJSZY',
    features: [
      'Brak 48h opóźnienia — natychmiastowy dostęp do nowych ofert',
      'Nieograniczone odkrywanie numerów telefonów i kontaktów',
      'Generator Umów Budowlanych i Protokołów Odbioru PDF',
      'Dostęp do giełdy zleceń błyskawicznych "Fachowiec SOS"',
      'Złota odznaka "Zweryfikowany Wykonawca" na mapie i liście',
    ],
  },
  PRO_YEARLY_SUB: {
    id: 'PRO_YEARLY_SUB',
    title: 'Abonament Majster PRO (Roczny)',
    subtitle: '12 miesięcy w cenie 9 miesięcy (Oszczędzasz 249 zł)',
    priceGrossPln: 699.0,
    vatRatePercent: 23,
    badge: 'OSZCZĘDŹ 30%',
    features: [
      'Wszystkie funkcje pakietu Majster PRO na cały rok',
      '3 darmowe Super-Wyróżnienia ogłoszeń na mapie 3D',
      'Priorytetowe pozycjonowanie profilu w wyszukiwarce majstrów',
      'Dedykowana infolinia wsparcia technicznego',
    ],
  },
  BOOST_AD_3D: {
    id: 'BOOST_AD_3D',
    title: 'Super-Wyróżnienie na Mapie 3D (7 dni)',
    subtitle: 'Złoty neonowy promień na mapie Szczecina i szczyt listy',
    priceGrossPln: 19.0,
    vatRatePercent: 23,
    badge: '3X WIĘCEJ KONTAKTÓW',
    features: [
      'Złoty, pulsujący marker 3D widoczny z każdego poziomu przybliżenia',
      'Pozycja na samym szczycie listy ogłoszeń w danej branży',
      'Powiadomienie PUSH do 200+ fachowców w promieniu 5 km',
    ],
  },
  PDF_CONTRACT_PACK: {
    id: 'PDF_CONTRACT_PACK',
    title: 'Pakiet 10 Umów Budowlanych PDF',
    subtitle: 'Generator umów o dzieło i roboty budowlane z podpisem cyfrowym',
    priceGrossPln: 29.0,
    vatRatePercent: 23,
    features: [
      'Gotowe szablony przygotowane przez prawników prawa budowlanego',
      'Podpis elektroniczny palcem na ekranie telefonu',
      'Klauzule zadatku, kar za opóźnienia i odbioru prac zanikających',
      'Automatyczna wysyłka PDF na WhatsApp i e-mail klienta',
    ],
  },
  INSTANT_SOS_CREDIT: {
    id: 'INSTANT_SOS_CREDIT',
    title: 'Błyskawiczny Alert SOS na Dziś',
    subtitle: 'Natychmiastowe wezwanie ekipy / pomocnika na budowę',
    priceGrossPln: 9.0,
    vatRatePercent: 23,
    features: [
      'Powiadomienie SMS/PUSH do wolnych ekip w Szczecinie',
      'Czas reakcji zazwyczaj poniżej 15 minut',
    ],
  },
};

export type BlikPaymentStatus =
  | 'IDLE'
  | 'VALIDATING'
  | 'WAITING_FOR_BANK_CONFIRMATION'
  | 'AUTHORIZED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface BlikTransaction {
  transactionId: string;
  productId: PaymentProductType;
  amountGross: number;
  amountNet: number;
  vatAmount: number;
  blikCode: string;
  status: BlikPaymentStatus;
  createdAt: Date;
  expiresAt: Date;
  authorizedAt?: Date;
  targetAdId?: string;
  buyerEmail?: string;
  buyerNip?: string;
}

/**
 * Validates a 6-digit Polish BLIK code.
 * Rules: Exactly 6 numeric digits, cannot be all identical (e.g. 000000 or 111111).
 */
export function validateBlikCode(code: string): { isValid: boolean; error?: string } {
  if (!code || typeof code !== 'string') {
    return { isValid: false, error: 'Wprowadź 6-cyfrowy kod BLIK' };
  }

  const clean = code.replace(/\D/g, '');
  if (clean.length !== 6) {
    return { isValid: false, error: 'Kod BLIK musi składać się dokładnie z 6 cyfr' };
  }

  // Reject trivial all-same digit sequences (e.g. 000000, 111111)
  if (/^(\d)\1{5}$/.test(clean)) {
    return { isValid: false, error: 'Nieprawidłowy kod BLIK' };
  }

  return { isValid: true };
}

/**
 * Computes net price and 23% VAT breakdown in Polish Grosz precision.
 */
export function calculateVatBreakdown(grossPln: number, vatRatePercent: number = 23) {
  const gross = Math.round(grossPln * 100) / 100;
  const net = Math.round((gross / (1 + vatRatePercent / 100)) * 100) / 100;
  const vat = Math.round((gross - net) * 100) / 100;

  return {
    grossPln: gross,
    netPln: net,
    vatPln: vat,
    formattedGross: `${gross.toFixed(2)} zł`,
    formattedNet: `${net.toFixed(2)} zł`,
    formattedVat: `${vat.toFixed(2)} zł`,
  };
}

/**
 * Generates a unique transaction identifier for the payment gateway.
 */
export function generateTransactionId(prefix = 'TXN_BLIK'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}_${timestamp}_${randomPart}`;
}

/**
 * Creates a new BLIK transaction session.
 */
export function initiateBlikTransaction(params: {
  productId: PaymentProductType;
  blikCode: string;
  buyerEmail?: string;
  buyerNip?: string;
  targetAdId?: string;
}): { transaction: BlikTransaction | null; error?: string } {
  const validation = validateBlikCode(params.blikCode);
  if (!validation.isValid) {
    return { transaction: null, error: validation.error };
  }

  const product = MONETIZATION_PRODUCTS[params.productId];
  if (!product) {
    return { transaction: null, error: 'Nieprawidłowy produkt' };
  }

  const { grossPln, netPln, vatPln } = calculateVatBreakdown(product.priceGrossPln, product.vatRatePercent);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 120 * 1000); // 2 minutes BLIK timeout window

  const transaction: BlikTransaction = {
    transactionId: generateTransactionId(),
    productId: params.productId,
    amountGross: grossPln,
    amountNet: netPln,
    vatAmount: vatPln,
    blikCode: params.blikCode.replace(/\D/g, ''),
    status: 'WAITING_FOR_BANK_CONFIRMATION',
    createdAt: now,
    expiresAt,
    buyerEmail: params.buyerEmail,
    buyerNip: params.buyerNip,
    targetAdId: params.targetAdId,
  };

  return { transaction };
}

/**
 * Simulates bank confirmation polling with optimistic resolving for testing & demo.
 */
export async function simulateBankAuthorization(
  transaction: BlikTransaction,
  mockDelayMs = 2000
): Promise<BlikTransaction> {
  return new Promise((resolve, _reject) => {
    // If BLIK code ends in '00' in test mode, simulate bank rejection
    if (transaction.blikCode.endsWith('00')) {
      setTimeout(() => {
        resolve({
          ...transaction,
          status: 'REJECTED',
        });
      }, mockDelayMs);
      return;
    }

    setTimeout(() => {
      resolve({
        ...transaction,
        status: 'AUTHORIZED',
        authorizedAt: new Date(),
      });
    }, mockDelayMs);
  });
}
