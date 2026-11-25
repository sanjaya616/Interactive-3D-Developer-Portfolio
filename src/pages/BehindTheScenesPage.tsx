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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {VERIFIED_STACK_PILLARS.map((pillar) => (
          <section
            key={pillar.number}
            className="ui-card ui-card-interactive bg-[#FFF9F0] rounded-2xl p-6"
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
