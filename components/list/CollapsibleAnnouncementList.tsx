'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  List,
  ChevronDown,
  ChevronUp,
  Layers,
  Globe,
  Sparkles,
  MapPin,
  TrendingUp,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, triggerHaptic } from '@/lib/utils';

export type GroupByMode = 'flat' | 'category' | 'portal' | 'trade';

export interface CollapsibleAnnouncementListProps<
  T extends {
    id: string;
    category?: string;
    source_portal?: string;
    price?: number | string | null;
    traits?: { trade_tags?: string[] };
  }
> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  title?: string;
  defaultCollapsed?: boolean;
  className?: string;
  onRefresh?: () => Promise<void>;
  enableGrouping?: boolean;
}

/**
 * Computes average price from numeric prices in items array.
 */
export function computeAverageSalary<T extends { price?: number | string | null }>(items: T[]): number | null {
  const numericPrices = items
    .map((item) => (typeof item.price === 'number' ? item.price : null))
    .filter((price): price is number => price !== null && price > 0);

  if (numericPrices.length === 0) return null;
  const sum = numericPrices.reduce((acc, curr) => acc + curr, 0);
  return Math.round(sum / numericPrices.length);
}

/**
 * Advanced Collapsible Announcement List (Zwijana Lista Ofert)
 * 
 * Features:
 * - WAI-ARIA Accordion standard compliance (role, aria-expanded, aria-controls, keyboard navigation)
 * - Glassmorphism UI & Framer Motion spring physics animations
 * - Grouping Modes: Flat, By Category, By Source Portal (with sub-collapsible headers)
 * - Live stats summary: Average salary badge, item counter
 * - LocalStorage state persistence for collapse state & group mode
 * - Haptic feedback integration & reduced motion support
 */
export default function CollapsibleAnnouncementList<
  T extends {
    id: string;
    category?: string;
    source_portal?: string;
    price?: number | string | null;
    traits?: { trade_tags?: string[] };
  }
