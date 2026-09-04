import { describe, it, expect, beforeEach } from 'vitest';
import {
  generatePhotoLogReportHtml,
  getStoredSitePhotos,
  saveStoredSitePhotos,
  SitePhotoReportData,
  SitePhotoEntry,
} from '@/lib/contracts/sitePhotoLog';

describe('SitePhotoLog - Construction Site Photo Documentation', () => {
  let mockStore: Record<string, string> = {};

  beforeEach(() => {
    mockStore = {};
    global.localStorage = {
      getItem: (key: string) => mockStore[key] ?? null,
      setItem: (key: string, value: string) => { mockStore[key] = value; },
      removeItem: (key: string) => { delete mockStore[key]; },
      clear: () => { mockStore = {}; },
      length: 0,
      key: () => null,
    } as unknown as Storage;
  });

  it('saves and retrieves site photos correctly from localStorage', () => {
    const mockPhotos: SitePhotoEntry[] = [
      {
        id: 'photo_1',
        timestamp: '2026-09-04T10:00:00.000Z',
        dateFormatted: '04.09.2026, 12:00',
        stage: 'before',
        description: 'Stan posadzki przed wylaniem samopoziomu',
        roomOrArea: 'Korytarz',
        locationText: 'Szczecin Pogodno',
        imageDataUrl: 'data:image/png;base64,mockdata1',
      },
    ];

    saveStoredSitePhotos('ad_123', mockPhotos);
    const retrieved = getStoredSitePhotos('ad_123');

    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].id).toBe('photo_1');
    expect(retrieved[0].stage).toBe('before');
    expect(retrieved[0].roomOrArea).toBe('Korytarz');
  });

  it('generates valid printable HTML report with photos, metadata, and signatures', () => {
    const reportData: SitePhotoReportData = {
      reportNumber: 'FOTO/2026/9988',
      jobTitle: 'Kompleksowy remont łazienki Szczecin',
      siteAddress: 'ul. Wojska Polskiego 45, Szczecin',
      contractorName: 'Jan Majster Usługi Budowlane',
      contractorPhone: '+48 600 700 800',
      clientName: 'Pan Marek Inwestor',
      createdDate: '04.09.2026',
      notes: 'Wszystkie usterki zgłoszone przed montażem glazury.',
      photos: [
        {
          id: 'p1',
          timestamp: '2026-09-04T08:00:00Z',
          dateFormatted: '04.09.2026, 10:00',
          stage: 'hidden_defect',
          description: 'Wilgoć i nieszczelność w pionie kanalizacyjnym',
          roomOrArea: 'Pion łazienkowy',
          imageDataUrl: 'data:image/png;base64,mockdata2',
        },
      ],
    };

    const html = generatePhotoLogReportHtml(reportData);

    expect(html).toContain('FOTO/2026/9988');
    expect(html).toContain('Kompleksowy remont łazienki Szczecin');
    expect(html).toContain('Jan Majster Usługi Budowlane');
    expect(html).toContain('Wilgoć i nieszczelność w pionie kanalizacyjnym');
    expect(html).toContain('Wada Ukryta / Usterka');
    expect(html).toContain('Sporządził (Wykonawca)');
  });
});
