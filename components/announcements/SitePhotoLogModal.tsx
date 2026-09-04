'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  X,
  Plus,
  Trash2,
  Printer,
  Upload,
  Calendar,
  MapPin,
  FileCheck,
} from 'lucide-react';
import {
  SitePhotoEntry,
  STAGE_LABELS,
  getStoredSitePhotos,
  saveStoredSitePhotos,
  generatePhotoLogReportHtml,
} from '@/lib/contracts/sitePhotoLog';

interface SitePhotoLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  adId: string;
  title: string;
  locationText?: string | null;
  companyName?: string | null;
}

export const SitePhotoLogModal: React.FC<SitePhotoLogModalProps> = ({
  isOpen,
  onClose,
  adId,
  title,
  locationText,
  companyName,
}) => {
  const [photos, setPhotos] = useState<SitePhotoEntry[]>([]);
  const [stage, setStage] = useState<SitePhotoEntry['stage']>('before');
  const [description, setDescription] = useState('');
  const [roomOrArea, setRoomOrArea] = useState('');
  const [contractorName, setContractorName] = useState('Majster / Ekipa Remontowa');
  const [contractorPhone, setContractorPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'gallery' | 'add'>('gallery');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing photos for this ad
  useEffect(() => {
    if (isOpen && adId) {
      setPhotos(getStoredSitePhotos(adId));
    }
  }, [isOpen, adId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const now = new Date();
      const newEntry: SitePhotoEntry = {
        id: `photo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: now.toISOString(),
        dateFormatted: now.toLocaleString('pl-PL', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        stage,
        description: description.trim() || 'Bez opisu',
        roomOrArea: roomOrArea.trim() || undefined,
        locationText: locationText || 'Szczecin',
        imageDataUrl: dataUrl,
      };

      const updated = [newEntry, ...photos];
      setPhotos(updated);
      saveStoredSitePhotos(adId, updated);

      // Reset form
      setDescription('');
      setRoomOrArea('');
      setActiveTab('gallery');
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleDeletePhoto = (id: string) => {
    const updated = photos.filter((p) => p.id !== id);
    setPhotos(updated);
    saveStoredSitePhotos(adId, updated);
  };

  const handlePrintReport = () => {
    if (photos.length === 0) return;

    const html = generatePhotoLogReportHtml({
      reportNumber: `FOTO/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`,
      jobTitle: title,
      siteAddress: locationText || 'Szczecin',
      contractorName: contractorName.trim() || 'Wykonawca',
      contractorPhone: contractorPhone.trim() || 'Brak telefonu',
      clientName: companyName || 'Inwestor',
      createdDate: new Date().toLocaleDateString('pl-PL'),
      notes: notes.trim() || undefined,
      photos,
    });

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        printWin.print();
      }, 300);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between bg-primary/5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm sm:text-base flex items-center gap-1.5">
                  Foto-Dziennik Budowy & Remontu
                  <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">
                    {photos.length} zdjęć
                  </span>
                </h3>
                <p className="text-[11px] text-muted-foreground truncate max-w-[280px] sm:max-w-md">
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

          {/* Sub Navigation */}
          <div className="flex border-b border-border bg-muted/20 px-4 pt-2 gap-2 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('gallery')}
              className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'gallery'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Galeria dokumentacji ({photos.length})
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'add'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Dodaj zdjęcie / usterkę
            </button>
          </div>

          {/* Body */}
          <div className="p-4 overflow-y-auto flex-1 space-y-4">
            {activeTab === 'add' && (
              <div className="space-y-3.5 bg-muted/30 p-4 rounded-xl border border-border">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Etap prac budowlanych:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {(Object.keys(STAGE_LABELS) as SitePhotoEntry['stage'][]).map((st) => {
                      const meta = STAGE_LABELS[st];
                      const active = stage === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setStage(st)}
                          className={`p-2 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 border transition-all text-left cursor-pointer ${
                            active
                              ? 'border-primary bg-primary/10 text-primary shadow-xs'
                              : 'border-border bg-background text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          <span>{meta.icon}</span>
                          <span className="truncate">{meta.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Strefa / Pomieszczenie (opcjonalnie):
                    </label>
                    <input
                      type="text"
                      placeholder="np. Łazienka piętro, Balkon, Ściana nośna"
                      value={roomOrArea}
                      onChange={(e) => setRoomOrArea(e.target.value)}
                      className="w-full p-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Krótki opis / Ustalenia:
                    </label>
                    <input
                      type="text"
                      placeholder="np. Pęknięcie w tynku przed rozpoczęciem robót"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full p-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Upload or Camera Button */}
                <div className="pt-2">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    id="site-photo-upload"
                  />
                  <label
                    htmlFor="site-photo-upload"
                    className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10 rounded-xl cursor-pointer transition-all"
                  >
                    <Upload className="w-8 h-8 text-primary mb-2 animate-bounce" />
                    <span className="text-xs font-bold text-foreground">
                      Zrób zdjęcie aparatem lub wybierz z galerii
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      Zdjęcie otrzyma automatyczny znak wodny z datą i lokalizacją
                    </span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'gallery' && (
              <>
                {photos.length === 0 ? (
                  <div className="text-center py-12 px-4 border border-dashed border-border rounded-2xl bg-muted/20">
                    <Camera className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                    <h4 className="text-sm font-bold text-foreground">Brak wpisów w foto-dzienniku</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                      Rób zdjęcia stanu przed wejściem ekipy, ukrytych usterek i postępu prac. Zabezpieczysz się przed roszczeniami inwestora.
                    </p>
                    <button
                      onClick={() => setActiveTab('add')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl shadow-xs cursor-pointer hover:bg-primary/90"
                    >
                      <Plus className="w-4 h-4" /> Dodaj pierwsze zdjęcie
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {photos.map((p) => {
                      const meta = STAGE_LABELS[p.stage] || STAGE_LABELS.progress;
                      return (
                        <div
                          key={p.id}
                          className="bg-card border border-border rounded-xl overflow-hidden shadow-2xs group flex flex-col"
                        >
                          <div className="p-2 border-b border-border/70 flex items-center justify-between text-[10px] bg-muted/30">
                            <span
                              className="font-bold px-2 py-0.5 rounded-md flex items-center gap-1"
                              style={{
                                backgroundColor: `${meta.badgeColor}15`,
                                color: meta.badgeColor,
                                border: `1px solid ${meta.badgeColor}30`,
                              }}
                            >
                              {meta.icon} {meta.label}
                            </span>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              <span>{p.dateFormatted}</span>
                            </div>
                          </div>

                          <div className="relative h-44 bg-muted overflow-hidden flex items-center justify-center">
                            <img
                              src={p.imageDataUrl}
                              alt={p.description}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                            />
                            <button
                              onClick={() => handleDeletePhoto(p.id)}
                              className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                              title="Usuń zdjęcie"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="p-2.5 text-xs flex-1 flex flex-col justify-between">
                            <div>
                              {p.roomOrArea && (
                                <p className="font-bold text-foreground text-[11px] mb-0.5">
                                  📍 {p.roomOrArea}
                                </p>
                              )}
                              <p className="text-muted-foreground text-[11px] line-clamp-2">
                                {p.description}
                              </p>
                            </div>
                            <div className="pt-2 text-[10px] text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-primary/70" />
                              <span className="truncate">{p.locationText}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* PDF Report Customizer Form */}
                {photos.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-2.5">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-primary" /> Dane do formalnego raportu PDF:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <input
                        type="text"
                        placeholder="Nazwa wykonawcy / firmy"
                        value={contractorName}
                        onChange={(e) => setContractorName(e.target.value)}
                        className="p-1.5 bg-background border border-border rounded text-foreground focus:outline-hidden"
                      />
                      <input
                        type="text"
                        placeholder="Telefon kontaktowy"
                        value={contractorPhone}
                        onChange={(e) => setContractorPhone(e.target.value)}
                        className="p-1.5 bg-background border border-border rounded text-foreground focus:outline-hidden"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Uwagi końcowe majstra (np. Usterki spisane w obecności inwestora)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full p-1.5 bg-background border border-border rounded text-xs text-foreground focus:outline-hidden"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-3 border-t border-border bg-muted/20 flex items-center justify-between gap-2">
            <button
              onClick={() => setActiveTab(activeTab === 'add' ? 'gallery' : 'add')}
              className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-xs font-bold hover:bg-muted text-foreground transition-all cursor-pointer"
            >
              {activeTab === 'add' ? 'Wróć do zdjęć' : <><Plus className="w-3.5 h-3.5" /> Dodaj kolejne zdjęcie</>}
            </button>

            <button
              onClick={handlePrintReport}
              disabled={photos.length === 0}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer ${
                photos.length > 0
                  ? 'bg-primary hover:bg-primary/90 text-primary-foreground active:scale-98'
                  : 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
              }`}
            >
              <Printer className="w-4 h-4" />
              Drukuj Raport PDF ({photos.length})
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
