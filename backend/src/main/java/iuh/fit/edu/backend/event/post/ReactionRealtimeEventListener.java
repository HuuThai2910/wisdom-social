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
public class ReactionRealtimeEventListener {

    @Qualifier("pubSubRedisTemplate")
    private final RedisTemplate<String, Object> pubSubRedisTemplate;

    @Async
    @EventListener
    public void handleReactionRealtimeEvent(ReactionRealtimeEvent event) {
        log.info("📡 Publishing ReactionRealtimeEvent to Redis for post: {}", event.getRootPostId());

        try {
            Map<String, Object> message = new HashMap<>();
            message.put("domainEventType", "REACTION");
            message.put("payload", event);

            pubSubRedisTemplate.convertAndSend(RedisPubSubConfig.CHAT_CHANNEL, message);
            log.info("✅ Successfully published reaction event to Redis channel: {}", RedisPubSubConfig.CHAT_CHANNEL);
        } catch (Exception e) {
            log.error("❌ Error publishing reaction event to Redis", e);
        }
    }
}
