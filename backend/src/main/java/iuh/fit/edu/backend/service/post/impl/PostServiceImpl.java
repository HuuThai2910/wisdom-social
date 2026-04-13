/*
 * @ (#) PostServiceImpl.java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.service.post.impl;

import iuh.fit.edu.backend.constant.TargetType;
import iuh.fit.edu.backend.constant.UploadModule;
import iuh.fit.edu.backend.domain.entity.nosql.Media;
import iuh.fit.edu.backend.domain.entity.nosql.Post;
import iuh.fit.edu.backend.domain.entity.nosql.Stats;
import iuh.fit.edu.backend.domain.entity.nosql.embeddable.Location;
import iuh.fit.edu.backend.dto.request.post.CreatePostRequest;
import iuh.fit.edu.backend.repository.mysql.UserRepository;
import iuh.fit.edu.backend.repository.nosql.CommentRepository;
import iuh.fit.edu.backend.repository.nosql.PostRepository;
import iuh.fit.edu.backend.repository.nosql.ReactionRepository;
import iuh.fit.edu.backend.service.s3.S3Service;
import iuh.fit.edu.backend.service.post.PostService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/*
 * @description: Post service implementation
 * @author: The Bao
 * @date: 31/01/2026
 * @version: 1.0
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PostServiceImpl implements PostService {
    
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final S3Service s3Service;
    private final ReactionRepository reactionRepository;
    private final CommentRepository commentRepository;
    
    @Override
    @Transactional
    public Post createPost(CreatePostRequest request, List<String> imageUrls, Long authorId) {
        log.info("Creating post for user: {}", authorId);
        log.info("Image URLs received: {}", imageUrls);
        
        // First, create and save post to get ID
        List<Media> mediaList = new ArrayList<>();
        
        // Extract hashtags from content
        List<String> hashtags = extractHashtags(request.getContent());
        
        // Extract mentions from content
        List<String> mentions = extractMentions(request.getContent());
        
        // Convert tagged usernames to IDs
        List<String> taggedUserIds = convertUsernamesToIds(request.getTaggedUsernames());
        
        // Parse location
        Location location = null;
        if (request.getLocation() != null && !request.getLocation().isEmpty()) {
            location = Location.builder()
                    .name(request.getLocation())
                    .build();
        }
        
        // Convert specific viewer usernames to IDs (for SPECIFIC privacy)
        List<String> specificViewerUserIds = convertUsernamesToIds(request.getSpecificViewerUsernames());
        
        // Convert excluded usernames to IDs (for EXCEPT privacy)
        List<String> excludedUserIds = convertUsernamesToIds(request.getExcludedUsernames());
        
        // Create post
        Post post = Post.builder()
                .authorId(authorId.toString())
                .content(request.getContent())
                .privacy(request.getPrivacy())
                .specificViewerUserIds(specificViewerUserIds)
                .excludedUserIds(excludedUserIds)
                .media(mediaList)
                .location(location)
                .taggedUserIds(taggedUserIds)
                .hashtags(hashtags)
                .mentions(mentions)
                .allowComments(request.getAllowComments() != null ? request.getAllowComments() : true)
                .allowShares(request.getAllowShares() != null ? request.getAllowShares() : true)
                .stats(Stats.builder()
                        .reactCount(0)
                        .commentCount(0)
                        .shareCount(0)
                        .viewCount(0)
                        .build())
                .status(iuh.fit.edu.backend.constant.StatusType.ACTIVE)
                .isEdited(false)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        
        // Save post to MongoDB to get ID
        Post savedPost = postRepository.save(post);
        log.info("Post saved to MongoDB successfully: {}", savedPost.getId());
        
        // Move images from temp to final location if provided and update post
        if (imageUrls != null && !imageUrls.isEmpty()) {
            log.info("Processing {} images to move from temp to final location", imageUrls.size());
            try {
                // Create Media objects for uploaded images
                for (int i = 0; i < imageUrls.size(); i++) {
                    String tempUrl = imageUrls.get(i);
                    log.info("Processing image {}: {}", i, tempUrl);
                    
                    try {
                        // Move from temp to final location using MongoDB ID (String)
                        String finalUrl = s3Service.moveUploadUrl("posts", savedPost.getId(), tempUrl);
                        log.info("Successfully moved image {} to final location: {}", i, finalUrl);
                        
                        Media media = Media.builder()
                                .order(i)
                                .url(finalUrl)
                                .type("image")
                                .build();
                        mediaList.add(media);
                        log.info("Created media object for image {}", i);
                    } catch (Exception e) {
                        // If move fails, log warning but continue 
                        // File might already be in final location
                        log.warn("Failed to move image {}: {}. Using original URL.", i, e.getMessage());
                        
                        Media media = Media.builder()
                                .order(i)
                                .url(tempUrl)
                                .type("image")
                                .build();
                        mediaList.add(media);
                    }
                }
                
                // Update post with media list
                if (!mediaList.isEmpty()) {
                    log.info("Saving post with {} media items", mediaList.size());
                    savedPost.setMedia(mediaList);
                    savedPost = postRepository.save(savedPost);
                    log.info("Post updated with media successfully");
                } else {
                    log.warn("No media items to save");
                }
            } catch (Exception e) {
                log.error("Error processing images: {}", e.getMessage());
                // Still return post even if image processing fails
                // Post has already been created successfully
            }
        } else {
            log.info("No image URLs provided");
        }
        
        return savedPost;
    }
    
    private List<String> convertUsernamesToIds(List<String> usernames) {
        if (usernames == null || usernames.isEmpty()) {
            return new ArrayList<>();
        }
        return usernames.stream()
                .map(username -> userRepository.findByUsername(username)
                        .map(user -> user.getId().toString())
                        .orElse(null))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }
    
    private List<String> extractHashtags(String content) {
        if (content == null) return new ArrayList<>();
        
        List<String> hashtags = new ArrayList<>();
        Pattern pattern = Pattern.compile("#[\\w]+");
        Matcher matcher = pattern.matcher(content);
        
        while (matcher.find()) {
            String hashtag = matcher.group().substring(1); // Remove # symbol
            hashtags.add(hashtag);
        }
        
        return hashtags;
    }
    
    private List<String> extractMentions(String content) {
        if (content == null) return new ArrayList<>();
        
        List<String> mentions = new ArrayList<>();
        Pattern pattern = Pattern.compile("@[\\w]+");
        Matcher matcher = pattern.matcher(content);
        
        while (matcher.find()) {
            String username = matcher.group().substring(1); // Remove @ symbol
            userRepository.findByUsername(username).ifPresent(user -> 
                mentions.add(user.getId().toString())
            );
        }
        
        return mentions;
    }

    @Override
    public List<Post> getPostsByUserId(Long userId) {
        log.info("Getting posts for user: {}", userId);
        List<Post> posts = postRepository.findByAuthorIdOrderByCreatedAtDesc(userId.toString());
        log.info("Found {} posts for user {}", posts.size(), userId);
        posts.forEach(post -> {
            int mediaCount = post.getMedia() != null ? post.getMedia().size() : 0;
            log.info("Post {}: {} media items", post.getId(), mediaCount);
            if (post.getMedia() != null && !post.getMedia().isEmpty()) {
                for (int i = 0; i < post.getMedia().size(); i++) {
                    log.info("  Media {}: URL={}", i, post.getMedia().get(i).getUrl());
                }
            }
        });
        return posts;
    }

    @Override
    public Post getPostById(String postId) {
        log.info("Getting post by ID: {}", postId);
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found with id: " + postId));
        log.info("Post found. Media items: {}", post.getMedia() != null ? post.getMedia().size() : 0);
        if (post.getMedia() != null) {
            post.getMedia().forEach(media -> log.info("Media: {}", media.getUrl()));
        }
        return post;
    }

    @Override
    @Transactional
    public void deletePost(String postId, Long userId) {
        log.info("Deleting post {} by user {}", postId, userId);
        
        // Get post to check authorization
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found with id: " + postId));
        
        // Check if user is the author
        if (!post.getAuthorId().equals(userId.toString())) {
            throw new RuntimeException("Unauthorized: You can only delete your own posts");
        }
        
        // Delete the post
        postRepository.delete(post);
        log.info("Post {} deleted successfully", postId);
    }

    @Override
    @Transactional
    public Post updatePost(String postId, CreatePostRequest request, List<String> newImageUrls, Long userId) {
        log.info("🔄 Updating post {} by user {}", postId, userId);
        
        // Get post to check authorization
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found with id: " + postId));
        
        // Debug logging
        log.info("Post authorId: {}, User ID: {}, Comparison: {}", 
                post.getAuthorId(), userId.toString(), post.getAuthorId().equals(userId.toString()));
        
        // Check if user is the author
        if (!post.getAuthorId().equals(userId.toString())) {
            throw new RuntimeException("Unauthorized: You can only edit your own posts");
        }
        
        // Update post fields
        post.setContent(request.getContent());
        post.setPrivacy(request.getPrivacy());
        
        // Update location if provided
        if (request.getLocation() != null && !request.getLocation().isEmpty()) {
            Location location = Location.builder()
                    .name(request.getLocation())
                    .build();
            post.setLocation(location);
        }
        
        // Update tagged users - convert usernames to IDs if provided
        if (request.getTaggedUsernames() != null) {
            post.setTaggedUserIds(convertUsernamesToIds(request.getTaggedUsernames()));
        } else if (request.getTaggedUserIds() != null) {
            post.setTaggedUserIds(request.getTaggedUserIds());
        }
        
        // Update specific viewer usernames to IDs (for SPECIFIC privacy)
        if (request.getSpecificViewerUsernames() != null) {
            post.setSpecificViewerUserIds(convertUsernamesToIds(request.getSpecificViewerUsernames()));
        }
        
        // Update excluded usernames to IDs (for EXCEPT privacy)
        if (request.getExcludedUsernames() != null) {
            post.setExcludedUserIds(convertUsernamesToIds(request.getExcludedUsernames()));
        }
        
        // ====================================================================
        // FIX 1 + FIX 4: HANDLE IMAGE DELETETION & NULL CHECK
        // ====================================================================
        List<String> oldMediaUrls = post.getMedia() != null
                ? post.getMedia().stream()
                    .map(Media::getUrl)
                    .collect(Collectors.toList())
                : new ArrayList<>();
        
        // Determine which URLs to keep (FIX 4)
        List<String> keepUrls;
        if (request.getExistingMediaUrls() == null) {
            // null = user did NOT touch images → keep all
            keepUrls = oldMediaUrls;
            log.info("📌 existingMediaUrls is NULL → keeping all {} existing images", oldMediaUrls.size());
        } else {
            // empty or not empty = user explicitly managing images
            keepUrls = request.getExistingMediaUrls();
            log.info("📌 existingMediaUrls provided with {} items → using this list", keepUrls.size());
        }
        
        // Find and DELETE removed images from S3 (FIX 1)
        List<String> removedUrls = oldMediaUrls.stream()
                .filter(url -> !keepUrls.contains(url))
                .collect(Collectors.toList());
        
        if (!removedUrls.isEmpty()) {
            log.warn("🗑️ Deleting {} removed images from S3...", removedUrls.size());
            for (String removedUrl : removedUrls) {
                try {
                    log.info("   Deleting from S3: {}", removedUrl);
                    s3Service.deleteByKey(UploadModule.POST, removedUrl);
                    log.info("   ✅ Successfully deleted: {}", removedUrl);
                } catch (Exception e) {
                    log.error("   ❌ Failed to delete {}: {}", removedUrl, e.getMessage(), e);
                    // Don't throw - continue deleting others
                }
            }
        } else {
            log.info("ℹ️ No images to delete");
        }
        
        // ====================================================================
        // FIX 2: REBUILD MEDIA LIST CLEANLY (DO NOT MUTATE OLD LIST)
        // ====================================================================
        List<Media> updatedMediaList = new ArrayList<>();
        
        // Step 1: Add existing images in original order from frontend
        log.info("📝 Step 1: Adding {} kept images (preserving order)...", keepUrls.size());
        for (int i = 0; i < keepUrls.size(); i++) {
            String url = keepUrls.get(i);
            Media media = Media.builder()
                    .order(i)
                    .url(url)
                    .type("image")
                    .build();
            updatedMediaList.add(media);
            log.info("   [{}] Added existing image: {}", i, url);
        }
        
        // ====================================================================
        // FIX 3: ADD NEW IMAGES (MOVE FROM TEMP → FINAL)
        // ====================================================================
        int startIndex = updatedMediaList.size();
        if (newImageUrls != null && !newImageUrls.isEmpty()) {
            log.info("📝 Step 2: Moving {} new images from TEMP to FINAL...", newImageUrls.size());
            try {
                for (int i = 0; i < newImageUrls.size(); i++) {
                    String tempKey = newImageUrls.get(i);
                    log.info("   [{}] Processing temp key: {}", i, tempKey);
                    
                    // Move from temp to final location
                    String finalKey = s3Service.moveUploadUrl("posts", postId, tempKey);
                    
                    Media media = Media.builder()
                            .order(startIndex + i)
                            .url(finalKey)
                            .type("image")
                            .build();
                    updatedMediaList.add(media);
                    log.info("   [{}] ✅ Moved to final: {}", startIndex + i, finalKey);
                }
            } catch (Exception e) {
                log.error("❌ Error moving images: {}", e.getMessage(), e);
                throw new RuntimeException("Failed to move images from temp to final: " + e.getMessage(), e);
            }
        } else {
            log.info("ℹ️ No new images to process");
        }
        
        // ====================================================================
        // FIX 7: COMPREHENSIVE LOGGING
        // ====================================================================
        log.info("═══════════════════════════════════════════════════════════════");
        log.info("📊 POST UPDATE SUMMARY FOR POST: {}", postId);
        log.info("───────────────────────────────────────────────────────────────");
        log.info("Old media count: {}", oldMediaUrls.size());
        log.info("Keep media count: {}", keepUrls.size());
        log.info("Removed media count: {}", removedUrls.size());
        log.info("New media count: {}", newImageUrls != null ? newImageUrls.size() : 0);
        log.info("Final media count: {}", updatedMediaList.size());
        log.info("───────────────────────────────────────────────────────────────");
        if (!removedUrls.isEmpty()) {
            log.info("Removed URLs: {}", removedUrls);
        }
        if (!keepUrls.isEmpty()) {
            log.info("Kept URLs: {}", keepUrls);
        }
        if (newImageUrls != null && !newImageUrls.isEmpty()) {
            log.info("New URLs (temp): {}", newImageUrls);
        }
        log.info("═══════════════════════════════════════════════════════════════");
        
        post.setMedia(updatedMediaList);
        
        // Extract hashtags and mentions
        post.setHashtags(extractHashtags(request.getContent()));
        post.setMentions(extractMentions(request.getContent()));
        
        post.setUpdatedAt(Instant.now());
        
        Post updated = postRepository.save(post);
        log.info("✅ Post {} updated successfully with {} media items", postId, updated.getMedia().size());
        
        return updated;
    }

    @Override
    public List<Post> getPostsByTaggedUserId(String userId) {
        log.info("Getting posts where user {} is tagged", userId);
        return postRepository.findByTaggedUserIdsContaining(userId);
    }

    @Override
    @Transactional
    public void syncAllPostsStats() {
        log.info("Starting to sync stats for all posts");
        List<Post> allPosts = postRepository.findAll();
        
        for (Post post : allPosts) {
            try {
                // Count reactions for this post
                long reactCount = reactionRepository.findByTargetTypeAndTargetId(
                    TargetType.POST, 
                    post.getId()
                ).size();
                
                // Count top-level comments for this post (parentId == null)
                long commentCount = commentRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDesc(
                    TargetType.POST, 
                    post.getId()
                ).stream()
                .filter(comment -> comment.getParentId() == null)
                .count();
                
                // Update stats
                if (post.getStats() == null) {
                    post.setStats(new Stats());
                }
                post.getStats().setReactCount(reactCount);
                post.getStats().setCommentCount(commentCount);
                
                postRepository.save(post);
                log.info("Updated stats for post {}: {} reactions, {} comments", 
                    post.getId(), reactCount, commentCount);
            } catch (Exception e) {
                log.error("Error syncing stats for post {}: {}", post.getId(), e.getMessage());
            }
        }
        
        log.info("Finished syncing stats for {} posts", allPosts.size());
    }
}
