/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.event.payload;

import iuh.fit.edu.backend.event.type.DomainEventType;
import iuh.fit.edu.backend.dto.response.message.MessageResponse;
import lombok.Getter;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Getter
public class MessageCreatedEvent{
    private final MessageResponse messageResponse;
    private final DomainEventType domainEventType;
    public MessageCreatedEvent(MessageResponse messageResponse) {
        this.messageResponse = messageResponse;
        this.domainEventType = DomainEventType.MESSAGE_CREATED;
    }
}
