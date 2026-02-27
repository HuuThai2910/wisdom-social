/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.service.chat.impl;

import iuh.fit.edu.backend.domain.entity.mysql.ConversationMember;
import iuh.fit.edu.backend.dto.response.conversation.ConversationMemberResponse;
import iuh.fit.edu.backend.mapper.ConversationMemberMapper;
import iuh.fit.edu.backend.repository.mysql.ConversationMemberRepository;
import iuh.fit.edu.backend.service.chat.ConversationMemberService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Set;
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

    /**
     * Trước khi chạy method này, spring sẽ kiểm tra redis trước
     * Nếu cache này đã có dữ liệu thì method này sẽ không được gọi
     * Nếu cache này chưa có thì sẽ query db và đồng thời lưu vào cache để tối ưu cho việc lấy thông tin vào những lần sau
     * Dựa vào key có dạng là: sender-name::{conversationId}:{userId}
     */
    @Cacheable(
            value = "memberInfo",
            key = "#conversationId + ':' + #userId",
            unless = "#result == null"
    )
    @Override
    public ConversationMemberResponse getMemberInfo(Long conversationId, Long userId) {
        // Query xuống db để tìm ra được nickName và gán vào senderName trong messageResponse
        // Đồng thời giá trị này sẽ được lưu vào redis
        log.info("Redis MISS: Query DB for convId: {}, userId: {}", conversationId, userId);
        return conversationMemberRepository
                .findByConversation_IdAndUser_Id(conversationId, userId)
                .map(this.conversationMemberMapper::toConversationMemberResponse).orElse(null);
    }

    /**
     * Lấy ra tất cả các member ở trong một cuộc hội thoại
     */
    @Override
    public Map<Long, ConversationMemberResponse> getMembersMap(Long conversationId, Set<Long> userIds) {
        List<ConversationMember> members = this.conversationMemberRepository.findByConversationIdAndUserIdIn(conversationId, userIds);
        return members.stream()
                .map(conversationMemberMapper::toConversationMemberResponse)
                .collect(Collectors.toMap(ConversationMemberResponse::getUserId, m -> m));
    }

    /**
     * Lấy ra tất cả id của member ở trong cuộc hội thoại (không trùng nhau)
     */
    @Override
    public Set<Long> getAllMemberId(Long conversationId){
        return  this.conversationMemberRepository.findAllUserIdsByConversationId(conversationId);
    }
}


