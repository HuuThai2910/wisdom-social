package iuh.fit.edu.backend.event.notification;

import iuh.fit.edu.backend.constant.NotificationType;
import iuh.fit.edu.backend.constant.TargetType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Domain event for notifications
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationEvent {
    private String recipientId;
    private List<String> actorIds;
    private NotificationType type;
    private TargetType targetType;
    private String targetId;
    private String content;
    private String imageUrl;
}
