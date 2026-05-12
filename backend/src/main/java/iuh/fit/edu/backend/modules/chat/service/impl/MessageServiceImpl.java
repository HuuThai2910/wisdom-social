/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.modules.chat.service.impl;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;

import iuh.fit.edu.backend.common.dto.response.CursorResponse;
import iuh.fit.edu.backend.modules.chat.dto.request.SendCallMessageRequest;
import iuh.fit.edu.backend.modules.chat.dto.request.SendMessageRequest;
import iuh.fit.edu.backend.modules.chat.dto.response.MessageRecalledResponse;
import iuh.fit.edu.backend.modules.chat.dto.response.MessageResponse;
import iuh.fit.edu.backend.modules.chat.service.MessageService;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;

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
