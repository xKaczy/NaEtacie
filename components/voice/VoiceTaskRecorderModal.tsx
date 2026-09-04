'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  X,
  Trash2,
  Sparkles,
  Calendar,
  DollarSign,
  Layers,
  Send,
  Check,
} from 'lucide-react';
import {
  VoiceTaskEntry,
  parseVoiceTranscript,
  getStoredVoiceTasks,
  saveStoredVoiceTasks,
  isSpeechRecognitionSupported,
} from '@/lib/voice/voiceTaskRecorder';

interface VoiceTaskRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  adId: string;
  title: string;
}

interface IWindowWithSpeech extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
}

export const VoiceTaskRecorderModal: React.FC<VoiceTaskRecorderModalProps> = ({
  isOpen,
  onClose,
  adId,
  title,
}) => {
  const [tasks, setTasks] = useState<VoiceTaskEntry[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen && adId) {
      setTasks(getStoredVoiceTasks(adId));
    }
  }, [isOpen, adId]);

  const startRecording = () => {
    const win = (typeof window !== 'undefined' ? window : null) as (IWindowWithSpeech | null);
    const SpeechRecognition = win ? (win.SpeechRecognition || win.webkitSpeechRecognition) : null;

    if (!SpeechRecognition) {
      alert('Twoja przeglądarka nie wspiera dyktowania głosem Web Speech API. Użyj Chrome lub Safari na telefonie.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pl-PL';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        let current = '';
        for (let i = 0; i < event.results.length; i++) {
          current += event.results[i][0].transcript + ' ';
        }
        setTranscript(current);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

  const handleSaveEntry = () => {
    if (!transcript.trim()) return;

    const parsed = parseVoiceTranscript(transcript);
    const now = new Date();
    const newEntry: VoiceTaskEntry = {
      id: `vt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      adId,
      timestamp: now.toISOString(),
      dateFormatted: now.toLocaleString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      rawTranscript: transcript.trim(),
      parsed,
    };

    const updated = [newEntry, ...tasks];
    setTasks(updated);
    saveStoredVoiceTasks(adId, updated);

    setTranscript('');
  };

  const handleDeleteEntry = (id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    saveStoredVoiceTasks(adId, updated);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between bg-primary/5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                  Głosowe Notatki & Rozliczenia Majstra
                  <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">
                    Hands-Free
                  </span>
                </h3>
                <p className="text-[11px] text-muted-foreground truncate max-w-[280px]">
                  {title}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Voice Input Station */}
          <div className="p-4 border-b border-border bg-muted/20 space-y-3">
            <div className="flex flex-col items-center justify-center text-center p-4 rounded-xl border border-border/80 bg-background/60 shadow-2xs">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`relative p-5 rounded-full text-white shadow-lg transition-all transform active:scale-95 cursor-pointer ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-700 animate-pulse ring-8 ring-red-500/20'
                    : 'bg-primary hover:bg-primary/90'
                }`}
                title={isRecording ? 'Zatrzymaj nagrywanie' : 'Naciśnij i dyktuj'}
              >
                {isRecording ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
              </button>

              <p className="mt-3 text-xs font-bold text-foreground">
                {isRecording ? '🔴 Nagrywam... Mów swobodnie (kwoty, metry, usterki)' : 'Dotknij mikrofon i podyktuj ustalenia z budowy'}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Np. &quot;Zrobione 50 metrów gładzi, inwestor dopłaca 500 zł za skucie tynku&quot;
              </p>
            </div>

            {/* Transcript Live Box */}
            {transcript && (
              <div className="space-y-2">
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Treść transkrypcji..."
                  rows={2}
                  className="w-full p-2.5 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-hidden resize-none"
                />
                <button
                  onClick={handleSaveEntry}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Zapisz i przeanalizuj notatkę głosową
                </button>
              </div>
            )}
          </div>

          {/* Stored Tasks List */}
          <div className="p-4 overflow-y-auto flex-1 space-y-3">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Zapisane ustalenia ({tasks.length}):
            </span>

            {tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">
                Brak zapisanych notatek głosowych dla tego zlecenia.
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 bg-card border border-border rounded-xl space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 text-muted-foreground font-medium">
                      <Calendar className="w-3 h-3 text-primary" />
                      {task.dateFormatted}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopy(task.id, task.rawTranscript)}
                        className="p-1 text-[10px] rounded hover:bg-muted text-muted-foreground flex items-center gap-1 cursor-pointer"
                        title="Kopiuj treść"
                      >
                        {copiedId === task.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Sparkles className="w-3 h-3" />}
                        Kopiuj
                      </button>
                      <button
                        onClick={() => handleDeleteEntry(task.id)}
                        className="p-1 text-[10px] rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 cursor-pointer"
                        title="Usuń wpis"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-foreground font-medium leading-relaxed bg-muted/20 p-2 rounded-lg border border-border/40">
                    &quot;{task.rawTranscript}&quot;
                  </p>

                  {/* Parsed Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/50">
                    {task.parsed.amountPLN && (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        <DollarSign className="w-3 h-3" /> {task.parsed.amountPLN} zł
                      </span>
                    )}
                    {task.parsed.scopeQuantity && (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                        <Layers className="w-3 h-3" /> {task.parsed.scopeQuantity} {task.parsed.scopeUnit}
                      </span>
                    )}
                    {task.parsed.category && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                        {task.parsed.category === 'zaliczka' ? '💰 Zaliczka' : task.parsed.category === 'materialy' ? '🧱 Materiały' : task.parsed.category === 'dodatkowe_prace' ? '⚡ Dodatkowe' : '🔨 Robocizna'}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-border bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>🎤 Szybkie dyktowanie w języku polskim</span>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground font-bold cursor-pointer"
            >
              Zamknij
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
