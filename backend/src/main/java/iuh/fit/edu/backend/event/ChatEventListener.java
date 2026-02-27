/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.event;

import iuh.fit.edu.backend.domain.event.MessageCreatedEvent;
import iuh.fit.edu.backend.dto.response.message.MessageResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
}
