/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.mapper;

import iuh.fit.edu.backend.domain.entity.mysql.Conversation;

import iuh.fit.edu.backend.domain.entity.mysql.PinnedMessageDetail;
import iuh.fit.edu.backend.dto.response.conversation.ConversationResponse;

import iuh.fit.edu.backend.dto.response.message.LastMessageResponse;
import iuh.fit.edu.backend.util.MediaUrlBuilder;
import org.mapstruct.*;
import org.springframework.beans.factory.annotation.Autowired;


import java.util.List;


/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Mapper(componentModel = "spring", uses = { ConversationMemberMapper.class })
public abstract class ConversationMapper {
    @Autowired
    protected MediaUrlBuilder mediaUrlBuilder;
    @Mapping(target = "members", source = "members")
    @Mapping(target = "pinnedMessages", source = "pinnedMessages")
    @Mapping(target = "lastMessage", ignore = true)
    public abstract ConversationResponse toConversationResponse(
            Conversation conversation,
            @Context Long userId
    );

    public abstract List<ConversationResponse> toListConversationResponse(
            List<Conversation> conversations,
            @Context Long userId
    );


    @Mapping(target = "lastMessageContent", source = "lastMessageContent")
    @Mapping(target = "lastMessageType", source = "lastMessageType")
    @Mapping(target = "lastMessageAt", source = "lastMessageAt")
    @Mapping(target = "lastSenderId", source = "lastSenderId")
    @Mapping(target = "lastSenderName", ignore = true)
    public abstract LastMessageResponse toLastMessageResponse(Conversation conversation);


    @AfterMapping
    protected void mapLastMessage(
            Conversation conversation,
            @MappingTarget ConversationResponse response
    ) {
        response.setLastMessage(toLastMessageResponse(conversation));
    }

    @AfterMapping
    protected void mapUnreadCount(
            Conversation conversation,
            @MappingTarget ConversationResponse response,
            @Context Long userId
    ) {
        conversation.getMembers().stream()
                .filter(m -> m.getUser().getId().equals(userId))
                .findFirst()
                .ifPresent(m -> response.setUnreadCount(m.getUnreadCount()));
    }
    @AfterMapping
    protected void mapPinnedMessages(
            Conversation conversation,
            @MappingTarget ConversationResponse response
    ) {
        if (conversation.getPinnedMessages() == null) return;

        List<PinnedMessageDetail> mapped = conversation.getPinnedMessages()
                .stream()
                .map(this::mapPinnedMessageDetail)
                .toList();

        response.setPinnedMessages(mapped);
    }

    // ================== HELPER ==================

    protected PinnedMessageDetail mapPinnedMessageDetail(PinnedMessageDetail p) {
        if (p == null) return null;

        PinnedMessageDetail copy = new PinnedMessageDetail();
        copy.setOriginalSenderId(p.getOriginalSenderId());
        copy.setMessageId(p.getMessageId());
        copy.setPinnerId(p.getPinnerId());
        copy.setPinnedAt(p.getPinnedAt());
        copy.setType(p.getType());

        copy.setContent(
                mediaUrlBuilder.build(p.getContent(), p.getType())
        );

        return copy;
    }
}
