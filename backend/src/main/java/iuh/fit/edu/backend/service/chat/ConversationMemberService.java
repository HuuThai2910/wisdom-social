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

import iuh.fit.edu.backend.dto.response.conversation.ConversationMemberResponse;
import org.springframework.cache.annotation.Cacheable;

public interface ConversationUserService {
    //    Trước khi chạy method này, spring sẽ kiểm tra redis trước
    //    Nếu cache này đã có dữ liệu thì method này sẽ không được gọi
    //    Dựa vào key có dạng là: sender-name::{conversationId}:{userId}
    @Cacheable(
            value = "memberInfo",
            key = "#conversationId + ':' + #userId",
            unless = "#result == null"
    )
    ConversationMemberResponse getMemberInfo(Long conversationId, Long userId);
}
