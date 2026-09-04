'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PaymentProductType, MONETIZATION_PRODUCTS } from '@/lib/billing/blikEngine';
import { BlikPaymentModal } from './BlikPaymentModal';
import { triggerHaptic } from '@/lib/utils';

interface ProTierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct?: (productType: PaymentProductType) => void;
}

export const ProTierModal: React.FC<ProTierModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<PaymentProductType>('PRO_MONTHLY_SUB');
  const [isBlikModalOpen, setIsBlikModalOpen] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleChoosePlan = (prodId: PaymentProductType) => {
    setSelectedProductId(prodId);
    triggerHaptic(15);
    setIsBlikModalOpen(true);
    if (onSelectProduct) {
      onSelectProduct(prodId);
    }
  };

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl bg-zinc-950 border border-amber-500/30 rounded-3xl p-6 sm:p-10 text-white shadow-2xl my-8"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              aria-label="Zamknij"
              className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-800/80 hover:bg-zinc-700 transition"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="text-center max-w-xl mx-auto mb-10">
              <span className="px-3 py-1 text-xs font-bold tracking-widest uppercase rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                EKOSYSTEM BIZNESOWY NA ETACIE
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight mt-3 text-white">
                Zdobądź przewagę na budowach w Szczecinie
              </h2>
              <p className="text-sm sm:text-base text-zinc-400 mt-2">
                Wybierz pakiet dla siebie lub swojej ekipy. Natychmiastowa aktywacja kodem BLIK z fakturą VAT 23%.
              </p>
            </div>

            {/* Pricing Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Plan 1: Free */}
              <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between">
                <div>
                  <div className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Darmowy Fachowiec</div>
                  <div className="text-3xl font-bold text-white mt-2">0 zł</div>
                  <p className="text-xs text-zinc-400 mt-1">Dostęp do podstawowej bazy zleceń</p>

                  <ul className="mt-6 space-y-3 text-xs text-zinc-300">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Widok mapy 3D Szczecina</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Wyszukiwarka ofert i kalkulator stawek</span>
                    </li>
                    <li className="flex items-center gap-2 text-zinc-500">
                      <svg className="w-4 h-4 text-zinc-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Oferty z 48h opóźnieniem</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full mt-6 py-2.5 px-4 rounded-xl text-xs font-bold text-zinc-400 bg-zinc-800 hover:bg-zinc-700 transition"
                >
                  Aktualny Plan
                </button>
              </div>

              {/* Plan 2: Majster PRO (Featured) */}
              <div className="relative p-6 rounded-2xl bg-gradient-to-b from-amber-500/10 via-zinc-900 to-zinc-900 border-2 border-amber-500 shadow-xl shadow-amber-500/10 flex flex-col justify-between transform md:-translate-y-2">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-zinc-950 font-extrabold text-[10px] tracking-wider uppercase shadow-md">
                  NAJCHĘTNIEJ WYBIERANY
                </div>

                <div>
                  <div className="text-sm font-bold text-amber-400 uppercase tracking-wider">Majster PRO</div>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-4xl font-extrabold text-white">79 zł</span>
                    <span className="text-xs text-zinc-400">/miesięcznie</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">Dla aktywnych majstrów i samodzielnych fachowców</p>

                  <ul className="mt-6 space-y-3 text-xs text-zinc-200">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-semibold text-white">Natychmiastowy dostęp (0 sekund opóźnienia)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Nielimitowane odkrywanie numerów telefonów</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Generator Umów Budowlanych PDF z podpisem</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Dostęp do zleceń &quot;Fachowiec SOS na Dziś&quot;</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => handleChoosePlan('PRO_MONTHLY_SUB')}
                  className="w-full mt-6 py-3 px-4 rounded-xl text-xs font-extrabold text-zinc-950 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 shadow-lg shadow-amber-500/25 transition transform active:scale-95"
                >
                  Aktywuj Majster PRO (BLIK)
                </button>
              </div>

              {/* Plan 3: Roczny Pakiet PRO */}
              <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Majster PRO (Rok)</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-300">-30%</span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-bold text-white">699 zł</span>
                    <span className="text-xs text-zinc-400">/rok</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">12 miesięcy w cenie 9 (58 zł / msc)</p>

                  <ul className="mt-6 space-y-3 text-xs text-zinc-300">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Wszystko z pakietu Majster PRO</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>3 darmowe Wyróżnienia 3D (wartość 57 zł)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Priorytet w bazie wykonawców Szczecin</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => handleChoosePlan('PRO_YEARLY_SUB')}
                  className="w-full mt-6 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition"
                >
                  Wybierz pakiet roczny
                </button>
              </div>
            </div>

            {/* Trust Footer */}
            <div className="pt-6 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Bezpieczne płatności BLIK
                </span>
                <span>•</span>
                <span>Automatyczna Faktura VAT 23%</span>
                <span>•</span>
                <span>Możliwość rezygnacji w dowolnym momencie</span>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Embedded BLIK Payment Modal */}
      <BlikPaymentModal
        isOpen={isBlikModalOpen}
        onClose={() => setIsBlikModalOpen(false)}
        productId={selectedProductId}
        onPaymentSuccess={() => {
          setIsBlikModalOpen(false);
          onClose();
        }}
      />
    </>
  );
};
