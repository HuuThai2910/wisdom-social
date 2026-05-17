import { useRef, useState, useCallback, useEffect } from "react";
import type { MusicStickerState } from "../../hooks/useStoryMusicSticker";
import { resolveMusicMediaUrl, formatDuration } from "../../services/musicService";
import { buildS3Url } from "../../utils/s3";

interface Props {
  sticker: MusicStickerState;
  isSelected: boolean;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onSelect: () => void;
  onUpdate: (updates: Partial<MusicStickerState>) => void;
  onCycleStyle: () => void;
  onRemove: () => void;
}

/* ── Compact: text-only ─────────────────────────── */
function CompactStyle({ sticker }: { sticker: MusicStickerState }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
      <div className="w-5 h-5 flex items-center justify-center">
        <div className="flex items-end gap-[2px] h-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-[3px] bg-white rounded-full"
              style={{
                height: sticker.isPlaying ? undefined : "4px",
                animation: sticker.isPlaying
                  ? `musicBar${i} 0.${4 + i}s ease-in-out infinite alternate`
                  : "none",
              }}
            />
          ))}
        </div>
      </div>
      <div className="text-white min-w-0">
        <p className="text-[11px] font-semibold truncate leading-tight">
          {sticker.music.title}
        </p>
        <p className="text-[9px] text-white/60 truncate leading-tight">
          {sticker.music.artist}
        </p>
      </div>
    </div>
  );
}

