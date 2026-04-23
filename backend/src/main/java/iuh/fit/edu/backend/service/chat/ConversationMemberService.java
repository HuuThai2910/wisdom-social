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
import iuh.fit.edu.backend.domain.entity.mysql.ConversationMember;
import iuh.fit.edu.backend.dto.request.convesation.AddMemberRequest;
import iuh.fit.edu.backend.dto.response.conversation.ConversationMemberResponse;
import iuh.fit.edu.backend.dto.response.conversation.ConversationResponse;
import jakarta.transaction.Transactional;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;

import java.util.Map;
import java.util.Set;

public interface ConversationMemberService {
    Map<Long, ConversationMemberResponse> getMembersMap(Long conversationId);

    ConversationMemberResponse getMemberInfo(Long conversationId, Long userId);


    ConversationResponse addMembers(Long conversationId, AddMemberRequest request, Long inviterId);

    @org.springframework.transaction.annotation.Transactional(rollbackFor = Exception.class)
    ConversationResponse leaveGroup(Long conversationId, Long userId);

    @org.springframework.transaction.annotation.Transactional(rollbackFor = Exception.class)
    ConversationResponse kickMember(Long conversationId, Long targetId, Long requesterId);

    void updateMemberStateInCache(Long conversationId, Long userId, ConversationMember memberEntity);

    @Transactional
    void updateNickname(Long conversationId, Long targetUserId, String newNickname);

    Set<Long> getAllMemberId(Long conversationId);

    ConversationResponse updateMemberRole(Long conversationId, Long targetId, Long requesterId, MemberRole newRole);

    void disbandGroup(Long conversationId, Long userId);
}
