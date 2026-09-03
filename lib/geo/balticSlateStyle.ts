/**
 * Szczecin Baltic Slate & High-Vis Tactical MapLibre GL Style Specification.
 * Designed specifically for construction & shipyard trades in Szczecin (Odra, Łasztownia, DK10/A6).
 */
import type { StyleSpecification } from 'maplibre-gl';

export const BALTIC_SLATE_PALETTE = {
  background: '#090d16',
  land: '#0b1120',
  landuseIndustrial: '#151d30',
  landuseCommercial: '#111827',
  landuseResidential: '#0e1626',
  parkGreen: '#062922',
  waterOdra: '#0369a1',
  waterDeep: '#075985',
  waterHighlight: '#38bdf8',
  portDocks: '#1e293b',
  roadMotorway: '#f59e0b',
  roadTrunk: '#fbbf24',
  roadPrimary: '#e2e8f0',
  roadSecondary: '#94a3b8',
  roadLocal: '#334155',
  railway: '#06b6d4',
  building3dBase: '#172033',
  building3dRoof: '#0284c7',
  skyAtmosphere: '#070b14',
  highVisAccent: '#10b981',
};

/**
 * Complete vector style specification using OpenMapTiles/CartoDB vector sources
 * with a high-contrast Baltic Slate palette.
 */
export const BALTIC_SLATE_STYLE: StyleSpecification = {
  version: 8,
  name: 'Szczecin Baltic Slate & High-Vis Tactical',
  metadata: {
    'naetacie:theme': 'baltic-slate',
    'naetacie:region': 'Szczecin',
  },
  sources: {
    carto: {
      type: 'vector',
      tiles: [
        'https://tiles.basemaps.cartocdn.com/vectortiles/carto.streets/v1/{z}/{x}/{y}.mvt',
      ],
      maxzoom: 14,
    },
  },
  glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
  sprite: 'https://tiles.basemaps.cartocdn.com/gl/dark-matter-gl-style/sprite',
  layers: [
    // 1. Background (deep graphite / slate)
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': BALTIC_SLATE_PALETTE.background,
      },
    },

    // 2. Landcover & Landuse
    {
      id: 'landuse-residential',
      type: 'fill',
      source: 'carto',
      'source-layer': 'landuse',
      filter: ['==', 'class', 'residential'],
      paint: {
        'fill-color': BALTIC_SLATE_PALETTE.landuseResidential,
        'fill-opacity': 0.7,
      },
    },
    {
      id: 'landuse-industrial',
      type: 'fill',
      source: 'carto',
      'source-layer': 'landuse',
      filter: ['in', 'class', 'industrial', 'railway', 'commercial'],
      paint: {
        'fill-color': BALTIC_SLATE_PALETTE.landuseIndustrial,
        'fill-opacity': 0.85,
        'fill-outline-color': '#1e293b',
      },
    },
    {
      id: 'landcover-park',
      type: 'fill',
      source: 'carto',
      'source-layer': 'landcover',
      filter: ['in', 'class', 'grass', 'park', 'wood', 'forest'],
      paint: {
        'fill-color': BALTIC_SLATE_PALETTE.parkGreen,
        'fill-opacity': 0.5,
      },
    },

    // 3. Water Bodies (Odra River, Jezioro Dąbie, Regalica, Parnica)
    {
      id: 'water-glow',
      type: 'fill',
      source: 'carto',
      'source-layer': 'water',
      paint: {
        'fill-color': BALTIC_SLATE_PALETTE.waterOdra,
        'fill-opacity': 0.9,
      },
    },
    {
      id: 'water-edge',
      type: 'line',
      source: 'carto',
      'source-layer': 'water',
      paint: {
        'line-color': BALTIC_SLATE_PALETTE.waterHighlight,
        'line-width': 1.2,
        'line-opacity': 0.45,
      },
    },

    // 4. Transport: Railways (Port Szczecin, Nadodrzanka)
    {
      id: 'railway-lines',
      type: 'line',
      source: 'carto',
      'source-layer': 'transportation',
      filter: ['==', 'class', 'rail'],
      paint: {
        'line-color': BALTIC_SLATE_PALETTE.railway,
        'line-width': 1.5,
        'line-dasharray': [3, 2],
        'line-opacity': 0.6,
      },
    },

    // 5. Road Network (Hierarchical Tactical High-Vis)
    {
      id: 'road-local',
      type: 'line',
      source: 'carto',
      'source-layer': 'transportation',
      filter: ['in', 'class', 'minor', 'service', 'street'],
      paint: {
        'line-color': BALTIC_SLATE_PALETTE.roadLocal,
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.5, 14, 2, 17, 4],
        'line-opacity': 0.65,
      },
    },
    {
      id: 'road-secondary',
      type: 'line',
      source: 'carto',
      'source-layer': 'transportation',
      filter: ['in', 'class', 'secondary', 'tertiary'],
      paint: {
        'line-color': BALTIC_SLATE_PALETTE.roadSecondary,
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.2, 14, 3, 17, 6],
        'line-opacity': 0.85,
      },
    },
    {
      id: 'road-primary',
      type: 'line',
      source: 'carto',
      'source-layer': 'transportation',
      filter: ['in', 'class', 'primary'],
      paint: {
        'line-color': BALTIC_SLATE_PALETTE.roadPrimary,
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.8, 14, 4.5, 17, 8],
        'line-opacity': 0.95,
      },
    },
    {
      id: 'road-motorway-casing',
      type: 'line',
      source: 'carto',
      'source-layer': 'transportation',
      filter: ['in', 'class', 'motorway', 'trunk'],
      paint: {
        'line-color': '#78350f',
        'line-width': ['interpolate', ['linear'], ['zoom'], 9, 2.5, 13, 6, 16, 11],
      },
    },
    {
      id: 'road-motorway-core',
      type: 'line',
      source: 'carto',
      'source-layer': 'transportation',
      filter: ['in', 'class', 'motorway', 'trunk'],
      paint: {
        'line-color': BALTIC_SLATE_PALETTE.roadMotorway,
        'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1.5, 13, 4, 16, 8],
      },
    },

    // 6. 3D Building Extrusions (Baltic Graphite with luminous top)
    {
      id: '3d-buildings-baltic',
      type: 'fill-extrusion',
      source: 'carto',
      'source-layer': 'building',
      minzoom: 13,
      paint: {
        'fill-extrusion-color': [
          'interpolate',
          ['linear'],
          ['zoom'],
          13,
          BALTIC_SLATE_PALETTE.building3dBase,
          16,
          BALTIC_SLATE_PALETTE.building3dRoof,
        ],
        'fill-extrusion-height': [
          'interpolate',
          ['linear'],
          ['zoom'],
          13,
          0,
          14.5,
          ['coalesce', ['get', 'render_height'], 15],
        ],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
        'fill-extrusion-opacity': 0.85,
      },
    },

    // 7. Place Labels (Szczecin Districts)
    {
      id: 'district-labels',
      type: 'symbol',
      source: 'carto',
      'source-layer': 'place',
      minzoom: 11,
      layout: {
        'text-field': ['get', 'name'],
        'text-size': 11,
        'text-font': ['Open Sans Regular'],
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.12,
      },
      paint: {
        'text-color': '#94a3b8',
        'text-halo-color': '#090d16',
        'text-halo-width': 1.5,
      },
    },
  ],
};

export const BALTIC_SLATE_FALLBACK_URL =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
