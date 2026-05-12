package iuh.fit.edu.backend.modules.page.event.publisher;

import iuh.fit.edu.backend.common.config.RedisPubSubConfig;
import iuh.fit.edu.backend.modules.page.event.payload.PageEvent;
import iuh.fit.edu.backend.common.event.payload.RedisEnvelope;
import iuh.fit.edu.backend.common.event.type.DomainEventType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Collections;

/**
 * Broadcasts real-time page membership events via Redis Pub/Sub.
 */
@Component
@Slf4j
public class PageEventPublisher {

    private final RedisTemplate<String, Object> pubSubRedisTemplate;

    public PageEventPublisher(@Qualifier("pubSubRedisTemplate") RedisTemplate<String, Object> pubSubRedisTemplate) {
        this.pubSubRedisTemplate = pubSubRedisTemplate;
    }

    private void publishToRedis(DomainEventType type, long pageId, long userId, String newRole, boolean sendToPage, boolean sendToUser) {
        PageEvent event = PageEvent.builder()
                .eventType(type)
                .pageId(pageId)
                .userId(userId)
                .newRole(newRole)
                .timestamp(Instant.now().toString())
                .sendToPage(sendToPage)
                .sendToUser(sendToUser)
                .build();

        RedisEnvelope envelope = new RedisEnvelope(
                Collections.emptySet(),
                type,
                event
        );

        pubSubRedisTemplate.convertAndSend(RedisPubSubConfig.CHAT_CHANNEL, envelope);
        log.info("Published {} to Redis for Page {} and User {}", type, pageId, userId);
    }

    public void publishMemberJoined(long pageId, long userId) {
        publishToRedis(DomainEventType.PAGE_MEMBER_JOINED, pageId, userId, null, true, false);
    }

    public void publishMemberLeft(long pageId, long userId) {
        publishToRedis(DomainEventType.PAGE_MEMBER_LEFT, pageId, userId, null, true, false);
    }

    public void publishMemberBlocked(long pageId, long userId) {
        publishToRedis(DomainEventType.PAGE_MEMBER_BLOCKED, pageId, userId, null, true, true);
    }

    public void publishMemberUnblocked(long pageId, long userId) {
        publishToRedis(DomainEventType.PAGE_MEMBER_UNBLOCKED, pageId, userId, null, true, true);
    }

    public void publishMemberRoleChanged(long pageId, long userId, String newRole) {
        publishToRedis(DomainEventType.PAGE_MEMBER_ROLE_CHANGED, pageId, userId, newRole, true, true);
    }

    public void publishJoinRequested(long pageId, long userId) {
        publishToRedis(DomainEventType.PAGE_JOIN_REQUESTED, pageId, userId, null, true, false);
    }

    public void publishJoinApproved(long pageId, long userId) {
        publishToRedis(DomainEventType.PAGE_JOIN_APPROVED, pageId, userId, null, true, true);
    }

    public void publishJoinRejected(long pageId, long userId) {
        publishToRedis(DomainEventType.PAGE_JOIN_REJECTED, pageId, userId, null, false, true);
    }

    public void publishJoinCancelled(long pageId, long userId) {
        publishToRedis(DomainEventType.PAGE_JOIN_CANCELLED, pageId, userId, null, true, false);
    }
}
