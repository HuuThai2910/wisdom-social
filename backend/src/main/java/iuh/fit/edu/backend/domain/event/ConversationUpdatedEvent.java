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

import iuh.fit.edu.backend.constant.event.DomainEventType;
import iuh.fit.edu.backend.dto.response.message.LastMessageResponse;
import lombok.Getter;

import java.util.Set;

@Getter
public class ConservationUpdatedEvent extends DomainEventPayload{
    private final Long conversationId;
    private final LastMessageResponse lastMessage;
    private final Set<Long> memberIds;

    public ConservationUpdatedEvent(Long conversationId, LastMessageResponse lastMessage, Set<Long> memberIds) {
        super(DomainEventType.ROOM_UPDATED);
        this.conversationId = conversationId;
        this.lastMessage = lastMessage;
        this.memberIds = memberIds;
    }
}
