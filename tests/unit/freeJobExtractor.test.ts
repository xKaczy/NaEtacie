import { describe, it, expect } from 'vitest';
import { extractJobTraits } from '@/lib/ai/freeJobExtractor';

describe('Zero-Cost Local AI/NLP Job Extractor', () => {
  it('extracts certifications, benefits, and experience level', () => {
    const title = 'Elektryk Budowlany z uprawnieniami SEP G1';
    const description = `
      Poszukujemy elektryka do wykonywania instalacji w budynkach mieszkalnych.
      Wymagane uprawnienia SEP oraz prawo jazdy kat. B. Praca na wysokości powyżej 3m.
      Oferujemy zakwaterowanie gratis, bus służbowy oraz płatne nadgodziny.
      Wypłata co tydzień (tygodniówka). Stawka 45 zł/h netto.
    `;

    const traits = extractJobTraits(title, description);

    expect(traits.certifications).toContain('Uprawnienia SEP');
    expect(traits.certifications).toContain('Prawo jazdy kat. B');
    expect(traits.certifications).toContain('Praca na wysokości');
    expect(traits.benefits).toContain('Zakwaterowanie gratis');
    expect(traits.benefits).toContain('Darmowy transport');
    expect(traits.benefits).toContain('Płatne nadgodziny');
    expect(traits.benefits).toContain('Tygodniowe wypłaty');
    expect(traits.accommodation_provided).toBe(true);
    expect(traits.transport_provided).toBe(true);
    expect(traits.salary_parsed).toEqual({
      min: 45,
      max: 45,
      currency: 'PLN',
      unit: 'hourly',
      estimated_monthly_min: 7560,
      estimated_monthly_max: 7560,
    });
  });

  it('detects no-experience requirements and B2B contracts', () => {
    const title = 'Pomocnik budowlany - przyuczymy, bez doświadczenia';
    const description = 'Praca przy pracach ogólnobudowlanych. Rozliczenie B2B lub umowa zlecenie.';

    const traits = extractJobTraits(title, description);

    expect(traits.experience_level).toBe('Brak doświadczenia');
    expect(traits.employment_type_normalized).toBe('B2B');
  });

  it('extracts trade tags and daily salary rates properly', () => {
    const title = 'Tynkarz maszynowy - agregat PFT G4, tynki gipsowe';
    const description = 'Zatrudnimy tynkarza maszynowego. Dniówka 400 - 450 zł za dzień, wypłata co tydzień.';

    const traits = extractJobTraits(title, description);

    expect(traits.trade_tags).toContain('Tynki maszynowe');
    expect(traits.salary_parsed).toEqual({
      min: 400,
      max: 450,
      currency: 'PLN',
      unit: 'daily',
      estimated_monthly_min: 8400,
      estimated_monthly_max: 9450,
    });
  });

  it('extracts piecework and modern eco-trades (pompy ciepła, fotowoltaika, szpachlowanie bezpyłowe)', () => {
    const title = 'Monter pomp ciepła i instalacji PV - szpachlowanie bezpyłowe';
    const description = 'Poszukujemy ekipy: montaż pomp ciepła HVAC, panele fotowoltaiczne, akord 60 zł/m2.';

    const traits = extractJobTraits(title, description);

    expect(traits.trade_tags).toContain('Pompy ciepła i HVAC');
    expect(traits.trade_tags).toContain('Fotowoltaika (PV)');
    expect(traits.trade_tags).toContain('Szpachlowanie bezpyłowe');
    expect(traits.salary_parsed).toEqual({
      min: 60,
      max: 60,
      currency: 'PLN',
      unit: 'piecework',
    });
  });
});
