/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.event.payload;

import iuh.fit.edu.backend.domain.entity.mysql.PinnedMessageDetail;
import iuh.fit.edu.backend.event.type.DomainEventType;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Getter

public class PinUpdatedEvent {
    private final Long conversationId;
    private final List<PinnedMessageDetail> currentPins;
    private final DomainEventType domainEventType;

    public PinUpdatedEvent(Long conversationId, List<PinnedMessageDetail> currentPins) {
        this.conversationId = conversationId;
        this.currentPins = currentPins;
        this.domainEventType = DomainEventType.PIN_MESSAGE;
    }
}
