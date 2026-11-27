import React, { useMemo } from 'react';
import { Compass } from 'lucide-react';
import {
  SECRET_LOCATIONS,
  STUNT_ARENA_RAMPS,
  WORLD_COLLECTIBLES,
  WORLD_LANDMARKS,
} from '../data/portfolioData';
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
  WORLD_MAP_HALF_SPAN,
  computeRoadNetworkRoute,
  getDistrictForPoint,
} from '../game/worldLayout';

interface MinimapHUDProps {
  playerX: number;
  playerZ: number;
  headingRad: number;
  discoveredIds: string[];
  collectedIds?: string[];
  discoveredSecrets?: string[];
  objectiveId: string | null;
  onOpenMap: () => void;
}

export const MinimapHUD: React.FC<MinimapHUDProps> = ({
  playerX,
  playerZ,
  headingRad,
  discoveredIds,
  collectedIds = [],
  discoveredSecrets = [],
  objectiveId,
  onOpenMap,
}) => {
  const arrowDeg = (-headingRad * 180) / Math.PI;
  const tunnelDeg = (-WEST_RIDGE_TUNNEL_DEF.yaw * 180) / Math.PI;
  const district = getDistrictForPoint(playerX, playerZ);

  const route = useMemo(
    () => (objectiveId ? computeRoadNetworkRoute(playerX, playerZ, objectiveId) : null),
    [playerX, playerZ, objectiveId],
  );

  const routePolyline = useMemo(() => {
    if (!route || route.roadPoints.length < 2) return '';
    return route.roadPoints.map((pt) => `${pt.x.toFixed(1)},${pt.z.toFixed(1)}`).join(' ');
  }, [route]);

  const vStartX = Math.cos(RING_LAGOON_VIADUCT.angStart) * RING_LAGOON_VIADUCT.radius;
  const vStartZ = Math.sin(RING_LAGOON_VIADUCT.angStart) * RING_LAGOON_VIADUCT.radius;
  const vEndX = Math.cos(RING_LAGOON_VIADUCT.angEnd) * RING_LAGOON_VIADUCT.radius;
  const vEndZ = Math.sin(RING_LAGOON_VIADUCT.angEnd) * RING_LAGOON_VIADUCT.radius;

  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={(e) => {
        e.currentTarget.blur();
        onOpenMap();
      }}
      aria-label="Open expanded world map [M]"
      title="Click to expand World Map (M)"
      className="pointer-events-auto group hidden md:flex flex-col ui-hud-panel rounded-2xl p-2 hover:bg-[#F5E9D4] active:translate-y-0.5 transition-colors cursor-pointer"
    >
      <div className="relative w-44 h-44 lg:w-48 lg:h-48 rounded-xl overflow-hidden border border-[#CBB18D] bg-[#EED6AF]">
        <span
          aria-hidden="true"
          className="absolute top-1 left-1/2 -translate-x-1/2 z-10 px-1.5 py-0.2 rounded bg-[#26211E] text-[#FFF9F0] text-[8px] font-extrabold leading-tight"
        >
          N
        </span>

        <svg
          viewBox={`${-WORLD_MAP_HALF_SPAN} ${-WORLD_MAP_HALF_SPAN} ${WORLD_MAP_HALF_SPAN * 2} ${WORLD_MAP_HALF_SPAN * 2}`}
          className="w-full h-full block"
        >
          {/* Lookout Hill, Forest Canopy & Water Features */}
          <rect x="-148" y="-128" width="90" height="78" rx="14" fill="#6A9A68" opacity="0.28" />
          <path
            d="M -112 -118 Q -104 -84 -98 -54"
            fill="none"
            stroke="#21968B"
            strokeWidth="5.2"
            strokeLinecap="round"
            opacity="0.72"
          />
          <circle cx="0" cy="-72" r="22" fill="#B5C78E" opacity="0.65" />
          <circle cx="0" cy="-72" r="14" fill="#9BB573" opacity="0.55" />
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

          {/* Stunt & Drift Arena Tarmac Pad + Launch Ramps */}
          <rect x="75" y="38" width="66" height="76" rx="4" fill="#4B4440" opacity="0.72" />
          {STUNT_ARENA_RAMPS.map((r) => (
            <rect
              key={r.id}
              x={r.x - r.width * 0.5}
              y={r.z - r.length * 0.4}
              width={r.width}
              height={r.length * 0.8}
              rx="1.2"
              fill="#EC6D2C"
              opacity="0.85"
            />
          ))}

          {/* Ring Road, Paddock Oval & Plaza */}
          <circle
            cx="0"
            cy="0"
            r={RING_ROAD_DEF.radius}
            fill="none"
            stroke="#4B4440"
            strokeWidth={RING_ROAD_DEF.width}
            opacity="0.72"
          />
          <circle
            cx={PADDOCK_TRACK_DEF.centerX}
            cy={PADDOCK_TRACK_DEF.centerZ}
            r={PADDOCK_TRACK_DEF.radius}
            fill="none"
            stroke="#4B4440"
            strokeWidth={PADDOCK_TRACK_DEF.width}
            opacity="0.72"
          />
          <circle
            cx="0"
            cy="0"
            r={PLAZA_RADIUS}
            fill="#FFF9F0"
            stroke="#EC6D2C"
            strokeWidth="2.4"
          />

          {/* Road Spokes & Gravel Trails from single source of truth */}
          {ROAD_SEGMENTS.map((seg) => (
            <line
              key={seg.id}
              x1={seg.x1}
              y1={seg.z1}
              x2={seg.x2}
              y2={seg.z2}
              stroke={seg.surface === 'gravel' ? '#8B5A3C' : '#4B4440'}
              strokeWidth={seg.surface === 'gravel' ? 2.6 : seg.width * 0.9}
              strokeDasharray={seg.surface === 'gravel' ? '4 3' : undefined}
              strokeLinecap="round"
              opacity={seg.surface === 'gravel' ? 0.8 : 0.74}
            />
          ))}

          {/* Bridges, Curved Ring Viaduct, East Jetty & Rotated West Ridge Tunnel */}
          <rect
            x={MAIN_LAGOON_BRIDGE.x - MAIN_LAGOON_BRIDGE.halfWidth}
            y={MAIN_LAGOON_BRIDGE.zCenter - MAIN_LAGOON_BRIDGE.halfLength}
            width={MAIN_LAGOON_BRIDGE.halfWidth * 2}
            height={MAIN_LAGOON_BRIDGE.halfLength * 2}
            rx="1.2"
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

          {/* Building Footprints */}
          {BUILDING_FOOTPRINTS.map((bf) => (
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
                opacity="0.45"
              />
            </g>
          ))}

          {/* Computed Objective Route Preview */}
          {route && route.entryConnector && (
            <line
              x1={route.entryConnector[0].x}
              y1={route.entryConnector[0].z}
              x2={route.entryConnector[1].x}
              y2={route.entryConnector[1].z}
              stroke="#E65448"
              strokeWidth="2.2"
              strokeDasharray="3 3"
              opacity="0.85"
            />
          )}
          {route && routePolyline && (
            <polyline
              points={routePolyline}
              fill="none"
              stroke={route.mode === 'direct' ? '#E65448' : '#EC6D2C'}
              strokeWidth="2.8"
              strokeDasharray={route.mode === 'direct' ? '3.5 3.5' : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.9"
            />
          )}

          {WORLD_COLLECTIBLES.map((c) => {
            if (collectedIds.includes(c.id)) return null;
            return (
              <circle
                key={c.id}
                cx={c.x}
                cy={c.z}
                r="2.1"
                fill={
                  c.kind === 'orb'
                    ? '#21968B'
                    : c.kind === 'token'
                      ? '#FFD54F'
                      : c.kind === 'fragment'
                        ? '#E65448'
                        : '#5E915E'
                }
                stroke="#26211E"
                strokeWidth="0.8"
              />
            );
          })}

          {SECRET_LOCATIONS.map((s) => (
            <circle
              key={s.id}
              cx={s.x}
              cy={s.z}
              r="3.2"
              fill={discoveredSecrets.includes(s.id) ? '#5E915E' : '#FFF9F0'}
              stroke="#26211E"
              strokeWidth="1.2"
              strokeDasharray="2 1"
            />
          ))}

          {WORLD_LANDMARKS.map((lm) => {
            const visited = discoveredIds.includes(lm.id);
            const isObjective = objectiveId === lm.id;
            return (
              <g key={lm.id} transform={`translate(${lm.position.x}, ${lm.position.z})`}>
                {isObjective && (
                  <circle
                    r="11.5"
                    fill="none"
                    stroke="#E65448"
                    strokeWidth="2.8"
                    strokeDasharray="4 3"
                  />
                )}
                {!visited && (
                  <circle r="7.8" fill="none" stroke="#FFF9F0" strokeWidth="2.2" />
                )}
                <circle
                  r={visited ? 5.2 : 5.6}
                  fill={lm.color}
                  stroke="#26211E"
                  strokeWidth="1.8"
                />
              </g>
            );
          })}

          <g transform={`translate(${playerX}, ${playerZ}) rotate(${arrowDeg})`}>
            <polygon
              points="0,-10 6.8,6.8 0,3.2 -6.8,6.8"
              fill="#26211E"
              stroke="#FFF9F0"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-1 px-1 text-[10px] font-extrabold text-[#26211E]">
        <span className="inline-flex items-center gap-1 min-w-0 truncate">
          <Compass className="w-3.5 h-3.5 text-[#EC6D2C] shrink-0" />
          <span className="truncate">{district.shortLabel}</span>
        </span>
        <span className="text-[#61564E] shrink-0">[M]</span>
      </div>
    </button>
  );
};
