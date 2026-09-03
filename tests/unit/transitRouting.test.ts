import { describe, it, expect } from 'vitest';
import {
  getZditmTransitUrl,
  getJakDojadeSzczecinUrl,
  getQuickSmsHref,
  getQuickWhatsAppHref,
} from '@/lib/geo/transitRouting';

describe('Transit Routing & 1-Tap Quick Application', () => {
  it('generates transit URL for ZDiTM Szczecin and JakDojade', () => {
    const zditm = getZditmTransitUrl(53.4285, 14.5528);
    expect(zditm).toContain('travelmode=transit');
    expect(zditm).toContain('53.4285');

    const jakdojade = getJakDojadeSzczecinUrl(53.4285, 14.5528);
    expect(jakdojade).toContain('jakdojade.pl/szczecin');
  });

  it('generates valid SMS deep-link with pre-filled message', () => {
    const sms = getQuickSmsHref({
      phone: '+48 501 234 567',
      title: 'Zbrojarz / Cieśla na budowę',
      district: 'Łasztownia',
    });

    expect(sms).toBeDefined();
    expect(sms).toContain('sms:+48501234567?body=');
    expect(decodeURIComponent(sms!)).toContain('Łasztownia');
    expect(decodeURIComponent(sms!)).toContain('Zbrojarz');
  });

  it('generates valid WhatsApp link with Polish country prefix', () => {
    const wa = getQuickWhatsAppHref({
      phone: '501234567',
      title: 'Elektryk uprawnienia SEP',
      district: 'Pogodno',
    });

    expect(wa).toBeDefined();
    expect(wa).toContain('https://wa.me/48501234567?text=');
    expect(decodeURIComponent(wa!)).toContain('Elektryk');
  });

  it('returns null when phone number is missing or invalid', () => {
    expect(getQuickSmsHref({ phone: null, title: 'Praca' })).toBeNull();
    expect(getQuickSmsHref({ phone: '123', title: 'Praca' })).toBeNull();
    expect(getQuickWhatsAppHref({ phone: '', title: 'Praca' })).toBeNull();
  });
});
