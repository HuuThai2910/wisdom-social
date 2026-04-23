package iuh.fit.edu.backend.event.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.edu.backend.config.RedisPubSubConfig;
import iuh.fit.edu.backend.domain.entity.nosql.Notification;
import iuh.fit.edu.backend.repository.nosql.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationEventListener {

    private final NotificationRepository notificationRepository;
    
    @Qualifier("pubSubRedisTemplate")
    private final RedisTemplate<String, Object> pubSubRedisTemplate;
    
    private final StringRedisTemplate stringRedisTemplate;
    
    @Qualifier("pubSubObjectMapper")
    private final ObjectMapper objectMapper;

    private static final String UNREAD_COUNT_KEY = "notification:unread:%s";
    private static final String RECENT_NOTIFICATIONS_KEY = "notification:recent:%s";
    private static final int MAX_RECENT_NOTIFICATIONS = 50;

    @Async
    @EventListener
    public void handleNotificationEvent(NotificationEvent event) {
        log.info("🔔 Processing NotificationEvent for user: {}", event.getRecipientId());

        try {
            // 1. Persist to MongoDB (Source of Truth)
            Notification notification = Notification.builder()
                    .recipientId(event.getRecipientId())
                    .actorIds(event.getActorIds())
                    .type(event.getType())
                    .targetType(event.getTargetType())
                    .targetId(event.getTargetId())
                    .content(event.getContent())
                    .isRead(false)
                    .createdAt(Instant.now())
                    .expireAt(Instant.now().plusSeconds(90L * 24 * 60 * 60)) // 90 days TTL
                    .build();
            
            notification = notificationRepository.save(notification);
            log.info("✅ Notification saved to MongoDB: {}", notification.getId());

            // 2. Update Redis Cache
            String userId = event.getRecipientId();
            String countKey = String.format(UNREAD_COUNT_KEY, userId);
            String zsetKey = String.format(RECENT_NOTIFICATIONS_KEY, userId);
            
            // Increment unread count safely with StringRedisTemplate
            stringRedisTemplate.opsForValue().increment(countKey);

            // Add to recent notifications (ZSET) - Use positive score (timestamp)
            String notificationJson = objectMapper.writeValueAsString(notification);
            double score = Instant.now().toEpochMilli();
            stringRedisTemplate.opsForZSet().add(zsetKey, notificationJson, score);
            
            // Trim ZSET to keep only latest N items (remove from rank 0 to rank -(N+1))
            // Since elements are ordered by score ascending, rank 0 is the oldest.
            stringRedisTemplate.opsForZSet().removeRange(zsetKey, 0, -(MAX_RECENT_NOTIFICATIONS + 1));
            log.info("🚀 Redis cache updated for user: {}", userId);

            // 3. Publish to Redis Pub/Sub
            Map<String, Object> message = new HashMap<>();
            message.put("domainEventType", "NOTIFICATION");
            
            // Safety check for Long ID
            try {
                message.put("targetMemberIds", Set.of(Long.valueOf(userId)));
            } catch (NumberFormatException e) {
                log.warn("⚠️ Non-numeric userId for targetMemberIds: {}. Real-time push might fail if subscriber expects Long.", userId);
                // Fallback: don't put targetMemberIds or use a different mechanism
            }
            
            message.put("payload", notification);

            pubSubRedisTemplate.convertAndSend(RedisPubSubConfig.CHAT_CHANNEL, message);
            log.info("📡 Notification published to Redis Pub/Sub channel");

        } catch (Exception e) {
            log.error("❌ Error processing notification event", e);
        }
    }
}
