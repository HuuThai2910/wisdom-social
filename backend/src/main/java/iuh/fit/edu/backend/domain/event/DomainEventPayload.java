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
public abstract class DomainEventPayload {
    private final DomainEventType domainEventType;

    protected DomainEventPayload(DomainEventType domainEventType) {
        this.domainEventType = domainEventType;
    }
}
