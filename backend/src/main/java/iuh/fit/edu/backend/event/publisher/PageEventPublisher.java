package iuh.fit.edu.backend.event.publisher;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Broadcasts real-time page membership events via WebSocket STOMP.
 *
 * Topics:
 *   /topic/page/{pageId}/members  — all member-change events for a page
 *   /topic/user/{userId}/page-events — personal notifications (request approved/rejected)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PageEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    // ── helpers ──────────────────────────────────────────────────────────────

    private Map<String, Object> base(String eventType, long pageId) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("eventType", eventType);
        payload.put("pageId", pageId);
        payload.put("timestamp", Instant.now().toString());
        return payload;
    }

    private void sendToPage(long pageId, Map<String, Object> payload) {
        try {
            messagingTemplate.convertAndSend("/topic/page/" + pageId + "/members", payload);
        } catch (Exception e) {
            log.error("PageEventPublisher sendToPage failed: {}", e.getMessage());
        }
    }

    private void sendToUser(long userId, Map<String, Object> payload) {
        try {
            messagingTemplate.convertAndSend("/topic/user/" + userId + "/page-events", payload);
        } catch (Exception e) {
            log.error("PageEventPublisher sendToUser failed: {}", e.getMessage());
        }
    }

    // ── public API ───────────────────────────────────────────────────────────

    public void publishMemberJoined(long pageId, long userId) {
        Map<String, Object> payload = base("PAGE_MEMBER_JOINED", pageId);
        payload.put("userId", userId);
        sendToPage(pageId, payload);
    }

    public void publishMemberLeft(long pageId, long userId) {
        Map<String, Object> payload = base("PAGE_MEMBER_LEFT", pageId);
        payload.put("userId", userId);
        sendToPage(pageId, payload);
    }

    public void publishMemberBlocked(long pageId, long userId) {
        Map<String, Object> payload = base("PAGE_MEMBER_BLOCKED", pageId);
        payload.put("userId", userId);
        sendToPage(pageId, payload);
        sendToUser(userId, payload);
    }

    public void publishMemberUnblocked(long pageId, long userId) {
        Map<String, Object> payload = base("PAGE_MEMBER_UNBLOCKED", pageId);
        payload.put("userId", userId);
        sendToPage(pageId, payload);
        sendToUser(userId, payload);
    }

    public void publishMemberRoleChanged(long pageId, long userId, String newRole) {
        Map<String, Object> payload = base("PAGE_MEMBER_ROLE_CHANGED", pageId);
        payload.put("userId", userId);
        payload.put("newRole", newRole);
        sendToPage(pageId, payload);
        sendToUser(userId, payload);
    }

    public void publishJoinRequested(long pageId, long userId) {
        Map<String, Object> payload = base("PAGE_JOIN_REQUESTED", pageId);
        payload.put("userId", userId);
        // notify admins/mods via the page members channel
        sendToPage(pageId, payload);
    }

    public void publishJoinApproved(long pageId, long userId) {
        Map<String, Object> payload = base("PAGE_JOIN_APPROVED", pageId);
        payload.put("userId", userId);
        sendToPage(pageId, payload);
        // notify the user who was approved
        sendToUser(userId, payload);
    }

    public void publishJoinRejected(long pageId, long userId) {
        Map<String, Object> payload = base("PAGE_JOIN_REJECTED", pageId);
        payload.put("userId", userId);
        // only notify the affected user
        sendToUser(userId, payload);
    }

    public void publishJoinCancelled(long pageId, long userId) {
        Map<String, Object> payload = base("PAGE_JOIN_CANCELLED", pageId);
        payload.put("userId", userId);
        sendToPage(pageId, payload);
    }
}
