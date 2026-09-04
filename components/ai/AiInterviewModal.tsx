'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, CheckCircle2, Award, Sparkles, X, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateInterviewQuestions, type QuestionStep } from '@/lib/ai/interviewSimulator';
import type { DisplayAnnouncement } from '@/lib/types/display';

export interface AiInterviewModalProps {
  ad: DisplayAnnouncement | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AiInterviewModal({ ad, isOpen, onClose }: AiInterviewModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  if (!isOpen || !ad) return null;

  const questions: QuestionStep[] = generateInterviewQuestions(ad.category, ad.title);
  const currentQ = questions[currentStepIndex];

  const handleSelectOption = (index: number) => {
    setSelectedOption(index);
  };

  const handleNextQuestion = () => {
    if (selectedOption === currentQ.bestAnswerIndex) {
      setScore((s) => s + 25);
    }

    if (currentStepIndex + 1 < questions.length) {
      setCurrentStepIndex((i) => i + 1);
      setSelectedOption(null);
    } else {
      setIsCompleted(true);
    }
  };

  const handleRestart = () => {
    setCurrentStepIndex(0);
    setSelectedOption(null);
    setScore(0);
    setIsCompleted(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-lg bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden text-card-foreground p-5 space-y-4 my-8 relative"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Bot className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h3 className="text-sm font-black">Symulator Rozmowy Rekrutacyjnej (AI)</h3>
                <p className="text-[11px] text-muted-foreground truncate max-w-[280px]">
                  Trening dla oferty: {ad.title}
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

          {!isCompleted ? (
            <div className="space-y-4">
              {/* Progress Indicator */}
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                <span>Pytanie {currentStepIndex + 1} z {questions.length}</span>
                <span className="text-primary font-mono font-bold">Wynik: {score} pkt</span>
              </div>

              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${((currentStepIndex + 1) / questions.length) * 100}%` }}
                />
              </div>

              {/* Question Text */}
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5">
                <h4 className="text-xs md:text-sm font-extrabold text-foreground leading-snug">
                  {currentQ.question}
                </h4>
                <p className="text-[11px] text-muted-foreground italic">
                  💡 Wskazówka: {currentQ.hint}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-2">
                {currentQ.options.map((opt, idx) => {
                  const isSelected = selectedOption === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(idx)}
                      className={`w-full text-left p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer flex items-start gap-2.5 ${
                        isSelected
                          ? 'border-primary bg-primary/10 ring-1 ring-primary text-foreground shadow-sm'
                          : 'border-border/60 hover:bg-accent hover:border-border text-muted-foreground'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full border border-primary/40 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="leading-snug">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {/* Feedback box if selected */}
              {selectedOption !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-400 font-semibold space-y-1"
                >
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Ochrona rekrutacyjna AI:
                  </div>
                  <p className="font-normal text-[11px] leading-relaxed">
                    {currentQ.feedback}
                  </p>
                </motion.div>
              )}

              {/* Action Button */}
              <Button
                onClick={handleNextQuestion}
                disabled={selectedOption === null}
                className="w-full text-xs font-bold gap-1.5 h-10 bg-primary text-primary-foreground shadow-md cursor-pointer"
              >
                <span>{currentStepIndex + 1 === questions.length ? 'Zakończ symulację' : 'Następne pytanie'}</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            /* Completion Screen */
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 mx-auto">
                <Award className="w-8 h-8 animate-bounce" />
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-black text-foreground">Gratulacje! Symulacja Zakończona</h4>
                <p className="text-xs text-muted-foreground">
                  Twój wynik przygotowania do rozmowy: <strong className="text-emerald-600 dark:text-emerald-400 font-black text-sm">{score} / 100 pkt</strong>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border border-border/50 text-xs text-muted-foreground leading-relaxed text-left">
                <p className="font-bold text-foreground flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Rekomendacja AI:
                </p>
                Jesteś dobrze przygotowany do negocjacji rynkowych. Pamiętaj, aby na rozmowie podkreślić swoje doświadczenie praktyczne oraz dbałość o zasady BHP.
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={handleRestart}
                  variant="outline"
                  className="flex-1 text-xs font-bold gap-1.5 h-10 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" /> Powtórz symulację
                </Button>
                <Button
                  onClick={onClose}
                  className="flex-1 text-xs font-bold gap-1.5 h-10 bg-primary text-primary-foreground cursor-pointer shadow-md"
                >
                  Gotowe
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
