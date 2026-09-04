'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Scale, ExternalLink, Check, Phone, MapPin, Wrench, ShieldCheck } from 'lucide-react';
import type { DisplayAnnouncement } from '@/lib/types/display';
import { getAnnouncementExternalUrl } from '@/lib/utils';
import { calculateNetSalary } from '@/lib/salary/calculator';
import { Button } from '@/components/ui/button';

export interface JobComparisonModalProps {
  ads: DisplayAnnouncement[];
  isOpen: boolean;
  onClose: () => void;
  onRemoveFromComparison: (id: string) => void;
}

export function JobComparisonModal({
  ads,
  isOpen,
  onClose,
  onRemoveFromComparison,
}: JobComparisonModalProps) {
  if (!isOpen || ads.length === 0) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-5xl max-h-[90vh] bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 text-card-foreground"
        >
          {/* Modal Header */}
          <div className="p-4 md:p-6 glass border-b border-border/50 flex items-center justify-between bg-card/90">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-primary/10 text-primary">
                <Scale className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg md:text-xl font-black text-foreground">Porównywarka Ofert Budowlanych</h2>
                <p className="text-xs text-muted-foreground">Porównujesz {ads.length} z 3 dostępnych ofert</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground border border-border/60 transition-colors"
              aria-label="Zamknij porównywarkę"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Comparison Grid */}
          <div className="p-4 md:p-6 overflow-x-auto flex-1">
            <div className={`grid grid-cols-${ads.length} gap-4 min-w-[600px]`}>
              {ads.map((ad) => {
                const netBreakdown = typeof ad.price === 'number' ? calculateNetSalary(ad.price) : null;
                const safeUrl = getAnnouncementExternalUrl(ad);

                return (
                  <div
                    key={ad.id}
                    className="flex flex-col justify-between p-4 rounded-xl border border-border/60 bg-background/60 space-y-4 shadow-sm relative group"
                  >
                    <button
                      onClick={() => onRemoveFromComparison(ad.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Usuń z porównywarki"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="space-y-3">
                      {/* Portal & Category Badge */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          {ad.source_portal}
                        </span>
                        <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded border border-border">
                          {ad.category}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="font-bold text-sm text-foreground leading-snug line-clamp-2">
                        {ad.title}
                      </h3>

                      {/* Price & Net Salary */}
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                        <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                          {typeof ad.price === 'number' ? `${ad.price.toLocaleString('pl-PL')} zł/mies.` : ad.price || 'Do uzgodnienia'}
                        </div>
                        {netBreakdown && (
                          <div className="text-[10px] text-muted-foreground font-semibold">
                            ~{netBreakdown.uopNet.toLocaleString('pl-PL')} zł netto na rękę (UoP)
                          </div>
                        )}
                      </div>

                      {/* Location */}
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{ad.location_text}</span>
                      </div>

                      {/* Equipment & Benefits */}
                      {ad.traits && (
                        <div className="space-y-1.5 pt-2 border-t border-border/40">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                            <Wrench className="w-3 h-3 text-primary" /> Sprzęt i korzyści:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {ad.traits.equipment_detected?.map((eq, i) => (
                              <span key={i} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                                🛠️ {eq.name}
                              </span>
                            ))}
                            {ad.traits.accommodation_provided && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                                🏠 Nocleg
                              </span>
                            )}
                            {ad.traits.transport_provided && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                                🚌 Transport
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Contact Phone */}
                      {ad.phone && (
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 pt-1">
                          <Phone className="w-3.5 h-3.5" /> {ad.phone}
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <Button asChild size="sm" className="w-full text-xs font-extrabold gap-1.5 shadow-md">
                      <a href={safeUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3.5 h-3.5" /> Aplikuj na {ad.source_portal}
                      </a>
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
