package iuh.fit.edu.backend.event.post;

import iuh.fit.edu.backend.constant.ReactionType;
import iuh.fit.edu.backend.constant.TargetType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReactionRealtimeEvent {
    private String action; // "REACT" or "UNREACT"
    private String rootPostId; // Required to route the websocket message to the correct post topic
    private TargetType targetType; // POST or COMMENT
    private String targetId;
    private ReactionType reactionType;
    private String userId;
    private long totalCount; // Optional: The new total count for that target
}
