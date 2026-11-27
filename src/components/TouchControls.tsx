import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Hand,
  OctagonX,
  RotateCcw,
  Zap,
} from 'lucide-react';
import type { TouchInputState } from '../game/controls';
import type { WorldLandmark } from '../types/portfolio';

interface TouchControlsProps {
  nearestLandmark: WorldLandmark | null;
  jumpsRemaining?: number;
  isOverturned?: boolean;
  onRecover?: () => void;
  onChange: (partial: Partial<TouchInputState>) => void;
  onJump: () => void;
  onInteract: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  nearestLandmark,
  jumpsRemaining = 2,
  isOverturned = false,
  onRecover,
  onChange,
  onJump,
  onInteract,
}) => {
  const [pressedMap, setPressedMap] = useState<Record<string, boolean>>({});

  const setPressed = (key: string, active: boolean) => {
    setPressedMap((prev) => (prev[key] === active ? prev : { ...prev, [key]: active }));
  };

  const bindHold = (id: string, onStart: () => void, onEnd: () => void) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Synthetic events without active pointerId
      }
      setPressed(id, true);
      onStart();
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore if not captured
      }
      setPressed(id, false);
      onEnd();
    },
    onPointerCancel: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore
      }
      setPressed(id, false);
      onEnd();
    },
    onLostPointerCapture: () => {
      setPressed(id, false);
      onEnd();
    },
  });

  const activeCls = (id: string) =>
    pressedMap[id] ? 'translate-y-0.5 brightness-95 ring-2 ring-[#26211E]' : '';

  return (
    <div
      data-testid="touch-controls"
      className="fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] sm:bottom-4 [@media(max-height:480px)]:bottom-2 z-20 px-[max(0.75rem,env(safe-area-inset-left))] sm:px-6 flex items-end justify-between gap-2 pointer-events-none select-none touch-none"
    >
      {/* Left: Landmark Interact Pill + Steering Pad */}
      <div className="flex flex-col items-start gap-2 pointer-events-auto touch-none">
        <button
          type="button"
          data-testid="touch-interact"
          aria-label={
            nearestLandmark ? `Interact with ${nearestLandmark.title}` : 'Interact'
          }
          disabled={!nearestLandmark}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (nearestLandmark) onInteract();
          }}
          className={`h-11 px-3.5 rounded-xl border-[1.5px] border-[#26211E] text-xs font-extrabold flex items-center gap-1.5 touch-none transition-colors ${
            nearestLandmark
              ? 'bg-[#EC6D2C] text-[#FFF9F0] shadow-[0_3px_0_#26211E] active:translate-y-0.5 cursor-pointer'
              : 'bg-[#FFF9F0]/88 text-[#61564E] opacity-75 cursor-default'
          }`}
        >
          <Hand className="w-4 h-4 shrink-0" />
          <span className="truncate max-w-[118px]">
            {nearestLandmark ? `Open ${nearestLandmark.zoneLabel}` : 'Nearby: None'}
          </span>
        </button>

        <div className="flex items-center gap-2 touch-none">
          <button
            type="button"
            data-testid="touch-steer-left"
            aria-label="Steer Left"
            {...bindHold('left', () => onChange({ steer: 1 }), () => onChange({ steer: 0 }))}
            className={`w-[54px] h-[54px] sm:w-16 sm:h-16 rounded-2xl bg-[#FFF9F0]/95 border-[1.5px] border-[#26211E] shadow-[0_3px_0_#26211E] flex items-center justify-center text-[#26211E] touch-none cursor-pointer ${activeCls('left')}`}
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            data-testid="touch-steer-right"
            aria-label="Steer Right"
            {...bindHold('right', () => onChange({ steer: -1 }), () => onChange({ steer: 0 }))}
            className={`w-[54px] h-[54px] sm:w-16 sm:h-16 rounded-2xl bg-[#FFF9F0]/95 border-[1.5px] border-[#26211E] shadow-[0_3px_0_#26211E] flex items-center justify-center text-[#26211E] touch-none cursor-pointer ${activeCls('right')}`}
          >
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Right: Drift/Jump/Boost Row above Ergonomic Pedals */}
      <div className="flex flex-col items-end gap-2 pointer-events-auto touch-none">
        <div className="flex items-center gap-1.5 touch-none">
          {isOverturned && onRecover && (
            <button
              type="button"
              data-testid="touch-recover"
              aria-label="Recover overturned vehicle"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRecover();
              }}
              className="min-h-[44px] h-11 px-2.5 rounded-xl bg-[#E65448] border-[1.5px] border-[#26211E] shadow-[0_2px_0_#26211E] flex items-center gap-1 text-[10px] font-extrabold tracking-wider text-[#FFF9F0] touch-none cursor-pointer animate-pulse"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>REC</span>
            </button>
          )}
          <button
            type="button"
            data-testid="touch-drift"
            aria-label="Handbrake Drift"
            {...bindHold(
              'drift',
              () => onChange({ handbrake: true }),
              () => onChange({ handbrake: false }),
            )}
            className={`min-h-[44px] min-w-[44px] h-11 px-3 rounded-xl bg-[#26211E]/95 border-[1.5px] border-[#26211E] shadow-[0_2px_0_#61564E] text-[10px] font-extrabold tracking-wider text-[#FFF9F0] touch-none cursor-pointer ${activeCls('drift')}`}
          >
            DRF
          </button>
          <button
            type="button"
            data-testid="touch-jump"
            aria-label="Jump"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {
                // ignore
              }
              setPressed('jump', true);
              onJump();
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              setPressed('jump', false);
            }}
            onPointerCancel={() => setPressed('jump', false)}
            className={`min-h-[44px] min-w-[44px] h-11 px-2.5 rounded-xl bg-[#F5E9D4]/95 border-[1.5px] border-[#26211E] shadow-[0_2px_0_#26211E] text-[10px] font-extrabold tracking-wider text-[#26211E] flex items-center gap-1.5 touch-none cursor-pointer ${activeCls('jump')}`}
          >
            <span>JMP</span>
            <span className="inline-flex items-center gap-0.5" aria-hidden="true">
              {[0, 1].map((idx) => (
                <span
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full border border-[#26211E] ${
                    idx < jumpsRemaining ? 'bg-[#EC6D2C]' : 'bg-transparent opacity-40'
                  }`}
                />
              ))}
            </span>
          </button>
          <button
            type="button"
            data-testid="touch-boost"
            aria-label="Boost"
            {...bindHold(
              'boost',
              () => onChange({ boost: true, throttle: 1 }),
              () => onChange({ boost: false, throttle: 0 }),
            )}
            className={`min-h-[44px] min-w-[44px] h-11 px-3 rounded-xl bg-[#21968B]/95 border-[1.5px] border-[#26211E] shadow-[0_2px_0_#26211E] flex items-center justify-center gap-1 text-[10px] font-extrabold tracking-wider text-[#FFF9F0] touch-none cursor-pointer ${activeCls('boost')}`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">BST</span>
          </button>
        </div>

        <div className="flex items-end gap-1.5 sm:gap-2 touch-none">
          <button
            type="button"
            data-testid="touch-brake"
            aria-label="Brake"
            {...bindHold(
              'brake',
              () => onChange({ brake: true }),
              () => onChange({ brake: false }),
            )}
            className={`w-12 h-13 sm:w-14 sm:h-14 rounded-2xl bg-[#FFF9F0]/95 border-[1.5px] border-[#26211E] shadow-[0_3px_0_#26211E] flex flex-col items-center justify-center text-[#E65448] touch-none cursor-pointer ${activeCls('brake')}`}
          >
            <OctagonX className="w-5 h-5" />
            <span className="text-[9px] font-extrabold leading-none mt-0.5">BRK</span>
          </button>

          <button
            type="button"
            data-testid="touch-reverse"
            aria-label="Reverse"
            {...bindHold(
              'reverse',
              () => onChange({ throttle: -1 }),
              () => onChange({ throttle: 0 }),
            )}
            className={`w-12 h-13 sm:w-14 sm:h-14 rounded-2xl bg-[#E65448]/95 border-[1.5px] border-[#26211E] shadow-[0_3px_0_#26211E] flex flex-col items-center justify-center text-[#FFF9F0] touch-none cursor-pointer ${activeCls('reverse')}`}
          >
            <ArrowDown className="w-5 h-5" />
            <span className="text-[9px] font-extrabold leading-none mt-0.5">REV</span>
          </button>

          <button
            type="button"
            data-testid="touch-accelerate"
            aria-label="Accelerate"
            {...bindHold(
              'accel',
              () => onChange({ throttle: 1 }),
              () => onChange({ throttle: 0 }),
            )}
            className={`w-15 h-15 sm:w-17 sm:h-17 rounded-2xl bg-[#EC6D2C]/95 border-[1.5px] border-[#26211E] shadow-[0_3px_0_#26211E] flex flex-col items-center justify-center text-[#FFF9F0] touch-none cursor-pointer ${activeCls('accel')}`}
          >
            <ArrowUp className="w-6 h-6" />
            <span className="text-[9px] font-extrabold leading-none mt-0.5">GAS</span>
          </button>
        </div>
      </div>
    </div>
  );
};
