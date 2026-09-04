'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ThumbsUp, ShieldCheck, Sparkles, X, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface Review {
  id: string;
  author: string;
  rating: number;
  trade: string;
  comment: string;
  date: string;
}

const INITIAL_REVIEWS: Review[] = [
  { id: 'r1', author: 'Grzegorz K.', rating: 5, trade: 'Elektryk', comment: 'Wypłata zawsze na czas, sprzęt i materiały pierwszej klasy. Polecam współpracę!', date: '3 dni temu' },
  { id: 'r2', author: 'Mariusz B.', rating: 5, trade: 'Glazurnik', comment: 'Świetny kierownik budowy, dobra atmosfera i brak opóźnień w rozliczeniach.', date: 'Tydzień temu' },
];

export interface EmployerReviewModalProps {
  companyName: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EmployerReviewModal({ companyName, isOpen, onClose }: EmployerReviewModalProps) {
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [newComment, setNewComment] = useState('');
  const [rating, setRating] = useState(5);

  if (!isOpen) return null;

  const targetName = companyName || 'BudMax Szczecin';

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const item: Review = {
      id: `r_${Date.now()}`,
      author: 'Anonimowy Wykonawca',
      rating,
      trade: 'Fachowiec',
      comment: newComment.trim(),
      date: 'Dzisiaj',
    };

    setReviews([item, ...reviews]);
    setNewComment('');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-lg bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden text-card-foreground p-5 space-y-4 my-8 relative max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/40 pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Star className="w-5 h-5 fill-amber-500" />
              </div>
              <div>
                <h3 className="text-sm font-black">Opinie o Pracodawcy / Ekipie</h3>
                <p className="text-[11px] text-muted-foreground truncate max-w-[280px]">
                  Firma: {targetName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Average Score */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/25 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-amber-500">4.9</span>
              <div className="space-y-0.5">
                <div className="flex text-amber-500">
                  {'★'.repeat(5)}
                </div>
                <p className="text-[10px] text-muted-foreground font-semibold">Na podstawie {reviews.length} opinii budowlańców</p>
              </div>
            </div>
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
          </div>

          {/* Review List */}
          <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
            {reviews.map((r) => (
              <div key={r.id} className="p-3 rounded-xl bg-muted/30 border border-border/40 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">{r.author} <span className="text-muted-foreground font-normal">({r.trade})</span></span>
                  <span className="text-amber-500 font-bold">{'★'.repeat(r.rating)}</span>
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">{r.comment}</p>
                <div className="text-[9px] text-muted-foreground pt-1">{r.date}</div>
              </div>
            ))}
          </div>

          {/* Add Review Form */}
          <form onSubmit={handleAddReview} className="space-y-2 pt-2 border-t border-border/40 shrink-0">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span>Dodaj własną opinię</span>
              <div className="flex gap-1 cursor-pointer">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`text-sm ${star <= rating ? 'text-amber-500' : 'text-muted-foreground'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <textarea
              placeholder="Napisz krótko o atmosferze, sprzęcie i terminowości wypłat..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="w-full text-xs p-2 rounded-md border border-input bg-transparent resize-none h-14 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button
              type="submit"
              className="w-full text-xs font-bold gap-1.5 h-8 bg-amber-500 hover:bg-amber-600 text-white shadow-xs cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Dodaj opinię weryfikowaną
            </Button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
