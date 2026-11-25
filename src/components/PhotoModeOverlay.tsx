import React, { useState } from 'react';
import { Camera, Download, Eye, EyeOff, ZoomIn, ZoomOut, X } from 'lucide-react';

interface PhotoModeOverlayProps {
  onZoom: (delta: number) => void;
  onChangeFov: (fov: number) => void;
  onCapture: () => string;
  onExit: () => void;
}

export const PhotoModeOverlay: React.FC<PhotoModeOverlayProps> = ({
  onZoom,
  onChangeFov,
  onCapture,
  onExit,
}) => {
  const [fov, setFov] = useState(48);
  const [hideHud, setHideHud] = useState(false);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const handleCapture = () => {
    try {
      setCaptureError(null);
      const dataUrl = onCapture();
      setSnapshotUrl(dataUrl);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `sanjayas-world-photo-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      setCaptureError('Screenshot capture failed on this graphics driver. Try zooming or switching quality.');
    }
  };

  if (hideHud) {
    return (
      <div className="fixed bottom-4 right-4 z-30">
        <button
          type="button"
          onClick={() => setHideHud(false)}
          className="px-4 py-2 rounded-xl bg-[#26211E]/90 text-[#FFF9F0] border-2 border-[#FFF9F0] text-xs font-extrabold flex items-center gap-2 cursor-pointer"
        >
          <Eye className="w-4 h-4" />
          <span>Show Photo HUD</span>
        </button>
      </div>
    );
  }

  return (
    <div
      data-testid="photo-mode-overlay"
      className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-4 sm:p-6"
    >
      {/* Subtle viewfinder corner brackets */}
      <div className="pointer-events-none fixed inset-6 border border-[#FFF9F0]/25 rounded-lg" aria-hidden="true" />

      {/* Top Bar */}
      <div className="relative flex items-start justify-between gap-3">
        <div className="pointer-events-auto bg-[#FFF9F0]/95 border-2 border-[#26211E] rounded-2xl px-4 py-2.5 shadow-[0_4px_0_#26211E]">
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#EC6D2C]">
            <Camera className="w-4 h-4" />
            <span>PHOTO MODE · PAUSED</span>
          </div>
          <p className="text-[11px] font-bold text-[#61564E] mt-0.5">
            Drag to orbit · Scroll to zoom · WASD pan · E/Q altitude
          </p>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHideHud(true)}
            className="px-3.5 py-2 rounded-xl bg-[#FFF9F0]/95 border-2 border-[#26211E] shadow-[0_3px_0_#26211E] text-xs font-extrabold text-[#26211E] flex items-center gap-1.5 hover:bg-[#F5E9D4] transition-colors cursor-pointer"
          >
            <EyeOff className="w-4 h-4" />
            <span>Hide HUD</span>
          </button>
          <button
            type="button"
            onClick={onExit}
            className="px-3.5 py-2 rounded-xl bg-[#26211E] border-2 border-[#26211E] shadow-[0_3px_0_#61564E] text-xs font-extrabold text-[#FFF9F0] flex items-center gap-1.5 hover:bg-[#3A322D] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Exit [P]</span>
          </button>
        </div>
      </div>

      {/* Bottom Camera Controls & Screenshot Preview */}
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="pointer-events-auto bg-[#FFF9F0]/95 border-2 border-[#26211E] rounded-2xl p-4 shadow-[0_4px_0_#26211E] flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-[#26211E]">ZOOM</span>
            <button
              type="button"
              aria-label="Zoom In"
              onClick={() => onZoom(-1.8)}
              className="w-8 h-8 rounded-lg bg-[#F5E9D4] border border-[#26211E] flex items-center justify-center hover:bg-[#E6D3B5] cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Zoom Out"
              onClick={() => onZoom(1.8)}
              className="w-8 h-8 rounded-lg bg-[#F5E9D4] border border-[#26211E] flex items-center justify-center hover:bg-[#E6D3B5] cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>

          <label className="flex items-center gap-2.5 text-xs font-extrabold text-[#26211E]">
            <span className="tabular-nums">FOV ({fov}°)</span>
            <input
              type="range"
              min={26}
              max={85}
              value={fov}
              onChange={(e) => {
                const next = Number(e.target.value);
                setFov(next);
                onChangeFov(next);
              }}
              className="w-28 accent-[#EC6D2C] cursor-pointer"
            />
          </label>

          <button
            type="button"
            onClick={handleCapture}
            className="px-4 py-2 rounded-xl bg-[#EC6D2C] text-[#FFF9F0] border-2 border-[#26211E] shadow-[0_3px_0_#26211E] text-xs font-extrabold flex items-center gap-2 hover:bg-[#CC5318] transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Capture Photo</span>
          </button>
        </div>

        {(snapshotUrl || captureError) && (
          <div className="pointer-events-auto bg-[#26211E] text-[#FFF9F0] border-2 border-[#EC6D2C] rounded-2xl p-3 max-w-xs shadow-lg">
            {captureError ? (
              <p className="text-xs font-bold text-[#E65448]">{captureError}</p>
            ) : (
              snapshotUrl && (
                <div className="flex items-center gap-3">
                  <img
                    src={snapshotUrl}
                    alt="Captured world snapshot"
                    className="w-20 h-12 object-cover rounded-lg border border-[#FFF9F0]/40"
                  />
                  <div>
                    <div className="text-xs font-extrabold text-[#EC6D2C]">SNAPSHOT SAVED</div>
                    <div className="text-[11px] font-semibold text-[#F5E9D4]">
                      PNG downloaded to device
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};
