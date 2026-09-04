'use client';

import React from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { X, MapPin, MessageSquare, Phone, ExternalLink, ShieldCheck, Calculator } from 'lucide-react';
import type { DisplayAnnouncement } from '@/lib/types/display';
import type { MaskedAnnouncement } from '@/lib/types/announcement';
import { getAnnouncementExternalUrl, triggerHaptic } from '@/lib/utils';
import { playUiSound } from '@/lib/motion/soundEngine';
import { SPRING_PRESETS } from '@/lib/motion/springs';
import { OlxLinkActions } from '@/components/olx/OlxLinkActions';
import AnnouncementDetail from '@/components/list/AnnouncementDetail';

export interface AnnouncementMobileDrawerProps {
  announcement: DisplayAnnouncement | MaskedAnnouncement | null;
  isOpen: boolean;
  onClose: () => void;
  onShowOnMap?: () => void;
  onOpenPitchGenerator?: () => void;
  onOpenTimeline?: () => void;
}

/**
 * AnnouncementMobileDrawer - Native iOS/Android style Bottom Sheet
 * Features physical drag handles, snap dismissal, and full trade details.
 */
export function AnnouncementMobileDrawer({
  announcement,
  isOpen,
  onClose,
  onShowOnMap,
  onOpenPitchGenerator,
  onOpenTimeline,
}: AnnouncementMobileDrawerProps) {
  if (!announcement) return null;

  const handleDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 140 || info.velocity.y > 600) {
      playUiSound('whoosh');
      triggerHaptic(10);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => {
              playUiSound('whoosh');
              onClose();
            }}
          />

          {/* Draggable Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            transition={SPRING_PRESETS.smooth}
            className="relative z-10 w-full max-h-[88vh] bg-card border-t border-border/80 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden text-card-foreground select-none"
          >
            {/* Grabber Handle */}
            <div className="w-full flex items-center justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1.5 rounded-full bg-muted-foreground/35" />
            </div>

            {/* Header info */}
            <div className="px-4 py-2 flex items-center justify-between border-b border-border/50">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 shrink-0">
                  {announcement.source_portal || 'OLX'}
                </span>
                <span className="text-xs font-semibold text-muted-foreground truncate">
                  {announcement.location_text}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  playUiSound('pop');
                  onClose();
                }}
                className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Zamknij"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable details */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              <AnnouncementDetail
                announcement={announcement as unknown as MaskedAnnouncement}
                tier="premium"
              />
            </div>

            {/* Fixed Bottom Action Bar above navigation */}
            <div className="p-3 bg-card border-t border-border/60 space-y-2 pb-5">
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
                    <span>Na mapie</span>
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
        </div>
      )}
    </AnimatePresence>
  );
}
