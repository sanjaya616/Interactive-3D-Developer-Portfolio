# Sanjaya's World

Interactive 3D developer portfolio of **Sanjaya Lakshan** built with React 19, TypeScript, Vite, Three.js, Rapier3D, Express, Firebase, and Gemini AI Guide integration.

## Scripts

- `npm run dev` — Start Express + Vite dev server on port 3000
- `npm run lint` — Run TypeScript type checking (`tsc --noEmit`)
- `npm run build` — Build production client bundle
- `npm run check:world` — Verify terrain, bridge seams, tunnel clearance, collectibles, and road GPS routing
- `npx tsx --test src/game/*.test.ts src/server/*.test.ts` — Run unit tests

## 3D World Controls & Dev Hotkeys

- **Drive**: `W / A / S / D` or Arrow Keys
- **Nitro Boost**: `Shift` | **Double Jump**: `Space` (x2) | **Handbrake Drift**: `X`
- **Vehicle Utilities**: `F` Flip/Recover · `R` Respawn · `C` Cycle Camera · `L` Headlights · `M` World Map · `P` Photo Mode
- **Dev Debug Shortcuts** (`import.meta.env.DEV` only): `F3` Collision Wireframes · `F4` Road Layer Debug · `F5` World Bounds/Colliders · `F6` Prop Audit · `F9` Perf Monitor
