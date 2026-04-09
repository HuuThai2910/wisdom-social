/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.event.listener;

import iuh.fit.edu.backend.event.payload.MemberUpdatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MemberEventListener {

    private final SimpMessagingTemplate messagingTemplate;

    @EventListener
    public void handleMemberUpdatedEvent(MemberUpdatedEvent event) {
        log.info("Bắn WebSocket: Cập nhật thông tin Member {} trong phòng {}",
                event.getUserId(), event.getConversationId());

        // Kênh để Frontend subscribe. Ví dụ: /topic/conversations/123/members
        String destination = "/topic/conversations/" + event.getConversationId() + "/members";

        // Gửi toàn bộ Object (có chứa newNickname, newAvatar) xuống cho FE
        messagingTemplate.convertAndSend(destination, event);
    }
}
