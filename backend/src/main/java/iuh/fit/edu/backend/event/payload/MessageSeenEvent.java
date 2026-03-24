package iuh.fit.edu.backend.event.payload;

import com.fasterxml.jackson.annotation.JsonIgnore;
import iuh.fit.edu.backend.dto.response.message.MessageSeenResponse;
import iuh.fit.edu.backend.event.type.DomainEventType;
import lombok.Getter;

import java.util.Set;

@Getter
public class MessageSeenEvent {
    
    private final MessageSeenResponse messageSeenResponse;
    @JsonIgnore
    private final Set<Long> receiverIds;
    private final DomainEventType domainEventType;

    public MessageSeenEvent(MessageSeenResponse messageSeenResponse, Set<Long> receiverIds) {
        this.messageSeenResponse = messageSeenResponse;
        this.receiverIds = receiverIds;
        this.domainEventType = DomainEventType.MESSAGE_SEEN;
    }
}