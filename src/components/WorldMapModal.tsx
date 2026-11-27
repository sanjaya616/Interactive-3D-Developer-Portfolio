import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Compass,
  Cpu,
  Crosshair,
  Database,
  ExternalLink,
  Flag,
  FolderKanban,
  Home,
  Layers,
  LocateFixed,
  MapPin,
  Maximize2,
  Mountain,
  Navigation,
  Radio,
  Route,
  Search,
  ShieldCheck,
  Tag,
  Truck,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  DRIFT_CIRCUIT_CHECKPOINTS,
  LAGOON_RUN_CHECKPOINTS,
  PADDOCK_CHECKPOINTS,
  PRECISION_PARKING_BAYS,
  SECRET_LOCATIONS,
  SQL_CHALLENGE_GATES,
  STUNT_ARENA_RAMPS,
  WORLD_COLLECTIBLES,
  WORLD_LANDMARKS,
} from '../data/portfolioData';
import { computeDistanceAndBearing, TOUR_STOPS, type TourState } from '../game/guidedTour';
import {
  FOREST_BROOK_BRIDGE,
  MAIN_LAGOON_BRIDGE,
  RING_LAGOON_VIADUCT,
  SOUTH_COVE_BRIDGE,
} from '../game/physicsMath';
import {
  AMPHIBIOUS_LAGOON_BOUNDS,
  EMERALD_LAGOON_BOUNDS,
  SOUTH_COVE_BOUNDS,
} from '../game/waterWaveMath';
import {
  BUILDING_FOOTPRINTS,
  EAST_JETTY_DEF,
  PADDOCK_TRACK_DEF,
  PLAZA_RADIUS,
  RING_ROAD_DEF,
  ROAD_SEGMENTS,
  WEST_RIDGE_TUNNEL_DEF,
  WORLD_DISTRICTS,
  WORLD_MAP_HALF_SPAN,
  computeRoadNetworkRoute,
  getDistrictForPoint,
} from '../game/worldLayout';
import type { ActiveChallengeHud, WorldLandmark } from '../types/portfolio';

interface WorldMapModalProps {
  open: boolean;
  playerX: number;
  playerZ: number;
  headingRad: number;
  discoveredIds: string[];
  collectedIds: string[];
  discoveredSecrets: string[];
  activeChallenge: ActiveChallengeHud;
  objectiveId: string | null;
  tourState?: TourState;
  onStartTour?: () => void;
  onEndTour?: () => void;
  onSelectObjective: (id: string | null) => void;
  onClose: () => void;
  onDriveTo: (landmark: WorldLandmark) => void;
  onOpenRoute: (route: string) => void;
}

const LAYER_STORAGE_KEY = 'sanjaya_map_layers_v1';

interface MapLayerState {
  roads: boolean;
  bridgesTunnel: boolean;
  districts: boolean;
  landmarks: boolean;
  collectibles: boolean;
  raceCheckpoints: boolean;
  sqlGates: boolean;
  secrets: boolean;
  routeGuide: boolean;
  labels: boolean;
  terrainWater: boolean;
  buildings: boolean;
}

const DEFAULT_LAYERS: MapLayerState = {
  roads: true,
  bridgesTunnel: true,
  districts: true,
  landmarks: true,
  collectibles: true,
  raceCheckpoints: true,
  sqlGates: true,
  secrets: true,
  routeGuide: true,
  labels: true,
  terrainWater: true,
  buildings: true,
};

const LAYER_META: { key: keyof MapLayerState; label: string; swatch: string }[] = [
  { key: 'districts', label: 'District Regions', swatch: '#B5C78E' },
  { key: 'terrainWater', label: 'Terrain & Water', swatch: '#21968B' },
  { key: 'roads', label: 'Road Network', swatch: '#564D47' },
  { key: 'bridgesTunnel', label: 'Bridges & Tunnel', swatch: '#8B5A3C' },
  { key: 'buildings', label: 'Building Footprints', swatch: '#26211E' },
  { key: 'landmarks', label: '9 Destinations', swatch: '#EC6D2C' },
  { key: 'labels', label: 'Map Labels', swatch: '#FFF9F0' },
  { key: 'routeGuide', label: 'Route Path', swatch: '#E65448' },
  { key: 'collectibles', label: 'Collectibles', swatch: '#FFD54F' },
  { key: 'raceCheckpoints', label: 'Paddock Checkpoints', swatch: '#CC5318' },
  { key: 'sqlGates', label: 'SQL Gates', swatch: '#3E7B9E' },
  { key: 'secrets', label: 'Secret Spots', swatch: '#5E915E' },
];

type DirectoryFilter = 'All' | 'Visited' | 'Unvisited' | 'Portfolio' | 'Circuit' | 'Challenge';

const LABEL_OFFSETS: Record<string, { dx: number; dy: number; align: 'center' | 'left' | 'right' }> = {
  studio: { dx: 0, dy: -22, align: 'center' },
  projects: { dx: 0, dy: -22, align: 'center' },
  workshop: { dx: 18, dy: -16, align: 'left' },
  lookout: { dx: 0, dy: -22, align: 'center' },
  'signal-house': { dx: -8, dy: 21, align: 'right' },
  paddock: { dx: 0, dy: -22, align: 'center' },
  delivery: { dx: -16, dy: 20, align: 'right' },
  'query-valley': { dx: 0, dy: -22, align: 'center' },
  'signal-workshop': { dx: 12, dy: 21, align: 'left' },
};

