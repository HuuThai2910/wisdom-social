package iuh.fit.edu.backend.event.handler;

import iuh.fit.edu.backend.event.post.ReactionRealtimeEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class ReactionRealtimeEventHandler implements RedisEventHandler {

    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public Class<?> getSupportedClass() {
        return ReactionRealtimeEvent.class;
    }

    @Override
    public String getSupportedEventType() {
        return "REACTION";
    }

    @Override
    public void handle(Object eventPayload, Set<Long> targetMemberIds) {
        if (eventPayload instanceof ReactionRealtimeEvent) {
            ReactionRealtimeEvent event = (ReactionRealtimeEvent) eventPayload;
            String postId = event.getRootPostId();
            
            String destination = "/topic/post/" + postId + "/reactions";
            log.info("Broadcasting realtime reaction action {} to destination: {}", event.getAction(), destination);
            
            // Push entire ReactionRealtimeEvent to subscribers
            messagingTemplate.convertAndSend(destination, event);
        }
    }
}
