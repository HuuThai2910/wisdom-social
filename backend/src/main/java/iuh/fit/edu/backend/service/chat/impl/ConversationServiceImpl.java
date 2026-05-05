/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.service.chat.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.edu.backend.constant.*;
import iuh.fit.edu.backend.domain.entity.mysql.Conversation;
import iuh.fit.edu.backend.domain.entity.mysql.ConversationMember;
import iuh.fit.edu.backend.dto.request.convesation.CreateGroupRequest;
import iuh.fit.edu.backend.dto.response.conversation.ConversationMemberResponse;
import iuh.fit.edu.backend.dto.response.conversation.ConversationResponse;
import iuh.fit.edu.backend.dto.response.conversation.ConversationSidebarResponse;
import iuh.fit.edu.backend.dto.response.message.MessageSeenResponse;
import iuh.fit.edu.backend.event.payload.ConversationCreatedEvent;
import iuh.fit.edu.backend.event.payload.MessageSeenEvent;
import iuh.fit.edu.backend.exception.ConversationAccessDeniedException;
import iuh.fit.edu.backend.exception.ConversationMemberKickedException;
import iuh.fit.edu.backend.exception.ConversationMemberLeftException;
import iuh.fit.edu.backend.mapper.ConversationMapper;
import iuh.fit.edu.backend.mapper.ConversationMemberMapper;
import iuh.fit.edu.backend.repository.mysql.ConversationMemberRepository;
import iuh.fit.edu.backend.repository.mysql.ConversationRepository;
import iuh.fit.edu.backend.repository.mysql.UserRepository;
import iuh.fit.edu.backend.service.chat.ConversationMemberCacheService;
import iuh.fit.edu.backend.service.chat.ConversationMemberService;
import iuh.fit.edu.backend.service.chat.ConversationService;
import iuh.fit.edu.backend.service.chat.InternalMessageService;
import iuh.fit.edu.backend.util.TransactionUtil;
import iuh.fit.edu.backend.util.heplper.ChatSnapshotHelper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
@Service
@RequiredArgsConstructor
@Slf4j
public class ConversationServiceImpl implements ConversationService {
    private final ConversationMemberRepository conversationMemberRepository;
    private final ConversationMapper conversationMapper;
    private final ConversationMemberService conversationMemberService;
    private final ApplicationEventPublisher eventPublisher;
    private final ConversationRepository conversationRepository;
    private final UserRepository userRepository;
    private final InternalMessageService internalMessageService;
    private final ConversationMemberCacheService memberCacheService;
    private final ConversationMemberMapper conversationMemberMapper;
    private final ChatSnapshotHelper chatSnapshotHelper;


    @Transactional(rollbackFor = Exception.class)
    @Override
    public ConversationResponse createGroup(CreateGroupRequest request, Long creatorId) {

        Set<Long> targetMemberIds = new HashSet<>(request.getMemberIds());
        targetMemberIds.remove(creatorId); // Đề phòng FE vô tình gửi kèm ID của người tạo
        if (targetMemberIds.size() < 2) {
            throw new IllegalArgumentException("Nhóm phải có ít nhất 3 thành viên (bao gồm bạn)");
        }

        String imageUrl = request.getImageUrl() != null ? request.getImageUrl() : "users/group.png";
        if(request.getImageUrl() == null){
            request.setImageUrl("users/group.png");
        }
        // Set tổng hợp tất cả ID
        Set<Long> allMemberIds = new HashSet<>(targetMemberIds);
        allMemberIds.add(creatorId);

        // LƯU BẢNG CONVERSATION (MySQL)
        Instant now = Instant.now().truncatedTo(ChronoUnit.MILLIS);

        Conversation savedConversation = initializeNewConversation(request.getName(), imageUrl, now);


        // LƯU BẢNG CONVERSATION MEMBER (MySQL - BATCH INSERT)
        List<ConversationMember> members = createMembersForNewGroup(savedConversation, allMemberIds, creatorId, now);
        savedConversation.setMembers(members);

        Map<Long, ConversationMemberResponse> dbMap = members.stream()
                .map(conversationMemberMapper::toConversationMemberResponse)
                .collect(Collectors.toMap(ConversationMemberResponse::getUserId, m -> m));

        TransactionUtil.executeAfterCommit(() -> {
            memberCacheService.saveMembersMap(savedConversation.getId(), dbMap);
        });

        String targetMembersSnapshot = chatSnapshotHelper.buildMemberSnapshotContent(targetMemberIds);
        internalMessageService.createSystemMessage(savedConversation.getId(), creatorId, MessageType.SYSTEM_CREATE_GROUP, targetMembersSnapshot);

        // CẬP NHẬT SNAPSHOT TIN NHẮN CUỐI (MySQL)
        String creatorName = chatSnapshotHelper.resolveUserDisplayName(creatorId);
        updateGroupSnapshot(savedConversation, targetMembersSnapshot, creatorId, creatorName, MessageType.SYSTEM_CREATE_GROUP);

        // MAP RESPONSE & BẮN EVENT
        ConversationResponse response = conversationMapper.toConversationResponse(savedConversation, creatorId);
        if(response.getLastMessage() != null){
            response.getLastMessage().setLastSenderName(creatorName);
            response.getLastMessage().setRead(true);
        }

        // Bắn Socket Event cho toàn bộ thành viên
        this.eventPublisher.publishEvent(new ConversationCreatedEvent(response,allMemberIds));

        return response;
    }

