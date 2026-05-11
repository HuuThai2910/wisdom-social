package iuh.fit.edu.backend.event.payload;

import iuh.fit.edu.backend.event.type.DomainEventType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PageEvent {
    private DomainEventType eventType;
    private long pageId;
    private long userId;
    private String newRole;
    private String timestamp;
    private boolean sendToPage;
    private boolean sendToUser;
}
