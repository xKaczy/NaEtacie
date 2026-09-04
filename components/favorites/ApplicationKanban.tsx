'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Kanban,
  CheckCircle2,
  Clock,
  Briefcase,
  Send,
  Sparkles,
  ExternalLink,
  MapPin,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, triggerHaptic, getAnnouncementExternalUrl } from '@/lib/utils';
import type { DisplayAnnouncement } from '@/lib/types/display';
import { useToast } from '@/components/feedback/ToastProvider';
import { STATUS_META, type ApplicationStatus, type TrackedApplication } from '@/lib/hooks/useApplicationTracking';
import { Phone, MessageSquare, FileEdit } from 'lucide-react';
import { getQuickSmsHref } from '@/lib/geo/transitRouting';

export type ApplicationStage = ApplicationStatus;

export interface ApplicationKanbanProps {
  favoriteAds: DisplayAnnouncement[];
  tracked?: Record<string, TrackedApplication>;
  onSetStatus?: (id: string, status: ApplicationStatus, note?: string) => void;
  onShowOnMap: (id: string) => void;
  onQuickView: (ad: DisplayAnnouncement) => void;
  onOpenTimeline?: (ad: DisplayAnnouncement) => void;
}

const COLUMNS: { id: ApplicationStage; title: string; color: string; icon: React.ElementType }[] = [
  { id: 'saved', title: 'Zapisane', color: 'border-blue-500/30 text-blue-500 bg-blue-500/10', icon: Briefcase },
  { id: 'applied', title: 'Aplikowano', color: 'border-amber-500/30 text-amber-500 bg-amber-500/10', icon: Send },
  { id: 'interview', title: 'Rozmowa', color: 'border-purple-500/30 text-purple-500 bg-purple-500/10', icon: Clock },
  { id: 'offer', title: 'Oferta / Start', color: 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10', icon: CheckCircle2 },
];

export function ApplicationKanban({
  favoriteAds,
  tracked = {},
  onSetStatus,
  onShowOnMap,
  onQuickView,
  onOpenTimeline,
}: ApplicationKanbanProps) {
  const { show: showToast } = useToast();
  
  // Track stage per announcement ID (synced with central tracked applications)
  const [localStages, setLocalStages] = useState<Record<string, ApplicationStage>>({});

  const getStage = (adId: string): ApplicationStage => {
    if (tracked[adId]?.status) {
      const s = tracked[adId].status;
      if (s === 'rejected') return 'saved';
      return s;
    }
    return localStages[adId] || 'saved';
  };

  const moveStage = (ad: DisplayAnnouncement, direction: 'next' | 'prev') => {
    triggerHaptic(10);
    const order: ApplicationStage[] = ['saved', 'applied', 'interview', 'offer'];
    const current = getStage(ad.id);
    const currentIndex = order.indexOf(current);

    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= order.length) nextIndex = order.length - 1;

    const nextStage = order[nextIndex];
    setLocalStages((prev) => ({ ...prev, [ad.id]: nextStage }));

    if (onSetStatus) {
      onSetStatus(ad.id, nextStage, tracked[ad.id]?.note || '');
    }

    const colName = COLUMNS.find((c) => c.id === nextStage)?.title;
    showToast('info', `Przeniesiono do: ${colName}`);
  };

  return (
    <div className="space-y-4">
      {/* Kanban Board Container */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const Icon = col.icon;
          const itemsInCol = favoriteAds.filter((ad) => getStage(ad.id) === col.id);

          return (
            <div
              key={col.id}
              className="bg-card/60 backdrop-blur-md border border-border/60 rounded-2xl p-3 flex flex-col min-h-[440px] shadow-xs"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between p-2 mb-2 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <div className={cn('p-1.5 rounded-lg border text-xs font-bold', col.color)}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-black text-foreground uppercase tracking-wider">{col.title}</h3>
                </div>
                <Badge variant="secondary" className="font-extrabold text-[10px]">
                  {itemsInCol.length}
                </Badge>
              </div>

              {/* Items in Column */}
              <div className="space-y-2.5 flex-1 overflow-y-auto no-scrollbar">
                <AnimatePresence>
                  {itemsInCol.length === 0 ? (
                    <div className="h-32 flex items-center justify-center text-center p-4 border border-dashed border-border/40 rounded-xl text-muted-foreground text-[11px] font-medium">
                      Brak ofert na tym etapie
                    </div>
                  ) : (
                    itemsInCol.map((ad) => {
                      const externalUrl = getAnnouncementExternalUrl(ad);
                      const currentStage = getStage(ad.id);
                      const appData = tracked[ad.id];
                      const cleanPhone = ad.phone ? ad.phone.replace(/\D/g, '') : null;

                      return (
                        <motion.div
                          key={ad.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-card border border-border/70 rounded-xl p-3.5 space-y-2.5 shadow-xs hover:border-primary/40 transition-all text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className="font-bold text-foreground line-clamp-2 hover:text-primary transition-colors cursor-pointer"
                              onClick={() => onQuickView(ad)}
                            >
                              {ad.title}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                              {ad.price ? (typeof ad.price === 'number' ? `${ad.price.toLocaleString('pl-PL')} zł` : ad.price) : 'Brak kwoty'}
                            </span>
                            <span className="capitalize text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border/50">
                              {ad.source_portal || 'OLX'}
                            </span>
                          </div>

                          {/* Candidate Note Preview or Add Note Prompt */}
                          {appData?.note ? (
                            <div
                              onClick={() => onOpenTimeline?.(ad)}
                              className="p-2 rounded-lg bg-muted/40 border border-border/50 text-[11px] text-muted-foreground italic line-clamp-2 cursor-pointer hover:bg-muted/70 transition-colors flex items-start gap-1.5"
                              title="Kliknij, aby edytować notatkę"
                            >
                              <FileEdit className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                              <span>{appData.note}</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onOpenTimeline?.(ad)}
                              className="text-[10px] font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <FileEdit className="w-3 h-3" />
                              <span>Dodaj notatkę z ustaleń...</span>
                            </button>
                          )}

                          {/* Quick 1-Tap Call & SMS Bar */}
                          {cleanPhone && (
                            <div className="grid grid-cols-2 gap-1.5 pt-1">
                              <a
                                href={`tel:+48${cleanPhone}`}
                                onClick={() => {
                                  triggerHaptic(15);
                                  if (currentStage === 'saved' && onSetStatus) {
                                    onSetStatus(ad.id, 'applied', appData?.note || '');
                                  }
                                }}
                                className="flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-500/20 transition-all cursor-pointer"
                                title="Zadzwoń do pracodawcy"
                              >
                                <Phone className="w-3 h-3" />
                                <span>Zadzwoń</span>
                              </a>
                              <a
                                href={getQuickSmsHref({ phone: ad.phone, title: ad.title, district: ad.location_text }) || `sms:+48${cleanPhone}`}
                                onClick={() => {
                                  triggerHaptic(15);
                                  if (currentStage === 'saved' && onSetStatus) {
                                    onSetStatus(ad.id, 'applied', appData?.note || '');
                                  }
                                }}
                                className="flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-sky-600/15 hover:bg-sky-600/25 text-sky-600 dark:text-sky-400 font-bold text-[10px] border border-sky-500/20 transition-all cursor-pointer"
                                title="Szybki SMS"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>SMS</span>
                              </a>
                            </div>
                          )}

                          {/* Controls to move columns */}
                          <div className="flex items-center justify-between pt-2 border-t border-border/40">
                            <button
                              onClick={() => moveStage(ad, 'prev')}
                              disabled={currentStage === 'saved'}
                              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 cursor-pointer"
                              title="Cofnij etap"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => onShowOnMap(ad.id)}
                                className="text-[10px] font-bold text-muted-foreground hover:text-primary flex items-center gap-0.5 cursor-pointer"
                              >
                                <MapPin className="w-3 h-3 text-emerald-500" />
                                <span>Mapa</span>
                              </button>

                              <a
                                href={externalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5"
                              >
                                <span>Oferta</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>

                            <button
                              onClick={() => moveStage(ad, 'next')}
                              disabled={currentStage === 'offer'}
                              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 cursor-pointer"
                              title="Następny etap"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
