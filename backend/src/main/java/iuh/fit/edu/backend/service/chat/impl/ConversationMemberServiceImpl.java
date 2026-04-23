/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.service.chat.impl;

import iuh.fit.edu.backend.constant.*;
import iuh.fit.edu.backend.domain.entity.mysql.Conversation;
import iuh.fit.edu.backend.domain.entity.mysql.ConversationMember;
import iuh.fit.edu.backend.dto.request.convesation.AddMemberRequest;
import iuh.fit.edu.backend.dto.response.conversation.ConversationMemberResponse;
import iuh.fit.edu.backend.dto.response.conversation.ConversationResponse;
import iuh.fit.edu.backend.event.payload.*;
import iuh.fit.edu.backend.event.type.DomainEventType;
import iuh.fit.edu.backend.mapper.ConversationMapper;
import iuh.fit.edu.backend.mapper.ConversationMemberMapper;
import iuh.fit.edu.backend.repository.mysql.ConversationMemberRepository;
import iuh.fit.edu.backend.repository.mysql.ConversationRepository;
import iuh.fit.edu.backend.repository.mysql.UserRepository;
import iuh.fit.edu.backend.service.chat.ConversationMemberCacheService;
import iuh.fit.edu.backend.service.chat.ConversationMemberService;
import iuh.fit.edu.backend.service.chat.InternalMessageService;
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
@Slf4j
@Service
@RequiredArgsConstructor
public class ConversationMemberServiceImpl implements ConversationMemberService {
    private final ConversationMemberRepository conversationMemberRepository;
    private final ConversationMemberMapper conversationMemberMapper;
    private final ConversationRepository conversationRepository;
    private final ConversationMemberCacheServiceImpl cacheService;
    private final ApplicationEventPublisher eventPublisher;
    private final UserRepository userRepository;
    private final ConversationMapper conversationMapper;
    private final InternalMessageService internalMessageService;
    private final ConversationMemberCacheService conversationMemberCacheService;

    /**
     * Lấy danh sách toàn bộ thành viên. Ưu tiên lấy từ Cache, nếu rỗng thì gọi DB.
     */
    @Override
    public Map<Long, ConversationMemberResponse> getMembersMap(Long conversationId) {
        // Kéo từ Redis
        Map<Long, ConversationMemberResponse> cachedMap = cacheService.getMembersMap(conversationId);
        if (!cachedMap.isEmpty()) {
            return cachedMap;
        }

        // Nếu Redis trống, chọc xuống MySQL
        List<ConversationMember> members = conversationMemberRepository.findByConversation_Id(conversationId);
        Map<Long, ConversationMemberResponse> dbMap = members.stream()
                .map(conversationMemberMapper::toConversationMemberResponse)
                .collect(Collectors.toMap(ConversationMemberResponse::getUserId, m -> m));

        // Nạp lại vào Redis để lần sau đọc cho nhanh
        cacheService.saveMembersMap(conversationId, dbMap);
        return dbMap;
    }

