/*
 * @ (#) PostServiceImpl.java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.service.user.impl;

import iuh.fit.edu.backend.constant.TargetType;
import iuh.fit.edu.backend.domain.entity.nosql.Media;
import iuh.fit.edu.backend.domain.entity.nosql.Post;
import iuh.fit.edu.backend.domain.entity.nosql.Stats;
import iuh.fit.edu.backend.domain.entity.nosql.embeddable.Location;
import iuh.fit.edu.backend.dto.request.CreatePostRequest;
import iuh.fit.edu.backend.repository.mysql.UserRepository;
import iuh.fit.edu.backend.repository.nosql.CommentRepository;
import iuh.fit.edu.backend.repository.nosql.PostRepository;
import iuh.fit.edu.backend.repository.nosql.ReactionRepository;
import iuh.fit.edu.backend.service.PostService;
import iuh.fit.edu.backend.service.s3.S3Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.core.sync.RequestBody;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
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
    private final S3Client s3Client;
    private final ReactionRepository reactionRepository;
    private final CommentRepository commentRepository;
    
    @Value("${aws.s3.bucket-name}")
    private String bucketName;
    
    @Override
    @Transactional
    public Post createPost(CreatePostRequest request, List<MultipartFile> images, Long authorId) {
        log.info("Creating post for user: {}", authorId);
        
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
        
        // Now upload images if provided and update post
        if (images != null && !images.isEmpty()) {
            for (int i = 0; i < images.size(); i++) {
                MultipartFile image = images.get(i);
                try {
                    String extension = getFileExtension(image.getOriginalFilename());
                    String s3Key = "images/avatars/posts/" + savedPost.getId() + "/" + i + "." + extension;
                    
                    // Upload file directly to S3
                    PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                            .bucket(bucketName)
                            .key(s3Key)
                            .contentType(getContentType(extension))
                            .contentLength(image.getSize())
                            .build();
                    
                    s3Client.putObject(putObjectRequest, RequestBody.fromInputStream(image.getInputStream(), image.getSize()));
                    
                    Media media = Media.builder()
                            .order(i)
                            .url(s3Key)
                            .type("image")
                            .build();
                    mediaList.add(media);
                    log.info("Uploaded image to S3: {}", s3Key);
                } catch (Exception e) {
                    log.error("Error uploading image to S3", e);
                }
            }
            
            // Update post with final media list
            savedPost.setMedia(mediaList);
            savedPost = postRepository.save(savedPost);
        }
        
        return savedPost;
    }
    
    private String getFileExtension(String filename) {
        if (filename != null && filename.contains(".")) {
            return filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
        }
        return "";
    }
    
    private String getContentType(String extension) {
        if (extension.equalsIgnoreCase("png")) {
            return "image/png";
        } else if (extension.equalsIgnoreCase("gif")) {
            return "image/gif";
        } else if (extension.equalsIgnoreCase("webp")) {
            return "image/webp";
        }
        return "image/jpeg"; // Default to JPEG
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
        return postRepository.findByAuthorIdOrderByCreatedAtDesc(userId.toString());
    }

    @Override
    public Post getPostById(String postId) {
        log.info("Getting post by ID: {}", postId);
        return postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found with id: " + postId));
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
    public Post updatePost(String postId, CreatePostRequest request, List<MultipartFile> newImages, Long userId) {
        log.info("Updating post {} by user {}", postId, userId);
        
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
        
        // Handle media updates
        List<Media> updatedMediaList = new ArrayList<>();
        List<String> tempImageUrls = new ArrayList<>(); // Store temp URLs to move later
        
        // If existingMediaUrls is provided, use it to filter what to keep
        // If not provided, keep all existing media (user is not modifying images)
        if (request.getExistingMediaUrls() != null) {
            // User is explicitly managing images
            if (post.getMedia() != null && !request.getExistingMediaUrls().isEmpty()) {
                // Keep only the media URLs specified in existingMediaUrls
                for (Media existingMedia : post.getMedia()) {
                    if (request.getExistingMediaUrls().contains(existingMedia.getUrl())) {
                        updatedMediaList.add(existingMedia);
                    }
                }
            }
            // If existingMediaUrls is empty list, it means user wants to remove all existing images
        } else {
            // No existingMediaUrls provided means keep all existing media
            if (post.getMedia() != null) {
                updatedMediaList.addAll(post.getMedia());
            }
        }
        
        // Track the index where new media starts
        int newMediaStartIndex = updatedMediaList.size();
        
        // Upload and add new images
        if (newImages != null && !newImages.isEmpty()) {
            for (int i = 0; i < newImages.size(); i++) {
                MultipartFile image = newImages.get(i);
                try {
                    String extension = getFileExtension(image.getOriginalFilename());
                    String s3Key = "images/avatars/posts/" + postId + "/" + (newMediaStartIndex + i) + "." + extension;
                    
                    // Upload file directly to S3
                    PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                            .bucket(bucketName)
                            .key(s3Key)
                            .contentType(getContentType(extension))
                            .contentLength(image.getSize())
                            .build();
                    
                    s3Client.putObject(putObjectRequest, RequestBody.fromInputStream(image.getInputStream(), image.getSize()));
                    
                    Media media = Media.builder()
                            .order(newMediaStartIndex + i)
                            .url(s3Key)
                            .type("image")
                            .build();
                    updatedMediaList.add(media);
                    log.info("Uploaded image to S3: {}", s3Key);
                } catch (Exception e) {
                    log.error("Error uploading image to S3", e);
                }
            }
        }
        
        post.setMedia(updatedMediaList);
        
        // Extract hashtags and mentions
        post.setHashtags(extractHashtags(request.getContent()));
        post.setMentions(extractMentions(request.getContent()));
        
        post.setUpdatedAt(Instant.now());
        
        Post updated = postRepository.save(post);
        log.info("Post {} updated successfully", postId);
        
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
