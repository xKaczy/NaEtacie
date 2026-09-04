'use client';

import React from 'react';
import { CATEGORIES, ALL_CATEGORY_KEYS, type CategoryKey } from '@/lib/data/categories';
import type { MapSalaryFilter } from './utils';

export interface CategoryFilterBarProps {
  active: Set<CategoryKey>;
  onChange: (cats: Set<CategoryKey>) => void;
  salaryFilter?: MapSalaryFilter;
  onSalaryFilterChange?: (filter: MapSalaryFilter) => void;
  ui: {
    surfaceAlpha: string;
    border: string;
    textMuted: string;
    shadow: string;
  };
  top?: number | string;
  left?: number | string;
  right?: number | string;
}

const SALARY_PILLS: Array<{ id: MapSalaryFilter; label: string; icon: string }> = [
  { id: 'all', label: 'Wszystkie stawki', icon: '⚡' },
  { id: 'hourly_standard', label: 'Godzinówka (Standard)', icon: '⏱️' },
  { id: 'daily_rate', label: 'Dniówka', icon: '📅' },
  { id: 'high_pay', label: 'Powyżej mediany (>45zł/h)', icon: '🔥' },
];

export function CategoryFilterBar({
  active,
  onChange,
  salaryFilter = 'all',
  onSalaryFilterChange,
  ui,
  top = 10,
  left = 10,
  right = 110,
}: CategoryFilterBarProps) {
  const allSelected = active.size === ALL_CATEGORY_KEYS.length;

  return (
    <div
      className="hidden md:flex no-scrollbar items-center pointer-events-auto"
      style={{
        position: 'absolute',
        top: typeof top === 'number' ? `${top}px` : top,
        left: typeof left === 'number' ? `${left}px` : left,
        right: typeof right === 'number' ? `${right}px` : right,
        zIndex: 20,
        gap: '5px',
        overflowX: 'auto',
        paddingBottom: '2px',
      }}
    >
      <button
        onClick={() => onChange(allSelected ? new Set() : new Set(ALL_CATEGORY_KEYS))}
        style={{
          flexShrink: 0,
          padding: '6px 12px',
          borderRadius: '20px',
          border: `1.5px solid ${ui.border}`,
          background: ui.surfaceAlpha,
          backdropFilter: 'blur(6px)',
          color: ui.textMuted,
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: ui.shadow,
          whiteSpace: 'nowrap',
        }}
      >
        {allSelected ? 'Odznacz wszystko' : 'Wybierz wszystko'}
      </button>
      {ALL_CATEGORY_KEYS.map((key) => {
        const cat = CATEGORIES[key];
        const isActive = active.has(key);
        return (
          <button
            key={key}
            onClick={() => {
              const next = new Set(active);
              if (isActive) next.delete(key);
              else next.add(key);
              onChange(next);
            }}
            style={{
              flexShrink: 0,
              pointerEvents: 'auto',
              padding: '6px 13px',
              borderRadius: '20px',
              border: `1.5px solid ${isActive ? cat.color : ui.border}`,
              background: isActive ? `${cat.color}20` : ui.surfaceAlpha,
              backdropFilter: 'blur(6px)',
              color: isActive ? cat.color : ui.textMuted,
              fontSize: '12px',
              fontWeight: isActive ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              whiteSpace: 'nowrap',
              boxShadow: ui.shadow,
              transition: 'all 0.15s ease',
            }}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        );
      })}

      {/* Separator between categories and rate filters */}
      {onSalaryFilterChange && (
        <>
          <div
            style={{
              width: '1px',
              height: '20px',
              background: ui.border,
              margin: '0 4px',
              flexShrink: 0,
              opacity: 0.6,
            }}
          />
          {SALARY_PILLS.map((pill) => {
            const isSelected = salaryFilter === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => onSalaryFilterChange(pill.id)}
                style={{
                  flexShrink: 0,
                  pointerEvents: 'auto',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: `1.5px solid ${isSelected ? '#10b981' : ui.border}`,
                  background: isSelected ? 'rgba(16, 185, 129, 0.2)' : ui.surfaceAlpha,
                  backdropFilter: 'blur(6px)',
                  color: isSelected ? '#10b981' : ui.textMuted,
                  fontSize: '12px',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap',
                  boxShadow: isSelected ? '0 0 12px rgba(16, 185, 129, 0.35)' : ui.shadow,
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{pill.icon}</span>
                <span>{pill.label}</span>
              </button>
            );
          })}
        </>
      )}
    </div>
  );
}

export default CategoryFilterBar;
export { CategoryFilterBar as CategoryFilter };
