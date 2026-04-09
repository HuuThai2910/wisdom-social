/*
 * @ (#) CommentResponse.java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.dto.response.post;

import iuh.fit.edu.backend.constant.StatusType;
import iuh.fit.edu.backend.constant.TargetType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

/*
 * @description: Response DTO for comment with nested replies
 * @author: The Bao
 * @date: 2026-04-09
 * @version: 1.0
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentResponse {
    
    private String id;
    private String userId;
    private TargetType targetType;
    private String targetId;
    private String parentId;
    private String content;
    private List<String> mentions;
    private long reactCount;
    private long replyCount;
    private StatusType status;
    private boolean isEdited;
    private boolean isPinned;
    private Instant createdAt;
    private Instant updatedAt;
    
    // Các reply được hiển thị (tối đa 3 đầu tiên)
    private List<CommentResponse> replies;
    
    // Để biết còn reply tiếp theo không
    private boolean hasMoreReplies;
    
    // Dùng cho cursor-based pagination
    private String nextCursor;
}
