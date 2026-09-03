'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, X, CheckCircle2, Send, Mail } from 'lucide-react';
import { triggerHaptic } from '@/lib/utils';

interface ReportAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  adId: string;
  adTitle: string;
  phone?: string | null;
}

export const ReportAdModal: React.FC<ReportAdModalProps> = ({
  isOpen,
  onClose,
  adId,
  adTitle,
  phone,
}) => {
  const [reason, setReason] = useState<string>('nieaktualne');
  const [userEmail, setUserEmail] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic(12);

    // Prepare mailto fallback link in case server is offline
    const mailSubject = encodeURIComponent(`[Zgłoszenie ogłoszenia] ID: ${adId} - ${adTitle.slice(0, 40)}`);
    const mailBody = encodeURIComponent(
      `ID Ogłoszenia: ${adId}\nTytuł: ${adTitle}\nPowód zgłoszenia: ${reason}\nTelefon w ogłoszeniu: ${phone || 'brak'}\nEmail kontaktowy zgłaszającego: ${userEmail}\nDodatkowe uwagi: ${details}\n`
    );

    // Save report in localStorage as audit trail
    try {
      const existing = JSON.parse(localStorage.getItem('naetacie_ad_reports') || '[]');
      existing.push({
        adId,
        adTitle,
        reason,
        userEmail,
        details,
        date: new Date().toISOString(),
      });
      localStorage.setItem('naetacie_ad_reports', JSON.stringify(existing));
    } catch { /* storage full */ }

    // Fire mailto if user requested removal or problem
    if (reason === 'rodo') {
      window.open(`mailto:kontakt@naetacie.pl?subject=${mailSubject}&body=${mailBody}`, '_blank');
    }

    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      onClose();
    }, 2200);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-100 shadow-2xl p-5 relative overflow-hidden"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {isSubmitted ? (
            <div className="py-6 flex flex-col items-center text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-white">Dziękujemy za zgłoszenie</h3>
              <p className="text-xs text-zinc-400 max-w-[240px]">
                Zgłoszenie zostało zarejestrowane. Zweryfikujemy to ogłoszenie w ciągu 24 godzin.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex items-center gap-2 text-rose-400">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="font-bold text-sm text-white">Zgłoś ogłoszenie lub błąd</h3>
              </div>

              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Ogłoszenie: <span className="text-zinc-200 font-semibold">{adTitle.slice(0, 50)}...</span>
              </p>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-300">Powód zgłoszenia:</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-rose-500"
                >
                  <option value="nieaktualne">Ogłoszenie jest już nieaktualne / 404</option>
                  <option value="rodo">To mój numer telefonu – żądam usunięcia (RODO)</option>
                  <option value="stawka">Błędna stawka lub lokalizacja</option>
                  <option value="oszustwo">Podejrzenie oszustwa / spamu</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-300">Twój e-mail (opcjonalnie do odpowiedzi):</label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="twoj-email@domena.pl"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-rose-500 placeholder:text-zinc-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-300">Szczegóły (opcjonalnie):</label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={2}
                  placeholder="Krótki opis problemu..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-rose-500 placeholder:text-zinc-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition-colors"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition-colors shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Wyślij zgłoszenie</span>
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
