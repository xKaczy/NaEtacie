'use client';

import React, { useMemo } from 'react';
import { CATEGORIES, ALL_CATEGORY_KEYS, normalizeCategory } from '@/lib/data/categories';
import type { DisplayAnnouncement } from '@/lib/types/display';

export interface MapStatsProps {
  ads: DisplayAnnouncement[];
  total: number;
  visible: number;
  ui: {
    surfaceAlpha: string;
    border: string;
    text: string;
    textMuted: string;
  };
  isDark: boolean;
}

export function MapStats({ ads, total, visible, ui }: MapStatsProps) {
  const avgPrice = useMemo(() => {
    const prices = ads
      .filter((a) => typeof a.price === 'number' && a.price > 0)
      .map((a) => a.price as number);
    if (prices.length === 0) return null;
    return Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
  }, [ads]);

  const newestLabel = useMemo(() => {
    const dates = ads
      .map((a) => a.scraped_at)
      .filter((d): d is Date => d !== null && d !== undefined)
      .sort((a, b) => b.getTime() - a.getTime());
    if (dates.length === 0) return null;
    const diffH = Math.floor((Date.now() - dates[0].getTime()) / 3600000);
    if (diffH < 1) return 'przed chwilą';
    if (diffH < 24) return `${diffH}h temu`;
    return `${Math.floor(diffH / 24)}d temu`;
  }, [ads]);

  const catCounts = useMemo(
    () =>
      ALL_CATEGORY_KEYS.map((k) => ({
        key: k,
        count: ads.filter((a) => normalizeCategory(a.category) === k).length,
        color: CATEGORIES[k].color,
      })).filter((c) => c.count > 0),
    [ads]
  );

  return (
    <div
      className="hidden md:flex flex-col gap-1 text-xs backdrop-blur-md rounded-xl p-2.5 shadow-md pointer-events-none max-w-[220px]"
      style={{
        position: 'absolute',
        bottom: '116px',
        left: '10px',
        zIndex: 10,
        background: ui.surfaceAlpha,
        border: `1px solid ${ui.border}`,
        color: ui.text,
      }}
    >
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#16a34a',
              display: 'inline-block',
            }}
          />
          <strong>{visible}</strong>
          <span style={{ color: ui.textMuted }}>widoczne w Szczecinie</span>
        </span>
        <span style={{ color: ui.border }}>│</span>
        <span style={{ color: ui.textMuted }}>{total} łącznie</span>
      </div>
      {(avgPrice !== null || newestLabel) && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {avgPrice !== null && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <span>💰</span>
              <span style={{ fontWeight: 600 }}>~{avgPrice.toLocaleString('pl-PL')} zł</span>
            </span>
          )}
          {newestLabel && (
            <span
              style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: ui.textMuted }}
            >
              <span>🕐</span>
              <span>{newestLabel}</span>
            </span>
          )}
        </div>
      )}
      {catCounts.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {catCounts.map((c) => (
            <span key={c.key} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: c.color,
                  display: 'inline-block',
                }}
              />
              <span style={{ color: ui.textMuted, fontSize: '11px' }}>{c.count}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default MapStats;
