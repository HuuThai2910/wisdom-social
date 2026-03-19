/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.domain.event;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */

import com.fasterxml.jackson.annotation.JsonIgnore;
import iuh.fit.edu.backend.constant.event.DomainEventType;
import iuh.fit.edu.backend.dto.response.message.LastMessageResponse;
import lombok.Getter;

import java.util.Set;

@Getter
public class ConversationUpdatedEvent{
    private final Long conversationId;
    private final LastMessageResponse lastMessage;
    private final DomainEventType domainEventType;

    // Field này chỉ dùng để Server biết gửi cho ai, không gửi xuống Client
    @JsonIgnore
    private final Set<Long> memberIds;

    public ConversationUpdatedEvent(Long conversationId, LastMessageResponse lastMessage, Set<Long> memberIds) {
        this.conversationId = conversationId;
        this.lastMessage = lastMessage;
        this.domainEventType = DomainEventType.ROOM_UPDATED;
        this.memberIds = memberIds;
    }
}
