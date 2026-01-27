/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.service.chat.impl;

import iuh.fit.edu.backend.dto.response.conversation.ConversationMemberResponse;
import iuh.fit.edu.backend.repository.mysql.ConversationUserRepository;
import iuh.fit.edu.backend.service.chat.ConversationUserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ConversationUserServiceImpl implements ConversationUserService {
    private final ConversationUserRepository conversationUserRepository;


//    Trước khi chạy method này, spring sẽ kiểm tra redis trước
//    Nếu cache này đã có dữ liệu thì method này sẽ không được gọi
//    Dựa vào key có dạng là: sender-name::{conversationId}:{userId}
@Cacheable(
        value = "memberInfo",
        key = "#conversationId + ':' + #userId",
        unless = "#result == null"
)
@Override
public ConversationMemberResponse getMemberInfo(Long conversationId, Long userId){
        // Query xuống db để tìm ra được nickName và gán vào senderName trong messageResponse
        // Đồng thời giá trị này sẽ được lưu vào redis
        log.info("Redis MISS: Query DB for convId: {}, userId: {}", conversationId, userId);
        return conversationUserRepository
                .findByConversation_IdAndUser_Id(conversationId, userId)
                .map(c -> {
                    ConversationMemberResponse member = new ConversationMemberResponse();
                    member.setUserId(c.getUser().getId());
                    member.setUsername(c.getUser().getUsername());
                    member.setNickname(c.getNickname() != null ? c.getNickname() : c.getUser().getUsername());
                    member.setAvatarUrl(c.getUser().getAvatarUrl());
                    return member;
                }).orElse(null);
    }
}
