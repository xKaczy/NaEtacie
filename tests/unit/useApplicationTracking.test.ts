import { describe, it, expect } from 'vitest';
import { STATUS_META, type ApplicationStatus, type TrackedApplication } from '@/lib/hooks/useApplicationTracking';

describe('Application Tracking Logic', () => {
  it('provides complete and valid status metadata for all pipeline stages', () => {
    const statuses: ApplicationStatus[] = ['saved', 'applied', 'interview', 'offer', 'rejected'];

    statuses.forEach((status) => {
      const meta = STATUS_META[status];
      expect(meta).toBeDefined();
      expect(typeof meta.label).toBe('string');
      expect(meta.label.length).toBeGreaterThan(0);
      expect(typeof meta.icon).toBe('string');
      expect(meta.color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  it('correctly models status transitions and note attachments', () => {
    const now = Date.now();
    const app: TrackedApplication = {
      id: 'ad-test-1',
      status: 'saved',
      note: 'Ogłoszenie z Pogodna',
      updatedAt: now,
      history: [{ status: 'saved', timestamp: now }],
    };

    expect(app.status).toBe('saved');
    expect(app.history?.length).toBe(1);

    // Transition to applied
    const nextNow = now + 1000;
    const appliedApp: TrackedApplication = {
      ...app,
      status: 'applied',
      note: 'Wysłano zapytanie SMS o stawkę za m2',
      updatedAt: nextNow,
      history: [...(app.history || []), { status: 'applied', timestamp: nextNow }],
    };

    expect(appliedApp.status).toBe('applied');
    expect(appliedApp.note).toBe('Wysłano zapytanie SMS o stawkę za m2');
    expect(appliedApp.history?.length).toBe(2);
    expect(appliedApp.history?.[1].status).toBe('applied');
  });
});
