import { useCallback, useEffect, useRef, useState } from "react";
import {
  playAudioPreview,
  resolveMusicMediaUrl,
  stopAudioPreview,
} from "@/services/musicService";

type UseMusicAutoplayOptions = {
  musicId: string;
  audioPath?: string | null;
  enabled: boolean;
  autoPlay?: boolean;
};

export default function useMusicAutoplay({
  audioPath,
  enabled,
  autoPlay = true,
}: UseMusicAutoplayOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioUrl = resolveMusicMediaUrl(audioPath);
  const hasAutoPlayed = useRef(false);
  const isPlayingRef = useRef(false);

  // Reset when audio URL changes
  useEffect(() => {
    hasAutoPlayed.current = false;
    isPlayingRef.current = false;
    setIsPlaying(false);
  }, [audioUrl]);

  // Auto-play when enabled, audio changes, and not yet auto-played
  useEffect(() => {
    if (!enabled || !audioUrl || !autoPlay) return;
    if (hasAutoPlayed.current) return;
    if (isPlayingRef.current) return;

    hasAutoPlayed.current = true;
    isPlayingRef.current = true;
    setIsPlaying(true);

    const timeout = setTimeout(async () => {
      try {
        await playAudioPreview(audioUrl);
      } catch (error) {
        console.error("[MusicAutoplay] Auto-play error:", error);
        isPlayingRef.current = false;
        setIsPlaying(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [enabled, audioUrl, autoPlay]);

  // Cleanup on unmount: stop audio
  useEffect(() => {
    return () => {
      // Stop this audio when component unmounts
      if (isPlayingRef.current) {
        isPlayingRef.current = false;
        stopAudioPreview().catch(() => {});
      }
    };
  }, []);

  const togglePlay = useCallback(async () => {
    if (!enabled || !audioUrl) return;

    if (isPlayingRef.current) {
      // Currently playing - stop
      isPlayingRef.current = false;
      setIsPlaying(false);
      await stopAudioPreview();
    } else {
      // Not playing - start
      isPlayingRef.current = true;
      setIsPlaying(true);
      await playAudioPreview(audioUrl);
    }
  }, [audioUrl, enabled]);

  return {
    isPlaying,
    audioUrl,
    togglePlay,
  };
}