/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.dto.response.message;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import iuh.fit.edu.backend.constant.MessageType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

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
    @JsonProperty("isRecalled")
    private boolean isRecalled = false;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Set<Long> deletedFor = new HashSet<>();

}
