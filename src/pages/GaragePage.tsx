import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Compass, Gauge, Lock, Sparkles } from 'lucide-react';
import { GaragePreview3D } from '../components/GaragePreview3D';
import { PortfolioLayout } from '../components/PortfolioLayout';
import {
  GARAGE_ACCESSORY_OPTIONS,
  GARAGE_CHASSIS_OPTIONS,
  GARAGE_HEADLIGHT_OPTIONS,
  GARAGE_PAINT_PRESETS,
} from '../data/portfolioData';
import { useAppState } from '../state/AppStateContext';
import type { VehicleConfig } from '../types/portfolio';

export const GaragePage: React.FC = () => {
  const { vehicleConfig, updateVehicleConfig, unlockedSkins } = useAppState();
  const [plateInput, setPlateInput] = useState(vehicleConfig.plateText);
  const [savedBanner, setSavedBanner] = useState(false);

  const handlePlateSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = plateInput.trim().toUpperCase().slice(0, 8) || 'SANJAYA';
    setPlateInput(cleaned);
    updateVehicleConfig({ plateText: cleaned });
    setSavedBanner(true);
    window.setTimeout(() => setSavedBanner(false), 2000);
  };

  const wheelOptions: { id: VehicleConfig['wheelStyle']; label: string; desc: string }[] = [
    { id: 'all-terrain', label: 'All-Terrain', desc: 'Balanced grip on plaza stone & desert sand' },
    { id: 'sport', label: 'Rally Sport', desc: 'Compact street rims tuned for sharp cornering' },
    { id: 'dune', label: 'Dune Monster', desc: 'Wide desert tires for tall obstacle jumps' },
  ];

  const upgradeTracks: {
    key: 'engineTier' | 'suspensionTier' | 'boostTier';
    title: string;
    desc: string;
  }[] = [
    {
      key: 'engineTier',
      title: 'Engine & Drivetrain',
      desc: 'Increases top speed and forward acceleration inside the 3D world',
    },
    {
      key: 'suspensionTier',
      title: 'Suspension & Steering',
      desc: 'Improves cornering grip and agile steering response',
    },
    {
      key: 'boostTier',
      title: 'Turbo Boost & Jump',
      desc: 'Raises boost top speed, jump height, and recharge efficiency',
    },
  ];

  const activeChassis =
    GARAGE_CHASSIS_OPTIONS.find((c) => c.id === vehicleConfig.chassisType) ??
    GARAGE_CHASSIS_OPTIONS[0];
  const activeAccessory =
    GARAGE_ACCESSORY_OPTIONS.find((a) => a.id === vehicleConfig.accessory) ??
    GARAGE_ACCESSORY_OPTIONS[0];
  const activeHeadlight =
    GARAGE_HEADLIGHT_OPTIONS.find((h) => h.id === vehicleConfig.headlightEffect) ??
    GARAGE_HEADLIGHT_OPTIONS[0];

  return (
    <PortfolioLayout
      title="3D VEHICLE GARAGE"
      subtitle="Live 3D Customization Showroom · Unlockable Skins, Physics Upgrades & Accessories"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Live Interactive Three.js 3D Turntable Showroom */}
        <div className="lg:col-span-5 bg-[#F5E9D4] border-2 border-[#26211E] rounded-2xl p-6 shadow-[0_6px_0_#26211E] lg:sticky lg:top-24">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <div className="text-xs font-extrabold text-[#61564E]">LIVE 3D SHOWROOM</div>
              <h2 className="font-display text-4xl font-bold text-[#26211E] leading-none mt-0.5">
                {activeChassis.label.toUpperCase()}
              </h2>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-[#FFF9F0] border-2 border-[#26211E] text-xs font-extrabold tabular-nums">
              {vehicleConfig.plateText}
            </span>
          </div>

          <GaragePreview3D config={vehicleConfig} />

          <dl className="mt-4 pt-3 border-t border-[#E6D3B5] grid grid-cols-2 gap-2 text-xs">
            <div>
              <dt className="font-bold text-[#61564E]">Wheels</dt>
              <dd className="font-extrabold text-[#26211E] capitalize">
                {vehicleConfig.wheelStyle}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-[#61564E]">Accessory</dt>
              <dd className="font-extrabold text-[#26211E]">{activeAccessory.label}</dd>
            </div>
            <div>
              <dt className="font-bold text-[#61564E]">Headlights</dt>
              <dd className="font-extrabold text-[#26211E]">{activeHeadlight.label}</dd>
            </div>
            <div>
              <dt className="font-bold text-[#61564E]">Tuning Tiers</dt>
              <dd className="font-extrabold text-[#EC6D2C] inline-flex items-center gap-1 tabular-nums">
                <Sparkles className="w-3 h-3" />
                E{vehicleConfig.engineTier} · S{vehicleConfig.suspensionTier} · B{vehicleConfig.boostTier}
              </dd>
            </div>
          </dl>

          <Link
            to="/?autostart=1"
            className="mt-5 w-full py-3 rounded-xl bg-[#EC6D2C] text-[#FFF9F0] border-2 border-[#26211E] shadow-[0_3px_0_#26211E] text-sm font-extrabold flex items-center justify-center gap-2 hover:bg-[#CC5318] transition-colors"
          >
            <Compass className="w-4 h-4" />
            <span>Test Drive in 3D World</span>
          </Link>
        </div>

        {/* Right: 7 Customization & Tuning Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Vehicle Selection */}
          <section className="ui-card p-6">
            <h2 className="font-display text-4xl font-bold text-[#26211E]">
              1. VEHICLE SELECTION
            </h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {GARAGE_CHASSIS_OPTIONS.map((ch) => {
                const selected = vehicleConfig.chassisType === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => updateVehicleConfig({ chassisType: ch.id })}
                    className={`p-4 rounded-xl border-2 border-[#26211E] text-left transition-all duration-150 cursor-pointer ${
                      selected
                        ? 'bg-[#26211E] text-[#FFF9F0] shadow-[0_3px_0_#EC6D2C]'
                        : 'bg-[#FFF9F0] text-[#26211E] hover:bg-[#F5E9D4]'
                    }`}
                  >
                    <div className="text-sm font-extrabold">{ch.label}</div>
                    <div
                      className={`text-xs font-semibold mt-1 ${
                        selected ? 'text-[#F5E9D4]' : 'text-[#61564E]'
                      }`}
                    >
                      {ch.tagline}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 2. Paint & Unlockable Skins */}
          <section className="ui-card p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-4xl font-bold text-[#26211E]">
                2. PAINTS &amp; UNLOCKABLE SKINS
              </h2>
              <span className="text-xs font-extrabold text-[#61564E] tabular-nums">
                {unlockedSkins.length}/{GARAGE_PAINT_PRESETS.length} Unlocked
              </span>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {GARAGE_PAINT_PRESETS.map((preset) => {
                const isUnlocked = unlockedSkins.includes(preset.id);
                const selected =
                  vehicleConfig.skinId === preset.id ||
                  vehicleConfig.paintColor.toLowerCase() === preset.hex.toLowerCase();
                return (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={!isUnlocked}
                    onClick={() => {
                      if (!isUnlocked) return;
                      updateVehicleConfig({
                        skinId: preset.id,
                        paintColor: preset.hex,
                        accentColor: preset.accent,
                      });
                    }}
                    className={`p-3 rounded-xl border-2 border-[#26211E] text-left transition-all duration-150 ${
                      !isUnlocked
                        ? 'bg-[#F5E9D4]/45 opacity-70 cursor-not-allowed'
                        : selected
                          ? 'bg-[#F5E9D4] shadow-[0_3px_0_#26211E] cursor-pointer'
                          : 'bg-[#FFF9F0] hover:bg-[#F5E9D4]/60 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="w-6 h-6 rounded-full border-2 border-[#26211E]"
                        style={{ backgroundColor: preset.hex }}
                      />
                      {!isUnlocked ? (
                        <Lock className="w-4 h-4 text-[#61564E]" />
                      ) : selected ? (
                        <Check className="w-4 h-4 text-[#26211E]" />
                      ) : null}
                    </div>
                    <div className="mt-2 text-xs font-extrabold text-[#26211E]">
                      {preset.name}
                    </div>
                    {preset.unlockAchievementId && (
                      <div className="mt-0.5 text-[10px] font-bold text-[#61564E]">
                        {isUnlocked ? 'Unlocked!' : preset.unlockLabel}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 3. Physics Vehicle Upgrades */}
          <section className="ui-card p-6">
            <div className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-[#EC6D2C]" />
              <h2 className="font-display text-4xl font-bold text-[#26211E]">
                3. PERFORMANCE UPGRADES
              </h2>
            </div>
            <div className="mt-4 space-y-3">
              {upgradeTracks.map((track) => {
                const currentTier = vehicleConfig[track.key];
                return (
                  <div
                    key={track.key}
                    className="p-3.5 rounded-xl bg-[#F5E9D4]/70 border border-[#D9C3A3] flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-extrabold text-[#26211E]">{track.title}</div>
                      <div className="text-xs font-semibold text-[#61564E]">{track.desc}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {([1, 2, 3] as const).map((tier) => (
                        <button
                          key={tier}
                          type="button"
                          onClick={() => updateVehicleConfig({ [track.key]: tier })}
                          className={`px-3 py-1.5 rounded-lg border-2 border-[#26211E] text-xs font-extrabold cursor-pointer transition-colors ${
                            currentTier === tier
                              ? 'bg-[#EC6D2C] text-[#FFF9F0]'
                              : 'bg-[#FFF9F0] text-[#26211E] hover:bg-[#E6D3B5]'
                          }`}
                        >
                          Tier {tier}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 4. Wheel Customization */}
          <section className="ui-card p-6">
            <h2 className="font-display text-4xl font-bold text-[#26211E]">
              4. WHEEL CUSTOMIZATION
            </h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {wheelOptions.map((wo) => {
                const selected = vehicleConfig.wheelStyle === wo.id;
                return (
                  <button
                    key={wo.id}
                    type="button"
                    onClick={() => updateVehicleConfig({ wheelStyle: wo.id })}
                    className={`p-3.5 rounded-xl border-2 border-[#26211E] text-left cursor-pointer transition-colors ${
                      selected
                        ? 'bg-[#26211E] text-[#FFF9F0]'
                        : 'bg-[#FFF9F0] text-[#26211E] hover:bg-[#F5E9D4]'
                    }`}
                  >
                    <div className="text-sm font-extrabold">{wo.label}</div>
                    <div
                      className={`text-xs font-semibold mt-1 ${
                        selected ? 'text-[#F5E9D4]' : 'text-[#61564E]'
                      }`}
                    >
                      {wo.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 5. Accessories */}
          <section className="ui-card p-6">
            <h2 className="font-display text-4xl font-bold text-[#26211E]">
              5. ROOF &amp; REAR ACCESSORIES
            </h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {GARAGE_ACCESSORY_OPTIONS.map((acc) => {
                const selected = vehicleConfig.accessory === acc.id;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => updateVehicleConfig({ accessory: acc.id })}
                    className={`p-3.5 rounded-xl border-2 border-[#26211E] text-left cursor-pointer transition-all duration-150 ${
                      selected
                        ? 'bg-[#F5E9D4] shadow-[0_3px_0_#26211E]'
                        : 'bg-[#FFF9F0] hover:bg-[#F5E9D4]/55'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-extrabold text-[#26211E]">{acc.label}</span>
                      {selected && <Check className="w-4 h-4 text-[#EC6D2C] shrink-0" />}
                    </div>
                    <p className="text-xs font-semibold text-[#61564E] mt-1">{acc.desc}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 6. Headlight Effects */}
          <section className="ui-card p-6">
            <h2 className="font-display text-4xl font-bold text-[#26211E]">
              6. HEADLIGHT EFFECTS
            </h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {GARAGE_HEADLIGHT_OPTIONS.map((hl) => {
                const selected = vehicleConfig.headlightEffect === hl.id;
                return (
                  <button
                    key={hl.id}
                    type="button"
                    onClick={() => updateVehicleConfig({ headlightEffect: hl.id })}
                    className={`p-3.5 rounded-xl border-2 border-[#26211E] text-left cursor-pointer transition-all duration-150 ${
                      selected
                        ? 'bg-[#F5E9D4] shadow-[0_3px_0_#26211E]'
                        : 'bg-[#FFF9F0] hover:bg-[#F5E9D4]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="w-6 h-6 rounded-full border-2 border-[#26211E]"
                        style={{ backgroundColor: hl.hex }}
                      />
                      {selected && <Check className="w-4 h-4 text-[#26211E]" />}
                    </div>
                    <div className="text-xs font-extrabold text-[#26211E] mt-2">{hl.label}</div>
                    <div className="text-[11px] font-semibold text-[#61564E] mt-0.5">
                      {hl.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 7. License Plate */}
          <section className="ui-card p-6">
            <h2 className="font-display text-4xl font-bold text-[#26211E]">
              7. LICENSE PLATE
            </h2>
            <form onSubmit={handlePlateSave} className="mt-3 flex flex-wrap items-center gap-3">
              <label htmlFor="plate-input" className="sr-only">
                License plate text
              </label>
              <input
                id="plate-input"
                type="text"
                maxLength={8}
                value={plateInput}
                onChange={(e) => setPlateInput(e.target.value)}
                placeholder="SANJAYA"
                className="px-4 py-2.5 rounded-xl border-2 border-[#26211E] bg-[#FFF9F0] text-sm font-extrabold uppercase tracking-wider w-48 text-[#26211E]"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#21968B] text-[#FFF9F0] border-2 border-[#26211E] text-sm font-extrabold hover:opacity-90 cursor-pointer"
              >
                Update Plate
              </button>
              {savedBanner && (
                <span className="text-xs font-extrabold text-[#5E915E]">
                  Saved to garage!
                </span>
              )}
            </form>
          </section>
        </div>
      </div>
    </PortfolioLayout>
  );
};
