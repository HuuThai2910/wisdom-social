package iuh.fit.edu.backend.event.handler;

import iuh.fit.edu.backend.dto.response.conversation.ConversationResponse;
import iuh.fit.edu.backend.event.payload.ConversationUpdatedEvent;
import iuh.fit.edu.backend.event.payload.MemberRoleUpdatedEvent;
import iuh.fit.edu.backend.event.payload.MemberUpdatedEvent;
import iuh.fit.edu.backend.event.type.DomainEventType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class MemberRoleUpdatedEventHandler implements RedisEventHandler {
    
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public Class<?> getSupportedClass() { return MemberRoleUpdatedEvent.class; }

    @Override
    public String getSupportedEventType() { return DomainEventType.MEMBER_ROLE_UPDATED.toString(); }

    @Override
    public void handle(Object eventPayload, Set<Long> targetMemberIds) {
        MemberRoleUpdatedEvent event = (MemberRoleUpdatedEvent) eventPayload;

        if (targetMemberIds == null || targetMemberIds.isEmpty())
            return;

        for(Long memberId : targetMemberIds){
            String destination = "/topic/user/" + memberId + "/conversations";
            messagingTemplate.convertAndSend(destination, event);
        }
        log.info("Broadcast update roloe member to {} members", event.getMemberIds());
    }
}