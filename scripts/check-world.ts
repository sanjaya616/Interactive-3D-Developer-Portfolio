import { WORLD_COLLECTIBLES, WORLD_LANDMARKS } from '../data/portfolioData.ts';
import {
  computeBridgeSurfaceY,
  computeGroundHeight,
  getBridgeColliderSegments,
} from '../game/physicsMath.ts';
import { generateWorldVegetationLayout } from '../game/vegetationPlacement.ts';
import { computeWaterShoreDepth } from '../game/waterWaveMath.ts';
import {
  WORLD_PLAYABLE_HALF_SPAN,
  computeRoadNetworkRoute,
  distanceToRoadEdge,
  isInsideTunnelZone,
  validateWorldLayout,
} from '../game/worldLayout.ts';

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

const report = validateWorldLayout(RELOCATED_CRATES);
const errors: string[] = [...report.issues];

const veg = generateWorldVegetationLayout();
for (const col of veg.staticColliders) {
  const edge = distanceToRoadEdge(col.x, col.z);
  if (edge.clearanceMeters < 0.45) {
    errors.push(`Tree collider (${col.x.toFixed(1)}, ${col.z.toFixed(1)}) intrudes on ${edge.nearestRoadName}`);
  }
  if (isInsideTunnelZone(col.x, col.z)) {
    errors.push(`Tree collider (${col.x.toFixed(1)}, ${col.z.toFixed(1)}) inside West Ridge Tunnel`);
  }
}

for (const lm of WORLD_LANDMARKS) {
  if (
    Math.abs(lm.position.x) > WORLD_PLAYABLE_HALF_SPAN ||
    Math.abs(lm.position.z) > WORLD_PLAYABLE_HALF_SPAN
  ) {
    errors.push(`Landmark ${lm.id} outside playable world bounds`);
  }
  const route = computeRoadNetworkRoute(0, 5.5, lm.id);
  if (!route) {
    errors.push(`No GPS route computed from Plaza to ${lm.id}`);
  }
}

for (const c of WORLD_COLLECTIBLES) {
  if (computeWaterShoreDepth(c.x, c.z) > 0.8 && computeBridgeSurfaceY(c.x, c.z) === null) {
    errors.push(`Collectible ${c.id} sits in deep water without bridge support`);
  }
}

const segments = getBridgeColliderSegments();
for (const seg of segments) {
  const deckY = computeBridgeSurfaceY(seg.x, seg.z);
  if (deckY === null || Math.abs(seg.y + seg.hy - deckY) > 0.08) {
    errors.push(`Bridge segment ${seg.bridgeId} mismatched from deck height`);
  }
}

const groundOrigin = computeGroundHeight(0, 0);
if (Math.abs(groundOrigin) > 0.01) {
  errors.push(`Plaza ground height expected 0, got ${groundOrigin}`);
}

if (errors.length > 0) {
  console.error('World integrity check FAILED:\n' + errors.map((e) => ` - ${e}`).join('\n'));
  process.exit(1);
}

console.log(
  `World check PASSED: ${WORLD_LANDMARKS.length} landmarks, ${WORLD_COLLECTIBLES.length} collectibles, ${segments.length} bridge collider chords, ${veg.staticColliders.length} tree colliders verified.`,
);
