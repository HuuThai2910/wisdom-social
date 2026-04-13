package iuh.fit.edu.backend.service.post.impl;

import iuh.fit.edu.backend.constant.StatusType;
import iuh.fit.edu.backend.constant.TargetType;
import iuh.fit.edu.backend.domain.entity.nosql.Comment;
import iuh.fit.edu.backend.dto.request.post.CreateCommentRequest;
import iuh.fit.edu.backend.dto.response.post.CommentResponse;
import iuh.fit.edu.backend.dto.response.post.PaginatedCommentsResponse;
import iuh.fit.edu.backend.repository.nosql.CommentRepository;
import iuh.fit.edu.backend.repository.nosql.PostRepository;
import iuh.fit.edu.backend.service.post.CommentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.Deque;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/*
 * @description: Implementation of CommentService with tree-based pagination
 * @author: The Bao
 * @date: 2026-01-31
 * @version: 1.0
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CommentServiceImpl implements CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private static final int INITIAL_REPLY_LIMIT = 3;

    @Override
    @Transactional
    public Comment createComment(CreateCommentRequest request, Long userId) {
        log.info("Creating comment for user: {} on target: {}", userId, request.getTargetId());

        // Extract mentions from content
        List<String> mentions = extractMentions(request.getContent());

        Comment comment = Comment.builder()
                .userId(userId.toString())
                .targetType(request.getTargetType())
                .targetId(request.getTargetId())
                .parentId(request.getParentId())
                .content(request.getContent())
                .mentions(mentions)
                .reactCount(0L)
                .replyCount(0L)
                .status(StatusType.ACTIVE)
                .isEdited(false)
                .isPinned(false)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        Comment savedComment = commentRepository.save(comment);

        // If this is a reply, update parent's reply count
        if (request.getParentId() != null) {
            commentRepository.findById(request.getParentId()).ifPresent(parent -> {
                parent.setReplyCount(parent.getReplyCount() + 1);
                commentRepository.save(parent);
            });

            // Replies also contribute to total post comment count.
            if (request.getTargetType() == TargetType.POST) {
                updatePostCommentCount(request.getTargetId(), 1);
            }
        } else if (request.getTargetType() == TargetType.POST) {
            // Top-level comment on post
            updatePostCommentCount(request.getTargetId(), 1);
        }

        log.info("Comment created successfully with ID: {}", savedComment.getId());
        return savedComment;
    }

    @Override
    public PaginatedCommentsResponse getRootComments(TargetType targetType, String targetId, int page, int size) {
        log.info("Getting root comments for target: {} of type: {} (page: {}, size: {})", 
                 targetId, targetType, page, size);
        
        Pageable pageable = PageRequest.of(page, size);
        
        // Get root comments only (parentId is null) - sorted mới → cũ
        List<Comment> rootComments = commentRepository
                .findByTargetTypeAndTargetIdAndParentIdIsNullOrderByCreatedAtDesc(targetType, targetId, pageable);
        
        // Root count: only for root pagination/hasMore
        long rootCount = commentRepository
                .countByTargetTypeAndTargetIdAndParentIdIsNull(targetType, targetId);

        // Total count: all comments across all levels (for display counters)
        long totalCount = commentRepository
            .countByTargetTypeAndTargetId(targetType, targetId);
        
        // Convert to response and add initial replies for each
        List<CommentResponse> responses = new ArrayList<>();
        for (Comment comment : rootComments) {
            CommentResponse response = buildCommentWithReplies(comment, INITIAL_REPLY_LIMIT);
            responses.add(response);
        }
        
        // Check if there are more pages
        boolean hasMore = (long) (page + 1) * size < rootCount;
        String nextCursor = hasMore ? encodePageCursor(page + 1, size) : null;
        
        return PaginatedCommentsResponse.builder()
                .data(responses)
                .hasMore(hasMore)
                .nextCursor(nextCursor)
                .totalCount((int) totalCount)
                .build();
    }

    @Override
    public CommentResponse getCommentWithReplies(String commentId, int initialReplyLimit) {
        log.info("Getting comment: {} with initial replies (limit: {})", commentId, initialReplyLimit);
        
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));
        
        return buildCommentWithReplies(comment, initialReplyLimit);
    }

    @Override
    public PaginatedCommentsResponse getMoreReplies(String parentId, String cursor, int size) {
        log.info("Getting more replies for parent: {} with cursor: {} (size: {})", parentId, cursor, size);

        Pageable pageable = PageRequest.of(0, size + 1); // +1 to determine hasMore
        List<Comment> replies;

        if (cursor == null || cursor.isBlank()) {
            // First load-more call: get latest replies first
            replies = commentRepository.findByParentIdOrderByCreatedAtDesc(parentId, pageable);
        } else {
            // Next pages: get older replies than cursor timestamp
            Instant cursorInstant = decodeCursor(cursor);
            replies = commentRepository.findRepliesBeforeCursor(parentId, cursorInstant, pageable);
        }
        
        // Total count
        long totalCount = commentRepository.countByParentId(parentId);
        
        boolean hasMore = replies.size() > size;
        if (hasMore) {
            replies = replies.subList(0, size);
        }

        List<CommentResponse> responses = replies.stream()
            .map(this::commentToResponse)
            .collect(Collectors.toList());
        
        String nextCursor = hasMore && !replies.isEmpty()
            ? encodeCursor(replies.get(replies.size() - 1).getCreatedAt())
                : null;
        
        return PaginatedCommentsResponse.builder()
                .data(responses)
                .hasMore(hasMore)
                .nextCursor(nextCursor)
                .totalCount((int) totalCount)
                .build();
    }

    /**
     * Build comment response with initial replies
     */
    private CommentResponse buildCommentWithReplies(Comment comment, int replyLimit) {
        CommentResponse response = commentToResponse(comment);

        // Get initial latest replies (newest-first window)
        Pageable pageable = PageRequest.of(0, replyLimit + 1); // +1 to check if there's more
        List<Comment> replies = commentRepository.findByParentIdOrderByCreatedAtDesc(comment.getId(), pageable);
        
        boolean hasMoreReplies = replies.size() > replyLimit;
        if (hasMoreReplies) {
            replies = replies.subList(0, replyLimit);
        }
        
        List<CommentResponse> replyResponses = replies.stream()
                .map(this::commentToResponse)
                .collect(Collectors.toList());

        // Keep UI list stable: oldest -> newest inside currently loaded window.
        Collections.reverse(replyResponses);
        
        response.setReplies(replyResponses);
        response.setHasMoreReplies(hasMoreReplies);
        
        if (!replies.isEmpty()) {
            // Cursor points to oldest loaded reply in this window.
            response.setNextCursor(encodeCursor(replies.get(replies.size() - 1).getCreatedAt()));
        }
        
        return response;
    }

    /**
     * Convert Comment entity to CommentResponse
     */
    private CommentResponse commentToResponse(Comment comment) {
        return CommentResponse.builder()
                .id(comment.getId())
                .userId(comment.getUserId())
                .targetType(comment.getTargetType())
                .targetId(comment.getTargetId())
                .parentId(comment.getParentId())
                .content(comment.getContent())
                .mentions(comment.getMentions())
                .reactCount(comment.getReactCount())
                .replyCount(comment.getReplyCount())
                .status(comment.getStatus())
                .isEdited(comment.isEdited())
                .isPinned(comment.isPinned())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .replies(null) // Replies will be set separately
                .hasMoreReplies(false)
                .nextCursor(null)
                .build();
    }

    /**
     * Encode timestamp to cursor for pagination
     */
    private String encodeCursor(Instant timestamp) {
        return Base64.getEncoder().encodeToString(timestamp.toString().getBytes());
    }

    /**
     * Encode page number and size to cursor
     */
    private String encodePageCursor(int page, int size) {
        String cursor = page + ":" + size;
        return Base64.getEncoder().encodeToString(cursor.getBytes());
    }

    /**
     * Decode cursor back to timestamp
     */
    private Instant decodeCursor(String cursor) {
        if (cursor == null || cursor.isBlank()) {
            throw new IllegalArgumentException("Cursor must not be null/blank");
        }
        try {
            String decoded = new String(Base64.getDecoder().decode(cursor));
            return Instant.parse(decoded);
        } catch (Exception e) {
            log.warn("Failed to decode cursor: {}", cursor);
            return Instant.now().minusSeconds(86400); // Default: 1 day ago
        }
    }

    // Legacy methods (keep for backward compatibility)
    
    @Override
    @Transactional
    public void deleteComment(String commentId, Long userId) {
        log.info("Deleting comment: {} by user: {}", commentId, userId);

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found"));

        if (!comment.getUserId().equals(userId.toString())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Unauthorized to delete this comment");
        }

        List<String> descendantIds = collectDescendantIds(commentId);
        List<String> allIdsToDelete = new ArrayList<>();
        allIdsToDelete.add(commentId);
        allIdsToDelete.addAll(descendantIds);

        // Update parent's reply count if this is a reply
        if (comment.getParentId() != null) {
            commentRepository.findById(comment.getParentId()).ifPresent(parent -> {
                parent.setReplyCount(Math.max(0, parent.getReplyCount() - 1));
                commentRepository.save(parent);
            });
        }

        // Keep post commentCount synced for all levels (comment + descendants)
        if (comment.getTargetType() == TargetType.POST) {
            updatePostCommentCount(comment.getTargetId(), -allIdsToDelete.size());
        }

        commentRepository.deleteAllById(allIdsToDelete);
        log.info("Comment deleted successfully. Removed {} docs (including descendants)", allIdsToDelete.size());
    }

    private List<String> collectDescendantIds(String rootCommentId) {
        List<String> descendants = new ArrayList<>();
        Deque<String> queue = new ArrayDeque<>();
        queue.add(rootCommentId);

        while (!queue.isEmpty()) {
            String current = queue.poll();
            List<Comment> children = commentRepository.findByParentIdOrderByCreatedAtAsc(current);
            for (Comment child : children) {
                descendants.add(child.getId());
                queue.add(child.getId());
            }
        }

        return descendants;
    }

    private List<String> extractMentions(String content) {
        List<String> mentions = new ArrayList<>();
        Pattern pattern = Pattern.compile("@(\\w+)");
        Matcher matcher = pattern.matcher(content);
        while (matcher.find()) {
            mentions.add(matcher.group(1));
        }
        return mentions;
    }

    private void updatePostCommentCount(String postId, int delta) {
        postRepository.findById(postId).ifPresent(post -> {
            if (post.getStats() != null) {
                long newCount = Math.max(0L, post.getStats().getCommentCount() + delta);
                post.getStats().setCommentCount(newCount);
                postRepository.save(post);
                log.info("Updated post {} commentCount to: {}", postId, newCount);
            }
        });
    }
}
