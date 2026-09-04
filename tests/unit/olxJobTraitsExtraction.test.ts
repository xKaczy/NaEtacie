import { describe, it, expect } from 'vitest';
import { extractJobTraits, extractPhoneNumber } from '@/lib/ai/freeJobExtractor';
import { extractRequirements } from '@/lib/ai/extractor';

describe('OLX Data & Job Traits Extraction Suite', () => {
  describe('extractJobTraits', () => {
    it('extracts technical certifications from OLX announcement text', () => {
      const title = 'Zatrudnię Elektryka Szczecin';
      const description = 'Poszukujemy fachowca. Wymagane uprawnienia SEP G1, prawo jazdy kat. B oraz certyfikat F-gazowy. Praca na wysokości.';

      const traits = extractJobTraits(title, description);

      expect(traits.certifications).toContain('Uprawnienia SEP');
      expect(traits.certifications).toContain('Prawo jazdy kat. B');
      expect(traits.certifications).toContain('Certyfikat F-gazowy');
      expect(traits.certifications).toContain('Praca na wysokości');
    });

    it('identifies benefits such as free housing, transport, and immediate start', () => {
      const title = 'Monter Budowlany - praca od zaraz';
      const description = 'Oferujemy zakwaterowanie gratis oraz darmowy transport z centrum Szczecina. Wypłata co tydzień (tygodniówka).';

      const traits = extractJobTraits(title, description);

      expect(traits.accommodation_provided).toBe(true);
      expect(traits.transport_provided).toBe(true);
      expect(traits.benefits).toContain('Zakwaterowanie gratis');
      expect(traits.benefits).toContain('Darmowy transport');
      expect(traits.benefits).toContain('Tygodniowe wypłaty');
      expect(traits.benefits).toContain('Praca od zaraz');
    });

    it('correctly normalizes employment type (B2B, UoP, Zlecenie)', () => {
      const b2bTraits = extractJobTraits('Hydraulik Szczecin', 'Praca wyłącznie na B2B, faktura VAT.');
      expect(b2bTraits.employment_type_normalized).toBe('B2B');

      const uopTraits = extractJobTraits('Murarz Szczecin', 'Zapewniamy stabilną umowę o pracę na pełen etat.');
      expect(uopTraits.employment_type_normalized).toBe('Umowa o pracę');

      const zlecenieTraits = extractJobTraits('Pomocnik budowlany', 'Umowa zlecenie dla studentów lub młodych osób.');
      expect(zlecenieTraits.employment_type_normalized).toBe('Umowa zlecenie');
    });

    it('parses hourly salary ranges correctly', () => {
      const traits = extractJobTraits('Spawacz TIG', 'Stawka 35 – 45 zł / h w zależności od umiejętności.');

      expect(traits.salary_parsed).toMatchObject({
        min: 35,
        max: 45,
        currency: 'PLN',
        unit: 'hourly',
        estimated_monthly_min: 5880,
        estimated_monthly_max: 7560,
      });
    });

    it('parses daily rates and converts them to monthly estimated equivalents', () => {
      const traits = extractJobTraits('Cieśla szalunkowy', 'Płatność 300 zł / dzień.');

      expect(traits.salary_parsed?.unit).toBe('daily');
      expect(traits.salary_parsed?.min).toBe(300);
      expect(traits.salary_parsed?.max).toBe(300);
      expect(traits.salary_parsed?.estimated_monthly_min).toBe(6300); // 300 * 21 days
      expect(traits.salary_parsed?.estimated_monthly_max).toBe(6300);
    });

    it('parses piecework rate per m2', () => {
      const traits = extractJobTraits('Glazurnik / Tynkarz', 'Kładzenie płytki 80 – 120 zł / m2.');

      expect(traits.salary_parsed).toMatchObject({
        min: 80,
        max: 120,
        currency: 'PLN',
        unit: 'piecework',
      });
    });

    it('parses monthly salary ranges', () => {
      const traits = extractJobTraits('Kierownik Budowy', 'Wynagrodzenie 8000 – 12000 PLN brutto.');

      expect(traits.salary_parsed).toMatchObject({
        min: 8000,
        max: 12000,
        currency: 'PLN',
        unit: 'monthly',
        estimated_monthly_min: 8000,
        estimated_monthly_max: 12000,
      });
    });

    it('assesses experience levels accurately', () => {
      const noExpTraits = extractJobTraits('Pomocnik na budowę', 'Przyuczymy do zawodu. Nie wymagamy doświadczenia.');
      expect(noExpTraits.experience_level).toBe('Brak doświadczenia');

      const seniorTraits = extractJobTraits('Brygadzista Dekarzy', 'Wymagane min. 5 lat doświadczenia w zawodzie.');
      expect(seniorTraits.experience_level).toBe('Powyżej 3 lat');
    });
  });

  describe('extractPhoneNumber', () => {
    it('extracts and formats Polish phone numbers with +48 prefix', () => {
      const text = 'Zadzwoń do nas pod numer +48 501 234 567 lub wyślij SMS.';
      expect(extractPhoneNumber(text)).toBe('501-234-567');
    });

    it('extracts phone numbers written with spaces or dashes', () => {
      expect(extractPhoneNumber('Kontakt: 602 987 654')).toBe('602-987-654');
      expect(extractPhoneNumber('Tel. 791-112-223')).toBe('791-112-223');
    });

    it('returns null when no valid Polish phone number is found', () => {
      expect(extractPhoneNumber('Brak telefonu, kontakt wyłącznie przez OLX')).toBeNull();
      expect(extractPhoneNumber('')).toBeNull();
    });
  });

  describe('extractRequirements badges', () => {
    it('generates requirement badges with icons and labels', () => {
      const title = 'Elektryk budowlany z autem';
      const description = 'Poszukujemy elektryka. Wymagane uprawnienia SEP oraz własne auto lub bus. Umowa o pracę od zaraz.';

      const badges = extractRequirements(title, description);

      expect(badges.some((b) => b.id === 'sep' && b.icon === '⚡')).toBe(true);
      expect(badges.some((b) => b.id === 'vehicle' && b.icon === '🚐')).toBe(true);
      expect(badges.some((b) => b.id === 'uop' && b.icon === '📜')).toBe(true);
      expect(badges.some((b) => b.id === 'urgent' && b.icon === '🔥')).toBe(true);
    });
  });
});
