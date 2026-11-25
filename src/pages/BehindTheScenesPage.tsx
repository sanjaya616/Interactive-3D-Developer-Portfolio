import React from 'react';
import { PortfolioLayout } from '../components/PortfolioLayout';

const VERIFIED_STACK_PILLARS = [
  {
    number: '01',
    name: 'Three.js',
    role: '3D World & Vehicle Garage Rendering',
    body: 'Powers the 9-destination open-world terrain, Emerald Lagoon Bridge, West Ridge Tunnel, instanced vegetation, ACES Filmic tone mapping, RoomEnvironment PBR reflections, and the interactive 3D Vehicle Garage showroom preview.',
  },
  {
    number: '02',
    name: 'Rapier (@dimforge/rapier3d-compat)',
    role: '60 Hz WebAssembly Rigid-Body Physics',
    body: 'Drives vehicle dynamics, gravity, jump impulses, building/gate bounding colliders, terrain height sampling, and dynamic physics props (crates & traffic cones) inside vehiclePhysics.ts.',
  },
  {
    number: '03',
    name: 'React + React Router',
    role: 'UI Layer, HUD & Classic Portfolio Routes',
    body: 'Separates the isolated WebGL canvas from accessible HUD overlays, interactive landmark challenges, the navigation drawer, and all classic portfolio pages.',
  },
  {
    number: '04',
    name: 'TypeScript',
    role: 'Type-Safe Game Loop & Centralized Schemas',
    body: 'Enforces strict contracts across vehicle customization configs, physics math utilities, centralized Sanjaya Lakshan portfolio datasets, and localStorage persistence.',
  },
  {
    number: '05',
    name: 'GSAP',
    role: 'Motion & Staggered Page Transitions',
    body: 'Animates classic page route transitions, editorial About sections, filtered Project & Skill cards, and Journey timeline milestones cleanly with gsap.context() lifecycle cleanup.',
  },
  {
    number: '06',
    name: 'Howler.js',
    role: 'Audio State Orchestration & Procedural Sound',
    body: 'Coordinates global audio initialization and mute/unmute controls via Howler alongside synthesized Web Audio engine hum, horn, jump, collectible, and chime cues (off by default until enabled).',
  },
  {
    number: '07',
    name: 'Google AI Studio',
    role: 'Development & Build Environment',
    body: 'Used as the integrated development environment to scaffold, iterate, compile, lint, and verify the application across desktop and mobile browser viewports.',
  },
];

export const BehindTheScenesPage: React.FC = () => {
  return (
    <PortfolioLayout
      title="BEHIND THE SCENES"
      subtitle="Verified Stack · Actual Technologies Implemented in Sanjaya's World"
    >
      {/* Clean Runtime Architecture Diagram */}
      <section className="ui-card-featured bg-[#F5E9D4]/80! p-5 sm:p-6 mb-8">
        <div className="text-xs font-extrabold tracking-wider text-[#21968B]">
          ARCHITECTURE OVERVIEW
        </div>
        <h2 className="font-display text-4xl font-bold text-[#26211E] mt-0.5">
          ISOLATED 3D LOOP &amp; PORTFOLIO LAYER
        </h2>
        <p className="mt-1 text-xs sm:text-sm font-semibold text-[#61564E]">
          The WebGL canvas and Rapier3D physics engine mount once and communicate with React overlays via throttled snapshots so HUD state changes never interrupt driving.
        </p>

        <svg
          viewBox="0 0 840 165"
          className="w-full h-auto mt-4 rounded-xl bg-[#FFF9F0] border border-[#CBB18D]"
          role="img"
          aria-label="System architecture diagram linking React Router UI, AppState and Firebase persistence, and the Three.js plus Rapier3D 60Hz game loop"
        >
          {/* Node 1: React UI */}
          <rect x="24" y="26" width="230" height="112" rx="14" fill="#F5E9D4" stroke="#26211E" strokeWidth="2.5" />
          <text x="139" y="54" textAnchor="middle" fontSize="13" fontWeight="800" fill="#EC6D2C">PRESENTATION LAYER</text>
          <text x="139" y="78" textAnchor="middle" fontSize="14" fontWeight="800" fill="#26211E">React 19 + Router</text>
          <text x="139" y="99" textAnchor="middle" fontSize="11" fontWeight="700" fill="#61564E">15 Portfolio Routes · Game HUD</text>
          <text x="139" y="116" textAnchor="middle" fontSize="11" fontWeight="700" fill="#61564E">GSAP Motion · Tailwind CSS v4</text>

          {/* Connector 1 -> 2 */}
          <line x1="254" y1="82" x2="305" y2="82" stroke="#26211E" strokeWidth="2.5" strokeDasharray="5 4" />
          <polygon points="301,76 312,82 301,88" fill="#26211E" />

          {/* Node 2: AppState + Persistence */}
          <rect x="312" y="26" width="216" height="112" rx="14" fill="#FFF9F0" stroke="#21968B" strokeWidth="2.5" />
          <text x="420" y="54" textAnchor="middle" fontSize="13" fontWeight="800" fill="#21968B">STATE &amp; PERSISTENCE</text>
          <text x="420" y="78" textAnchor="middle" fontSize="14" fontWeight="800" fill="#26211E">AppStateContext</text>
          <text x="420" y="99" textAnchor="middle" fontSize="11" fontWeight="700" fill="#61564E">localStorage + Cloud Firestore</text>
          <text x="420" y="116" textAnchor="middle" fontSize="11" fontWeight="700" fill="#61564E">Achievements · Race Telemetry</text>

          {/* Connector 2 -> 3 */}
          <line x1="528" y1="82" x2="579" y2="82" stroke="#26211E" strokeWidth="2.5" strokeDasharray="5 4" />
          <polygon points="575,76 586,82 575,88" fill="#26211E" />

          {/* Node 3: 3D Engine */}
          <rect x="586" y="26" width="230" height="112" rx="14" fill="#26211E" stroke="#EC6D2C" strokeWidth="2.5" />
          <text x="701" y="54" textAnchor="middle" fontSize="13" fontWeight="800" fill="#FFE08A">60 HZ ENGINE LOOP</text>
          <text x="701" y="78" textAnchor="middle" fontSize="14" fontWeight="800" fill="#FFF9F0">SceneManager</text>
          <text x="701" y="99" textAnchor="middle" fontSize="11" fontWeight="700" fill="#F5E9D4">Three.js WebGL · Rapier3D WASM</text>
          <text x="701" y="116" textAnchor="middle" fontSize="11" fontWeight="700" fill="#F5E9D4">Challenges · Howler Audio</text>
        </svg>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {VERIFIED_STACK_PILLARS.map((pillar) => (
          <section
            key={pillar.number}
            className="ui-card-interactive p-6"
          >
            <div className="text-xs font-extrabold tracking-wider text-[#EC6D2C]">
              {pillar.number}. {pillar.role.toUpperCase()}
            </div>
            <h2 className="font-display text-4xl font-bold text-[#26211E] mt-1">
              {pillar.name}
            </h2>
            <p className="mt-3 text-sm sm:text-base font-semibold text-[#61564E] leading-relaxed">
              {pillar.body}
            </p>
          </section>
        ))}
      </div>
    </PortfolioLayout>
  );
};
