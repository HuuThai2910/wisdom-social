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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
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
    private static final int PAGE_SIZE_REPLIES = 10;

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
        } else if (request.getTargetType() == TargetType.POST) {
            // If this is a top-level comment on a post, update post stats
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
        
        // Total count for frontend to calculate total pages
        long totalCount = commentRepository
                .countByTargetTypeAndTargetIdAndParentIdIsNull(targetType, targetId);
        
        // Convert to response and add initial replies for each
        List<CommentResponse> responses = new ArrayList<>();
        for (Comment comment : rootComments) {
            CommentResponse response = buildCommentWithReplies(comment, INITIAL_REPLY_LIMIT);
            responses.add(response);
        }
        
        // Check if there are more pages
        boolean hasMore = (long) (page + 1) * size < totalCount;
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
        
        // Decode cursor to get the timestamp
        Instant cursorInstant = decodeCursor(cursor);
        Pageable pageable = PageRequest.of(0, size);
        
        // Get next replies after cursor (sorted cũ → mới)
        List<Comment> replies = commentRepository.findRepliesAfterCursor(parentId, cursorInstant, pageable);
        
        // Total count
        long totalCount = commentRepository.countByParentId(parentId);
        
        List<CommentResponse> responses = replies.stream()
                .map(this::commentToResponse)
                .collect(Collectors.toList());
        
        // Check if there's more data (we get size+1 to check, but return only size)
        boolean hasMore = responses.size() >= size;
        if (hasMore && responses.size() > size) {
            responses = responses.subList(0, size);
        }
        
        String nextCursor = hasMore && !responses.isEmpty() 
                ? encodeCursor(responses.get(responses.size() - 1).getCreatedAt())
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
        
        // Get initial replies (sorted cũ → mới)
        Pageable pageable = PageRequest.of(0, replyLimit + 1); // +1 to check if there's more
        List<Comment> replies = commentRepository.findByParentIdOrderByCreatedAtAsc(comment.getId(), pageable);
        
        boolean hasMoreReplies = replies.size() > replyLimit;
        if (hasMoreReplies) {
            replies = replies.subList(0, replyLimit);
        }
        
        List<CommentResponse> replyResponses = replies.stream()
                .map(this::commentToResponse)
                .collect(Collectors.toList());
        
        response.setReplies(replyResponses);
        response.setHasMoreReplies(hasMoreReplies);
        
        if (!replyResponses.isEmpty()) {
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
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        if (!comment.getUserId().equals(userId.toString())) {
            throw new RuntimeException("Unauthorized to delete this comment");
        }

        // Update parent's reply count if this is a reply
        if (comment.getParentId() != null) {
            commentRepository.findById(comment.getParentId()).ifPresent(parent -> {
                parent.setReplyCount(Math.max(0, parent.getReplyCount() - 1));
                commentRepository.save(parent);
            });
        } else if (comment.getTargetType() == TargetType.POST) {
            // If this is a top-level comment on a post, update post stats
            updatePostCommentCount(comment.getTargetId(), -1);
        }

        commentRepository.deleteById(commentId);
        log.info("Comment deleted successfully");
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
