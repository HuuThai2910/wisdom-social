/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.service.chat.impl;

import iuh.fit.edu.backend.domain.entity.mysql.Conversation;
import iuh.fit.edu.backend.domain.entity.mysql.ConversationMember;
import iuh.fit.edu.backend.dto.response.conversation.ConversationResponse;
import iuh.fit.edu.backend.dto.response.message.LastMessageResponse;
import iuh.fit.edu.backend.mapper.ConversationMapper;
import iuh.fit.edu.backend.repository.mysql.ConversationRepository;
import iuh.fit.edu.backend.repository.mysql.ConversationMemberRepository;
import iuh.fit.edu.backend.repository.nosql.MessageRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ConversationServiceImpl implements iuh.fit.edu.backend.service.chat.ConversationService {
    private final ConversationMemberRepository conversationMemberRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final ConversationMapper conversationMapper;

    @Override
    public List<ConversationResponse> getConversationsByUser(Long userId){
        log.info("Get conversation by user {}", userId);

        List<Conversation> conversations = conversationMemberRepository.findConversationsByUserIdOrderByLastMessageAtDesc(userId);
        if(conversations.isEmpty()) return Collections.emptyList();

        // Map sang dto (lúc này senderName đang null vì cần lấy dynamic name trong trường hợp người dùng đổi tên)
        List<ConversationResponse> conversationResponses = this.conversationMapper.toListConversationResponse(conversations, userId);

        // Lấy conversationId + senderId đề tìm ra đúng tên người gửi
        Set<Long> conversationIds = conversationResponses.stream()
                .map(ConversationResponse::getId)
                .collect(Collectors.toSet());

        Set<Long> senderIds = conversationResponses.stream()
                .map(ConversationResponse::getLastMessage)
                .filter(Objects::nonNull)
                .map(LastMessageResponse::getLastSenderId)
                .collect(Collectors.toSet());

        if(!senderIds.isEmpty()){
            // Lấy ConversationMember tương ứng
            List<ConversationMember> conversationMembers =
                    conversationMemberRepository
                            .findByConversation_IdInAndUser_IdIn(conversationIds, senderIds);
            Map<String, String> senderNameMap =
                    conversationMembers.stream()
                            .collect(Collectors.toMap(
                                    cm -> cm.getConversation().getId() + "-" + cm.getUser().getId(),
                                    cm -> cm.getNickname() != null
                                            ? cm.getNickname()
                                            : cm.getUser().getUsername()
                            ));
            conversationResponses.forEach(res -> {
                if(res.getLastMessage() != null){
                    Long sid = res.getLastMessage().getLastSenderId();
                    String key = res.getId() + "-" + sid;
                    res.getLastMessage().setLastSenderName(senderNameMap.get(key));
                }
            });
        }
        log.info("List conversation {}", conversationResponses);
        return conversationResponses;
    }

    @Override
    public ConversationResponse getConversationById(Long conversationId, Long userId) {
        log.info("Get conversation {} for user {}", conversationId, userId);
        
        // Kiểm tra user có phải là member của conversation không
        ConversationMember conversationMember = conversationMemberRepository
                .findByConversation_IdAndUser_Id(conversationId, userId)
                .orElseThrow(() -> new RuntimeException("Bạn không phải thành viên của cuộc trò chuyện này"));
        
        Conversation conversation = conversationMember.getConversation();
        ConversationResponse response = conversationMapper.toConversationResponse(conversation, userId);
        log.info("Conversation: {}", response);
        return response;
    }
    @Transactional
    @Override
    public void markAsRead(Long conversationId, Long userId) {
        this.conversationMemberRepository.resetUnreadCount(conversationId, userId);
    }
}
