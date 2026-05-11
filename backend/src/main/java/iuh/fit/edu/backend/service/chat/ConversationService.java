/*
 * @ (#) .java    1.0       
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.service.chat;/*
 * @description
 * @author: Huu Thai
 * @date:   
 * @version: 1.0
 */

import iuh.fit.edu.backend.constant.MemberRole;
import iuh.fit.edu.backend.dto.request.convesation.AddMemberRequest;
import iuh.fit.edu.backend.dto.request.convesation.CreateGroupRequest;
import iuh.fit.edu.backend.dto.response.conversation.ConversationResponse;
import iuh.fit.edu.backend.dto.response.conversation.ConversationSidebarResponse;
import jakarta.transaction.Transactional;

import java.util.List;

public interface ConversationService {



    ConversationResponse createGroup(CreateGroupRequest request, Long creatorId);

    List<ConversationSidebarResponse> getConversationsByUser(Long userId);

    ConversationResponse getConversationById(Long conversationId, Long userId);

    void deleteConversationForMe(Long conversationId, Long userId);

    @Transactional
    void markAsRead(Long conversationId, Long userId, String lastMessageId);

    ConversationResponse updateMessageRestriction(Long conversationId, Long requesterId, boolean isRestricted);
}

