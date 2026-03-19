/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.domain.event;

import iuh.fit.edu.backend.constant.event.DomainEventType;
import lombok.Getter;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Getter
public class MessageRecalledEvent{
    private final String id;
    private final DomainEventType domainEventType;

    protected MessageRecalledEvent(String id) {
        this.id = id;
        this.domainEventType = DomainEventType.MESSAGE_RECALLED;
    }
}
