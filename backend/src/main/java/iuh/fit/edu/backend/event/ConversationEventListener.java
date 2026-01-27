/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.event;

import iuh.fit.edu.backend.domain.event.ConversationUpdatedEvent;
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
public class ConversationEventListener {
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Cập nhật danh sách chat (Sidebar) cho TẤT CẢ thành viên.
     * Gửi tin nhắn tóm tắt (LastMessageDTO) vào topic riêng của từng user.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleMessageCreated(ConversationUpdatedEvent event){
        for(Long memberId : event.getMemberIds()){
            String destination = "/topic/user/" + memberId + "/conversations";
            messagingTemplate.convertAndSend(destination, event);
        }
        log.info("Broadcasted conversation update to {} members", event.getMemberIds());
    }
}
