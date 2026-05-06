package iuh.fit.edu.backend.event.post;

import iuh.fit.edu.backend.dto.response.post.CommentResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentRealtimeEvent {
    private String action; // "CREATE" or "DELETE"
    private String postId;
    private CommentResponse payload;
}
