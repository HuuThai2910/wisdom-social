/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.modules.chat.service;/*
                                         * @description
                                         * @author: Huu Thai
                                         * @date:
                                         * @version: 1.0
                                         */

import java.time.Instant;
import java.util.List;

import org.springframework.transaction.annotation.Transactional;

import iuh.fit.edu.backend.common.dto.response.CursorResponse;
import iuh.fit.edu.backend.modules.chat.dto.request.SendCallMessageRequest;
import iuh.fit.edu.backend.modules.chat.dto.request.ForwardMessageRequest;
import iuh.fit.edu.backend.modules.chat.dto.request.SendMessageRequest;
import iuh.fit.edu.backend.modules.chat.dto.response.MessageRecalledResponse;
import iuh.fit.edu.backend.modules.chat.dto.response.MessageResponse;

public interface MessageService {
    MessageResponse sendMessage(SendMessageRequest sendMessageRequest, Long userId);

    List<MessageResponse> forwardMessage(ForwardMessageRequest forwardMessageRequest, Long userId);

    MessageResponse sendCallMessage(SendCallMessageRequest sendCallMessageRequest, Long userId);

    MessageRecalledResponse recallMessage(String messageId, Long userId);

    @Transactional
    void deleteMessageForMe(String messageId, Long userId);

    void pinMessage(String messageId, Long userId);

    void unpinMessage(String messageId, Long userId);

    MessageResponse addReaction(String messageId, Long userId, String emoji);

    MessageResponse getMessageById(String messageId, Long userId);

    CursorResponse<List<MessageResponse>> getMessagesByConversation(
            Long conversationId,
            Long userId,
            Instant before,
            int limit);

    CursorResponse<List<MessageResponse>> getNewerMessages(
            Long conversationId, Long userId, Instant after, int limit);

    CursorResponse<List<MessageResponse>> jumpToMessage(Long conversationId, String targetMessageId, Long userId);
}
