import { CATEGORIES, normalizeCategory } from '@/lib/data/categories';
import { formatShortPrice } from '@/lib/utils';

/**
 * Creates GeoJSON circular polygon for radius / commute visualization
 */
export function createGeoJsonCircle(center: [number, number], radiusKm: number, points = 64) {
  const [lng, lat] = center;
  const coords: Array<[number, number]> = [];
  const distanceX = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const distanceY = radiusKm / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([lng + x, lat + y]);
  }
  coords.push(coords[0]);

  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [coords],
    },
    properties: {},
  };
}

/**
 * Calculates spiderfy positions for multiple overlapping pins at the same location.
 * Spreads pins along a spiral or circle ring around the origin center.
 */
export function generateSpiderfyPositions(
  center: [number, number],
  count: number,
  zoom: number
): Array<[number, number]> {
  if (count <= 1) return [center];

  const [lng, lat] = center;
  const positions: Array<[number, number]> = [];
  const pixelRadius = 38;
  const metersPerPixel = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
  const radiusKm = (pixelRadius * metersPerPixel) / 1000;

  const distanceX = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const distanceY = radiusKm / 110.574;

  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    positions.push([lng + distanceX * Math.cos(angle), lat + distanceY * Math.sin(angle)]);
  }

  return positions;
}

/**
 * High-visibility tactical job pill HTML generator with hover and selection support
 */
