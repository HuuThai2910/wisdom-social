/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.service.chat;

import iuh.fit.edu.backend.constant.MessageType;
import iuh.fit.edu.backend.domain.entity.nosql.Message;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
public interface InternalMessageService {
    void createSystemMessage(Long conversationId, Long actorId, MessageType type, String content);
}
