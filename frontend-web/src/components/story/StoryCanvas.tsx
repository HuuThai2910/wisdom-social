import { useRef, useCallback, useEffect } from "react";
import StoryTextLayer from "./StoryTextLayer";
import StoryToolbar from "./StoryToolbar";
import StoryMusicSticker from "./StoryMusicSticker";
import type { StoryTextManager } from "../../hooks/useStoryTextManager";
import type { StoryMusicManager } from "../../hooks/useStoryMusicSticker";

interface Props {
  manager: StoryTextManager;
  musicManager?: StoryMusicManager;
  backgroundUrl?: string;
  backgroundType?: "image" | "video";
  gradientClass?: string;
}

export default function StoryCanvas({
  manager,
  musicManager,
  backgroundUrl,
  backgroundType = "image",
  gradientClass,
}: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);

  // Click on canvas background => deselect all
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === canvasRef.current || e.target === e.currentTarget) {
        manager.deselectAll();
        musicManager?.deselectSticker();
      }
    },
    [manager, musicManager]
  );

  // ESC key to deselect or exit edit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (manager.editingId) {
          manager.setEditingId(null);
        } else {
          manager.deselectAll();
          musicManager?.deselectSticker();
        }
      }
      // Delete selected layer
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        !manager.editingId
      ) {
        if (manager.selectedId) {
          manager.removeLayer(manager.selectedId);
        } else if (musicManager?.isSelected && musicManager?.sticker) {
          musicManager.removeSticker();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [manager, musicManager]);

  const hasBackground = backgroundUrl || gradientClass;

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative w-full max-w-[360px] aspect-[9/16] rounded-2xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.5)] ring-1 ring-white/5"
        onClick={handleCanvasClick}
        style={{ cursor: "default" }}
      >
        {/* Background */}
        {gradientClass && !backgroundUrl && (
          <div className={`absolute inset-0 ${gradientClass}`} />
        )}

        {backgroundUrl && backgroundType === "image" && (
          <img
            src={backgroundUrl}
            alt="Story background"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {backgroundUrl && backgroundType === "video" && (
          <video
            src={backgroundUrl}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          />
        )}

        {/* Gradient overlay for text readability */}
        {backgroundUrl && (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40 pointer-events-none" />
            <div className="absolute inset-0 bg-black/5 pointer-events-none" />
          </>
        )}

        {/* Empty state */}
        {!hasBackground && manager.layers.length === 0 && !musicManager?.sticker && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center text-white/20">
              <p className="text-sm font-medium">Bắt đầu tạo story</p>
              <p className="text-[11px] mt-1">Nhấn "Aa" để thêm văn bản</p>
            </div>
          </div>
        )}

        {/* Default dark bg when no gradient */}
        {!hasBackground && (manager.layers.length > 0 || musicManager?.sticker) && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        )}

        {/* Text Layers */}
        {manager.layers.map((layer) => (
          <StoryTextLayer
            key={layer.id}
            layer={layer}
            isSelected={layer.id === manager.selectedId}
            isEditing={layer.id === manager.editingId}
            canvasRef={canvasRef}
            onSelect={(id) => {
              manager.setSelectedId(id);
              if (manager.editingId && manager.editingId !== id) {
                manager.setEditingId(null);
              }
              musicManager?.deselectSticker();
            }}
            onStartEdit={(id) => {
              manager.setSelectedId(id);
              manager.setEditingId(id);
              musicManager?.deselectSticker();
            }}
            onUpdate={manager.updateLayer}
          />
        ))}

        {/* Music Sticker */}
        {musicManager?.sticker && (
          <StoryMusicSticker
            sticker={musicManager.sticker}
            isSelected={musicManager.isSelected}
            canvasRef={canvasRef}
            onSelect={() => {
              musicManager.selectSticker();
              manager.deselectAll();
            }}
            onUpdate={musicManager.updateSticker}
            onCycleStyle={musicManager.cycleStyle}
            onRemove={musicManager.removeSticker}
          />
        )}

        {/* Canvas border glow when editing */}
        {manager.editingId && (
          <div className="absolute inset-0 ring-2 ring-blue-400/20 rounded-2xl pointer-events-none" />
        )}
      </div>

      {/* Toolbar */}
      <StoryToolbar manager={manager} />
    </div>
  );
}
