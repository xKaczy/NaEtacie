import { describe, it, expect } from 'vitest';
import {
  GERMAN_BORDER_TOWNS,
  convertEurToPln,
  isGermanBorderOffer,
  DEFAULT_EUR_PLN_RATE,
} from '@/lib/geo/germanBorderZone';

describe('German Border Zone Utilities (Przygranicze DE)', () => {
  it('contains Löcknitz, Pasewalk, and Schwedt with realistic distance metrics', () => {
    const locknitz = GERMAN_BORDER_TOWNS.find((t) => t.id === 'locknitz');
    expect(locknitz).toBeDefined();
    expect(locknitz?.distanceFromSzczecinKm).toBeLessThanOrEqual(30);

    const schwedt = GERMAN_BORDER_TOWNS.find((t) => t.id === 'schwedt');
    expect(schwedt).toBeDefined();
    expect(schwedt?.germanState).toBe('Brandenburg');
  });

  it('converts EUR hourly rates to PLN correctly', () => {
    const pln = convertEurToPln(20, 4.30);
    expect(pln).toBe(86);
  });

  it('detects German border keywords in announcement descriptions', () => {
    expect(isGermanBorderOffer('Monter konstrukcji - Schwedt (Niemcy) - 20 EUR/h')).toBe(true);
    expect(isGermanBorderOffer('Zlecenia budowlane Löcknitz przygranicze')).toBe(true);
    expect(isGermanBorderOffer('Murarz Szczecin Pogodno')).toBe(false);
  });
});