    /**
     * Lấy thông tin 1 thành viên. Dùng cho hàm Gửi tin, Ghim tin...
     */
    @Override
    public ConversationMemberResponse getMemberInfo(Long conversationId, Long userId) {
        ConversationMemberResponse cachedMember = cacheService.getMemberInfo(conversationId, userId);
        if (cachedMember != null && cachedMember.getStatus().equals(ConversationMemberStatus.ACTIVE)) {
            return cachedMember;
        }

        ConversationMemberResponse response = conversationMemberRepository.findByConversation_IdAndUser_IdAndStatus(conversationId, userId, ConversationMemberStatus.ACTIVE)
                .map(conversationMemberMapper::toConversationMemberResponse)
                        .orElseThrow(() -> new RuntimeException("Không tim thấy thành viên cuộc trò chuyện"));

        cacheService.saveMemberInfo(conversationId, userId, response);
        return response;
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public ConversationResponse addMembers(Long conversationId, AddMemberRequest request, Long inviterId) {
        Instant now = Instant.now().truncatedTo(ChronoUnit.MILLIS);

        // Kiểm tra phòng chat
        Conversation conv = validateGroupAndInviter(conversationId, inviterId);

        Set<Long> actuallyAddedIds = new HashSet<>();
        List<ConversationMember> membersToSave = prepareMembersForAddition(
                conv, request.getNewMemberIds(), inviterId, actuallyAddedIds, now);

        // Nếu tất cả ID gửi lên đều đã nằm trong nhóm (ACTIVE) rồi thì dừng luôn
        if (actuallyAddedIds.isEmpty()) {
            return conversationMapper.toConversationResponse(conv, inviterId);
        }

        List<ConversationMember> conversationMembers = conversationMemberRepository.saveAll(membersToSave);
        for (ConversationMember member : conversationMembers){
            this.conversationMemberCacheService.saveMemberInfo(conversationId, member.getUser().getId(), conversationMemberMapper.toConversationMemberResponse(member));
        }

        // Cập nhật thông tin cho redis
        for (ConversationMember m : membersToSave) {
            ConversationMemberResponse memberResponse = conversationMemberMapper.toConversationMemberResponse(m);
            conversationMemberCacheService.saveMemberInfo(conversationId, m.getUser().getId(), memberResponse);
        }


        // Ghi Log vào MongoDB qua MessageFacade
        String targetIdsJson = "[" + actuallyAddedIds.stream()
                .map(String::valueOf).collect(Collectors.joining(",")) + "]";

        internalMessageService.createSystemMessage(conversationId, inviterId, MessageType.SYSTEM_ADD_MEMBER, targetIdsJson);

        // Cập nhật Snapshot (MySQL)
        updateConversationSnapshot(conv, inviterId, MessageType.SYSTEM_ADD_MEMBER, targetIdsJson, now);

        // Map Response & Chỉnh sửa LastMessage
        ConversationResponse response = conversationMapper.toConversationResponse(conv, inviterId);
        if (response.getLastMessage() != null) {
            response.getLastMessage().setLastSenderName("");
            response.getLastMessage().setRead(true);
        }

        // Bắn sự kiện (Lấy tất cả member ACTIVE hiện tại để bắn)
        Set<Long> allActiveMemberIds = conversationMemberRepository
                .findUserIdsByConversationIdAndStatus(conversationId, ConversationMemberStatus.ACTIVE);

        eventPublisher.publishEvent(new MemberAddedEvent(response, allActiveMemberIds));

        return response;
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public ConversationResponse leaveGroup(Long conversationId, Long userId) {
        // 1. Chỉ validate logic Leave
        Conversation conv = validateLeavePermission(conversationId, userId);

        // 2. Gọi hàm lõi dùng chung
        return processMemberRemoval(conv, userId, userId,
                ConversationMemberStatus.LEFT, MessageType.SYSTEM_LEAVE_GROUP, "[]", DomainEventType.MEMBER_LEFT);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public ConversationResponse kickMember(Long conversationId, Long targetId, Long requesterId) {
        // Chỉ validate logic Kick
        Conversation conv = validateKickPermission(conversationId, targetId, requesterId);

        // Gọi hàm lõi dùng chung
        return processMemberRemoval(conv, targetId, requesterId,
                ConversationMemberStatus.KICKED, MessageType.SYSTEM_KICK_MEMBER, "[" + targetId + "]", DomainEventType.MEMBER_KICKED);
    }

    /**
     * Hàm dùng để đồng bộ dữ liệu vào Redis ngay sau khi DB vừa cập nhật.
     * Dùng cho tính năng "Đã xem" (Seen) hoặc "Xóa lịch sử" (ClearedAt).
     */
    @Override
    public void updateMemberStateInCache(Long conversationId, Long userId, ConversationMember memberEntity) {
        ConversationMemberResponse updatedInfo = conversationMemberMapper.toConversationMemberResponse(memberEntity);
        cacheService.saveMemberInfo(conversationId, userId, updatedInfo);
    }

    /**
     * Logic Đổi biệt danh. Cần cập nhật DB, Cập nhật Cache, và Bắn WebSocket.
     */
    @Transactional
    @Override
    public void updateNickname(Long conversationId, Long targetUserId, String newNickname) {
        ConversationMember member = conversationMemberRepository.findByConversation_IdAndUser_IdAndStatus(conversationId, targetUserId, ConversationMemberStatus.ACTIVE)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thành viên trong phòng chat"));

        // Lưu vào MySQL
        member.setNickname(newNickname);
        ConversationMember savedMember = conversationMemberRepository.save(member);

        // Cập nhật đè lên ô của người này trong Redis Hash (HSET)
        updateMemberStateInCache(conversationId, targetUserId, savedMember);

        // 3. Bắn WebSocket Event để Frontend đổi tên hiển thị trên luồng chat
        eventPublisher.publishEvent(new MemberUpdatedEvent(
                conversationId,
                targetUserId,
                newNickname,
                savedMember.getUser().getAvatarUrl()
        ));
    }

    /**
     * Lấy ra tất cả id của member ở trong cuộc hội thoại (không trùng nhau)
     */
    @Override
    public Set<Long> getAllMemberId(Long conversationId){
        return  this.conversationMemberRepository.findUserIdsByConversationIdAndStatus(conversationId, ConversationMemberStatus.ACTIVE);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public ConversationResponse updateMemberRole(Long conversationId, Long targetId, Long requesterId, MemberRole newRole) {
        Instant now = Instant.now().truncatedTo(ChronoUnit.MILLIS);

        // Kiểm tra phòng và lấy thông tin 2 người
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy cuộc trò chuyện"));

        ConversationMember requester = getActiveMember(conversationId, requesterId);
        ConversationMember target = getActiveMember(conversationId, targetId);

        // Kiểm tra tính hợp lệ (Chỉ OWNER mới được làm điều này)
        validateRoleUpdatePermission(conv, requester, target, newRole);

        // Xử lý logic cập nhật (1 dòng hay 2 dòng DB?)
        List<ConversationMember> membersToUpdate = new ArrayList<>();

        if (newRole == MemberRole.OWNER) {
            requester.setRole(MemberRole.MEMBER);
            target.setRole(MemberRole.OWNER);
            membersToUpdate.add(requester);
            membersToUpdate.add(target);
        } else {
            // Chỉ update người kia
            target.setRole(newRole);
            membersToUpdate.add(target);
        }
        conversationMemberRepository.saveAll(membersToUpdate);

        // Cập nhật thông tin cho redis
        for (ConversationMember m : membersToUpdate) {
            ConversationMemberResponse memberResponse = conversationMemberMapper.toConversationMemberResponse(m);
            conversationMemberCacheService.saveMemberInfo(conversationId, m.getUser().getId(), memberResponse);
        }

        // Tạo JSON Content cho tin nhắn hệ thống
        // Chuyển {"targetId": 2, "newRole": "DEPUTY"} thành chuỗi để FE dễ dịch
        String sysMsgContent = String.format("{\"targetId\":%d, \"newRole\":\"%s\"}", targetId, newRole.name());

        // Gom ID người nhận Socket
        Set<Long> allNotifyIds = conversationMemberRepository
                .findUserIdsByConversationIdAndStatus(conversationId, ConversationMemberStatus.ACTIVE);

        // 6. Lưu Mongo & Bắn Socket Khung Chat qua Facade
        internalMessageService.createSystemMessage(
                conversationId, requesterId, MessageType.SYSTEM_UPDATE_ROLE, sysMsgContent);

        // Cập nhật Snapshot Sidebar (MySQL)
        updateConversationSnapshot(conv, requesterId, MessageType.SYSTEM_UPDATE_ROLE, sysMsgContent, now);

        // Map DTO & Bắn Event Sidebar
        ConversationResponse response = conversationMapper.toConversationResponse(conv, requesterId);
        if (response.getLastMessage() != null) {
            response.getLastMessage().setLastSenderName("");
            response.getLastMessage().setRead(true);
        }

        eventPublisher.publishEvent(new MemberRoleUpdatedEvent(response, allNotifyIds));

        return response;
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void disbandGroup(Long conversationId, Long requesterId) {
        Instant now = Instant.now().truncatedTo(ChronoUnit.MILLIS);

        // 1. Kiểm tra phòng và quyền Trưởng nhóm
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy cuộc trò chuyện"));

        ConversationMember requester = getActiveMember(conversationId, requesterId);
        if (requester.getRole() != MemberRole.OWNER) {
            throw new RuntimeException("Chỉ Trưởng nhóm mới có quyền giải tán nhóm");
        }

        // 2. Lấy danh sách tất cả thành viên đang ACTIVE để xử lý
        List<ConversationMember> activeMembers = conversationMemberRepository
                .findByConversationIdAndStatus(conversationId, ConversationMemberStatus.ACTIVE);

        Set<Long> allNotifyIds = activeMembers.stream()
                .map(m -> m.getUser().getId()).collect(Collectors.toSet());

        // Cập nhật trạng thái hàng loạt trong MySQL
        for (ConversationMember member : activeMembers) {
            member.setStatus(ConversationMemberStatus.GROUP_DISBANDED);
            member.setLeftAt(now);
        }
        conversationMemberRepository.saveAll(activeMembers);

        // Đồng bộ Redis (Xóa hoặc cập nhật status từng người)
        for (Long uid : allNotifyIds) {
            ConversationMemberResponse dto = conversationMemberCacheService.getMemberInfo(conversationId, uid);
            if (dto != null) {
                dto.setStatus(ConversationMemberStatus.GROUP_DISBANDED);
                conversationMemberCacheService.saveMemberInfo(conversationId, uid, dto);
            }
        }

        // 5. Lưu tin nhắn hệ thống & Bắn Socket Khung Chat
        internalMessageService.createSystemMessage(
                conversationId, requesterId, MessageType.SYSTEM_DISBAND_GROUP, "[]");

        // Cập nhật Snapshot Sidebar (Để hiện chữ "Nhóm đã giải tán")
        updateConversationSnapshot(conv, requesterId, MessageType.SYSTEM_DISBAND_GROUP, "[]", now);

        // Bắn Event giải tán để FE xóa/khóa Sidebar
        // Chúng ta không cần Map Response phức tạp vì nhóm đã chết, chỉ cần gửi ID để FE xử lý
        eventPublisher.publishEvent(new GroupDisbandedEvent(conversationId, allNotifyIds));
    }

// ======================= HÀM HELPER =======================

    private void validateRoleUpdatePermission(Conversation conv, ConversationMember requester,
                                              ConversationMember target, MemberRole newRole) {
        if (conv.getType() != ConversationType.GROUP) {
            throw new IllegalArgumentException("Chỉ có thể phân quyền trong nhóm chat");
        }

        if (requester.getRole() != MemberRole.OWNER) {
            throw new RuntimeException("Chỉ Trưởng nhóm mới có quyền thay đổi vai trò thành viên");
        }

        if (requester.getUser().getId().equals(target.getUser().getId())) {
            throw new RuntimeException("Bạn không thể tự thay đổi quyền của chính mình");
        }

        if (target.getRole() == newRole) {
            throw new RuntimeException("Thành viên này đã giữ vai trò " + newRole.name() + " rồi");
        }
    }

    private Conversation validateLeavePermission(Long convId, Long userId) {
        Conversation conv = conversationRepository.findById(convId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy cuộc trò chuyện"));

        if (conv.getType() != ConversationType.GROUP) {
            throw new IllegalArgumentException("Chỉ có thể rời khỏi nhóm chat");
        }

        ConversationMember member = getActiveMember(convId, userId);

        // Trưởng nhóm không được tự ý bỏ đi nếu nhóm còn người khác
        if (member.getRole() == MemberRole.OWNER) {
            long activeCount = conversationMemberRepository.countByConversationIdAndStatus(convId, ConversationMemberStatus.ACTIVE);
            if (activeCount > 1) {
                throw new RuntimeException("Bạn là Trưởng nhóm. Hãy chuyển quyền cho người khác trước khi rời đi.");
            }
        }
        return conv;
    }

    private Conversation validateKickPermission(Long convId, Long targetId, Long requesterId) {
        Conversation conv = conversationRepository.findById(convId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy cuộc trò chuyện"));

        if (conv.getType() != ConversationType.GROUP) {
            throw new IllegalArgumentException("Chỉ có thể áp dụng cho nhóm chat");
        }

        ConversationMember requester = getActiveMember(convId, requesterId);
        ConversationMember target = getActiveMember(convId, targetId);

        if (requester.getRole() == MemberRole.MEMBER) {
            throw new RuntimeException("Bạn không có quyền mời thành viên ra khỏi nhóm");
        }
        if (target.getRole() == MemberRole.OWNER) {
            throw new RuntimeException("Không thể mời Trưởng nhóm ra khỏi nhóm");
        }
        if (requester.getRole() == MemberRole.DEPUTY && target.getRole() == MemberRole.DEPUTY) {
            throw new RuntimeException("Phó nhóm không thể mời Phó nhóm khác ra khỏi nhóm");
        }
        return conv;
    }

    private ConversationMember getActiveMember(Long convId, Long userId) {
        ConversationMember member = conversationMemberRepository.findByConversation_IdAndUser_IdAndStatus(convId, userId, ConversationMemberStatus.ACTIVE)
                .orElseThrow(() -> new RuntimeException("Thành viên không tồn tại trong nhóm"));
        if (member.getStatus() != ConversationMemberStatus.ACTIVE) {
            throw new RuntimeException("Thành viên này không còn hoạt động trong nhóm");
        }
        return member;
    }

    private ConversationResponse processMemberRemoval(
            Conversation conv, Long targetId, Long requesterId,
            ConversationMemberStatus newStatus, MessageType sysMsgType, String sysMsgContent, DomainEventType eventType) {

        Instant now = Instant.now().truncatedTo(ChronoUnit.MILLIS);
        Long convId = conv.getId();

        // Cập nhật DB cho nạn nhân (Soft Delete)
        ConversationMember target = getActiveMember(convId, targetId);
        target.setStatus(newStatus);
        target.setLeftAt(now);
        conversationMemberRepository.save(target);

        // Cập nhật thông tin cho redis
        ConversationMemberResponse memberResponse = conversationMemberMapper.toConversationMemberResponse(target);
        conversationMemberCacheService.saveMemberInfo(convId, targetId, memberResponse);

        // Gom ID để bắn Socket (Bao gồm cả người vừa out để họ biết đường khóa ô chat)
        Set<Long> allNotifyIds = conversationMemberRepository
                .findUserIdsByConversationIdAndStatus(convId, ConversationMemberStatus.ACTIVE);
        allNotifyIds.add(targetId);

        //  Giao việc lưu Mongo & Bắn Socket khung chat chon internal messsage serivce
        internalMessageService.createSystemMessage(
                convId, requesterId, sysMsgType, sysMsgContent);

        // Cập nhật Snapshot Sidebar (MySQL)
        conv.setLastMessageContent(sysMsgContent);
        conv.setLastSenderId(requesterId);
        conv.setLastMessageType(sysMsgType);
        conv.setLastMessageAt(now);
        conversationRepository.save(conv);

        // Map DTO
        ConversationResponse response = conversationMapper.toConversationResponse(conv, requesterId);
        if (response.getLastMessage() != null) {
            response.getLastMessage().setLastSenderName("");
            response.getLastMessage().setRead(true);
        }

        // Bắn sự kiện qua cho redis
        eventPublisher.publishEvent(new MemberStatusChangedEvent(response, eventType, allNotifyIds));

        return response;
    }

    private Conversation validateGroupAndInviter(Long conversationId, Long inviterId) {
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy cuộc trò chuyện"));

        if (conv.getType() != ConversationType.GROUP) {
            throw new IllegalArgumentException("Chỉ có thể thêm thành viên vào nhóm");
        }

        ConversationMember inviter = conversationMemberRepository.findByConversation_IdAndUser_IdAndStatus(conversationId, inviterId, ConversationMemberStatus.ACTIVE)
                .orElseThrow(() -> new RuntimeException("Bạn không nằm trong nhóm này"));

        if (inviter.getStatus() != ConversationMemberStatus.ACTIVE) {
            throw new RuntimeException("Bạn không có quyền thực hiện hành động này");
        }
        return conv;
    }

    private List<ConversationMember> prepareMembersForAddition(
            Conversation conv, Set<Long> rawIds, Long inviterId,
            Set<Long> actuallyAddedIds, Instant now) {

        // Lọc danh sách được mời (Bỏ ID của chính người mời nếu FE gửi nhầm)
        Set<Long> targetIds = new HashSet<>(rawIds);
        targetIds.remove(inviterId);

        // Thêm mới hoặc Cập nhật người cũ
        // Lấy tất cả record của những người này trong nhóm (kể cả đã LEFT/KICKED)
        List<ConversationMember> existingRecords = conversationMemberRepository
                .findByConversationIdAndUserIdIn(conv.getId(), targetIds);

        Map<Long, ConversationMember> existingMap = existingRecords.stream()
                .collect(Collectors.toMap(m -> m.getUser().getId(), m -> m));

        List<ConversationMember> membersToSave = new ArrayList<>();

        for (Long tId : targetIds) {
            if (existingMap.containsKey(tId)) {
                // Trường hợp 1: Người cũ (Đã Left/Kicked)
                ConversationMember em = existingMap.get(tId);
                if (em.getStatus() != ConversationMemberStatus.ACTIVE) {
                    em.setStatus(ConversationMemberStatus.ACTIVE);
                    em.setJoinedAt(now);
                    em.setLeftAt(null); // Xóa mốc thời gian rời đi
                    membersToSave.add(em);
                    actuallyAddedIds.add(tId);
                }
            } else {
                // Trường hợp 2: Người mới hoàn toàn
                ConversationMember nm = new ConversationMember();
                nm.setConversation(conv);
                nm.setUser(userRepository.getReferenceById(tId));
                nm.setRole(MemberRole.MEMBER);
                nm.setStatus(ConversationMemberStatus.ACTIVE);
                nm.setJoinedAt(now);
                membersToSave.add(nm);
                actuallyAddedIds.add(tId);
            }
        }
        return membersToSave;
    }

    private void updateConversationSnapshot(Conversation conv, Long inviterId,
                                            MessageType type, String content, Instant now) {
        conv.setLastMessageContent(content);
        conv.setLastSenderId(inviterId);
        conv.setLastMessageType(type);
        conv.setLastMessageAt(now);
        conversationRepository.save(conv);
    }
}


