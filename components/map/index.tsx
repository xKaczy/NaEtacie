'use client';

import dynamic from 'next/dynamic';
import type { MapComponentProps } from './MapComponent';
import { MapErrorBoundary } from './MapErrorBoundary';

/**
 * Dynamically imported MapComponent with SSR disabled and ErrorBoundary protection.
 */
const MapComponentInternal = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0f0f0',
      }}
    >
      Loading map...
    </div>
  ),
});

export default function MapComponent(props: MapComponentProps) {
  return (
    <MapErrorBoundary>
      <MapComponentInternal {...props} />
    </MapErrorBoundary>
  );
}

export { MapErrorBoundary };
export type { MapComponentProps };

