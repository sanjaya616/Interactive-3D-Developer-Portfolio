# Sanjaya's World — World Architecture & Coordinate Map

Authoritative spatial layout reference synced with `src/game/worldConstants.ts`, `src/game/worldLayout.ts`, `src/game/physicsMath.ts`, and `src/game/propPlacement.ts`.

## World Bounds & Terrain Resolution
- **Heightfield & Visual Terrain Span**: `360m × 360m` (`180 × 180` cells at exact `2.0m` grid spacing, `181 × 181` vertices) synced 1:1 with Rapier heightfield colliders.
- **Outer Scenic Skirt**: `440m × 440m` visual horizon hills (+40m ring beyond perimeter) surrounded by layered noise-displaced mountain ranges.
- **Playable Boundary**: `WORLD_HALF_SPAN = 156m` (`X, Z ∈ [-156, +156]`), bounded physically and visually by a continuous sandstone parapet/guardrail wall and dense treeline. Approaching within `12m` triggers an edge warning vignette and HUD cue.
- **Road Longitudinal Slope Cap**: `<= 0.20 m/m` (~11.3°) and `<= 4°` cross-slope across all paved & gravel segments.

## Districts (8 Zones)
1. **Central Hub** (`(-26..26, -26..28)`) — Starting Plaza (`r = 13.65m`) & Sunlit Ring Boulevard (`r = 34.0m`, `w = 5.2m`). Spawn `(0, 5.5)` facing North toward Lookout Hill.
2. **North Ridge** — Lookout Hill Summit (`(0, -72)`, elevation `+3.6m`) & Query Valley (`(48, -74)`).
3. **Western Highlands** — The Studio (`(-36, -34)`), **20m West Ridge Tunnel** (`center=(-48.25, 6.90)`, `yaw=-1.0122`), and **The Paddock** oval circuit (`center=(-78, 25.5)`, `radius=18m`).
4. **Eastern Shore** — Emerald Lagoon (`x ∈ [16, 74], z ∈ [-30, -14]`), **Emerald Lagoon Arched Bridge** (`x=40, z=-22`), Project Pavilion (`(36, -44)`), and The Workshop (`(64, 8)`).
5. **Southern Cove** — Delivery Depot (`(-38, 48)`), Signal House (`(0, 46)`) + Contact/CV Kiosk (`(11.2, 40.5)`), Signal Workshop (`(44, 48)`), and South Cove Footbridge (`x=-18, z=62`).
6. **Forest Trail District** (`NW (-152..-56, -132..-48)`) — Woodland gravel loop crossing Forest Brook Timber Bridge (`x=-104, z=-84`) up to Pine Overlook.
7. **Amphibious Lagoon** (`(-36, 118)`, `r=22.5m`) — Shallow navigable lagoon basin (`depth <= 0.68m`), floating buoys, and timber exit dock.
8. **Stunt & Drift Arena** (`x ∈ [72, 152], z ∈ [34, 134]`) — Asphalt apron, drift hairpins, 3 launch/takeoff ramps, elevated Double-Jump Sky Decks (`y=3.1m, 4.9m`), and Precision Parking bays.

## Landmarks & Buildings (9 Structures)
Every building is constructed as an architectural multi-part group at `BUILDING_FOOTPRINTS` (each sitting `>= 4.5m` clear of road edges with exact `Box3` multi-box colliders):
- **The Studio** (`-48.5, -31.5`) — Gabled creative loft with north skylight monitor & easel porch.
- **Project Pavilion** (`46.5, -45.5`) — Open exhibition gallery hall with terracotta canopy columns.
- **The Workshop** (`73.5, 9.0`) — Industrial sawtooth tech lab with exhaust stacks & workbench bay.
- **Lookout Hill Pavilion** (`0, -81.0`) — Summit stone watchtower, timber deck & beacon lantern.
- **Signal House** (`11.5, 47.0`) — Coastal masonry lighthouse relay station with rotating glass lantern & neighboring Contact Kiosk.
- **Paddock Race Control** (`-107.5, 25.5`) — Two-tier race timing tower overlooking The Paddock circuit.
- **Delivery Depot** (`-50.0, 46.5`) — Dispatch warehouse with loading canopy beside fenced Cargo Yard I.
- **Query Valley Schema Hall** (`59.0, -81.0`) — Monolithic arched relational data sanctuary.
- **Signal Workshop** (`39.0, 59.5`) — Hardware prototyping bay with parabolic dish & RFID barrier gate.

## Managed Cargo Yards & Props
All props are validated through `placeProp(kind, x, z)` (`src/game/propPlacement.ts`), guaranteeing `>= 4.0m` clearance from road edges and `>= 6.0m` from landmark entrances:
- **Crate Yard I (Delivery Depot)**: `(-54.5, 56.5)` — 6 sleeping fenced wooden cargo crates.
- **Crate Yard II (The Workshop)**: `(77.5, -3.5)` — 6 sleeping fenced workshop crates.

## Developer Inspection Keys
- **F4**: Toggle road layer debug colors (`gravel`, `asphalt`, `junction`, `curb`, `markings`, `decals`).
- **F5**: Toggle Rapier 3D wireframe collider visualizer.
- **F6**: Toggle managed prop placement audit overlay & road clearance checks.
