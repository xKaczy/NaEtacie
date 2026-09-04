'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  MapPin,
  Clock,
  Phone,
  MessageSquare,
  Calculator,
  ExternalLink,
  Bot,
  Wrench,
  Bus,
  ShieldCheck,
} from 'lucide-react';
import type { MaskedAnnouncement } from '@/lib/types/announcement';
import type { DisplayAnnouncement } from '@/lib/types/display';
import { getAnnouncementExternalUrl, triggerHaptic } from '@/lib/utils';
import { playUiSound } from '@/lib/motion/soundEngine';
import { SPRING_PRESETS } from '@/lib/motion/springs';
import { OlxLinkActions } from '@/components/olx/OlxLinkActions';
import AnnouncementDetail from '@/components/list/AnnouncementDetail';

export interface AnnouncementSlideOverProps {
  announcement: DisplayAnnouncement | MaskedAnnouncement | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenPitchGenerator?: () => void;
  onOpenEstimator?: () => void;
  onOpenAiInterview?: () => void;
  onShowOnMap?: () => void;
  onOpenTimeline?: () => void;
}

export function AnnouncementSlideOver({
  announcement,
  isOpen,
  onClose,
  onOpenPitchGenerator,
  onOpenEstimator,
  onOpenAiInterview,
  onShowOnMap,
  onOpenTimeline,
}: AnnouncementSlideOverProps) {
  if (!announcement) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Blur Dismiss Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs"
            onClick={() => {
              playUiSound('whoosh');
              onClose();
            }}
          />

          {/* Slide-Over Drawer Container */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={SPRING_PRESETS.smooth}
            className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[480px] lg:w-[540px] bg-card/98 backdrop-blur-2xl border-l border-border/80 shadow-2xl overflow-y-auto flex flex-col text-card-foreground select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Bar */}
            <div className="sticky top-0 z-20 flex items-center justify-between p-4 border-b border-border/60 bg-card/90 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                  {announcement.source_portal || 'OLX'}
                </span>
                <span className="text-xs text-muted-foreground font-semibold truncate max-w-[240px]">
                  {announcement.location_text}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  playUiSound('pop');
                  onClose();
                }}
                className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Zamknij podgląd"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-5 space-y-5 flex-1">
              <AnnouncementDetail
                announcement={announcement as unknown as MaskedAnnouncement}
                tier="premium"
              />
            </div>

            {/* Sticky Bottom Actions Bar */}
            <div className="sticky bottom-0 z-20 p-4 border-t border-border/60 bg-card/95 backdrop-blur-md space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <OlxLinkActions ad={announcement} variant="default" size="sm" className="w-full text-xs font-bold py-2.5 shadow-sm" />
                {onShowOnMap && (
                  <button
                    type="button"
                    onClick={() => {
                      playUiSound('pop');
                      triggerHaptic(10);
                      onShowOnMap();
                      onClose();
                    }}
                    className="py-2.5 px-3 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <MapPin className="w-4 h-4 text-primary" />
                    <span>Pokaż na mapie</span>
                  </button>
                )}
              </div>

              {onOpenTimeline && (
                <button
                  type="button"
                  onClick={() => {
                    playUiSound('pop');
                    triggerHaptic(10);
                    onOpenTimeline();
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>📋 Rejestr Aplikacji & Notatki Majstra</span>
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
