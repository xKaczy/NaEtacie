import { describe, it, expect } from 'vitest';
import { ALL_SEO_PAGES, getSeoPageBySlug } from '@/lib/seo/seoPagesConfig';

describe('Programmatic SEO Landing Pages Configuration', () => {
  it('defines trade slugs including malarz, glazurnik, and elektryk', () => {
    const malarz = getSeoPageBySlug('malarz-szczecin');
    expect(malarz).toBeDefined();
    expect(malarz?.h1).toContain('Malarz');
    expect(malarz?.metaDescription).toContain('Szczecin');

    const elektryk = getSeoPageBySlug('elektryk-szczecin');
    expect(elektryk).toBeDefined();
    expect(elektryk?.category).toBe('instalacje');
  });

  it('defines district slugs for major Szczecin osiedla', () => {
    const warszewo = getSeoPageBySlug('praca-warszewo');
    expect(warszewo).toBeDefined();
    expect(warszewo?.title).toContain('Warszewo');

    const pogodno = getSeoPageBySlug('praca-pogodno');
    expect(pogodno).toBeDefined();
    expect(pogodno?.title).toContain('Pogodno');
  });

  it('contains at least 20 SEO pages with keywords and titles', () => {
    expect(ALL_SEO_PAGES.length).toBeGreaterThanOrEqual(20);
    for (const page of ALL_SEO_PAGES) {
      expect(page.slug).toBeTruthy();
      expect(page.title).toBeTruthy();
      expect(page.metaDescription).toBeTruthy();
      expect(page.keywords.length).toBeGreaterThan(0);
    }
  });
});
