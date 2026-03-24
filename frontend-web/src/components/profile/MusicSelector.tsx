import { useState, useEffect, useRef } from "react";
import { Search, Play, Pause, Music, X } from "lucide-react";
import {
  getAllMusic,
  searchMusicByTitle,
  formatDuration,
  type MusicMetadata,
} from "../../services/musicService";

interface MusicSelectorProps {
  onSelect: (music: MusicMetadata) => void;
  onClose?: () => void;
}

export default function MusicSelector({
  onSelect,
  onClose,
}: MusicSelectorProps) {
  const [musicList, setMusicList] = useState<MusicMetadata[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load initial music list
  useEffect(() => {
    const loadInitialMusic = async () => {
      setLoading(true);
      const data = await getAllMusic(0, 20);
      setMusicList(data);
      setLoading(false);
    };
    loadInitialMusic();
  }, []);

  // Search music
  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setLoading(true);
      const data = await getAllMusic(0, 20);
      setMusicList(data);
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const results = await searchMusicByTitle(query);
      setMusicList(results);
      setLoading(false);
    }, 400);
  };

  // Toggle audio preview
  const togglePreview = (music: MusicMetadata) => {
    if (playingId === music.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      audioRef.current?.pause();
      const audio = new Audio(music.audioUrl);
      audio.onended = () => setPlayingId(null);
      audio.play().catch((err) => console.error("Error playing audio:", err));
      audioRef.current = audio;
      setPlayingId(music.id);
    }
  };

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="flex items-center gap-2 px-3 py-2 border dark:border-gray-700 rounded-xl dark:bg-gray-800 focus-within:ring-2 focus-within:ring-blue-500">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          autoFocus
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search music by title..."
          className="flex-1 text-sm bg-transparent dark:text-white focus:outline-none"
        />
        {loading && (
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
        )}
      </div>

      {/* Music List */}
      <div className="max-h-80 overflow-y-auto space-y-1 border dark:border-gray-700 rounded-xl dark:bg-gray-800 p-2">
        {!searchQuery && musicList.length === 0 && !loading && (
          <p className="text-xs text-gray-400 text-center py-4">
            No music found
          </p>
        )}

        {searchQuery && musicList.length === 0 && !loading && (
          <p className="text-xs text-gray-400 text-center py-4">
            No results for "{searchQuery}"
          </p>
        )}

        {musicList.map((music) => (
          <div
            key={music.id}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
          >
            {/* Album Cover */}
            <img
              src={music.imageUrl}
              alt={music.title}
              className="w-10 h-10 rounded-lg object-cover shrink-0"
            />

            {/* Song Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold dark:text-white truncate">
                {music.title}
              </p>
              <p className="text-[11px] text-gray-500 truncate">
                {music.artist} • {formatDuration(music.duration)}
              </p>
            </div>

            {/* Play/Pause Button */}
            <button
              onClick={() => togglePreview(music)}
              className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors opacity-0 group-hover:opacity-100"
              title="Preview music"
            >
              {playingId === music.id ? (
                <Pause className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" />
              ) : (
                <Play className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" />
              )}
            </button>

            {/* Select Button */}
            <button
              onClick={() => {
                onSelect(music);
                audioRef.current?.pause();
                setPlayingId(null);
                onClose?.();
              }}
              className="p-1.5 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors opacity-0 group-hover:opacity-100"
              title="Select this music"
            >
              <X className="w-3.5 h-3.5 text-white rotate-45" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
