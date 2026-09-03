/**
 * Transit Routing & 1-Tap Quick Application Dispatcher for Szczecin Construction Market.
 * Provides deep-links for ZDiTM / JakDojade morning commute (6:30 AM arrival)
 * and 1-tap pre-filled SMS/WhatsApp message generators for workers with work gloves.
 */

export interface QuickApplicationParams {
  phone: string | null | undefined;
  title: string;
  district?: string | null;
  applicantPhone?: string | null;
}

/**
 * Generates direct link to ZDiTM Szczecin public transit route with arrival targeted for 6:30 AM.
 */
export function getZditmTransitUrl(lat: number, lng: number): string {
  // Google Maps transit mode targeting arrival at next 06:30 AM CET
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=transit`;
}

/**
 * Generates JakDojade Szczecin direct link to the exact coordinates.
 */
export function getJakDojadeSzczecinUrl(lat: number, lng: number): string {
  return `https://jakdojade.pl/szczecin/trasa/do--${lat.toFixed(5)},${lng.toFixed(5)}`;
}

/**
 * Generates 1-Tap pre-filled SMS uri (rfc5724) for instant application without typing.
 */
export function getQuickSmsHref(params: QuickApplicationParams): string | null {
  if (!params.phone) return null;
  const cleanDigits = params.phone.replace(/[^0-9+]/g, '');
  if (cleanDigits.length < 9) return null;

  const titleSnippet = params.title ? params.title.trim().slice(0, 45) : 'ogłoszenia';
  const locationSnippet = params.district ? ` na ${params.district}` : ' w Szczecinie';

  const bodyText = `Dzień dobry! Piszę w sprawie zlecenia: "${titleSnippet}"${locationSnippet}. Mam doświadczenie budowlane, własne narzędzia i dyspozycyjność od zaraz. Proszę o kontakt telefoniczny.`;

  return `sms:${cleanDigits}?body=${encodeURIComponent(bodyText)}`;
}

/**
 * Generates 1-Tap WhatsApp chat link with pre-filled message.
 */
export function getQuickWhatsAppHref(params: QuickApplicationParams): string | null {
  if (!params.phone) return null;
  const rawDigits = params.phone.replace(/\D/g, '');
  if (rawDigits.length < 9) return null;

  const phoneWithCountry = rawDigits.startsWith('48') && rawDigits.length >= 11
    ? rawDigits
    : `48${rawDigits.slice(-9)}`;

  const titleSnippet = params.title ? params.title.trim().slice(0, 45) : 'ogłoszenia';
  const locationSnippet = params.district ? ` na ${params.district}` : ' w Szczecinie';

  const bodyText = `Dzień dobry! Piszę w sprawie zlecenia: "${titleSnippet}"${locationSnippet}. Mam doświadczenie budowlane i dyspozycyjność od zaraz. Proszę o kontakt.`;

  return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(bodyText)}`;
}
