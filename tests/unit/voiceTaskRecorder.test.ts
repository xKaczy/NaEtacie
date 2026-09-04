import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseVoiceTranscript,
  getStoredVoiceTasks,
  saveStoredVoiceTasks,
  VoiceTaskEntry,
} from '@/lib/voice/voiceTaskRecorder';

describe('VoiceTaskRecorder - Audio Task & NLP Parser for Tradespeople', () => {
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

  it('correctly parses speech with work scope and extra payment', () => {
    const speech = 'Dzisiaj zrobione 45 metrów kwadratowych gładzi, inwestor dopłaca 600 zł za skucie tynku';
    const parsed = parseVoiceTranscript(speech);

    expect(parsed.amountPLN).toBe(600);
    expect(parsed.scopeQuantity).toBe(45);
    expect(parsed.scopeUnit).toBe('m²');
    expect(parsed.category).toBe('dodatkowe_prace');
    expect(parsed.keyPoints).toContain('Kwota: 600 zł');
    expect(parsed.keyPoints).toContain('Obmiar: 45 m²');
  });

  it('correctly parses speech with points and advance payment (zaliczka)', () => {
    const speech = 'Zrobione 12 punktów elektryki, pobrana zaliczka 1500 zł';
    const parsed = parseVoiceTranscript(speech);

    expect(parsed.amountPLN).toBe(1500);
    expect(parsed.scopeQuantity).toBe(12);
    expect(parsed.scopeUnit).toBe('pkt');
    expect(parsed.category).toBe('zaliczka');
  });

  it('saves and retrieves voice tasks correctly from localStorage', () => {
    const mockTasks: VoiceTaskEntry[] = [
      {
        id: 'vt_1',
        adId: 'ad_99',
        timestamp: '2026-09-04T08:00:00Z',
        dateFormatted: '04.09, 10:00',
        rawTranscript: 'Kupione 4 worki kleju za 180 zł',
        parsed: {
          amountPLN: 180,
          category: 'materialy',
          keyPoints: ['Kwota: 180 zł'],
        },
      },
    ];

    saveStoredVoiceTasks('ad_99', mockTasks);
    const stored = getStoredVoiceTasks('ad_99');

    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('vt_1');
    expect(stored[0].parsed.amountPLN).toBe(180);
    expect(stored[0].parsed.category).toBe('materialy');
  });
});
