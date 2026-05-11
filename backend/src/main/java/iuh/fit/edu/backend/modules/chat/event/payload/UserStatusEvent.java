/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.modules.chat.event.payload;

import iuh.fit.edu.backend.modules.user.dto.response.UserStatusResponse;
import iuh.fit.edu.backend.common.event.type.DomainEventType;
import lombok.Getter;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Getter
public class UserStatusEvent {

    private final UserStatusResponse payload;
    private final DomainEventType type = DomainEventType.USER_STATUS;

    public UserStatusEvent(UserStatusResponse payload) {
        this.payload = payload;
    }
}