    @Override
    public List<ConversationSidebarResponse> getConversationsByUser(Long userId){
        List<ConversationMember> members = conversationMemberRepository.findActiveSidebarByUserId(userId);
        if(members.isEmpty()) return Collections.emptyList();
        List<ConversationSidebarResponse> conversationResponses = this.conversationMapper.toListSidebarFromMembers(members);
        log.info("List conversation by user {}:  {} ", userId, conversationResponses);
        return conversationResponses;
    }

    @Override
    public ConversationResponse getConversationById(Long conversationId, Long userId) {
        log.info("Get conversation {} for user {}", conversationId, userId);

        ConversationMember conversationMember = conversationMemberRepository
                .findByConversation_IdAndUser_Id(conversationId, userId)
                .orElseThrow(() -> new ConversationAccessDeniedException("Bạn không phải thành viên của cuộc trò chuyện này"));

        if (conversationMember.getStatus() == ConversationMemberStatus.KICKED) {
            throw new ConversationMemberKickedException("Bạn đã bị xóa khỏi nhóm");
        }

        if (conversationMember.getStatus() == ConversationMemberStatus.LEFT) {
            throw new ConversationMemberLeftException("Bạn đã rời khỏi nhóm");
        }

        if (conversationMember.getStatus() == ConversationMemberStatus.GROUP_DISBANDED) {
            throw new ConversationAccessDeniedException("Nhóm đã bị giải tán");
        }

        Conversation conversation = conversationMember.getConversation();
        ConversationResponse response = conversationMapper.toConversationResponse(conversation, userId);

        log.info("Conversation: {}", response);
        return response;
    }

    @Transactional
    @Override
    public void deleteConversationForMe(Long conversationId, Long userId) {
        ConversationMember member = conversationMemberRepository.findByConversation_IdAndUser_IdAndStatus(conversationId, userId, ConversationMemberStatus.ACTIVE)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thành viên trong cuộc trò chuyện"));

        member.setClearedAt(Instant.now().truncatedTo(ChronoUnit.MILLIS));
        member.setHidden(true);
        ConversationMember savedMember = conversationMemberRepository.save(member);

        // DỌN SẠCH CACHE ĐỂ CẬP NHẬT MỐC CLEARED_AT
        TransactionUtil.executeAfterCommit(() -> {
            conversationMemberService.updateMemberStateInCache(conversationId, userId, savedMember);
        });

    }

    @Transactional
    @Override
    public void markAsRead(Long conversationId, Long userId, String lastMessageId) {
        ConversationMember member = conversationMemberRepository.findByConversation_IdAndUser_IdAndStatus(conversationId, userId, ConversationMemberStatus.ACTIVE)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thành viên trong cuộc trò chuyện"));

        // Kiểm tra xem có thực sự cần cập nhật không để tránh call DB vô ích
        if (member.getUnreadCount() == 0 &&
                (lastMessageId == null || lastMessageId.equals(member.getLastReadMessageId()))) {
            return;
        }
        member.setUnreadCount(0);
        if (lastMessageId != null) {
            member.setLastReadMessageId(lastMessageId);
        }
        ConversationMember savedMember = conversationMemberRepository.save(member);

        // ĐỒNG BỘ REDIS: Số unreadCount = 0 vừa cập nhật phải được nhét lại vào Redis Hash ngay!
        TransactionUtil.executeAfterCommit(() -> {
            conversationMemberService.updateMemberStateInCache(conversationId, userId, savedMember);
        });

        // Chuẩn bị dữ liệu bắn Socket
        MessageSeenResponse response = MessageSeenResponse.builder()
                .conversationId(conversationId)
                .userId(userId)
                .lastMessageId(lastMessageId)
                .seenAt(Instant.now())
                .build();

        Set<Long> memberIds = conversationMemberService.getAllMemberId(conversationId);
        // Publish Event cho các user khác thấy tin nhắn mình đã xem
        this.eventPublisher.publishEvent(new MessageSeenEvent(response, memberIds));

    }

    // =======================================================
    // PRIVATE HELPERS CHO HÀM TẠO NHÓM
    // =======================================================

    private Conversation initializeNewConversation(String name, String imageUrl, Instant now) {
        Conversation conversation = new Conversation();
        conversation.setType(ConversationType.GROUP);
        conversation.setName(name);
        conversation.setImageUrl(imageUrl);
        conversation.setUpdatedAt(now);
        conversation.setLastMessageAt(now);
        return conversationRepository.save(conversation);
    }

    private List<ConversationMember> createMembersForNewGroup(Conversation conv, Set<Long> allMemberIds, Long creatorId, Instant now) {
        List<ConversationMember> members = allMemberIds.stream().map(userId -> {
            ConversationMember member = new ConversationMember();
            member.setConversation(conv);
            member.setUser(userRepository.getReferenceById(userId));
            member.setStatus(ConversationMemberStatus.ACTIVE);
            member.setJoinedAt(now);
            member.setRole(userId.equals(creatorId) ? MemberRole.OWNER : MemberRole.MEMBER);
            return member;
        }).collect(Collectors.toList());

        return conversationMemberRepository.saveAll(members);
    }

    private void updateGroupSnapshot(Conversation conv, String targetSnapshot, Long creatorId, String creatorName, MessageType type) {
        conv.setLastMessageContent(targetSnapshot);
        conv.setLastSenderId(creatorId);
        conv.setLastMessageType(type);
        conv.setLastSenderName(creatorName);
        conversationRepository.save(conv);
    }
}
