/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.domain.event;

import iuh.fit.edu.backend.constant.event.DomainEventType;
import iuh.fit.edu.backend.domain.entity.nosql.Message;
import iuh.fit.edu.backend.dto.response.message.MessageResponse;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Getter
public class MessageCreatedEvent extends DomainEventPayload {
    private final MessageResponse messageResponse;
    public MessageCreatedEvent( MessageResponse messageResponse) {
        super(DomainEventType.MESSAGE_CREATED);
        this.messageResponse = messageResponse;
    }
}
