/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.event.payload;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import iuh.fit.edu.backend.dto.response.conversation.ConversationResponse;
import iuh.fit.edu.backend.event.type.DomainEventType;
import lombok.Getter;

import java.util.Set;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Getter
public class GroupDisbandedEvent {

    private Long conversationId;
    private DomainEventType domainEventType;
    // Field này chỉ dùng để Server biết gửi cho ai, không gửi xuống Client
    @JsonIgnore
    private final Set<Long> memberIds;


    @JsonCreator
    public GroupDisbandedEvent(
            @JsonProperty("conversationId") Long conversationId,
            @JsonProperty("memberIds") Set<Long> memberIds) {
        this.conversationId = conversationId;
        this.domainEventType = DomainEventType.GROUP_DISBANDED;
        this.memberIds = memberIds;
    }
}
