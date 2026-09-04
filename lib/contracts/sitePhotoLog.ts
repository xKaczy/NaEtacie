/**
 * Construction Site Photo Documentation & Log Module (Foto-Dziennik Budowy).
 * 
 * Allows self-employed tradespeople and construction teams to capture,
 * organize, timestamp, and export photo logs before, during, and after
 * completion of building / renovation work in Szczecin.
 */

export interface SitePhotoEntry {
  id: string;
  timestamp: string; // ISO string
  dateFormatted: string;
  stage: 'before' | 'progress' | 'hidden_defect' | 'after' | 'handover';
  description: string;
  imageDataUrl: string; // Base64 or Blob URL
  locationText?: string;
  roomOrArea?: string; // e.g. "Łazienka", "Salon", "Elewacja frontowa"
}

export interface SitePhotoReportData {
  reportNumber: string;
  jobTitle: string;
  siteAddress: string;
  contractorName: string;
  contractorPhone: string;
  clientName?: string;
  createdDate: string;
  notes?: string;
  photos: SitePhotoEntry[];
}

export const STAGE_LABELS: Record<SitePhotoEntry['stage'], { label: string; icon: string; badgeColor: string }> = {
  before: { label: 'Stan Przed Wejściem', icon: '📸', badgeColor: '#0284c7' },
  progress: { label: 'W Trakcie Prac', icon: '🔨', badgeColor: '#f59e0b' },
  hidden_defect: { label: 'Wada Ukryta / Usterka', icon: '⚠️', badgeColor: '#ef4444' },
  after: { label: 'Po Zakończeniu', icon: '✨', badgeColor: '#10b981' },
  handover: { label: 'Odbiór Końcowy', icon: '📋', badgeColor: '#8b5cf6' },
};

const STORAGE_KEY_PREFIX = 'naetacie_site_photos_';

export function getStoredSitePhotos(adId: string): SitePhotoEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${adId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredSitePhotos(adId: string, photos: SitePhotoEntry[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${adId}`, JSON.stringify(photos));
  } catch (err) {
    console.warn('Failed to save site photos to localStorage:', err);
  }
}

/**
 * Generates an exportable, printable HTML report of the construction photographic evidence.
 */
export function generatePhotoLogReportHtml(data: SitePhotoReportData): string {
  const photoCardsHtml = data.photos.map((p, idx) => {
    const stageMeta = STAGE_LABELS[p.stage] || STAGE_LABELS.progress;
    return `
      <div class="photo-card">
        <div class="photo-header">
          <span class="photo-index">#${idx + 1}</span>
          <span class="photo-badge" style="background-color: ${stageMeta.badgeColor}15; color: ${stageMeta.badgeColor}; border: 1px solid ${stageMeta.badgeColor}40;">
            ${stageMeta.icon} ${stageMeta.label}
          </span>
          <span class="photo-time">${p.dateFormatted}</span>
        </div>
        <div class="photo-img-wrapper">
          <img src="${p.imageDataUrl}" alt="Dokumentacja #${idx + 1}" />
        </div>
        <div class="photo-meta">
          ${p.roomOrArea ? `<div class="meta-row"><strong>Strefa / Pomieszczenie:</strong> ${p.roomOrArea}</div>` : ''}
          ${p.locationText ? `<div class="meta-row"><strong>Lokalizacja:</strong> ${p.locationText}</div>` : ''}
          <div class="meta-desc"><strong>Opis:</strong> ${p.description || 'Brak opisu'}</div>
        </div>
      </div>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <title>Dokumentacja Fotograficzna Robót - ${data.reportNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; color: #111; padding: 24px; line-height: 1.5; }
    h1 { font-size: 18px; text-align: center; margin-bottom: 2px; text-transform: uppercase; }
    .sub { text-align: center; font-size: 11px; color: #555; margin-bottom: 20px; }
    .header { display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 8px; font-size: 11px; margin-bottom: 16px; }
    .parties { display: flex; gap: 16px; margin-bottom: 20px; }
    .party-box { flex: 1; border: 1px solid #ddd; padding: 10px; border-radius: 6px; background-color: #fafafa; font-size: 11px; }
    .party-box h4 { margin: 0 0 4px 0; text-transform: uppercase; font-size: 10px; color: #666; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 20px 0; }
    .photo-card { border: 1px solid #ddd; border-radius: 8px; overflow: hidden; page-break-inside: avoid; background: #fff; }
    .photo-header { display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: #f8fafc; border-bottom: 1px solid #eee; font-size: 10px; }
    .photo-index { font-weight: bold; color: #333; }
    .photo-badge { padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 9.5px; }
    .photo-time { color: #666; }
    .photo-img-wrapper { width: 100%; height: 220px; background: #eee; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .photo-img-wrapper img { width: 100%; height: 100%; object-fit: cover; }
    .photo-meta { padding: 8px 10px; font-size: 11px; }
    .meta-row { margin-bottom: 3px; color: #444; }
    .meta-desc { color: #222; margin-top: 4px; border-top: 1px dashed #eee; padding-top: 4px; }
    .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; page-break-inside: avoid; }
    .sig-box { width: 45%; text-align: center; border-top: 1px dashed #666; padding-top: 6px; font-weight: bold; font-size: 11px; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div><strong>Miejscowość:</strong> Szczecin</div>
    <div><strong>Data raportu:</strong> ${data.createdDate}</div>
    <div><strong>Nr raportu:</strong> ${data.reportNumber}</div>
  </div>

  <h1>Dokumentacja Fotograficzna Budowy / Remontu</h1>
  <div class="sub">Inwestycja: <strong>${data.jobTitle}</strong></div>

  <div class="parties">
    <div class="party-box">
      <h4>Wykonawca sporządzający dokumentację:</h4>
      <strong>${data.contractorName}</strong><br>
      Tel: ${data.contractorPhone}
    </div>
    <div class="party-box">
      <h4>Inwestor / Adres inwestycji:</h4>
      <strong>${data.clientName || 'Inwestor'}</strong><br>
      ${data.siteAddress}
    </div>
  </div>

  ${data.notes ? `<div style="padding: 8px 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; margin-bottom: 16px; font-size: 11px;"><strong>Uwagi ogólne majstra:</strong> ${data.notes}</div>` : ''}

  <div class="grid">
    ${photoCardsHtml}
  </div>

  <div class="signatures">
    <div class="sig-box">Sporządził (Wykonawca)</div>
    <div class="sig-box">Przyjął do wiadomości (Inwestor)</div>
  </div>
</body>
</html>
  `.trim();
}
