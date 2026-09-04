'use client';

import dynamic from 'next/dynamic';
import type { MapViewProps } from './MapView';
import { MapErrorBoundary } from './MapErrorBoundary';

/**
 * Dynamically imported MapView with SSR disabled and resilient ErrorBoundary protection.
 * MapLibre requires DOM (window, canvas, WebGL) which is not available during SSR.
 */
const MapViewInternal = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        backgroundColor: 'var(--color-background, #f0f0f0)',
        color: 'var(--color-foreground, #6b7280)',
      }}
    >
      <div
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          borderWidth: '3px',
          borderStyle: 'solid',
          borderLeftColor: 'currentColor',
          borderRightColor: 'currentColor',
          borderBottomColor: 'currentColor',
          borderTopColor: 'transparent',
          opacity: 0.6,
          animation: 'map-spin 0.8s linear infinite',
        }}
      />
      <span style={{ fontSize: '13px', opacity: 0.7 }}>Wczytywanie mapy...</span>
      <style>{`
        @keyframes map-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  ),
});

export default function MapView(props: MapViewProps) {
  return (
    <MapErrorBoundary>
      <MapViewInternal {...props} />
    </MapErrorBoundary>
  );
}

export type { MapViewProps };

