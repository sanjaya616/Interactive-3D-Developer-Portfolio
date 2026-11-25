import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Gamepad2, Keyboard, Smartphone } from 'lucide-react';
import { PortfolioLayout } from '../components/PortfolioLayout';

const DESKTOP_CONTROLS = [
  { keys: 'W / Arrow Up', action: 'Accelerate forward' },
  { keys: 'S / Arrow Down', action: 'Reverse' },
  { keys: 'A / Arrow Left', action: 'Steer left' },
  { keys: 'D / Arrow Right', action: 'Steer right' },
  { keys: 'X', action: 'Handbrake drift with tire skid marks' },
  { keys: 'SHIFT', action: 'Engage turquoise boost' },
  { keys: 'B or CTRL', action: 'Brake hard' },
  { keys: 'SPACE', action: 'Jump over obstacles' },
  { keys: 'ENTER', action: 'Interact with nearby landmark' },
  { keys: 'M', action: 'Open World Map, Collectibles & Secrets' },
  { keys: 'C', action: 'Cycle camera (Chase / Close / Wide / Overhead / Free Orbit)' },
  { keys: 'Mouse Drag / Wheel', action: 'Rotate camera around vehicle & zoom' },
  { keys: 'L', action: 'Toggle vehicle headlights' },
  { keys: 'P', action: 'Open Photo Mode (pan, orbit, FOV, PNG capture)' },
  { keys: 'R', action: 'Respawn vehicle at Starting Plaza' },
  { keys: 'H', action: 'Honk horn (when audio is enabled)' },
  { keys: 'ESC', action: 'Pause menu (SFX/Music Mixer, Weather, Quality & Reduced Motion)' },
];

const GAMEPAD_CONTROLS = [
  { input: 'Left Stick (X-Axis) / D-Pad', action: 'Steer left & right' },
  { input: 'Right Stick', action: 'Rotate camera around vehicle' },
  { input: 'RT (Right Trigger) / D-Pad Up', action: 'Accelerate forward' },
  { input: 'LT (Left Trigger) / D-Pad Down', action: 'Reverse' },
  { input: 'A / Cross Button', action: 'Jump (and Start from Title)' },
  { input: 'B / Circle Button', action: 'Handbrake drift (or Resume from Pause)' },
  { input: 'RB (Right Bumper)', action: 'Engage Boost' },
  { input: 'X / Square Button', action: 'Brake hard' },
  { input: 'Y / Triangle Button', action: 'Open nearby landmark' },
  { input: 'LB / View / Start', action: 'Cycle camera · Map · Pause' },
];

