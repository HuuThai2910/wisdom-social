/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.event.listener;

import iuh.fit.edu.backend.dto.response.message.MessageRecalledResponse;
import iuh.fit.edu.backend.dto.response.message.MessageSeenResponse;
import iuh.fit.edu.backend.event.payload.MessageCreatedEvent;
import iuh.fit.edu.backend.event.payload.MessageRecalledEvent;
import iuh.fit.edu.backend.dto.response.message.MessageResponse;
import iuh.fit.edu.backend.event.payload.MessageSeenEvent;
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

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleMessageCreated(MessageCreatedEvent event){
        MessageResponse payload = event.getMessageResponse();
        // Bắn socket: update realtime cho user đăng ký kênh này
        String destination = "/topic/conversation/" + payload.getConversationId();
        messagingTemplate.convertAndSend(destination, event);
        log.info("Send new message to {}", destination);
    }
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleMessageRecalled(MessageRecalledEvent event){
        MessageRecalledResponse payload = event.getMessageRecalledResponse();
        // Bắn socket: update realtime cho user đăng ký kênh này
        String destination = "/topic/conversation/" + payload.getConversationId();
        messagingTemplate.convertAndSend(destination, event);
        log.info("Recall message to {}", destination);
    }
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleMessageSeenEvent(MessageSeenEvent event) {
        // Lấy ID phòng chat để tạo kênh Topic
        Long conversationId = event.getMessageSeenResponse().getConversationId();
        String destination = "/topic/conversation/" + conversationId;

        // Bắn thẳng nguyên cục Event (có chứa type và payload) vào kênh này
        messagingTemplate.convertAndSend(destination, event);

        log.info("Broadcast MessageSeenEvent to {}", destination);
    }


}
