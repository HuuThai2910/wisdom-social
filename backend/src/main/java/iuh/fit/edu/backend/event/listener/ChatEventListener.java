/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.event.listener;

import iuh.fit.edu.backend.dto.response.message.MessageRecalledResponse;
import iuh.fit.edu.backend.dto.response.message.MessageSeenResponse;
import iuh.fit.edu.backend.event.payload.*;
import iuh.fit.edu.backend.dto.response.message.MessageResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class ChatEventListener {
    private final SimpMessagingTemplate messagingTemplate;

    // Hàm xử lý sự kiện bắn tin nhắn cho tất cả user đăng ký conversation
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleMessageCreated(MessageCreatedEvent event){
        MessageResponse payload = event.getMessageResponse();
        // Bắn socket: update realtime cho user đăng ký kênh này
        String destination = "/topic/conversation/" + payload.getConversationId();
        messagingTemplate.convertAndSend(destination, event);
        log.info("Send new message to {}", destination);
    }

    // Hàm xử lý sự kiện thu hồi tin nhắn cho tất cả user đăng ký conversation
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleMessageRecalled(MessageRecalledEvent event){
        MessageRecalledResponse payload = event.getMessageRecalledResponse();
        // Bắn socket: update realtime cho user đăng ký kênh này
        String destination = "/topic/conversation/" + payload.getConversationId();
        messagingTemplate.convertAndSend(destination, event);
        log.info("Recall message to {}", destination);
    }

    // Hàm xử lý sự kiện xem tin nhắn cho tất cả user đăng ký conversation
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleMessageSeenEvent(MessageSeenEvent event) {
        // Lấy ID phòng chat để tạo kênh Topic
        Long conversationId = event.getMessageSeenResponse().getConversationId();
        String destination = "/topic/conversation/" + conversationId;

        // Bắn thẳng nguyên cục Event (có chứa type và payload) vào kênh này
        messagingTemplate.convertAndSend(destination, event);

        log.info("Broadcast MessageSeenEvent to {}", destination);
    }

    @EventListener
    public void handleTypingEvent(TypingEvent event) {
        Long conversationId = event.getTypingResponse().getConversationId();

        // Vẫn xài chung đường ống Topic tuyệt vời của chúng ta!
        String destination = "/topic/conversation/" + conversationId;

        log.info("Broadcasting TypingEvent to {}: userId={}, isTyping={}",
                destination,
                event.getTypingResponse().getUserId(),
                event.getTypingResponse().isTyping());

        messagingTemplate.convertAndSend(destination, event);
    }

    @EventListener
    public void handleUserStatusEvent(UserStatusEvent event) {
        // Kênh này dùng chung cho toàn bộ user đang mở app
        // Có thể tối ưu hơn bằng cách chỉ bắn cho danh sách bạn bè, nhưng tạm thời dùng kênh public cho dễ test
        String destination = "/topic/public/users/status";

        messagingTemplate.convertAndSend(destination, event);
    }


}
