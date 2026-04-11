package iuh.fit.edu.backend.event.listener;

import iuh.fit.edu.backend.dto.response.user.UserStatusResponse;
import iuh.fit.edu.backend.event.payload.UserStatusEvent;
import iuh.fit.edu.backend.service.user.UserCacheService;
import iuh.fit.edu.backend.service.user.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;
import java.time.Instant;
//
//@Slf4j
//@Component
//@RequiredArgsConstructor
public class UserStatusWebSocketListener {

//    private final UserCacheService userCacheService;
//    private final UserService userService;
//    private final ApplicationEventPublisher eventPublisher;
//
//    @EventListener
//    public void handleUserConnect(SessionConnectedEvent event) {
//        SimpMessageHeaderAccessor headers = SimpMessageHeaderAccessor.wrap(event.getMessage());
//        String sessionId = headers.getSessionId();
//        Principal principal = event.getUser();
//
//        if (principal == null || principal.getName() == null) return;
//        Long userId = Long.valueOf(principal.getName());
//
//        // 1. Gọi Cache Service
//        boolean isNewlyOnline = userCacheService.addOnlineSession(userId, sessionId);
//
//        // 2. Nếu chính thức Online, bắn Event cho FE
//        if (isNewlyOnline) {
//            log.info("User {} ONLINE (Session: {})", userId, sessionId);
//            UserStatusResponse payload = UserStatusResponse.builder()
//                    .userId(userId).isOnline(true).lastActiveAt(null).build();
//            eventPublisher.publishEvent(new UserStatusEvent(payload));
//        }
//    }
//
//    @EventListener
//    public void handleUserDisconnect(SessionDisconnectEvent event) {
//        String sessionId = event.getSessionId();
//        Principal principal = event.getUser();
//
//        if (principal == null || principal.getName() == null) return;
//        Long userId = Long.valueOf(principal.getName());
//
//        // 1. Rút Cache ra
//        boolean isFullyOffline = userCacheService.removeOnlineSession(userId, sessionId);
//
//        // 2. Nếu rút thiết bị cuối cùng, lưu DB và bắn Event
//        if (isFullyOffline) {
//            log.info("User {} OFFLINE (Session: {})", userId, sessionId);
//
//            // Gọi User Service cập nhật MySQL
//            Instant lastSeenAt = userService.updateLastActiveAt(userId);
//
//            UserStatusResponse payload = UserStatusResponse.builder()
//                    .userId(userId).isOnline(false).lastActiveAt(lastSeenAt).build();
//            eventPublisher.publishEvent(new UserStatusEvent(payload));
//        }
//    }
}