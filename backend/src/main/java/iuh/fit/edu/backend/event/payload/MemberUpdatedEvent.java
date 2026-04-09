/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.event.payload;

import iuh.fit.edu.backend.event.type.DomainEventType;
import lombok.AllArgsConstructor;
import lombok.Getter;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Getter
@AllArgsConstructor
public class MemberUpdatedEvent {
    private final Long conversationId;
    private final Long userId;         // ID của người bị đổi tên
    private final String newNickname;  // Tên hiển thị mới
    private final String newAvatar;    // Ảnh đại diện mới
    private final DomainEventType domainEventType = DomainEventType.MEMBER_UPDATED;
}
