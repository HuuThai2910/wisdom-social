/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.constant.event;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
public enum DomainEventType {
    // Message
    MESSAGE_CREATED,
    MESSAGE_RECALLED,


    // Conversation
    ROOM_CREATED,
    ROOM_UPDATED,
    ROOM_DELETED,

    // Group membership
    MEMBER_ADDED,
    MEMBER_REMOVED,
    MEMBER_ROLE_CHANGED,
}