export function getMarkerHtml(
  category: string,
  isFavorite: boolean,
  isSelected: boolean,
  dimmed: boolean = false,
  price?: string | number | null,
  isUrgent: boolean = false,
  isFresh: boolean = false,
  isHovered: boolean = false
): string {
  const cat = CATEGORIES[normalizeCategory(category)];
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const shortPrice = price ? formatShortPrice(price) : null;

  const numPrice =
    typeof price === 'number'
      ? price
      : typeof price === 'string'
      ? parseFloat(price.replace(/[^\d.]/g, ''))
      : null;

  // Hourly or monthly salary threshold against Szczecin median (45 zł/h or 7500 zł/mc)
  const isHighPay = numPrice !== null && ((numPrice >= 45 && numPrice <= 300) || numPrice >= 7500);
  const isMidPay = !isHighPay && numPrice !== null && ((numPrice >= 30 && numPrice < 45) || numPrice >= 5000);

  // Tactical heat-bar colors
  const heatColor = isUrgent ? '#ef4444' : isHighPay ? '#10b981' : isMidPay ? '#f59e0b' : '#64748b';
  const borderColor = isHovered
    ? '#10b981'
    : isSelected
    ? '#38bdf8'
    : isUrgent
    ? '#ef4444'
    : isHighPay
    ? '#10b981'
    : '#334155';

  const glowShadow = isHovered
    ? '0 0 20px rgba(16, 185, 129, 0.85), 0 4px 18px rgba(0,0,0,0.8)'
    : isSelected
    ? '0 0 16px rgba(56, 189, 248, 0.75), 0 4px 16px rgba(0,0,0,0.7)'
    : isUrgent
    ? '0 0 14px rgba(239, 68, 68, 0.55), 0 4px 14px rgba(0,0,0,0.6)'
    : isHighPay
    ? '0 0 12px rgba(16, 185, 129, 0.45), 0 4px 12px rgba(0,0,0,0.6)'
    : '0 4px 12px rgba(0,0,0,0.5)';

  const opacity = dimmed ? '0.35' : '1';
  const scale = isHovered ? 'scale(1.22)' : isSelected ? 'scale(1.15)' : 'scale(1)';

  // Sonar Wave for fresh offers (<6h), urgent offers, selected, or hovered
  const sonarRing =
    isSelected || isHovered || isFresh || isUrgent
      ? `<div class="sonar-wave-pulse" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:${
          isMobile ? '38px' : '48px'
        };height:${
          isMobile ? '38px' : '48px'
        };border-radius:50%;background:${
          isUrgent
            ? 'rgba(239,68,68,0.25)'
            : isHovered
            ? 'rgba(16,185,129,0.3)'
            : isSelected
            ? 'rgba(56,189,248,0.3)'
            : 'rgba(16,185,129,0.25)'
        };border:1.5px solid ${heatColor};animation:sonar-wave 2s cubic-bezier(0.1, 0.8, 0.3, 1) infinite;pointer-events:none;"></div>`
      : '';

  // Top micro tag (CITO / TOP / NOWE)
  const tagHtml = isUrgent
    ? `<span style="position:absolute;top:-8px;left:50%;transform:translateX(-50%);background:#dc2626;color:#ffffff;font-size:7px;font-weight:900;padding:1px 5px;border-radius:4px;letter-spacing:0.04em;box-shadow:0 1px 4px rgba(220,38,38,0.6);white-space:nowrap;border:1px solid #f87171;z-index:3;">CITO</span>`
    : isHighPay
    ? `<span style="position:absolute;top:-8px;left:50%;transform:translateX(-50%);background:#059669;color:#ffffff;font-size:7px;font-weight:900;padding:1px 5px;border-radius:4px;letter-spacing:0.04em;box-shadow:0 1px 4px rgba(5,150,105,0.6);white-space:nowrap;border:1px solid #34d399;z-index:3;">TOP</span>`
    : isFresh
    ? `<span style="position:absolute;top:-8px;left:50%;transform:translateX(-50%);background:#0284c7;color:#ffffff;font-size:7px;font-weight:900;padding:1px 5px;border-radius:4px;letter-spacing:0.04em;box-shadow:0 1px 4px rgba(2,132,199,0.6);white-space:nowrap;border:1px solid #38bdf8;z-index:3;">NOWE</span>`
    : '';

  // Heart badge for favorites
  const heartBadge = isFavorite
    ? `<div style="position:absolute;top:-4px;right:-5px;width:13px;height:13px;background:linear-gradient(135deg,#ef4444,#dc2626);border-radius:50%;border:1.5px solid white;display:flex;align-items:center;justify-content:center;font-size:7px;line-height:1;color:white;box-shadow:0 1px 4px rgba(239,68,68,0.6);z-index:4;">♥</div>`
    : '';

  const pillPad = isMobile ? '2px 7px 2px 4px' : '3px 9px 3px 5px';
  const iconSize = isMobile ? '11px' : '13px';
  const priceFontSize = isMobile ? '9.5px' : '11px';
  const zIndex = isHovered ? '25' : isSelected ? '20' : '2';

  return `
    <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;user-select:none;transform:${scale};transition:transform 0.22s cubic-bezier(0.34,1.56,0.64,1);opacity:${opacity};z-index:${zIndex};">
      ${sonarRing}
      ${tagHtml}
      ${heartBadge}
      
      <!-- Tactical Job Pill Body -->
      <div style="display:flex;align-items:center;gap:4.5px;background:rgba(9,13,22,0.92);backdrop-filter:blur(8px);border:1.5px solid ${borderColor};border-radius:999px;box-shadow:${glowShadow};padding:${pillPad};position:relative;z-index:2;">
        <!-- Left Heat Bar -->
        <div style="width:3.5px;height:12px;border-radius:2px;background:${heatColor};box-shadow:0 0 6px ${heatColor};shrink:0;"></div>
        
        <!-- Category Icon -->
        <span style="font-size:${iconSize};line-height:1;display:flex;align-items:center;">${cat.icon}</span>
        
        <!-- Price Label -->
        <span style="font-size:${priceFontSize};font-weight:800;color:#f8fafc;letter-spacing:-0.02em;white-space:nowrap;">${shortPrice || 'Wycena'}</span>
      </div>

      <!-- Downward Pointing Tactical Needle -->
      <div style="width:0;height:0;border-left:4.5px solid transparent;border-right:4.5px solid transparent;border-top:5.5px solid ${borderColor};margin-top:-1px;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.5));position:relative;z-index:1;"></div>
    </div>
  `;
}
