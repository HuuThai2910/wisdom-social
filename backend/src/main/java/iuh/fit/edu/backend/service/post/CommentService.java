/*
 * @ (#) CommentService.java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.service.post;

import iuh.fit.edu.backend.constant.TargetType;
import iuh.fit.edu.backend.domain.entity.nosql.Comment;
import iuh.fit.edu.backend.dto.request.post.CreateCommentRequest;
import iuh.fit.edu.backend.dto.response.post.CommentResponse;
import iuh.fit.edu.backend.dto.response.post.PaginatedCommentsResponse;

import java.util.List;

/*
 * @description: Service interface for Comment operations with tree-based pagination
 * @author: The Bao
 * @date: 2026-01-31
 * @version: 1.0
 */
public interface CommentService {
    
    Comment createComment(CreateCommentRequest request, Long userId);
    
    // Get root comments (cấp 1) of post/target with pagination (mới → cũ)
    PaginatedCommentsResponse getRootComments(TargetType targetType, String targetId, int page, int size);
    
    // Get replies of a comment with initial load (first 3, cũ → mới)
    CommentResponse getCommentWithReplies(String commentId, int initialReplyLimit);
    
    // Get more replies using cursor-based pagination (cũ → mới)
    PaginatedCommentsResponse getMoreReplies(String parentId, String cursor, int size);
    
    void deleteComment(String commentId, Long userId);
}