export const GuidePage: React.FC = () => {
  return (
    <PortfolioLayout
      title="CONTROLS & GUIDE"
      subtitle="Desktop Keyboard, Mobile Touch & Gamepad Diagrams · Exploring Sanjaya's World"
    >
      {/* Visual Control Diagrams */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* 1. Desktop Keyboard Diagram */}
        <section className="ui-card p-5">
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#EC6D2C]">
            <Keyboard className="w-4 h-4" />
            <span>DESKTOP KEYBOARD</span>
          </div>
          <h2 className="font-display text-3xl font-bold text-[#26211E] mt-1">
            DRIVE &amp; INTERACT KEYS
          </h2>
          <svg
            viewBox="0 0 300 175"
            className="w-full mt-3 rounded-xl bg-[#F5E9D4] border border-[#D9C3A3]"
            role="img"
            aria-label="Desktop keyboard control diagram showing WASD movement, Shift boost, Space jump, and Enter interact"
          >
            {/* W A S D cluster */}
            <rect x="52" y="24" width="32" height="30" rx="5" fill="#FFF9F0" stroke="#26211E" strokeWidth="2.5" />
            <text x="68" y="44" textAnchor="middle" fontSize="13" fontWeight="800" fill="#26211E">W</text>
            <rect x="16" y="60" width="32" height="30" rx="5" fill="#FFF9F0" stroke="#26211E" strokeWidth="2.5" />
            <text x="32" y="80" textAnchor="middle" fontSize="13" fontWeight="800" fill="#26211E">A</text>
            <rect x="52" y="60" width="32" height="30" rx="5" fill="#FFF9F0" stroke="#26211E" strokeWidth="2.5" />
            <text x="68" y="80" textAnchor="middle" fontSize="13" fontWeight="800" fill="#26211E">S</text>
            <rect x="88" y="60" width="32" height="30" rx="5" fill="#FFF9F0" stroke="#26211E" strokeWidth="2.5" />
            <text x="104" y="80" textAnchor="middle" fontSize="13" fontWeight="800" fill="#26211E">D</text>
            <text x="68" y="106" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#61564E">DRIVE (OR ARROWS)</text>

            {/* SHIFT & SPACE */}
            <rect x="16" y="122" width="76" height="30" rx="5" fill="#21968B" stroke="#26211E" strokeWidth="2.5" />
            <text x="54" y="141" textAnchor="middle" fontSize="11" fontWeight="800" fill="#FFF9F0">SHIFT · BOOST</text>
            <rect x="100" y="122" width="110" height="30" rx="5" fill="#EC6D2C" stroke="#26211E" strokeWidth="2.5" />
            <text x="155" y="141" textAnchor="middle" fontSize="11" fontWeight="800" fill="#FFF9F0">SPACE · JUMP</text>

            {/* M, C, ENTER */}
            <rect x="148" y="24" width="36" height="30" rx="5" fill="#FFF9F0" stroke="#26211E" strokeWidth="2.5" />
            <text x="166" y="44" textAnchor="middle" fontSize="12" fontWeight="800" fill="#26211E">M</text>
            <text x="166" y="67" textAnchor="middle" fontSize="9" fontWeight="800" fill="#61564E">MAP</text>

            <rect x="192" y="24" width="36" height="30" rx="5" fill="#FFF9F0" stroke="#26211E" strokeWidth="2.5" />
            <text x="210" y="44" textAnchor="middle" fontSize="12" fontWeight="800" fill="#26211E">C</text>
            <text x="210" y="67" textAnchor="middle" fontSize="9" fontWeight="800" fill="#61564E">CAM</text>

            <rect x="236" y="24" width="48" height="30" rx="5" fill="#FFF9F0" stroke="#26211E" strokeWidth="2.5" />
            <text x="260" y="44" textAnchor="middle" fontSize="12" fontWeight="800" fill="#26211E">R</text>
            <text x="260" y="67" textAnchor="middle" fontSize="9" fontWeight="800" fill="#61564E">RESET</text>

            <rect x="220" y="84" width="64" height="68" rx="6" fill="#26211E" />
            <text x="252" y="114" textAnchor="middle" fontSize="11" fontWeight="800" fill="#FFF9F0">ENTER</text>
            <text x="252" y="130" textAnchor="middle" fontSize="9" fontWeight="700" fill="#F5E9D4">OPEN ZONE</text>
          </svg>
        </section>

        {/* 2. Touch Controls Diagram */}
        <section className="ui-card p-5">
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#21968B]">
            <Smartphone className="w-4 h-4" />
            <span>MOBILE &amp; TABLET TOUCH</span>
          </div>
          <h2 className="font-display text-3xl font-bold text-[#26211E] mt-1">
            ON-SCREEN HUD PADS
          </h2>
          <svg
            viewBox="0 0 300 175"
            className="w-full mt-3 rounded-xl bg-[#F5E9D4] border border-[#D9C3A3]"
            role="img"
            aria-label="Touch screen diagram with left steering buttons and right pedals, jump, and boost buttons"
          >
            {/* Phone frame */}
            <rect x="14" y="14" width="272" height="147" rx="14" fill="#FFF9F0" stroke="#26211E" strokeWidth="3" />
            <text x="150" y="38" textAnchor="middle" fontSize="10" fontWeight="800" fill="#61564E">AUTO-ENABLED ON TOUCH VIEWPORTS</text>
            {/* Left Steer */}
            <rect x="28" y="102" width="44" height="42" rx="8" fill="#F5E9D4" stroke="#26211E" strokeWidth="2.5" />
            <text x="50" y="128" textAnchor="middle" fontSize="14" fontWeight="800" fill="#26211E">◀</text>
            <rect x="78" y="102" width="44" height="42" rx="8" fill="#F5E9D4" stroke="#26211E" strokeWidth="2.5" />
            <text x="100" y="128" textAnchor="middle" fontSize="14" fontWeight="800" fill="#26211E">▶</text>
            <text x="75" y="92" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#26211E">STEER</text>

            {/* Right Pedals & Action */}
            <rect x="176" y="64" width="46" height="32" rx="8" fill="#21968B" stroke="#26211E" strokeWidth="2" />
            <text x="199" y="84" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#FFF9F0">BOOST</text>
            <rect x="228" y="64" width="44" height="32" rx="8" fill="#E69F38" stroke="#26211E" strokeWidth="2" />
            <text x="250" y="84" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#26211E">JUMP</text>

            <rect x="176" y="102" width="46" height="42" rx="8" fill="#E65448" stroke="#26211E" strokeWidth="2.5" />
            <text x="199" y="127" textAnchor="middle" fontSize="10" fontWeight="800" fill="#FFF9F0">REV</text>
            <rect x="228" y="102" width="44" height="42" rx="8" fill="#EC6D2C" stroke="#26211E" strokeWidth="2.5" />
            <text x="250" y="127" textAnchor="middle" fontSize="10" fontWeight="800" fill="#FFF9F0">GAS</text>
          </svg>
        </section>

        {/* 3. Gamepad Controller Diagram */}
        <section className="ui-card p-5">
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#CC5318]">
            <Gamepad2 className="w-4 h-4" />
            <span>USB / BLUETOOTH GAMEPAD</span>
          </div>
          <h2 className="font-display text-3xl font-bold text-[#26211E] mt-1">
            CONTROLLER MAPPING
          </h2>
          <svg
            viewBox="0 0 300 175"
            className="w-full mt-3 rounded-xl bg-[#F5E9D4] border border-[#D9C3A3]"
            role="img"
            aria-label="Gamepad controller diagram mapping left stick steering, LT reverse, RT throttle, A jump, and B or RB boost"
          >
            {/* Triggers */}
            <rect x="52" y="16" width="56" height="20" rx="6" fill="#26211E" />
            <text x="80" y="30" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#FFF9F0">LT · REV</text>
            <rect x="192" y="16" width="56" height="20" rx="6" fill="#EC6D2C" stroke="#26211E" strokeWidth="2" />
            <text x="220" y="30" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#FFF9F0">RT · GAS</text>

            {/* Controller silhouette */}
            <path
              d="M48 64 C48 44, 252 44, 252 64 L268 134 C272 154, 240 162, 224 142 L202 118 L98 118 L76 142 C60 162, 28 154, 32 134 Z"
              fill="#FFF9F0"
              stroke="#26211E"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            {/* Left Stick */}
            <circle cx="88" cy="84" r="17" fill="#26211E" />
            <text x="88" y="88" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#FFF9F0">STEER</text>

            {/* Face buttons */}
            <circle cx="212" cy="70" r="9" fill="#E65448" stroke="#26211E" strokeWidth="2" />
            <text x="212" y="73" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#FFF9F0">Y</text>
            <circle cx="230" cy="86" r="9" fill="#21968B" stroke="#26211E" strokeWidth="2" />
            <text x="230" y="89" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#FFF9F0">B</text>
            <circle cx="212" cy="102" r="9" fill="#EC6D2C" stroke="#26211E" strokeWidth="2" />
            <text x="212" y="105" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#FFF9F0">A</text>
            <circle cx="194" cy="86" r="9" fill="#E69F38" stroke="#26211E" strokeWidth="2" />
            <text x="194" y="89" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#26211E">X</text>

            <text x="150" y="148" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#61564E">
              A=JUMP · B=BOOST · Y=OPEN · X=BRAKE
            </text>
          </svg>
        </section>
      </div>

      {/* Detailed Control Reference Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 bg-[#FFF9F0] border-2 border-[#26211E] rounded-2xl overflow-hidden shadow-[0_6px_0_#26211E]">
          <div className="px-5 py-3 bg-[#F5E9D4] border-b-2 border-[#26211E] text-xs font-extrabold text-[#26211E]">
            DESKTOP KEYBOARD REFERENCE
          </div>
          <table className="w-full text-left border-collapse">
            <tbody>
              {DESKTOP_CONTROLS.map((row) => (
                <tr key={row.keys} className="border-b border-[#E6D3B5] last:border-0 text-sm font-bold">
                  <td className="py-3 px-5 font-extrabold text-[#EC6D2C] whitespace-nowrap">
                    {row.keys}
                  </td>
                  <td className="py-3 px-5 text-[#26211E]">{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="lg:col-span-5 space-y-5">
          <div className="bg-[#FFF9F0] border-2 border-[#26211E] rounded-2xl overflow-hidden shadow-[0_6px_0_#26211E]">
            <div className="px-5 py-3 bg-[#F5E9D4] border-b-2 border-[#26211E] text-xs font-extrabold text-[#26211E]">
              GAMEPAD CONTROLLER REFERENCE
            </div>
            <table className="w-full text-left border-collapse">
              <tbody>
                {GAMEPAD_CONTROLS.map((row) => (
                  <tr key={row.input} className="border-b border-[#E6D3B5] last:border-0 text-xs sm:text-sm font-bold">
                    <td className="py-2.5 px-4 font-extrabold text-[#21968B]">{row.input}</td>
                    <td className="py-2.5 px-4 text-[#26211E]">{row.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-[#F5E9D4] border-2 border-[#26211E] rounded-2xl p-6 shadow-[0_6px_0_#26211E]">
            <h2 className="font-display text-3xl font-bold text-[#26211E]">
              READY TO DRIVE?
            </h2>
            <p className="mt-2 text-xs sm:text-sm font-semibold text-[#61564E] leading-relaxed">
              Plug in any standard gamepad or use keyboard / touch controls to explore all 9 destinations across Sanjaya&apos;s World.
            </p>
            <Link
              to="/?autostart=1"
              className="mt-4 w-full py-3 rounded-xl bg-[#EC6D2C] text-[#FFF9F0] border-2 border-[#26211E] shadow-[0_3px_0_#26211E] text-sm font-extrabold flex items-center justify-center gap-2 hover:bg-[#CC5318] transition-colors"
            >
              <Compass className="w-4 h-4" />
              <span>Launch 3D World</span>
            </Link>
          </div>
        </aside>
      </div>
    </PortfolioLayout>
  );
};
