/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.service.chat.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.edu.backend.constant.ConversationMemberStatus;
import iuh.fit.edu.backend.constant.MemberStatus;
import iuh.fit.edu.backend.constant.MessageType;
import iuh.fit.edu.backend.constant.UploadModule;
import iuh.fit.edu.backend.domain.entity.mysql.*;
import iuh.fit.edu.backend.domain.entity.nosql.Message;
import iuh.fit.edu.backend.dto.request.SendCallMessageRequest;
import iuh.fit.edu.backend.dto.response.message.MessageRecalledResponse;
import iuh.fit.edu.backend.event.payload.ConversationUpdatedEvent;
import iuh.fit.edu.backend.event.payload.MessageCreatedEvent;
import iuh.fit.edu.backend.dto.request.message.SendMessageRequest;
import iuh.fit.edu.backend.dto.response.CursorResponse;
import iuh.fit.edu.backend.dto.response.conversation.ConversationMemberResponse;
import iuh.fit.edu.backend.dto.response.message.LastMessageResponse;
import iuh.fit.edu.backend.dto.response.message.MessageResponse;
import iuh.fit.edu.backend.event.payload.MessageRecalledEvent;
import iuh.fit.edu.backend.event.payload.PinUpdatedEvent;
import iuh.fit.edu.backend.mapper.ConversationMapper;
import iuh.fit.edu.backend.mapper.MessageMapper;
import iuh.fit.edu.backend.repository.mysql.ConversationMemberRepository;
import iuh.fit.edu.backend.repository.mysql.ConversationRepository;
import iuh.fit.edu.backend.repository.mysql.UserRepository;
import iuh.fit.edu.backend.repository.nosql.MessageRepository;
import iuh.fit.edu.backend.service.chat.ConversationMemberService;
import iuh.fit.edu.backend.service.chat.InternalMessageService;
import iuh.fit.edu.backend.service.chat.MessageCacheService;
import iuh.fit.edu.backend.service.chat.MessageService;
import iuh.fit.edu.backend.service.s3.S3Service;
import iuh.fit.edu.backend.util.TransactionUtil;
import iuh.fit.edu.backend.util.heplper.ChatSnapshotHelper;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.*;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Slf4j
@Service
@AllArgsConstructor
public class MessageServiceImpl implements MessageService{
    private final MessageCommandService commandService;
    private final MessageQueryService queryService;


    @Override
    public MessageResponse sendMessage(SendMessageRequest sendMessageRequest, Long userId) {
        return commandService.sendMessage(sendMessageRequest, userId);
    }

    @Override
    public void pinMessage(String messageId, Long userId) {
        commandService.pinMessage(messageId, userId);
    }

    @Override
    public void unpinMessage(String messageId, Long userId) {
        commandService.unpinMessage(messageId, userId);
    }

    @Override
    public MessageResponse sendCallMessage(SendCallMessageRequest sendCallMessageRequest, Long userId) {
        return commandService.sendCallMessage(sendCallMessageRequest, userId);
    }

    @Override
    public MessageRecalledResponse recallMessage(String messageId, Long userId) {
        return commandService.recallMessage(messageId, userId);
    }

    @Override
    public void deleteMessageForMe(String messageId, Long userId) {
        commandService.deleteMessageForMe(messageId, userId);
    }

    @Override
    public CursorResponse<List<MessageResponse>> getMessagesByConversation(Long conversationId, Long userId, Instant before, int limit) {
        return queryService.getMessagesByConversation(conversationId, userId, before, limit);
    }

    @Override
    public CursorResponse<List<MessageResponse>> getNewerMessages(Long conversationId, Long userId, Instant after, int limit) {
        return queryService.getNewerMessages(conversationId, userId, after, limit);
    }

    @Override
    public CursorResponse<List<MessageResponse>> jumpToMessage(Long conversationId, String targetMessageId, Long userId) {
        return queryService.jumpToMessage(conversationId, targetMessageId, userId);
    }
}
