/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.dto.response.message;

import iuh.fit.edu.backend.constant.MessageType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDateTime;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@AllArgsConstructor
@NoArgsConstructor
@Data
public class MessageResponse {
    private String id;
    private Long conversationId;
    private String content;
    private MessageType type;
    private Instant createdAt;
    private Long senderId;
    private String senderName;
    private String senderAvatar;
    private boolean isActive;

}
