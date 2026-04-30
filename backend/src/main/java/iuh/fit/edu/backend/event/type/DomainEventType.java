/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.event.type;

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
    MESSAGE_SEEN,
    TYPING,
    PIN_MESSAGE,
    UPIN_MESSAGE,
    USER_STATUS,


    // Conversation
    ROOM_CREATED,
    ROOM_UPDATED,
    ROOM_DELETED,

    // Group membership
    MEMBER_ADDED,
    MEMBER_REMOVED,
    MEMBER_ROLE_CHANGED,
    MEMBER_UPDATED,

    // Page membership
    PAGE_MEMBER_JOINED,
    PAGE_MEMBER_LEFT,
    PAGE_MEMBER_BLOCKED,
    PAGE_MEMBER_UNBLOCKED,
    PAGE_MEMBER_ROLE_CHANGED,
    PAGE_JOIN_REQUESTED,
    PAGE_JOIN_APPROVED,
    PAGE_JOIN_REJECTED,
    PAGE_JOIN_CANCELLED,

}

