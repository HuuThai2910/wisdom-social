package iuh.fit.edu.backend.event.handler;

import iuh.fit.edu.backend.domain.entity.nosql.Notification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationEventHandler implements RedisEventHandler {

    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public Class<?> getSupportedClass() {
        return Notification.class;
    }

    @Override
    public String getSupportedEventType() {
        return "NOTIFICATION";
    }

    @Override
    public void handle(Object eventPayload, Set<Long> targetMemberIds) {
        log.info("Handling notification via WebSocket for members: {}", targetMemberIds);
        if (targetMemberIds == null || targetMemberIds.isEmpty()) {
            return;
        }

        if (eventPayload instanceof Notification) {
            Notification notification = (Notification) eventPayload;
            targetMemberIds.forEach(userId -> {
                String destination = "/topic/user/" + userId + "/notifications";
                messagingTemplate.convertAndSend(destination, notification);
                log.info("Notification sent to: {}", destination);
            });
        }
    }
}
