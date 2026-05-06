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
public class PostRealtimeEventListener {

    @Qualifier("pubSubRedisTemplate")
    private final RedisTemplate<String, Object> pubSubRedisTemplate;

    @Async
    @EventListener
    public void handlePostRealtimeEvent(PostRealtimeEvent event) {
        log.info("📡 Publishing PostRealtimeEvent to Redis for post: {}, action: {}", 
                event.getPostId() != null ? event.getPostId() : "N/A", event.getAction());

        try {
            Map<String, Object> message = new HashMap<>();
            message.put("domainEventType", "POST");
            message.put("payload", event);

            pubSubRedisTemplate.convertAndSend(RedisPubSubConfig.CHAT_CHANNEL, message);
            log.info("✅ Successfully published post event to Redis channel: {}", RedisPubSubConfig.CHAT_CHANNEL);
        } catch (Exception e) {
            log.error("❌ Error publishing post event to Redis", e);
        }
    }
}