function renderLandmarkIcon(id: string) {
  const cls = 'w-3.5 h-3.5 text-[#FFF9F0]';
  switch (id) {
    case 'studio':
      return <Home className={cls} />;
    case 'projects':
      return <FolderKanban className={cls} />;
    case 'workshop':
      return <Cpu className={cls} />;
    case 'lookout':
      return <Mountain className={cls} />;
    case 'signal-house':
      return <Radio className={cls} />;
    case 'paddock':
      return <Flag className={cls} />;
    case 'delivery':
      return <Truck className={cls} />;
    case 'query-valley':
      return <Database className={cls} />;
    case 'signal-workshop':
      return <ShieldCheck className={cls} />;
    default:
      return <MapPin className={cls} />;
  }
}

function loadSavedLayers(): MapLayerState {
  try {
    const raw = window.sessionStorage.getItem(LAYER_STORAGE_KEY);
    if (!raw) return DEFAULT_LAYERS;
    return { ...DEFAULT_LAYERS, ...(JSON.parse(raw) as Partial<MapLayerState>) };
  } catch {
    return DEFAULT_LAYERS;
  }
}

export const WorldMapModal: React.FC<WorldMapModalProps> = ({
  open,
  playerX,
  playerZ,
  headingRad,
  discoveredIds,
  collectedIds,
  discoveredSecrets,
  activeChallenge,
  objectiveId,
  tourState,
  onStartTour,
  onEndTour,
  onSelectObjective,
  onClose,
  onDriveTo,
  onOpenRoute,
}) => {
  const [highlightedId, setHighlightedId] = useState<string>(
    objectiveId || WORLD_LANDMARKS[0].id,
  );
  const [layers, setLayers] = useState<MapLayerState>(loadSavedLayers);
  const [layersOpen, setLayersOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<DirectoryFilter>('All');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Pan & Zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [viewportSize, setViewportSize] = useState({ w: 680, h: 560 });

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    origPanX: number;
    origPanY: number;
    moved: boolean;
  }>({ active: false, startX: 0, startY: 0, origPanX: 0, origPanY: 0, moved: false });
  const pinchDistRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(LAYER_STORAGE_KEY, JSON.stringify(layers));
    } catch {
      // ignore storage errors
    }
  }, [layers]);

  useEffect(() => {
    if (open) {
      setHighlightedId((prev) => objectiveId || prev || WORLD_LANDMARKS[0].id);
      setLayersOpen(false);
    }
  }, [open, objectiveId]);

  useEffect(() => {
    if (!open || !viewportRef.current) return;
    const el = viewportRef.current;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 10 && rect.height > 10) {
        setViewportSize({ w: rect.width, h: rect.height });
      }
    };
    updateSize();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  const clampPan = useCallback(
    (nx: number, ny: number, targetZoom: number) => {
      const maxX = Math.max(0, (viewportSize.w * (targetZoom - 1)) / 2);
      const maxY = Math.max(0, (viewportSize.h * (targetZoom - 1)) / 2);
      return {
        x: Math.max(-maxX, Math.min(maxX, nx)),
        y: Math.max(-maxY, Math.min(maxY, ny)),
      };
    },
    [viewportSize],
  );

  const aspect = Math.max(0.7, viewportSize.w / Math.max(1, viewportSize.h));
  const halfX = aspect >= 1 ? WORLD_MAP_HALF_SPAN * aspect : WORLD_MAP_HALF_SPAN;
  const halfZ = aspect >= 1 ? WORLD_MAP_HALF_SPAN : WORLD_MAP_HALF_SPAN / aspect;

  const toMapXPct = (x: number) => ((x + halfX) / (halfX * 2)) * 100;
  const toMapZPct = (z: number) => ((z + halfZ) / (halfZ * 2)) * 100;

  const applyZoom = useCallback(
    (nextZoomRaw: number) => {
      const nextZoom = Math.max(1, Math.min(3.2, Number(nextZoomRaw.toFixed(2))));
      setZoom(nextZoom);
      setPan((prev) => clampPan(prev.x, prev.y, nextZoom));
    },
    [clampPan],
  );

  const handleFitWorld = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleCenterOnPlayer = () => {
    const nextZoom = Math.max(zoom, 1.85);
    const offsetX = (playerX / (2 * halfX)) * viewportSize.w;
    const offsetY = (playerZ / (2 * halfZ)) * viewportSize.h;
    setZoom(nextZoom);
    setPan(clampPan(-offsetX * nextZoom, -offsetY * nextZoom, nextZoom));
  };

  const routeTargetId = objectiveId || highlightedId;
  const computedRoute = useMemo(
    () => (routeTargetId ? computeRoadNetworkRoute(playerX, playerZ, routeTargetId) : null),
    [playerX, playerZ, routeTargetId],
  );

  const filteredLandmarks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return WORLD_LANDMARKS.filter((lm) => {
      const visited = discoveredIds.includes(lm.id);
      if (filterMode === 'Visited' && !visited) return false;
      if (filterMode === 'Unvisited' && visited) return false;
      if (
        (filterMode === 'Portfolio' || filterMode === 'Circuit' || filterMode === 'Challenge') &&
        lm.category !== filterMode
      ) {
        return false;
      }
      if (!q) return true;
      return (
        lm.title.toLowerCase().includes(q) ||
        lm.subtitle.toLowerCase().includes(q) ||
        lm.zoneLabel.toLowerCase().includes(q) ||
        lm.category.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, filterMode, discoveredIds]);

  if (!open) return null;

  const arrowDeg = (-headingRad * 180) / Math.PI;
  const tunnelDeg = (-WEST_RIDGE_TUNNEL_DEF.yaw * 180) / Math.PI;
  const selectedLandmark =
    WORLD_LANDMARKS.find((l) => l.id === highlightedId) || WORLD_LANDMARKS[0];
  const selectedVisited = discoveredIds.includes(selectedLandmark.id);
  const selectedIsObjective = objectiveId === selectedLandmark.id;
  const selectedNav = computeDistanceAndBearing(
    playerX,
    playerZ,
    selectedLandmark.position.x,
    selectedLandmark.position.z,
  );
  const playerDistrict = getDistrictForPoint(playerX, playerZ);
  const selectedDistrict = getDistrictForPoint(
    selectedLandmark.position.x,
    selectedLandmark.position.z,
  );

  const vStartX = Math.cos(RING_LAGOON_VIADUCT.angStart) * RING_LAGOON_VIADUCT.radius;
  const vStartZ = Math.sin(RING_LAGOON_VIADUCT.angStart) * RING_LAGOON_VIADUCT.radius;
  const vEndX = Math.cos(RING_LAGOON_VIADUCT.angEnd) * RING_LAGOON_VIADUCT.radius;
  const vEndZ = Math.sin(RING_LAGOON_VIADUCT.angEnd) * RING_LAGOON_VIADUCT.radius;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origPanX: pan.x,
      origPanY: pan.y,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.hypot(dx, dy) > 4) {
      dragRef.current.moved = true;
    }
    setPan(clampPan(dragRef.current.origPanX + dx, dragRef.current.origPanY + dy, zoom));
  };

  const handlePointerUp = () => {
    dragRef.current.active = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    applyZoom(zoom + delta);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDistRef.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchDistRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / Math.max(20, pinchDistRef.current);
      pinchDistRef.current = dist;
      applyZoom(zoom * ratio);
    }
  };

  const handleTouchEnd = () => {
    pinchDistRef.current = null;
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#26211E]/55 p-2 sm:p-4 overflow-y-auto">
      <div
        className="animate-modal-pop ui-modal-panel w-full max-w-7xl max-h-[92dvh] flex flex-col overflow-hidden my-auto"
        role="dialog"
        aria-label="World Map"
      >
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-[#F5E9D4] border-b border-[#D9C3A3] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#FFF9F0] border border-[#CBB18D] flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5 text-[#EC6D2C]" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#26211E] leading-none truncate">
                SANJAYA&apos;S WORLD ATLAS
              </h2>
              <p className="text-xs font-bold text-[#61564E] mt-0.5 tabular-nums truncate">
                {playerDistrict.name} · {discoveredIds.length}/{WORLD_LANDMARKS.length} destinations · {collectedIds.length}/{WORLD_COLLECTIBLES.length} items · {discoveredSecrets.length}/{SECRET_LOCATIONS.length} secrets
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 relative">
            <button
              type="button"
              onClick={() => applyZoom(zoom + 0.35)}
              aria-label="Zoom in map"
              title="Zoom In"
              className="ui-btn ui-btn-secondary w-8 h-8 p-0"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => applyZoom(zoom - 0.35)}
              aria-label="Zoom out map"
              title="Zoom Out"
              className="ui-btn ui-btn-secondary w-8 h-8 p-0"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleFitWorld}
              title="Reset view to full world"
              className="ui-filter-chip"
            >
              <Maximize2 className="w-3.5 h-3.5 text-[#26211E]" />
              <span>Fit World</span>
            </button>
            <button
              type="button"
              onClick={handleCenterOnPlayer}
              title="Center map on your vehicle"
              className="ui-filter-chip"
            >
              <LocateFixed className="w-3.5 h-3.5 text-[#EC6D2C]" />
              <span>Player</span>
            </button>
            <button
              type="button"
              aria-pressed={layers.labels}
              onClick={() => setLayers((prev) => ({ ...prev, labels: !prev.labels }))}
              className="ui-filter-chip"
            >
              <Tag className="w-3.5 h-3.5 text-[#21968B]" />
              <span>Labels</span>
            </button>

            <div className="relative">
              <button
                type="button"
                aria-expanded={layersOpen}
                onClick={() => setLayersOpen((o) => !o)}
                className="ui-filter-chip"
              >
                <Layers className="w-3.5 h-3.5 text-[#EC6D2C]" />
                <span>Layers</span>
              </button>

              {layersOpen && (
                <div className="absolute right-0 top-10 z-50 w-56 p-3 rounded-xl bg-[#FFF9F0] border-2 border-[#26211E] shadow-[0_6px_0_#26211E] grid grid-cols-1 gap-1.5">
                  <div className="flex items-center justify-between text-[11px] font-extrabold text-[#61564E] pb-1 border-b border-[#E6D3B5]">
                    <span>MAP LAYERS (12)</span>
                    <button
                      type="button"
                      onClick={() => setLayers(DEFAULT_LAYERS)}
                      className="text-[#EC6D2C] hover:underline cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                  {LAYER_META.map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center justify-between gap-2 text-xs font-bold text-[#26211E] cursor-pointer py-0.5"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-xs border border-[#26211E] shrink-0"
                          style={{ backgroundColor: item.swatch }}
                        />
                        <span>{item.label}</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={layers[item.key]}
                        onChange={() =>
                          setLayers((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                        }
                        className="accent-[#EC6D2C] w-3.5 h-3.5 cursor-pointer"
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close map"
              className="ui-btn ui-btn-outline w-9 h-9 p-0 ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main 2-Column Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 sm:p-5 overflow-y-auto flex-1 min-h-0">
          {/* Left: Enlarged Interactive Map Canvas + Route/Legend Strip */}
          <div className="lg:col-span-8 flex flex-col gap-2.5 min-h-0">
            <div
              ref={viewportRef}
              data-testid="world-map-viewport"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onWheel={handleWheel}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="relative w-full h-[380px] sm:h-[490px] lg:h-[580px] rounded-2xl bg-[#EED4AA] border-2 border-[#26211E] overflow-hidden shadow-inner select-none touch-none cursor-grab active:cursor-grabbing"
            >
              {/* Compass Rose & Scale Indicator */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5"
              >
                <span className="px-2 py-0.5 rounded-md bg-[#26211E]/90 text-[#FFF9F0] text-[10px] font-extrabold tabular-nums">
                  {Math.round(zoom * 100)}%
                </span>
                <div className="w-7 h-7 rounded-full bg-[#26211E] flex items-center justify-center text-[11px] font-extrabold text-[#FFF9F0]">
                  N
                </div>
              </div>

              {/* Route Summary Ribbon inside Map Corner */}
              {computedRoute && layers.routeGuide && (
                <div
                  data-testid="map-route-readout"
                  className="pointer-events-none absolute bottom-2 left-2 sm:bottom-2.5 sm:left-2.5 z-20 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-[#FFF9F0]/95 border-[1.5px] border-[#26211E] text-[10px] sm:text-[11px] font-extrabold text-[#26211E] flex items-center gap-1.5 sm:gap-2 shadow-[0_2px_0_#26211E] max-w-[calc(100%-1rem)] truncate"
                >
                  <Route
                    className={`w-3.5 h-3.5 shrink-0 ${
                      computedRoute.mode === 'direct' ? 'text-[#E65448]' : 'text-[#EC6D2C]'
                    }`}
                  />
                  <span>
                    {computedRoute.label} · {computedRoute.totalMeters}m
                  </span>
                </div>
              )}

              {/* Pan & Zoom Synchronized Canvas + HTML Marker Overlay */}
              <div
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                }}
                className="relative w-full h-full will-change-transform"
              >
                <svg
                  viewBox={`${-halfX} ${-halfZ} ${halfX * 2} ${halfZ * 2}`}
                  className="w-full h-full block pointer-events-none"
                  aria-hidden="true"
                >
                  {/* 5 Shaded District Polygons */}
                  {layers.districts &&
                    WORLD_DISTRICTS.map((dist) => (
                      <g key={dist.id}>
                        <polygon
                          points={dist.polygon.map(([px, pz]) => `${px},${pz}`).join(' ')}
                          fill={dist.tintFill}
                          stroke={dist.color}
                          strokeWidth="0.65"
                          strokeDasharray="2.5 2.5"
                        />
                        {layers.labels && (
                          <text
                            x={dist.labelX}
                            y={dist.labelZ}
                            fontSize="4.2"
                            fontWeight="800"
                            fill="#61564E"
                            opacity="0.72"
                            textAnchor="middle"
                            letterSpacing="0.4"
                          >
                            {dist.shortLabel}
                          </text>
                        )}
                      </g>
                    ))}

                  {/* Terrain Contours & Water */}
                  {layers.terrainWater && (
                    <g>
                      <rect x="-148" y="-128" width="90" height="78" rx="14" fill="#6A9A68" opacity="0.28" />
                      <path
                        d="M -112 -118 Q -104 -84 -98 -54"
                        fill="none"
                        stroke="#21968B"
                        strokeWidth="5.2"
                        strokeLinecap="round"
                        opacity="0.76"
                      />
                      <circle cx="0" cy="-72" r="23" fill="#B5C78E" opacity="0.6" />
                      <circle cx="0" cy="-72" r="15" fill="#9BB573" opacity="0.55" />
                      <rect
                        x={EMERALD_LAGOON_BOUNDS.centerX - EMERALD_LAGOON_BOUNDS.halfX}
                        y={EMERALD_LAGOON_BOUNDS.centerZ - EMERALD_LAGOON_BOUNDS.halfZ}
                        width={EMERALD_LAGOON_BOUNDS.halfX * 2}
                        height={EMERALD_LAGOON_BOUNDS.halfZ * 2}
                        rx="5"
                        fill="#21968B"
                        opacity="0.82"
                      />
                      <circle
                        cx={SOUTH_COVE_BOUNDS.centerX}
                        cy={SOUTH_COVE_BOUNDS.centerZ}
                        r={SOUTH_COVE_BOUNDS.radius}
                        fill="#21968B"
                        opacity="0.82"
                      />
                      <circle
                        cx={AMPHIBIOUS_LAGOON_BOUNDS.centerX}
                        cy={AMPHIBIOUS_LAGOON_BOUNDS.centerZ}
                        r={AMPHIBIOUS_LAGOON_BOUNDS.radius}
                        fill="#21968B"
                        opacity="0.74"
                      />
                      {LAGOON_RUN_CHECKPOINTS.map((cp, idx) => (
                        <circle
                          key={`lag-${idx}`}
                          cx={cp.x}
                          cy={cp.z}
                          r="2.2"
                          fill="#92E9FF"
                          stroke="#26211E"
                          strokeWidth="0.7"
                        />
                      ))}
                    </g>
                  )}

                  {/* Road Network (1:1 worldLayout.ts) */}
                  {layers.roads && (
                    <g>
                      <rect x="75" y="38" width="66" height="76" rx="4" fill="#564D47" opacity="0.72" />
                      {STUNT_ARENA_RAMPS.map((r) => (
                        <rect
                          key={r.id}
                          x={r.x - r.width * 0.5}
                          y={r.z - r.length * 0.42}
                          width={r.width}
                          height={r.length * 0.84}
                          rx="1.2"
                          fill="#EC6D2C"
                          stroke="#26211E"
                          strokeWidth="0.7"
                        />
                      ))}
                      {PRECISION_PARKING_BAYS.map((bay) => (
                        <rect
                          key={bay.id}
                          x={bay.x - 2.3}
                          y={bay.z - 3.0}
                          width="4.6"
                          height="6.0"
                          rx="0.6"
                          fill="none"
                          stroke="#FFE08A"
                          strokeWidth="0.85"
                        />
                      ))}
                      {DRIFT_CIRCUIT_CHECKPOINTS.map((cp) => (
                        <circle
                          key={cp.id}
                          cx={cp.x}
                          cy={cp.z}
                          r="2.3"
                          fill="#E65448"
                          stroke="#FFF9F0"
                          strokeWidth="0.7"
                        />
                      ))}
                      <circle
                        cx="0"
                        cy="0"
                        r={RING_ROAD_DEF.radius}
                        fill="none"
                        stroke="#564D47"
                        strokeWidth={RING_ROAD_DEF.width}
                        opacity="0.7"
                      />
                      <circle
                        cx={PADDOCK_TRACK_DEF.centerX}
                        cy={PADDOCK_TRACK_DEF.centerZ}
                        r={PADDOCK_TRACK_DEF.radius}
                        fill="none"
                        stroke="#564D47"
                        strokeWidth={PADDOCK_TRACK_DEF.width}
                        opacity="0.7"
                      />
                      <circle
                        cx="0"
                        cy="0"
                        r={PLAZA_RADIUS}
                        fill="#FFF9F0"
                        stroke="#EC6D2C"
                        strokeWidth="2.2"
                      />
                      {ROAD_SEGMENTS.map((seg) => (
                        <line
                          key={seg.id}
                          x1={seg.x1}
                          y1={seg.z1}
                          x2={seg.x2}
                          y2={seg.z2}
                          stroke={seg.surface === 'gravel' ? '#8B5A3C' : '#564D47'}
                          strokeWidth={seg.surface === 'gravel' ? 2.5 : seg.width * 0.85}
                          strokeDasharray={seg.surface === 'gravel' ? '4 3.5' : undefined}
                          strokeLinecap="round"
                          opacity={seg.surface === 'gravel' ? 0.82 : 0.72}
                        />
                      ))}
                    </g>
                  )}

                  {/* Bridges, Curved Ring Viaduct, East Jetty & Rotated West Ridge Tunnel */}
                  {layers.bridgesTunnel && (
                    <g>
                      <rect
                        x={MAIN_LAGOON_BRIDGE.x - MAIN_LAGOON_BRIDGE.halfWidth}
                        y={MAIN_LAGOON_BRIDGE.zCenter - MAIN_LAGOON_BRIDGE.halfLength}
                        width={MAIN_LAGOON_BRIDGE.halfWidth * 2}
                        height={MAIN_LAGOON_BRIDGE.halfLength * 2}
                        rx="1.4"
                        fill="#8B5A3C"
                        stroke="#26211E"
                        strokeWidth="1"
                      />
                      <path
                        d={`M ${vStartX.toFixed(2)} ${vStartZ.toFixed(2)} A ${RING_LAGOON_VIADUCT.radius} ${RING_LAGOON_VIADUCT.radius} 0 0 1 ${vEndX.toFixed(2)} ${vEndZ.toFixed(2)}`}
                        fill="none"
                        stroke="#B98A5E"
                        strokeWidth="5.4"
                        strokeLinecap="round"
                      />
                      <rect
                        x={SOUTH_COVE_BRIDGE.xCenter - SOUTH_COVE_BRIDGE.halfLength}
                        y={SOUTH_COVE_BRIDGE.z - SOUTH_COVE_BRIDGE.halfWidth}
                        width={SOUTH_COVE_BRIDGE.halfLength * 2}
                        height={SOUTH_COVE_BRIDGE.halfWidth * 2}
                        rx="1.2"
                        fill="#8B5A3C"
                        stroke="#26211E"
                        strokeWidth="0.9"
                      />
                      <rect
                        x={FOREST_BROOK_BRIDGE.xCenter - FOREST_BROOK_BRIDGE.halfLength}
                        y={FOREST_BROOK_BRIDGE.z - FOREST_BROOK_BRIDGE.halfWidth}
                        width={FOREST_BROOK_BRIDGE.halfLength * 2}
                        height={FOREST_BROOK_BRIDGE.halfWidth * 2}
                        rx="1.2"
                        fill="#8B5A3C"
                        stroke="#26211E"
                        strokeWidth="0.9"
                      />
                      <rect
                        x={EAST_JETTY_DEF.x - EAST_JETTY_DEF.width / 2}
                        y={EAST_JETTY_DEF.zEnd}
                        width={EAST_JETTY_DEF.width}
                        height={EAST_JETTY_DEF.zStart - EAST_JETTY_DEF.zEnd}
                        rx="0.9"
                        fill="#8B5A3C"
                        stroke="#26211E"
                        strokeWidth="0.8"
                      />
                      <g
                        transform={`translate(${WEST_RIDGE_TUNNEL_DEF.centerX}, ${WEST_RIDGE_TUNNEL_DEF.centerZ}) rotate(${tunnelDeg})`}
                      >
                        <rect
                          x={-WEST_RIDGE_TUNNEL_DEF.outerHalfWidth}
                          y={-WEST_RIDGE_TUNNEL_DEF.halfLength}
                          width={WEST_RIDGE_TUNNEL_DEF.outerHalfWidth * 2}
                          height={WEST_RIDGE_TUNNEL_DEF.length}
                          rx="1.8"
                          fill="#B98A5E"
                          stroke="#26211E"
                          strokeWidth="1"
                        />
                      </g>
                    </g>
                  )}

                  {/* Building Footprints */}
                  {layers.buildings &&
                    BUILDING_FOOTPRINTS.map((bf) => (
                      <g
                        key={bf.landmarkId}
                        transform={`translate(${bf.buildX}, ${bf.buildZ}) rotate(${(-bf.yaw * 180) / Math.PI})`}
                      >
                        <rect
                          x={-bf.colliderHx}
                          y={-bf.colliderHz}
                          width={bf.colliderHx * 2}
                          height={bf.colliderHz * 2}
                          rx="1"
                          fill="#26211E"
                          opacity="0.5"
                        />
                      </g>
                    ))}

                  {/* Dijkstra Shortest-Path / Direct Route Preview */}
                  {layers.routeGuide && computedRoute && (
                    <g>
                      {computedRoute.entryConnector && (
                        <line
                          x1={computedRoute.entryConnector[0].x}
                          y1={computedRoute.entryConnector[0].z}
                          x2={computedRoute.entryConnector[1].x}
                          y2={computedRoute.entryConnector[1].z}
                          stroke="#E65448"
                          strokeWidth="2.2"
                          strokeDasharray="3.2 2.8"
                          opacity="0.88"
                        />
                      )}
                      {computedRoute.roadPoints.length >= 2 && (
                        <polyline
                          points={computedRoute.roadPoints
                            .map((p) => `${p.x.toFixed(1)},${p.z.toFixed(1)}`)
                            .join(' ')}
                          fill="none"
                          stroke={computedRoute.mode === 'direct' ? '#E65448' : '#EC6D2C'}
                          strokeWidth="3.0"
                          strokeDasharray={computedRoute.mode === 'direct' ? '3.5 3.5' : undefined}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity="0.92"
                        />
                      )}
                    </g>
                  )}

                  {/* Paddock Race Checkpoints */}
                  {layers.raceCheckpoints &&
                    PADDOCK_CHECKPOINTS.map((cp, idx) => (
                      <g key={cp.id} transform={`translate(${cp.x}, ${cp.z})`}>
                        <circle r="3.4" fill="#CC5318" stroke="#FFF9F0" strokeWidth="1.1" />
                        <text
                          x="0"
                          y="1.2"
                          fontSize="3.3"
                          fontWeight="900"
                          fill="#FFF9F0"
                          textAnchor="middle"
                        >
                          {idx + 1}
                        </text>
                      </g>
                    ))}

                  {/* SQL Challenge Gates */}
                  {layers.sqlGates &&
                    SQL_CHALLENGE_GATES.map((g) => (
                      <rect
                        key={g.clause}
                        x={g.x - 2.2}
                        y={g.z - 2.2}
                        width="4.4"
                        height="4.4"
                        rx="1"
                        fill="#3E7B9E"
                        stroke="#FFF9F0"
                        strokeWidth="1"
                      />
                    ))}

                  {/* Collectibles */}
                  {layers.collectibles &&
                    WORLD_COLLECTIBLES.map((c) => {
                      const picked = collectedIds.includes(c.id);
                      const color =
                        c.kind === 'orb'
                          ? '#21968B'
                          : c.kind === 'token'
                            ? '#FFD54F'
                            : c.kind === 'fragment'
                              ? '#E65448'
                              : '#5E915E';
                      return (
                        <circle
                          key={c.id}
                          cx={c.x}
                          cy={c.z}
                          r={picked ? 1.5 : 2.5}
                          fill={color}
                          opacity={picked ? 0.35 : 0.95}
                          stroke="#26211E"
                          strokeWidth={picked ? 0.4 : 0.85}
                        />
                      );
                    })}

                  {/* Secret Locations */}
                  {layers.secrets &&
                    SECRET_LOCATIONS.map((s) => {
                      const found = discoveredSecrets.includes(s.id);
                      return (
                        <g key={s.id} transform={`translate(${s.x}, ${s.z})`}>
                          <circle
                            r="5.0"
                            fill={found ? '#5E915E' : '#FFF9F0'}
                            fillOpacity="0.9"
                            stroke="#26211E"
                            strokeWidth="1.2"
                            strokeDasharray="2 1"
                          />
                          <text
                            x="0"
                            y="1.7"
                            fontSize="4.8"
                            fontWeight="900"
                            fill={found ? '#FFF9F0' : '#26211E'}
                            textAnchor="middle"
                          >
                            {found ? '★' : '?'}
                          </text>
                        </g>
                      );
                    })}

                  {/* Highlight & Objective Rings */}
                  {WORLD_LANDMARKS.map((lm) => {
                    const isHighlighted = lm.id === highlightedId;
                    const isObj = lm.id === objectiveId;
                    if (!isHighlighted && !isObj) return null;
                    return (
                      <g
                        key={`ring-${lm.id}`}
                        transform={`translate(${lm.position.x}, ${lm.position.z})`}
                      >
                        {isHighlighted && (
                          <circle
                            r="11.5"
                            fill="#EC6D2C"
                            fillOpacity="0.2"
                            stroke="#26211E"
                            strokeWidth="2.1"
                          />
                        )}
                        {isObj && (
                          <circle
                            r="14.8"
                            fill="none"
                            stroke="#E65448"
                            strokeWidth="2.1"
                            strokeDasharray="4 3"
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Interactive Destination Category Markers */}
                {layers.landmarks &&
                  WORLD_LANDMARKS.map((lm) => {
                    const visited = discoveredIds.includes(lm.id);
                    const isSelected = lm.id === highlightedId;
                    const isObjective = lm.id === objectiveId;
                    const isHovered = hoveredId === lm.id;
                    const off = LABEL_OFFSETS[lm.id] || { dx: 0, dy: -22, align: 'center' };
                    const inverseScale = 1 / Math.sqrt(zoom);

                    return (
                      <div
                        key={lm.id}
                        style={{
                          left: `${toMapXPct(lm.position.x)}%`,
                          top: `${toMapZPct(lm.position.z)}%`,
                          transform: `translate(-50%, -50%) scale(${inverseScale})`,
                        }}
                        className={`absolute ${
                          isSelected || isHovered ? 'z-30' : 'z-10'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setHighlightedId(lm.id)}
                          onMouseEnter={() => setHoveredId(lm.id)}
                          onMouseLeave={() => setHoveredId(null)}
                          onFocus={() => setHoveredId(lm.id)}
                          onBlur={() => setHoveredId(null)}
                          aria-label={`Highlight ${lm.title}`}
                          style={{ backgroundColor: lm.color }}
                          className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-[#26211E] flex items-center justify-center shadow-[0_2px_0_#26211E] transition-transform cursor-pointer ${
                            isSelected
                              ? 'scale-115 ring-2 ring-[#FFF9F0]'
                              : 'hover:scale-110'
                          }`}
                        >
                          {renderLandmarkIcon(lm.id)}
                          {visited && (
                            <span
                              aria-hidden="true"
                              className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#5E915E] border border-[#26211E] text-[8px] font-black text-[#FFF9F0] flex items-center justify-center"
                            >
                              ✓
                            </span>
                          )}
                          {isObjective && (
                            <span
                              aria-hidden="true"
                              className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#E65448] border border-[#26211E] text-[8px] font-black text-[#FFF9F0] flex items-center justify-center"
                            >
                              ★
                            </span>
                          )}
                        </button>

                        {(layers.labels || isHovered || isSelected) && (
                          <div
                            style={{
                              transform: `translate(${off.dx}px, ${off.dy}px)`,
                            }}
                            className={`pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-[#FFF9F0]/95 border border-[#26211E] text-[10px] font-extrabold text-[#26211E] whitespace-nowrap shadow-[0_1px_0_#26211E] ${
                              !isHovered && !isSelected ? 'hidden sm:block' : 'block'
                            } ${
                              off.align === 'left'
                                ? 'ml-7'
                                : off.align === 'right'
                                  ? '-ml-7'
                                  : ''
                            }`}
                          >
                            {lm.zoneLabel}
                          </div>
                        )}
                      </div>
                    );
                  })}

                {/* Player Position & Heading Chevron */}
                <div
                  style={{
                    left: `${toMapXPct(playerX)}%`,
                    top: `${toMapZPct(playerZ)}%`,
                    transform: `translate(-50%, -50%) rotate(${arrowDeg}deg) scale(${1 / Math.sqrt(zoom)})`,
                  }}
                  className="absolute z-20 pointer-events-none"
                  title="Your Vehicle Heading"
                >
                  <svg width="22" height="22" viewBox="-12 -12 24 24">
                    <polygon
                      points="0,-10 7,8 0,4 -7,8"
                      fill="#26211E"
                      stroke="#FFF9F0"
                      strokeWidth="2.4"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Compact Legend & Active Challenge Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 ui-card-sand text-[11px] font-bold text-[#26211E]">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#21968B] border border-[#26211E]" />
                  <span>Orbs</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FFD54F] border border-[#26211E]" />
                  <span>Tokens</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E65448] border border-[#26211E]" />
                  <span>Fragments</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-3 h-1.5 rounded-xs bg-[#8B5A3C] border border-[#26211E]" />
                  <span>Bridges &amp; Tunnel</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-4 h-0.5 bg-[#EC6D2C]" />
                  <span>Road Route</span>
                </span>
              </div>
              {activeChallenge.id && (
                <span className="text-[11px] font-extrabold text-[#EC6D2C]">
                  Active: {activeChallenge.title} ({activeChallenge.progressText})
                </span>
              )}
            </div>
          </div>

          {/* Right: Guided Tour + Highlighted Detail Card + Searchable Directory */}
          <div className="lg:col-span-4 flex flex-col gap-3 min-h-0">
            {onStartTour && tourState && (
              <div className="p-3 rounded-xl bg-[#F5E9D4] border border-[#CBB18D] flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-extrabold text-[#21968B] flex items-center gap-1.5">
                    <Route className="w-3.5 h-3.5" />
                    <span>
                      GUIDED TOUR · {tourState.visitedStopIds.length}/{TOUR_STOPS.length} STOPS
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-[#61564E] mt-0.5">
                    {tourState.active
                      ? 'Tour beacon active in 3D world.'
                      : '5-stop scenic tour across key landmarks.'}
                  </p>
                </div>
                {tourState.active && onEndTour ? (
                  <button
                    type="button"
                    onClick={() => {
                      onEndTour();
                      onClose();
                    }}
                    className="ui-btn ui-btn-outline px-3 py-1.5 text-xs shrink-0"
                  >
                    End Tour
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onStartTour();
                      onClose();
                    }}
                    className="ui-btn ui-btn-accent px-3 py-1.5 text-xs shrink-0"
                  >
                    {tourState.completed ? 'Replay Tour' : 'Start Tour'}
                  </button>
                )}
              </div>
            )}

            {/* Highlighted Destination Detail Card */}
            <div data-testid="map-highlighted-card" className="p-3.5 ui-card-featured">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-extrabold text-[#61564E] tracking-wider flex flex-wrap items-center gap-1">
                    <span>{selectedLandmark.category.toUpperCase()}</span>
                    <span>·</span>
                    <span>{selectedDistrict.shortLabel}</span>
                    <span>·</span>
                    <span>{selectedVisited ? 'VISITED' : 'UNVISITED'}</span>
                    <span>·</span>
                    <span className="text-[#EC6D2C] inline-flex items-center gap-0.5 tabular-nums">
                      <MapPin className="w-3 h-3" />
                      {selectedNav.distanceMeters}m {selectedNav.bearingLabel}
                    </span>
                  </div>
                  <h3 className="font-display text-3xl font-bold text-[#26211E] leading-none mt-0.5">
                    {selectedLandmark.title}
                  </h3>
                  <div className="text-xs font-bold text-[#61564E] mt-0.5">
                    {selectedLandmark.subtitle}
                  </div>
                </div>
                <span
                  className="w-7 h-7 rounded-lg border-[1.5px] border-[#26211E] shrink-0 mt-0.5 flex items-center justify-center"
                  style={{ backgroundColor: selectedLandmark.color }}
                >
                  {renderLandmarkIcon(selectedLandmark.id)}
                </span>
              </div>

              <p className="text-xs font-semibold text-[#61564E] mt-2 leading-relaxed">
                {selectedLandmark.summary}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onSelectObjective(selectedIsObjective ? null : selectedLandmark.id)
                  }
                  className={`ui-btn px-2.5 py-1.5 text-xs ${
                    selectedIsObjective ? 'ui-btn-danger' : 'ui-btn-outline'
                  }`}
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>{selectedIsObjective ? 'Clear Waypoint' : 'Set Waypoint'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectObjective(selectedLandmark.id);
                    onClose();
                  }}
                  className="ui-btn ui-btn-secondary px-2.5 py-1.5 text-xs border-[#26211E]"
                >
                  <Route className="w-3.5 h-3.5 text-[#EC6D2C]" />
                  <span>Drive Route</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDriveTo(selectedLandmark)}
                  className="ui-btn ui-btn-accent px-2.5 py-1.5 text-xs"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Warp Nearby</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenRoute(selectedLandmark.route)}
                  className="ui-btn ui-btn-primary px-2.5 py-1.5 text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Page</span>
                </button>
              </div>
            </div>

            {/* Search & Filter Directory */}
            <div className="flex flex-col gap-2 min-h-0 flex-1">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#61564E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  placeholder="Filter destinations..."
                  aria-label="Filter destinations"
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#FFF9F0] border border-[#CBB18D] text-xs font-bold text-[#26211E] placeholder:text-[#61564E]/75 focus:outline-none focus:border-[#EC6D2C]"
                />
              </div>

              <div className="flex flex-wrap gap-1">
                {(['All', 'Visited', 'Unvisited', 'Portfolio', 'Circuit', 'Challenge'] as const).map(
                  (mode) => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={filterMode === mode}
                      onClick={() => setFilterMode(mode)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border cursor-pointer transition-colors ${
                        filterMode === mode
                          ? 'bg-[#26211E] text-[#FFF9F0] border-[#26211E]'
                          : 'bg-[#F5E9D4] text-[#61564E] border-[#CBB18D] hover:bg-[#E6D3B5]'
                      }`}
                    >
                      {mode}
                    </button>
                  ),
                )}
              </div>

              <div className="space-y-1.5 overflow-y-auto pr-1 max-h-[250px] lg:max-h-none lg:flex-1">
                {filteredLandmarks.length === 0 ? (
                  <div className="p-3 text-center text-xs font-bold text-[#61564E] ui-card-sand">
                    No matching destinations.
                  </div>
                ) : (
                  filteredLandmarks.map((lm) => {
                    const found = discoveredIds.includes(lm.id);
                    const selected = lm.id === highlightedId;
                    const isObj = lm.id === objectiveId;
                    const nav = computeDistanceAndBearing(
                      playerX,
                      playerZ,
                      lm.position.x,
                      lm.position.z,
                    );
                    return (
                      <button
                        key={lm.id}
                        type="button"
                        onClick={() => setHighlightedId(lm.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl border transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                          selected
                            ? 'bg-[#FFF9F0] border-2 border-[#26211E] shadow-xs'
                            : 'bg-[#F5E9D4]/55 border-[#D9C3A3] hover:bg-[#F5E9D4]'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-extrabold text-[#26211E] flex items-center gap-1.5 truncate">
                            <span
                              className="w-2.5 h-2.5 rounded-sm shrink-0"
                              style={{ backgroundColor: lm.color }}
                            />
                            <span className="truncate">{lm.title}</span>
                            {isObj && <span className="text-[#E65448]">★</span>}
                          </div>
                          <div className="text-[11px] font-semibold text-[#61564E] truncate">
                            {lm.subtitle}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[11px] font-extrabold text-[#26211E] tabular-nums">
                            {nav.distanceMeters}m {nav.bearingLabel}
                          </div>
                          <div className="text-[10px] font-bold text-[#61564E]">
                            {found ? 'Visited ✓' : 'Unvisited'}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
