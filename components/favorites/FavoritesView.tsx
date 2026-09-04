'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  ExternalLink,
  MapPin,
  Sparkles,
  TrendingUp,
  Download,
  Trash2,
  SlidersHorizontal,
  Search,
  ArrowUpDown,
  Building2,
  Briefcase,
  FileText,
  Bot,
  Layers,
  Map as MapIcon,
  CheckCircle2,
  LayoutGrid,
  Kanban,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, triggerHaptic, exportApplicationsToCSV, getAnnouncementExternalUrl, formatShortPrice } from '@/lib/utils';
import type { DisplayAnnouncement } from '@/lib/types/display';
import { useToast } from '@/components/feedback/ToastProvider';
import { ApplicationKanban } from './ApplicationKanban';

import type { ApplicationStatus, TrackedApplication } from '@/lib/hooks/useApplicationTracking';

export interface FavoritesViewProps {
  favoriteAds: DisplayAnnouncement[];
  tracked?: Record<string, TrackedApplication>;
  onSetStatus?: (id: string, status: ApplicationStatus, note?: string) => void;
  onOpenTimeline?: (ad: DisplayAnnouncement) => void;
  onToggleFavorite: (id: string) => void;
  onShowOnMap: (id: string) => void;
  onQuickView: (ad: DisplayAnnouncement) => void;
  onOpenAiInterview?: (ad: DisplayAnnouncement) => void;
  onOpenSalaryBenchmark?: (ad: DisplayAnnouncement) => void;
  onOpenCvGenerator?: (ad: DisplayAnnouncement) => void;
  onCompare?: (ads: DisplayAnnouncement[]) => void;
  onGoToBrowse?: () => void;
}

