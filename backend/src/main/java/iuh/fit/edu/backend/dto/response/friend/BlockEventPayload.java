package iuh.fit.edu.backend.dto.response.friend;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlockEventPayload {
    private String eventType;
    private Long blockerId;
    private Long blockedId;
    private String timestamp;
}
