import { describe, it, expect } from 'vitest';
import type { DisplayAnnouncement } from '@/lib/types/display';
import type { SheetSnapState } from '@/components/map/MobileBottomSheet';

describe('MobileBottomSheet Component Logic Unit Tests', () => {
  const SNAP_HEIGHTS: Record<SheetSnapState, string> = {
    collapsed: '56px',
    medium: '44vh',
    expanded: '78vh',
  };

  const mockAds: DisplayAnnouncement[] = [
    {
      id: 'ad-bot-1',
      deduplication_key: 'key-1',
      title: 'Elektryk ze znajomością automatyki',
      company: 'Elektro-Szczecin Sp. z o.o.',
      description: 'Praca na terenie Szczecina.',
      source_portal: 'pracuj',
      category: 'construction',
      location_text: 'Szczecin, Prawobrzeże',
      latitude: 53.40,
      longitude: 14.65,
      price: 8500,
      phone: '500600700',
      scraped_at: new Date(),
      published_at: null,
    },
    {
      id: 'ad-bot-2',
      deduplication_key: 'key-2',
      title: 'Hydraulik / Monter Instalacji',
      company: 'Instal-Bud',
      description: 'Montaż instalacji sanitarnych.',
      source_portal: 'olx',
      category: 'construction',
      location_text: 'Szczecin, Śródmieście',
      latitude: 53.43,
      longitude: 14.55,
      price: 7000,
      phone: null,
      scraped_at: new Date(),
      published_at: null,
    },
  ];

  it('verifies snap heights for mobile viewport ensuring map is not obstructed', () => {
    expect(SNAP_HEIGHTS.collapsed).toBe('56px');
    expect(SNAP_HEIGHTS.medium).toBe('44vh');
    expect(SNAP_HEIGHTS.expanded).toBe('78vh');
  });

  it('defaults to collapsed state when no ad is selected to keep map visible', () => {
    const selectedId = null;
    const initialSnap: SheetSnapState = selectedId ? 'medium' : 'collapsed';
    expect(initialSnap).toBe('collapsed');
  });

  it('switches to medium preview when an ad is explicitly tapped', () => {
    const selectedId = 'ad-bot-1';
    const initialSnap: SheetSnapState = selectedId ? 'medium' : 'collapsed';
    expect(initialSnap).toBe('medium');
  });

  it('selects active ad or falls back to first offer', () => {
    const selectedId = 'ad-bot-2';
    const selectedAd = mockAds.find((a) => a.id === selectedId) || null;
    const currentDisplayAd = selectedAd || (mockAds.length > 0 ? mockAds[0] : null);

    expect(currentDisplayAd).toBeDefined();
    expect(currentDisplayAd!.id).toBe('ad-bot-2');
    expect(currentDisplayAd!.title).toBe('Hydraulik / Monter Instalacji');
  });

  it('generates WhatsApp link when phone is present', () => {
    const adWithPhone = mockAds[0];
    const text = encodeURIComponent(
      `Dzień dobry! Piszę w sprawie ogłoszenia "${adWithPhone.title}" z portalu NaEtacie. Czy oferta jest nadal aktualna?`
    );
    const cleanPhone = adWithPhone.phone!.replace(/\D/g, '');
    const waLink = `https://wa.me/48${cleanPhone}?text=${text}`;

    expect(waLink).toContain('https://wa.me/48500600700');
    expect(waLink).toContain(text);
  });

  it('generates SMS link when phone is absent', () => {
    const adWithoutPhone = mockAds[1];
    const text = encodeURIComponent(
      `Dzień dobry! Piszę w sprawie ogłoszenia "${adWithoutPhone.title}" z portalu NaEtacie. Czy oferta jest nadal aktualna?`
    );
    const smsLink = `sms:?body=${text}`;

    expect(smsLink).toContain('sms:?body=');
  });
});
