package iuh.fit.edu.backend.event.post;

import iuh.fit.edu.backend.config.RedisPubSubConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class CommentRealtimeEventListener {

    @Qualifier("pubSubRedisTemplate")
    private final RedisTemplate<String, Object> pubSubRedisTemplate;

    @Async
    @EventListener
    public void handleCommentRealtimeEvent(CommentRealtimeEvent event) {
        log.info("📡 Publishing CommentRealtimeEvent to Redis for post: {}", event.getPostId());

        try {
            Map<String, Object> message = new HashMap<>();
            message.put("domainEventType", "COMMENT");
            message.put("payload", event);
            // No targetMemberIds required because we broadcast to everyone on this postId

            pubSubRedisTemplate.convertAndSend(RedisPubSubConfig.CHAT_CHANNEL, message);
            log.info("✅ Successfully published comment event to Redis channel: {}", RedisPubSubConfig.CHAT_CHANNEL);
        } catch (Exception e) {
            log.error("❌ Error publishing comment event to Redis", e);
        }
    }
}
