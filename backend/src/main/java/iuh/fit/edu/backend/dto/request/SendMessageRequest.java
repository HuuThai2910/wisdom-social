/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.dto.request;

import iuh.fit.edu.backend.constant.MessageType;
import lombok.Getter;
import lombok.Setter;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Getter
@Setter
public class SendMessageRequest {
    private String content;
    private MessageType type;
    private Long conversationId;
}