/* ── Rectangle: card ngang ──────────────────────── */
function RectangleStyle({ sticker }: { sticker: MusicStickerState }) {
  const albumUrl = buildS3Url(sticker.music.imageUrl) || "";
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!sticker.isPlaying) return;
    const interval = setInterval(() => {
      setProgress((p) => (p >= 100 ? 0 : p + 0.5));
    }, 50);
    return () => clearInterval(interval);
  }, [sticker.isPlaying]);

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 min-w-[200px] max-w-[260px] shadow-lg">
      <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 shadow-md">
        {albumUrl ? (
          <img src={albumUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-white text-lg">♪</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-white truncate leading-tight">
          {sticker.music.title}
        </p>
        <p className="text-[10px] text-white/50 truncate leading-tight mt-0.5">
          {sticker.music.artist}
        </p>
        {/* Progress bar */}
        <div className="mt-1.5 h-[3px] bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full transition-[width] duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-[8px] text-white/30">
            {formatDuration(Math.floor((sticker.music.duration * progress) / 100))}
          </span>
          <span className="text-[8px] text-white/30">
            {formatDuration(sticker.music.duration)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Square: album card ─────────────────────────── */
function SquareStyle({ sticker }: { sticker: MusicStickerState }) {
  const albumUrl = buildS3Url(sticker.music.imageUrl) || "";

  return (
    <div className="w-[150px] rounded-2xl overflow-hidden bg-black/60 backdrop-blur-xl border border-white/10 shadow-xl">
      <div className="w-full aspect-square relative">
        {albumUrl ? (
          <img src={albumUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
            <span className="text-white text-4xl">♪</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {sticker.isPlaying && (
          <div className="absolute bottom-2 left-2 flex items-end gap-[2px] h-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-[2px] bg-white rounded-full"
                style={{
                  animation: `musicBar${i} 0.${3 + i}s ease-in-out infinite alternate`,
                }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="px-3 py-2">
        <p className="text-[11px] font-semibold text-white truncate">
          {sticker.music.title}
        </p>
        <p className="text-[9px] text-white/50 truncate">
          {sticker.music.artist}
        </p>
      </div>
    </div>
  );
}

/* ── Vinyl: rotating disc ───────────────────────── */
function VinylStyle({ sticker }: { sticker: MusicStickerState }) {
  const albumUrl = buildS3Url(sticker.music.imageUrl) || "";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-[120px] h-[120px]">
        {/* Vinyl disc */}
        <div
          className="absolute inset-0 rounded-full bg-[#1a1a1a] shadow-[0_0_20px_rgba(0,0,0,0.4),inset_0_0_30px_rgba(0,0,0,0.3)]"
          style={{
            animation: sticker.isPlaying
              ? "vinylSpin 3s linear infinite"
              : "none",
            background: `radial-gradient(circle at center,
              transparent 22%,
              #222 23%, #222 24%, #333 24.5%,
              #222 25%, #222 35%, #333 35.5%,
              #222 36%, #222 46%, #333 46.5%,
              #222 47%, #1a1a1a 48%)`,
          }}
        >
          {/* Center album art */}
          <div className="absolute top-1/2 left-1/2 w-[50px] h-[50px] -translate-x-1/2 -translate-y-1/2 rounded-full overflow-hidden border-2 border-white/10 shadow-inner">
            {albumUrl ? (
              <img
                src={albumUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-white text-sm">♪</span>
              </div>
            )}
          </div>
          {/* Center hole */}
          <div className="absolute top-1/2 left-1/2 w-[8px] h-[8px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1a1a1a] border border-white/10" />
        </div>
        {/* Glow */}
        {sticker.isPlaying && (
          <div className="absolute inset-[-4px] rounded-full bg-purple-500/10 blur-md pointer-events-none animate-pulse" />
        )}
      </div>
      <div className="text-center max-w-[130px]">
        <p className="text-[10px] font-semibold text-white truncate">
          {sticker.music.title}
        </p>
        <p className="text-[8px] text-white/50 truncate">
          {sticker.music.artist}
        </p>
      </div>
    </div>
  );
}

/* ── Hidden: audio-only indicator ────────────────── */
function HiddenStyle({ sticker }: { sticker: MusicStickerState }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/10">
      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-sm">
        <span className="text-white text-[8px]">♪</span>
      </div>
      {sticker.isPlaying && (
        <div className="flex items-end gap-[1.5px] h-2.5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-[2px] bg-white/70 rounded-full"
              style={{
                animation: `musicBar${i} 0.${4 + i}s ease-in-out infinite alternate`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main Sticker Component ─────────────────────── */
export default function StoryMusicSticker({
  sticker,
  isSelected,
  canvasRef,
  onSelect,
  onUpdate,
  onCycleStyle,
  onRemove,
}: Props) {
  const stickerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, sx: 0, sy: 0 });

  // Drag
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onSelect();

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      setIsDragging(true);
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        sx: sticker.x,
        sy: sticker.y,
      };

      const onMove = (ev: MouseEvent) => {
        const dx = ((ev.clientX - dragStart.current.x) / rect.width) * 100;
        const dy = ((ev.clientY - dragStart.current.y) / rect.height) * 100;
        onUpdate({
          x: Math.max(0, Math.min(100, dragStart.current.sx + dx)),
          y: Math.max(0, Math.min(100, dragStart.current.sy + dy)),
        });
      };
      const onUp = () => {
        setIsDragging(false);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [sticker.x, sticker.y, canvasRef, onSelect, onUpdate]
  );

  // Click to cycle style
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isDragging) onCycleStyle();
    },
    [isDragging, onCycleStyle]
  );

  return (
    <div
      ref={stickerRef}
      className={`absolute select-none ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
      }`}
      style={{
        left: `${sticker.x}%`,
        top: `${sticker.y}%`,
        transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
        zIndex: sticker.zIndex,
        transition: isDragging ? "none" : "transform 0.2s ease",
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      {/* Selection frame */}
      {isSelected && (
        <div className="absolute -inset-2 border-2 border-white/60 rounded-xl pointer-events-none">
          {/* Delete button */}
          <button
            className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs shadow-lg pointer-events-auto z-50"
            onMouseDown={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Style renderers */}
      {sticker.style === "compact" && <CompactStyle sticker={sticker} />}
      {sticker.style === "rectangle" && <RectangleStyle sticker={sticker} />}
      {sticker.style === "square" && <SquareStyle sticker={sticker} />}
      {sticker.style === "vinyl" && <VinylStyle sticker={sticker} />}
      {sticker.style === "hidden" && <HiddenStyle sticker={sticker} />}
    </div>
  );
}
