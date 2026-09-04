'use client';

import React, { useMemo } from 'react';
import { CATEGORIES, normalizeCategory } from '@/lib/data/categories';
import { haversineKm } from '@/lib/matching/engine';
import { findNearestSupplier } from '@/lib/geo/szczecinSuppliers';
import { getQuickSmsHref, getZditmTransitUrl } from '@/lib/geo/transitRouting';
import { getAnnouncementExternalUrl } from '@/lib/utils';
import type { DisplayAnnouncement } from '@/lib/types/display';

export interface MarkerPopupProps {
  ad: DisplayAnnouncement;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onShowInList: () => void;
  onOpenDetails?: () => void;
  isDark: boolean;
  homeLat?: number | null;
  homeLng?: number | null;
}

export function MarkerPopup({
  ad,
  isFavorite,
  onToggleFavorite,
  onShowInList,
  onOpenDetails,
  isDark,
  homeLat,
  homeLng,
}: MarkerPopupProps) {
  const cat = CATEGORIES[normalizeCategory(ad.category)];
  const priceDisplay = ad.price
    ? typeof ad.price === 'number'
      ? `${ad.price.toLocaleString('pl-PL')} zł${ad.price < 500 ? '/m²' : ''}`
      : ad.price
    : null;

  const distKm = useMemo(() => {
    if (homeLat != null && homeLng != null && ad.latitude != null && ad.longitude != null) {
      const d = haversineKm(homeLat, homeLng, ad.latitude, ad.longitude);
      return Math.round(d * 10) / 10;
    }
    return null;
  }, [homeLat, homeLng, ad.latitude, ad.longitude]);

  const estDriveMin = distKm != null ? Math.max(2, Math.round((distKm / 35) * 60)) : null;
  const nearestSupplier = findNearestSupplier(ad.latitude, ad.longitude);

  const bg = isDark ? '#09090b' : '#ffffff';
  const textPrimary = isDark ? '#f4f4f5' : '#111827';
  const textMuted = isDark ? '#a1a1aa' : '#6b7280';
  const chipBg = isDark ? 'rgba(39,39,42,0.85)' : 'rgba(244,244,245,0.95)';
  const divider = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  return (
    <div
      style={{
        minWidth: '240px',
        maxWidth: '280px',
        fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
        background: bg,
        overflow: 'hidden',
        borderRadius: '12px',
        boxShadow: '0 12px 36px rgba(0,0,0,0.35)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
      }}
    >
      {/* ── Category Header Bar ── */}
      <div
        style={{
          background: `linear-gradient(135deg, ${cat.color}25 0%, ${cat.color}08 100%)`,
          borderBottom: `1px solid ${cat.color}35`,
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 8px',
            borderRadius: '999px',
            background: `${cat.color}20`,
            border: `1px solid ${cat.color}45`,
            color: cat.color,
            fontSize: '10px',
            fontWeight: 800,
            letterSpacing: '0.04em',
          }}
        >
          <span style={{ fontSize: '12px' }}>{cat.icon}</span>
          {cat.label.toUpperCase()}
        </span>
        <button
          onClick={onToggleFavorite}
          aria-label={isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
          style={{
            border: 'none',
            background: isFavorite ? 'rgba(239,68,68,0.15)' : 'transparent',
            cursor: 'pointer',
            fontSize: '15px',
            lineHeight: 1,
            padding: '4px 6px',
            borderRadius: '6px',
            color: isFavorite ? '#ef4444' : textMuted,
            transition: 'all 0.2s ease',
          }}
        >
          {isFavorite ? '♥' : '♡'}
        </button>
      </div>

      {/* ── Main Content ── */}
      <div style={{ padding: '10px 12px' }}>
        <h3
          style={{
            margin: '0 0 6px',
            fontSize: '13px',
            fontWeight: 800,
            lineHeight: 1.3,
            color: textPrimary,
          }}
        >
          {ad.title}
        </h3>

        {ad.description && (
          <p
            style={{
              margin: '0 0 8px',
              fontSize: '11px',
              color: textMuted,
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {ad.description}
          </p>
        )}

        {/* ── Info chips ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
          <span
            style={{
              fontSize: '10px',
              background: chipBg,
              color: textPrimary,
              padding: '3px 8px',
              borderRadius: '999px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>📍</span> {ad.location_text}
          </span>
          {distKm != null && (
            <span
              style={{
                fontSize: '10px',
                background: isDark ? 'rgba(16,185,129,0.18)' : '#d1fae5',
                color: isDark ? '#34d399' : '#047857',
                border: `1px solid ${isDark ? 'rgba(16,185,129,0.35)' : '#a7f3d0'}`,
                padding: '3px 8px',
                borderRadius: '999px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <span>🚗</span> {distKm} km (~{estDriveMin}m)
            </span>
          )}
          {priceDisplay && (
            <span
              style={{
                fontSize: '10px',
                padding: '3px 8px',
                borderRadius: '999px',
                fontWeight: 800,
                background: isDark ? 'rgba(16,185,129,0.2)' : '#ecfdf5',
                color: isDark ? '#10b981' : '#059669',
                border: `1px solid ${isDark ? 'rgba(16,185,129,0.4)' : '#a7f3d0'}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <span>💰</span> {priceDisplay}
            </span>
          )}
          {nearestSupplier && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${nearestSupplier.supplier.lat},${nearestSupplier.supplier.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              title={`Nawiguj do marketu budowlanego: ${nearestSupplier.supplier.name} (${nearestSupplier.supplier.address})`}
              style={{
                fontSize: '10px',
                background: isDark ? 'rgba(245,158,11,0.18)' : '#fef3c7',
                color: isDark ? '#fbbf24' : '#b45309',
                border: `1px solid ${isDark ? 'rgba(245,158,11,0.35)' : '#fde68a'}`,
                padding: '3px 8px',
                borderRadius: '999px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                textDecoration: 'none',
              }}
            >
              <span>🏪</span> {nearestSupplier.supplier.name} ({nearestSupplier.distanceKm} km • ~{nearestSupplier.driveTimeMinutes}m)
            </a>
          )}
        </div>

        {/* ── Phone & 1-Tap Quick SMS ── */}
        {ad.phone && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
            <a
              href={`tel:${ad.phone.replace(/\s+/g, '')}`}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '7px 8px',
                background: isDark ? 'rgba(16,185,129,0.18)' : 'rgba(220,252,231,0.95)',
                border: `1px solid ${isDark ? 'rgba(16,185,129,0.4)' : '#86efac'}`,
                borderRadius: '8px',
                fontSize: '11px',
                color: isDark ? '#34d399' : '#15803d',
                fontWeight: 800,
                textDecoration: 'none',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <span>📞</span> Zadzwoń
            </a>
            <a
              href={
                getQuickSmsHref({
                  phone: ad.phone,
                  title: ad.title,
                  district: ad.location_text,
                }) || `sms:${ad.phone}`
              }
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '7px 8px',
                background: isDark ? 'rgba(59,130,246,0.18)' : 'rgba(219,234,254,0.95)',
                border: `1px solid ${isDark ? 'rgba(59,130,246,0.4)' : '#93c5fd'}`,
                borderRadius: '8px',
                fontSize: '11px',
                color: isDark ? '#60a5fa' : '#1d4ed8',
                fontWeight: 800,
                textDecoration: 'none',
              }}
            >
              <span>💬</span> Szybki SMS
            </a>
          </div>
        )}

        {/* ── Divider ── */}
        <div style={{ height: '1px', background: divider, marginBottom: '8px' }} />

        {/* ── Action Buttons ── */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
          <button
            onClick={onShowInList}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '6px 8px',
              background: chipBg,
              color: textPrimary,
              border: `1px solid ${divider}`,
              borderRadius: '8px',
              fontSize: '10px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = isDark ? '#27272a' : '#e4e4e7';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = chipBg;
            }}
          >
            📋 Na liście
          </button>
          <a
            href={getAnnouncementExternalUrl(ad)}
            target="_blank"
            rel="noopener noreferrer"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '6px 8px',
              background: `linear-gradient(135deg, ${cat.color}, ${cat.color}dd)`,
              color: 'white',
              borderRadius: '8px',
              fontSize: '10px',
              fontWeight: 800,
              textDecoration: 'none',
              boxShadow: `0 2px 8px ${cat.color}50`,
              cursor: 'pointer',
            }}
          >
            Otwórz →
          </a>
        </div>

        {/* ── Commute & Navigation ── */}
        {ad.latitude != null && ad.longitude != null && (
          <div style={{ display: 'flex', gap: '5px' }}>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${ad.latitude},${ad.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Dojazd samochodem"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                padding: '5px 4px',
                borderRadius: '8px',
                fontSize: '10px',
                fontWeight: 700,
                textDecoration: 'none',
                color: isDark ? '#93c5fd' : '#1d4ed8',
                background: isDark ? 'rgba(30,41,59,0.7)' : 'rgba(241,245,249,0.9)',
                border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                transition: 'opacity 0.15s ease',
              }}
            >
              🚗 Auto
            </a>
            <a
              href={getZditmTransitUrl(ad.latitude, ad.longitude)}
              target="_blank"
              rel="noopener noreferrer"
              title="Dojazd tramwajem / autobusem ZDiTM Szczecin na 6:30 rano"
              style={{
                flex: 1.2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                padding: '5px 4px',
                borderRadius: '8px',
                fontSize: '10px',
                fontWeight: 700,
                textDecoration: 'none',
                color: isDark ? '#f472b6' : '#be185d',
                background: isDark ? 'rgba(80,7,36,0.35)' : 'rgba(253,242,248,0.95)',
                border: `1px solid ${isDark ? '#831843' : '#fbcfe8'}`,
                transition: 'opacity 0.15s ease',
              }}
            >
              🚌 ZDiTM 6:30
            </a>
            <a
              href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${ad.latitude},${ad.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Zobacz widok sferyczny Google Street View"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                padding: '5px 4px',
                borderRadius: '8px',
                fontSize: '10px',
                fontWeight: 700,
                textDecoration: 'none',
                color: isDark ? '#34d399' : '#047857',
                background: isDark ? 'rgba(6,78,59,0.25)' : 'rgba(209,250,229,0.9)',
                border: `1px solid ${isDark ? 'rgba(52,211,153,0.3)' : '#a7f3d0'}`,
                transition: 'opacity 0.15s ease',
              }}
            >
              🌐 Widok
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default MarkerPopup;
