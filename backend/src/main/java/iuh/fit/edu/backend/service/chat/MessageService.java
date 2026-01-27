/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.service;/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */

import iuh.fit.edu.backend.dto.request.SendMessageRequest;
import iuh.fit.edu.backend.dto.response.message.MessageResponse;

public interface MessageService {
    MessageResponse sendMessage(SendMessageRequest sendMessageRequest, Long userId);
}
