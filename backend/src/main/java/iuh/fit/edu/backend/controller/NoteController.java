package iuh.fit.edu.backend.controller;

import iuh.fit.edu.backend.constant.StatusType;
import iuh.fit.edu.backend.domain.entity.nosql.Note;
import iuh.fit.edu.backend.domain.entity.nosql.NoteMusic;
import iuh.fit.edu.backend.dto.response.ApiResponse;
import iuh.fit.edu.backend.repository.nosql.NoteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/*
 * @description: Note management controller
 * Notes are auto-deleted after 24 hours via MongoDB TTL index
 */
@RestController
@RequestMapping("/api/notes")
@RequiredArgsConstructor
@Slf4j
public class NoteController {

    private final NoteRepository noteRepository;

    /**
     * Get the current (most recent) note for a user.
     * Returns the first note in the list (ordered by createdAt desc).
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<Note>> getNoteByUser(@PathVariable String userId) {
        List<Note> notes = noteRepository.findByUserIdOrderByCreatedAtDesc(userId);
        Note current = notes.isEmpty() ? null : notes.get(0);
        return ResponseEntity.ok(ApiResponse.success(200, "OK", current));
    }

    /**
     * Create or replace the note for a user.
     * Body: { userId, content, emoji }
     * - Deletes all existing notes for the user first (only 1 active note per user).
     * - Sets expireAt = now + 24h so MongoDB TTL removes it automatically.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<Note>> upsertNote(@RequestBody Map<String, String> body) {
        String userId = body.get("userId");
        String content = body.get("content");
        String emoji   = body.get("emoji");
        String location = body.get("location");
        String musicTitle      = body.get("musicTitle");
        String musicArtist     = body.get("musicArtist");
        String musicPreviewUrl = body.get("musicPreviewUrl");
        String musicCoverUrl   = body.get("musicCoverUrl");

        if (userId == null) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(400, "userId is required", null));
        }
        // At least one of content / location / music must be present
        boolean hasContent  = content != null && !content.isBlank();
        boolean hasLocation = location != null && !location.isBlank();
        boolean hasMusic    = musicTitle != null && !musicTitle.isBlank();
        if (!hasContent && !hasLocation && !hasMusic) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(400, "Note must have at least text, location, or music", null));
        }
        if (hasContent && content.length() > 200) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(400, "Note content must be 200 characters or less", null));
        }

        // Build music sub-object if present
        NoteMusic noteMusic = null;
        if (hasMusic) {
            noteMusic = NoteMusic.builder()
                    .title(musicTitle)
                    .artist(musicArtist != null ? musicArtist : "")
                    .previewUrl(musicPreviewUrl != null ? musicPreviewUrl : "")
                    .coverUrl(musicCoverUrl != null ? musicCoverUrl : "")
                    .build();
        }

        // Delete all previous notes for this user
        List<Note> existing = noteRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (!existing.isEmpty()) {
            noteRepository.deleteAll(existing);
        }

        Instant now = Instant.now();
        Note note = Note.builder()
                .userId(userId)
                .content(hasContent ? content.trim() : "")
                .emoji(emoji != null ? emoji.trim() : "")
                .location(hasLocation ? location.trim() : null)
                .music(noteMusic)
                .status(StatusType.ACTIVE)
                .createdAt(now)
                .expireAt(now.plusSeconds(86400))
                .build();

        Note saved = noteRepository.save(note);
        log.info("Note created for user {}: {}", userId, saved.getId());
        return ResponseEntity.ok(ApiResponse.success(201, "Note created", saved));
    }

    /**
     * Delete a note by ID.
     */
    @DeleteMapping("/{noteId}")
    public ResponseEntity<ApiResponse<Void>> deleteNote(@PathVariable String noteId) {
        if (!noteRepository.existsById(noteId)) {
            return ResponseEntity.status(404)
                    .body(ApiResponse.error(404, "Note not found", null));
        }
        noteRepository.deleteById(noteId);
        log.info("Note deleted: {}", noteId);
        return ResponseEntity.ok(ApiResponse.success(200, "Note deleted", null));
    }
}
