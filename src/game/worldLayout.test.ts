import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BUG_HUNT_TARGETS,
  DOUBLE_JUMP_PLATFORMS,
  DRIFT_CIRCUIT_CHECKPOINTS,
  FOREST_TRAIL_GATES,
  LAGOON_RUN_CHECKPOINTS,
  MISSION_CATALOG,
  PADDOCK_CHECKPOINTS,
  PRECISION_PARKING_BAYS,
  SQL_CHALLENGE_GATES,
  STUNT_ARENA_RAMPS,
  TIME_TRIAL_CHECKPOINTS,
  TREASURE_CHESTS,
  WORLD_COLLECTIBLES,
  WORLD_LANDMARKS,
} from '../data/portfolioData';
import {
  FOREST_BROOK_BRIDGE,
  MAIN_LAGOON_BRIDGE,
  RING_LAGOON_VIADUCT,
  SOUTH_COVE_BRIDGE,
  computeBridgeSurfaceY,
  computeGroundHeight,
  getZoneName,
} from './physicsMath';
import { generateWorldVegetationLayout } from './vegetationPlacement';
import { computeWaterShoreDepth } from './waterWaveMath';
import {
  DIRECTIONAL_SIGNS,
  WEST_RIDGE_TUNNEL_DEF,
  WORLD_DISTRICTS,
  WORLD_MAP_HALF_SPAN,
  WORLD_PLAYABLE_HALF_SPAN,
  computeRoadNetworkRoute,
  distanceToRoadEdge,
  getDistrictForPoint,
  isInsideTunnelZone,
  validateWorldLayout,
} from './worldLayout';

const RELOCATED_CRATES = [
  { x: -16.2, z: -4.2 },
  { x: -17.4, z: -4.2 },
  { x: -16.8, z: -4.2 },
  { x: 15.6, z: -4.8 },
  { x: 16.8, z: -4.8 },
  { x: 16.2, z: -4.8 },
  { x: -43.2, z: 44.6 },
  { x: -44.4, z: 44.6 },
];

test('worldLayout audit validates all signs, crates, and bridge-to-terrain seams', () => {
  const report = validateWorldLayout(RELOCATED_CRATES);
  assert.equal(report.valid, true, `Layout audit errors: ${JSON.stringify(report.issues)}`);

  for (const sc of report.signClearances) {
    assert.ok(sc.clearanceMeters >= 1.7, `Sign ${sc.id} too close to ${sc.nearestRoad} (${sc.clearanceMeters}m)`);
  }
  assert.equal(report.bridgeSeamChecks.length, 4);
  for (const bs of report.bridgeSeamChecks) {
    assert.ok(bs.groundDiffStart <= 0.08 && bs.groundDiffEnd <= 0.08, `Bridge ${bs.id} seam diff too large: ${JSON.stringify(bs)}`);
  }
  // Former broken sign position (0, -36) sits inside North road intersection
  const oldSignPos = distanceToRoadEdge(0, -36);
  assert.ok(oldSignPos.clearanceMeters < 0);
});

test('South Cove Footbridge and Forest Brook Timber Bridge span dry banks cleanly', () => {
  const startX = SOUTH_COVE_BRIDGE.xCenter - SOUTH_COVE_BRIDGE.halfLength;
  const endX = SOUTH_COVE_BRIDGE.xCenter + SOUTH_COVE_BRIDGE.halfLength;
  assert.equal(startX, -30.5);
  assert.equal(endX, -5.5);
  assert.equal(computeWaterShoreDepth(startX, SOUTH_COVE_BRIDGE.z), 0);
  assert.equal(computeWaterShoreDepth(endX, SOUTH_COVE_BRIDGE.z), 0);
  assert.ok(Math.abs(computeGroundHeight(startX, SOUTH_COVE_BRIDGE.z) - SOUTH_COVE_BRIDGE.baseY) <= 0.04);
  assert.ok(Math.abs(computeGroundHeight(endX, SOUTH_COVE_BRIDGE.z) - SOUTH_COVE_BRIDGE.baseY) <= 0.04);
  assert.ok(computeBridgeSurfaceY(MAIN_LAGOON_BRIDGE.x, MAIN_LAGOON_BRIDGE.zCenter) !== null);
  assert.ok(computeBridgeSurfaceY(Math.cos(-0.6) * RING_LAGOON_VIADUCT.radius, Math.sin(-0.6) * RING_LAGOON_VIADUCT.radius) !== null);

  const fbCrownY = computeBridgeSurfaceY(FOREST_BROOK_BRIDGE.xCenter, FOREST_BROOK_BRIDGE.z);
  assert.ok(fbCrownY !== null && fbCrownY > computeGroundHeight(FOREST_BROOK_BRIDGE.xCenter, FOREST_BROOK_BRIDGE.z) + 0.5);
  assert.equal(getZoneName(FOREST_BROOK_BRIDGE.xCenter, FOREST_BROOK_BRIDGE.z, WORLD_LANDMARKS), 'Forest Brook Timber Bridge');
});

