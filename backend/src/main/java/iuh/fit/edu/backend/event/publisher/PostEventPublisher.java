package iuh.fit.edu.backend.event.publisher;

import iuh.fit.edu.backend.config.RedisPubSubConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.stereotype.Component;

import iuh.fit.edu.backend.event.payload.PostEvent;
import iuh.fit.edu.backend.event.payload.RedisEnvelope;
import iuh.fit.edu.backend.event.type.DomainEventType;

import java.util.Collections;

@Component
@RequiredArgsConstructor
@Slf4j
public class PostEventPublisher {

    @Qualifier("pubSubRedisTemplate")
    private final RedisTemplate<String, Object> pubSubRedisTemplate;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handlePostRealtimeEvent(PostEvent event) {
        log.info("📡 Publishing PostRealtimeEvent to Redis for post: {}, action: {}", 
                event.getPostId() != null ? event.getPostId() : "N/A", event.getAction());

        try {
            RedisEnvelope envelope = new RedisEnvelope(
                    Collections.emptySet(),
                    DomainEventType.POST,
                    event
            );

            pubSubRedisTemplate.convertAndSend(RedisPubSubConfig.POST_CHANNEL, envelope);
            log.info("✅ Successfully published post event to Redis channel: {}", RedisPubSubConfig.POST_CHANNEL);
        } catch (Exception e) {
            log.error("❌ Error publishing post event to Redis", e);
        }
    }
}
