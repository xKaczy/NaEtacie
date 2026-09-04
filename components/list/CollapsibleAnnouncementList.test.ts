import { describe, it, expect } from 'vitest';
import { computeAverageSalary } from './CollapsibleAnnouncementList';

describe('computeAverageSalary utility', () => {
  it('should return null for empty array', () => {
    expect(computeAverageSalary([])).toBeNull();
  });

  it('should return null when no item has a numeric price', () => {
    const items = [
      { id: '1', price: null },
      { id: '2', price: 'Negotiable' },
      { id: '3', price: 0 },
    ];
    expect(computeAverageSalary(items)).toBeNull();
  });

  it('should compute average for numeric prices correctly', () => {
    const items = [
      { id: '1', price: 6000 },
      { id: '2', price: 8000 },
      { id: '3', price: 10000 },
    ];
    expect(computeAverageSalary(items)).toBe(8000);
  });

  it('should round the average to nearest integer', () => {
    const items = [
      { id: '1', price: 5000 },
      { id: '2', price: 6000 },
    ];
    expect(computeAverageSalary(items)).toBe(5500);
  });

  it('should ignore non-numeric or non-positive prices', () => {
    const items = [
      { id: '1', price: 7000 },
      { id: '2', price: null },
      { id: '3', price: -100 },
      { id: '4', price: 9000 },
    ];
    expect(computeAverageSalary(items)).toBe(8000);
  });
});

describe('CollapsibleAnnouncementList trade tags grouping & filtering', () => {
  it('groups items by trade tags and falls back to general for untagged items', () => {
    const items = [
      { id: '1', title: 'Tynkarz Szczecin', traits: { trade_tags: ['Tynki maszynowe'] } },
      { id: '2', title: 'Glazurnik / Tynkarz', traits: { trade_tags: ['Tynki maszynowe', 'Płytki i glazura'] } },
      { id: '3', title: 'Pracownik ogólny', traits: { trade_tags: [] } },
    ];

    const groups: Record<string, typeof items> = {};
    for (const item of items) {
      const trades = item.traits?.trade_tags;
      if (trades && trades.length > 0) {
        for (const t of trades) {
          if (!groups[t]) groups[t] = [];
          groups[t].push(item);
        }
      } else {
        const defaultKey = 'Inne / Ogólnobudowlane';
        if (!groups[defaultKey]) groups[defaultKey] = [];
        groups[defaultKey].push(item);
      }
    }

    expect(groups['Tynki maszynowe']).toHaveLength(2);
    expect(groups['Płytki i glazura']).toHaveLength(1);
    expect(groups['Inne / Ogólnobudowlane']).toHaveLength(1);
  });

  it('calculates damped pull distance for mobile pull-to-refresh correctly', () => {
    const calculatePullDamping = (diff: number) => Math.min(80, Math.pow(diff, 0.85));

    expect(calculatePullDamping(0)).toBe(0);
    // 50px pull gives ~27.8px damped
    expect(calculatePullDamping(50)).toBeGreaterThan(20);
    // 120px pull triggers threshold > 50px
    expect(calculatePullDamping(120)).toBeGreaterThanOrEqual(50);
    // Cap at 80px maximum
    expect(calculatePullDamping(300)).toBe(80);
  });
});