test('West Ridge Tunnel aligns with Paddock spoke and clears all vehicle chassis + accessories', () => {
  assert.equal(isInsideTunnelZone(WEST_RIDGE_TUNNEL_DEF.centerX, WEST_RIDGE_TUNNEL_DEF.centerZ), true);
  assert.equal(isInsideTunnelZone(-42, -4), false);
  assert.equal(getZoneName(WEST_RIDGE_TUNNEL_DEF.centerX, WEST_RIDGE_TUNNEL_DEF.centerZ, WORLD_LANDMARKS), 'West Ridge Tunnel');

  // orb-three relocated inside tunnel
  const orbThree = WORLD_COLLECTIBLES.find((c) => c.id === 'orb-three');
  assert.ok(orbThree);
  assert.equal(isInsideTunnelZone(orbThree.x, orbThree.z), true);

  // Rapier vehicle collider (half-width 0.95m, max roof+cargo height 2.15m) clears tunnel interior (8.8m x 7.05m)
  const vehicleWidth = 0.95 * 2;
  const maxVehicleRoofWithCargo = 2.15;
  assert.ok(WEST_RIDGE_TUNNEL_DEF.innerHalfWidth * 2 - vehicleWidth >= 6.0);
  assert.ok(WEST_RIDGE_TUNNEL_DEF.clearHeight - maxVehicleRoofWithCargo >= 4.5);
});

test('no directional sign or tree trunk obstructs road corridors or tunnel', () => {
  for (const sd of DIRECTIONAL_SIGNS) {
    assert.equal(isInsideTunnelZone(sd.x, sd.z), false);
  }
  const veg = generateWorldVegetationLayout();
  for (const col of veg.staticColliders) {
    const roadEdge = distanceToRoadEdge(col.x, col.z);
    assert.ok(
      roadEdge.clearanceMeters >= 0.45,
      `Tree collider at (${col.x.toFixed(1)}, ${col.z.toFixed(1)}) intrudes on ${roadEdge.nearestRoadName} (${roadEdge.clearanceMeters.toFixed(2)}m)`,
    );
    assert.equal(isInsideTunnelZone(col.x, col.z), false);
  }
});

test('world map bounds, 8 districts, and Dijkstra road-network routing parity', () => {
  assert.ok(WORLD_MAP_HALF_SPAN >= WORLD_PLAYABLE_HALF_SPAN);
  assert.equal(WORLD_DISTRICTS.length, 8);
  assert.equal(getDistrictForPoint(0, 5).id, 'central');
  assert.equal(getDistrictForPoint(0, -72).id, 'north');
  assert.equal(getDistrictForPoint(-66, 18).id, 'west');
  assert.equal(getDistrictForPoint(64, 8).id, 'east');
  assert.equal(getDistrictForPoint(44, 48).id, 'south');
  assert.equal(getDistrictForPoint(-104, -84).id, 'forest-trail');
  assert.equal(getDistrictForPoint(-36, 118).id, 'amphibious-lagoon');
  assert.equal(getDistrictForPoint(106, 74).id, 'stunt-drift');

  // Plaza -> Query Valley follows connected paved route through road nodes
  const routeQuery = computeRoadNetworkRoute(0, 5.5, 'query-valley');
  assert.ok(routeQuery);
  assert.notEqual(routeQuery.mode, 'direct');
  assert.ok(routeQuery.roadPoints.length >= 4);
  assert.match(routeQuery.label, /Road/);

  // Off-road far corner closer to destination uses explicit "Direct Direction" label
  const routeDirect = computeRoadNetworkRoute(135, -110, 'query-valley');
  assert.ok(routeDirect);
  assert.equal(routeDirect.mode, 'direct');
  assert.equal(routeDirect.label, 'Direct Direction');
});

test('all 15 MISSION_CATALOG start points are dry, tunnel-free, and aligned with initial targets', () => {
  const firstTargets: Record<string, { x: number; z: number }> = {
    tour: WORLD_LANDMARKS[0].position,
    treasure: TREASURE_CHESTS[0],
    'forest-trail': FOREST_TRAIL_GATES[0],
    delivery: WORLD_LANDMARKS[0].position,
    race: PADDOCK_CHECKPOINTS[0],
    timetrial: TIME_TRIAL_CHECKPOINTS[0],
    'drift-master': DRIFT_CIRCUIT_CHECKPOINTS[0],
    'stunt-master': STUNT_ARENA_RAMPS[0],
    'double-jump-trial': DOUBLE_JUMP_PLATFORMS[0],
    'precision-parking': PRECISION_PARKING_BAYS[0],
    'lagoon-run': LAGOON_RUN_CHECKPOINTS[0],
    sql: SQL_CHALLENGE_GATES[0],
    rfid: { x: 54, z: 42 },
    bughunt: BUG_HUNT_TARGETS[0],
    memory: { x: 0, z: -72 },
  };

  for (const m of MISSION_CATALOG) {
    assert.equal(
      computeWaterShoreDepth(m.startPoint.x, m.startPoint.z),
      0,
      `Mission ${m.id} spawns inside water`,
    );
    assert.equal(
      isInsideTunnelZone(m.startPoint.x, m.startPoint.z),
      false,
      `Mission ${m.id} spawns inside tunnel`,
    );
    const target = firstTargets[m.id];
    assert.ok(target, `Missing target check for ${m.id}`);
    const dx = target.x - m.startPoint.x;
    const dz = target.z - m.startPoint.z;
    const len = Math.hypot(dx, dz);
    assert.ok(len > 1, `Mission ${m.id} too close to first target`);
    assert.equal(typeof m.startYaw, 'number', `Mission ${m.id} missing startYaw`);
    const yaw = m.startYaw as number;
    // Forward direction in vehiclePhysics.ts is (-sin(yaw), -cos(yaw))
    const fwdX = -Math.sin(yaw);
    const fwdZ = -Math.cos(yaw);
    const cosErr = (fwdX * dx + fwdZ * dz) / len;
    const errDeg = (Math.acos(Math.max(-1, Math.min(1, cosErr))) * 180) / Math.PI;
    assert.ok(
      errDeg <= 35,
      `Mission ${m.id} startYaw (${yaw.toFixed(2)}) aims ${errDeg.toFixed(1)}° off target`,
    );
  }
});
