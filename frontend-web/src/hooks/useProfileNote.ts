import { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import type { Note } from "../types/note";

interface UseProfileNoteResult {
  note: Note | null;
  showNoteModal: boolean;
  openNoteModal: () => void;
  closeNoteModal: () => void;
  setNote: (updated: Note | null) => void;
}

export const useProfileNote = (userId?: number | string): UseProfileNoteResult => {
  const [note, setNote] = useState<Note | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);

  useEffect(() => {
    if (!userId) return;

    axiosClient
      .get(`/notes/user/${userId}`)
      .then((res) => setNote(res.data.data ?? null))
      .catch(() => setNote(null));
  }, [userId]);

  return {
    note,
    showNoteModal,
    openNoteModal: () => setShowNoteModal(true),
    closeNoteModal: () => setShowNoteModal(false),
    setNote,
  };
};