>({
  items,
  renderItem,
  isLoading = false,
  emptyState,
  title = 'Zwijana Lista Ofert',
  defaultCollapsed = false,
  className,
  enableGrouping = true,
}: CollapsibleAnnouncementListProps<T>) {
  const prefersReducedMotion = useReducedMotion();

  // LocalStorage state persistence
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('naetacie_list_collapsed');
      if (saved !== null) return saved === 'true';
    }
    return defaultCollapsed;
  });

  const [groupBy, setGroupBy] = useState<GroupByMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('naetacie_list_group_by');
      if (saved === 'flat' || saved === 'category' || saved === 'portal' || saved === 'trade') return saved;
    }
    return 'flat';
  });

  // Track collapsed state for individual group sections
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('naetacie_list_collapsed', String(isCollapsed));
    }
  }, [isCollapsed]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('naetacie_list_group_by', groupBy);
    }
  }, [groupBy]);

  const toggleMainCollapse = useCallback(() => {
    triggerHaptic(10);
    setIsCollapsed((prev) => !prev);
  }, []);

  const toggleGroupCollapse = useCallback((groupKey: string) => {
    triggerHaptic(8);
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  }, []);

  const handleKeyDownHeader = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleMainCollapse();
    }
  };

  // Live average salary calculation
  const avgSalary = useMemo(() => computeAverageSalary(items), [items]);

  // Grouping logic
  const groupedItems = useMemo(() => {
    if (groupBy === 'flat') {
      return { Wszystkie: items };
    }

    const groups: Record<string, T[]> = {};
    for (const item of items) {
      if (groupBy === 'trade') {
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
      } else {
        let key = 'Inne';
        if (groupBy === 'category') {
          key = item.category?.trim() || 'Ogólne budowlane';
        } else if (groupBy === 'portal') {
          key = item.source_portal?.toUpperCase() || 'BEZPOŚREDNIE';
        }
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      }
    }
    return groups;
  }, [items, groupBy]);

  return (
    <div className={cn('w-full space-y-2 select-none', className)}>
      {/* Prominent Collapsible List Accordion Toggle Bar */}
      <div
        id="collapsible-announcement-header"
        role="button"
        tabIndex={0}
        aria-expanded={!isCollapsed}
        aria-controls="collapsible-announcement-content"
        onKeyDown={handleKeyDownHeader}
        onClick={toggleMainCollapse}
        className={cn(
          'mx-2 sm:mx-4 my-1 sm:my-2 px-2.5 sm:px-4 py-2 sm:py-3 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2.5',
          'bg-card/95 dark:bg-slate-900/95 border border-primary/30 hover:border-primary/60',
          'rounded-xl sm:rounded-2xl shadow-xl backdrop-blur-2xl transition-all duration-200 cursor-pointer glass group active:scale-[0.985] touch-manipulation'
        )}
      >
        {/* Left Side: Icon, Title, Counter */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-primary/15 text-primary group-hover:scale-110 transition-transform shrink-0">
            <List className="w-4 h-4 text-primary" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5 min-w-0">
            <span className="text-xs sm:text-sm font-black text-foreground tracking-tight flex items-center gap-1.5 truncate">
              {title}
              <span className="text-[10px] sm:text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                {items.length} {items.length === 1 ? 'oferta' : 'ofert'}
              </span>
            </span>

            {/* Stats Summary: Avg Salary */}
            {avgSalary && (
              <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 bg-muted/70 px-2 py-0.5 rounded-lg shrink-0">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                Śr. <strong className="text-foreground">{avgSalary.toLocaleString('pl-PL')} zł</strong>
              </span>
            )}
          </div>
        </div>

        {/* Right Side: Grouping selector & Toggle Button */}
        <div className="flex items-center gap-1.5 sm:gap-2" onClick={(e) => e.stopPropagation()}>
          {enableGrouping && !isCollapsed && (
            <div className="flex items-center bg-muted/90 p-0.5 rounded-xl border border-border/60 text-[10px] font-extrabold shadow-inner">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(8);
                  setGroupBy('flat');
                }}
                className={cn(
                  'px-2 py-1 rounded-lg transition-all flex items-center gap-1 active:scale-95 touch-manipulation',
                  groupBy === 'flat' ? 'bg-background text-primary shadow-xs font-black' : 'text-muted-foreground hover:text-foreground'
                )}
                title="Płaska lista"
              >
                <List className="w-3.5 h-3.5" />
                <span className="inline text-[10px]">Wszystkie</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic(8);
                  setGroupBy('category');
                }}
                className={cn(
                  'px-2 py-1 rounded-lg transition-all flex items-center gap-1 active:scale-95 touch-manipulation',
                  groupBy === 'category' ? 'bg-background text-primary shadow-xs font-black' : 'text-muted-foreground hover:text-foreground'
                )}
                title="Grupuj według kategorii"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[10px]">Kategorie</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic(8);
                  setGroupBy('trade');
                }}
                className={cn(
                  'px-2 py-1 rounded-lg transition-all flex items-center gap-1 active:scale-95 touch-manipulation',
                  groupBy === 'trade' ? 'bg-background text-amber-500 shadow-xs font-black' : 'text-muted-foreground hover:text-foreground'
                )}
                title="Grupuj według branży budowlanej (Trade Tags)"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[10px]">Branże</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic(8);
                  setGroupBy('portal');
                }}
                className={cn(
                  'px-2 py-1 rounded-lg transition-all flex items-center gap-1 active:scale-95 touch-manipulation',
                  groupBy === 'portal' ? 'bg-background text-primary shadow-xs font-black' : 'text-muted-foreground hover:text-foreground'
                )}
                title="Grupuj według portalu"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[10px]">Portale</span>
              </button>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMainCollapse}
            className="gap-1 text-xs font-extrabold text-primary hover:bg-primary/10 rounded-xl h-8 px-2.5 cursor-pointer active:scale-95"
            aria-label={isCollapsed ? 'Rozwiń listę' : 'Zwiń listę'}
          >
            <span className="text-xs font-black">{isCollapsed ? 'Rozwiń' : 'Zwiń'}</span>
            <motion.div
              animate={{ rotate: isCollapsed ? 0 : 180 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.25 }}
            >
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </Button>
        </div>
      </div>

      {/* Main List Content (Animated Accordion Body) */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            id="collapsible-announcement-content"
            role="region"
            aria-labelledby="collapsible-announcement-header"
            initial={prefersReducedMotion ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 32 }}
            className="overflow-hidden"
          >
            {items.length === 0 && !isLoading ? (
              emptyState || (
                <div className="p-8 text-center bg-card/40 rounded-2xl mx-4 my-2 border border-border/50">
                  <MapPin className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-muted-foreground">Brak ogłoszeń na liście</p>
                </div>
              )
            ) : (
              <div className="px-4 py-2 space-y-4">
                {Object.entries(groupedItems).map(([groupName, groupList]) => {
                  const isGroupCollapsed = collapsedGroups[groupName] || false;

                  return (
                    <div key={groupName} className="space-y-2">
                      {/* Sub-accordion Header for Category/Portal grouping */}
                      {groupBy !== 'flat' && (
                        <button
                          type="button"
                          onClick={() => toggleGroupCollapse(groupName)}
                          className={cn(
                            'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold',
                            'bg-muted/60 hover:bg-muted/90 border border-border/40 transition-colors'
                          )}
                          aria-expanded={!isGroupCollapsed}
                        >
                          <span className="flex items-center gap-2 text-foreground font-extrabold">
                            <Sparkles className="w-3.5 h-3.5 text-primary" />
                            {groupName}
                            <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              {groupList.length}
                            </span>
                          </span>

                          <div className="flex items-center gap-1 text-muted-foreground text-[11px]">
                            <span>{isGroupCollapsed ? 'Rozwiń' : 'Zwiń'}</span>
                            {isGroupCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                          </div>
                        </button>
                      )}

                      {/* Render list items inside subgroup */}
                      <AnimatePresence initial={false}>
                        {(!isGroupCollapsed || groupBy === 'flat') && (
                          <motion.div
                            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-3"
                          >
                            {groupList.map((item, idx) => (
                              <React.Fragment key={item.id}>
                                {renderItem(item, idx)}
                              </React.Fragment>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