export function FavoritesView({
  favoriteAds,
  tracked = {},
  onSetStatus,
  onOpenTimeline,
  onToggleFavorite,
  onShowOnMap,
  onQuickView,
  onOpenAiInterview,
  onOpenSalaryBenchmark,
  onOpenCvGenerator,
  onCompare,
  onGoToBrowse,
}: FavoritesViewProps) {
  const { show: showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'price-desc' | 'price-asc'>('newest');
  const [selectedIdsForCompare, setSelectedIdsForCompare] = useState<Set<string>>(new Set());

  const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('grid');

  // Calculations & Analytics
  const stats = useMemo(() => {
    if (favoriteAds.length === 0) return { avgSalary: 0, topCategory: 'Brak', count: 0 };
    
    const numericPrices = favoriteAds
      .map((a) => (typeof a.price === 'number' ? a.price : parseFloat(String(a.price || '0')) || null))
      .filter((p): p is number => p !== null && p > 0);

    const avgSalary = numericPrices.length > 0
      ? Math.round(numericPrices.reduce((sum, p) => sum + p, 0) / numericPrices.length)
      : 0;

    const categoriesCount: Record<string, number> = {};
    favoriteAds.forEach((a) => {
      const cat = a.category || 'Inne';
      categoriesCount[cat] = (categoriesCount[cat] || 0) + 1;
    });

    const topCategory = Object.entries(categoriesCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Budowa';

    return {
      avgSalary,
      topCategory,
      count: favoriteAds.length,
    };
  }, [favoriteAds]);

  // Filtering & Sorting
  const filteredAds = useMemo(() => {
    let result = [...favoriteAds];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.location_text.toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== 'all') {
      result = result.filter((a) => (a.category || '').toLowerCase() === categoryFilter.toLowerCase());
    }

    result.sort((a, b) => {
      if (sortBy === 'newest') {
        const ta = a.scraped_at ? new Date(a.scraped_at).getTime() : 0;
        const tb = b.scraped_at ? new Date(b.scraped_at).getTime() : 0;
        return tb - ta;
      }
      const pa = typeof a.price === 'number' ? a.price : parseFloat(String(a.price || '0')) || 0;
      const pb = typeof b.price === 'number' ? b.price : parseFloat(String(b.price || '0')) || 0;
      if (sortBy === 'price-desc') return pb - pa;
      return pa - pb;
    });

    return result;
  }, [favoriteAds, searchQuery, categoryFilter, sortBy]);

  const toggleSelectForCompare = (id: string) => {
    triggerHaptic(10);
    const next = new Set(selectedIdsForCompare);
    if (next.has(id)) {
      next.delete(id);
    } else {
      if (next.size >= 3) {
        showToast('error', 'Możesz porównać maksymalnie 3 oferty jednocześnie.');
        return;
      }
      next.add(id);
    }
    setSelectedIdsForCompare(next);
  };

  const handleExportCSV = () => {
    triggerHaptic(15);
    exportApplicationsToCSV(favoriteAds, () => 'Zapisano w Ulubionych');
    showToast('success', 'Pobrano plik CSV z Ulubionymi Ofertami!');
  };

  const handleCompareClick = () => {
    if (selectedIdsForCompare.size < 2) {
      showToast('error', 'Zaznacz co najmniej 2 oferty, aby je porównać.');
      return;
    }
    const selected = favoriteAds.filter((a) => selectedIdsForCompare.has(a.id));
    if (onCompare) onCompare(selected);
  };

  if (favoriteAds.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-inner"
        >
          <Heart className="w-10 h-10 animate-pulse fill-red-500/20" />
        </motion.div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-foreground tracking-tight">Brak Ulubionych Ofert</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Nie dodałeś jeszcze żadnego ogłoszenia do ulubionych. Kliknij ikonę serduszka (`❤️`) przy jakiejkolwiek ofercie na liście lub mapie 3D, aby zapisać ją na później!
          </p>
        </div>
        {onGoToBrowse && (
          <Button onClick={onGoToBrowse} size="lg" className="gap-2 font-bold shadow-lg cursor-pointer">
            <Search className="w-4 h-4" /> Przeglądaj Oferty Pracy
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-500 shadow-sm">
            <Heart className="w-6 h-6 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-foreground tracking-tight">Twoje Ulubione Oferty</h1>
              <Badge variant="secondary" className="font-extrabold text-xs px-2.5 py-0.5 bg-red-500/10 text-red-500 border border-red-500/20">
                {favoriteAds.length}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Zapisane ogłoszenia, porównywarka i asystent aplikacyjny AI</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode switcher */}
          <div className="flex items-center bg-accent/40 border border-border/50 rounded-xl p-0.5 text-xs">
            <button
              onClick={() => { triggerHaptic(10); setViewMode('grid'); }}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer',
                viewMode === 'grid' ? 'bg-card text-primary shadow-xs' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Lista
            </button>
            <button
              onClick={() => { triggerHaptic(10); setViewMode('kanban'); }}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer',
                viewMode === 'kanban' ? 'bg-card text-primary shadow-xs' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Kanban className="w-3.5 h-3.5" /> Tablica Kanban
            </button>
          </div>

          {selectedIdsForCompare.size >= 2 && (
            <Button onClick={handleCompareClick} variant="default" size="sm" className="gap-1.5 text-xs font-bold shadow-md animate-bounce">
              <Layers className="w-4 h-4" /> Porównaj ({selectedIdsForCompare.size})
            </Button>
          )}
          <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
            <Download className="w-4 h-4 text-primary" /> Eksportuj (CSV)
          </Button>
        </div>
      </div>

      {/* Conditional Rendering: Kanban vs Grid View */}
      {viewMode === 'kanban' ? (
        <ApplicationKanban
          favoriteAds={filteredAds}
          tracked={tracked}
          onSetStatus={onSetStatus}
          onShowOnMap={onShowOnMap}
          onQuickView={onQuickView}
          onOpenTimeline={onOpenTimeline}
        />
      ) : (
        <>

      {/* Analytical Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card/70 backdrop-blur-md border border-border/60 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Średnia stawka w Ulubionych</span>
            <div className="text-lg font-black text-foreground">
              {stats.avgSalary > 0 ? `${stats.avgSalary.toLocaleString('pl-PL')} zł/mies.` : 'Brak podanych stawek'}
            </div>
          </div>
        </div>

        <div className="bg-card/70 backdrop-blur-md border border-border/60 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Dominująca kategoria</span>
            <div className="text-lg font-black text-foreground capitalize">{stats.topCategory}</div>
          </div>
        </div>

        <div className="bg-card/70 backdrop-blur-md border border-border/60 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Gotowe do aplikacji</span>
            <div className="text-lg font-black text-foreground">{favoriteAds.length} ofert przygotowanych</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card border border-border/60 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-muted-foreground ml-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj w ulubionych..."
            className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-xs text-muted-foreground hover:text-foreground mr-2">
              ×
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Category Chips */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-xs">
            {['all', 'budowa', 'instalacje', 'wykończenia'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-xl font-bold capitalize transition-all cursor-pointer',
                  categoryFilter === cat
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-accent/40 text-muted-foreground hover:text-foreground'
                )}
              >
                {cat === 'all' ? 'Wszystkie' : cat}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-accent/40 border border-border/50 rounded-xl px-2.5 py-1 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
            >
              <option value="newest">Najnowsze</option>
              <option value="price-desc">Najwyższa stawka</option>
              <option value="price-asc">Najniższa stawka</option>
            </select>
          </div>
        </div>
      </div>

      {/* Favorite Offers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {filteredAds.map((ad) => {
            const isSelectedForCompare = selectedIdsForCompare.has(ad.id);
            const externalUrl = getAnnouncementExternalUrl(ad);

            return (
              <motion.div
                key={ad.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'bg-card border rounded-2xl p-5 space-y-4 shadow-sm hover:shadow-md transition-all relative flex flex-col justify-between',
                  isSelectedForCompare ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border/60 hover:border-primary/40'
                )}
              >
                {/* Card Top */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                        {ad.source_portal || 'OLX'}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] font-bold">
                        {ad.category || 'Budowa'}
                      </Badge>
                      {ad.price && (
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          {typeof ad.price === 'number' ? `${ad.price.toLocaleString('pl-PL')} zł` : ad.price}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => toggleSelectForCompare(ad.id)}
                        className={cn(
                          'p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer',
                          isSelectedForCompare
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-accent/40 border-border/50 text-muted-foreground hover:bg-accent'
                        )}
                        title="Zaznacz do porównania"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          triggerHaptic(10);
                          onToggleFavorite(ad.id);
                          showToast('info', 'Usunięto z ulubionych');
                        }}
                        className="p-1.5 rounded-lg text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-colors cursor-pointer"
                        title="Usuń z ulubionych"
                      >
                        <Heart className="w-4 h-4 fill-current" />
                      </button>
                    </div>
                  </div>

                  <h3
                    onClick={() => onQuickView(ad)}
                    className="text-base font-bold text-foreground leading-snug hover:text-primary transition-colors cursor-pointer"
                  >
                    {ad.title}
                  </h3>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{ad.description}</p>
                </div>

                {/* Card Location & Actions */}
                <div className="pt-3 border-t border-border/40 space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-semibold text-foreground">
                      <MapPin className="w-3.5 h-3.5 text-primary" /> {ad.location_text || 'Szczecin'}
                    </span>
                    {ad.company && <span className="font-medium">{ad.company}</span>}
                  </div>

                  {/* AI & Interactive Tool Buttons */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {onOpenCvGenerator && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenCvGenerator(ad)}
                        className="gap-1 text-[11px] font-semibold h-8"
                      >
                        <FileText className="w-3.5 h-3.5 text-primary" /> List Motywacyjny AI
                      </Button>
                    )}

                    {onOpenAiInterview && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenAiInterview(ad)}
                        className="gap-1 text-[11px] font-semibold h-8"
                      >
                        <Bot className="w-3.5 h-3.5 text-purple-500" /> Symulator Rozmowy
                      </Button>
                    )}
                  </div>

                  {/* Direct Action Link */}
                  <div className="flex items-center gap-2">
                    <a
                      href={externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-primary text-primary-foreground text-xs font-bold rounded-xl active:scale-95 transition-all shadow-xs hover:bg-primary/90 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Otwórz Ofertę ({ad.source_portal || 'OLX'})
                    </a>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onShowOnMap(ad.id)}
                      className="gap-1 text-xs font-semibold h-9"
                    >
                      <MapIcon className="w-3.5 h-3.5 text-primary" /> Na Mapie
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      </>
      )}
    </div>
  );
}
