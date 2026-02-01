/*
 * @ (#) PostController.java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.edu.backend.domain.entity.nosql.Post;
import iuh.fit.edu.backend.dto.request.CreatePostRequest;
import iuh.fit.edu.backend.dto.response.ApiResponse;
import iuh.fit.edu.backend.service.PostService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/*
 * @description: Post management controller
 * @author: The Bao
 * @date: 31/01/2026
 * @version: 1.0
 */
@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
@Slf4j
public class PostController {

    private final PostService postService;
    private final ObjectMapper objectMapper;

    /**
     * Create a new post with images
     * @param postDataJson JSON string of CreatePostRequest
     * @param images List of image files
     * @param authorId Author user ID
     * @return Created post
     */
    @PostMapping(consumes = {"multipart/form-data"})
    public ResponseEntity<ApiResponse<Post>> createPost(
            @RequestParam("postData") String postDataJson,
            @RequestParam(value = "images", required = false) List<MultipartFile> images,
            @RequestParam("authorId") Long authorId) {
        
        try {
            log.info("Creating post for user: {}", authorId);
            log.info("Post data: {}", postDataJson);
            
            // Parse JSON to CreatePostRequest
            CreatePostRequest request = objectMapper.readValue(postDataJson, CreatePostRequest.class);
            
            // Create post
            Post post = postService.createPost(request, images, authorId);
            
            return ResponseEntity.ok(ApiResponse.success(200, "Tạo post thành công", post));
        } catch (Exception e) {
            log.error("Error creating post", e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(400, "Lỗi khi tạo post: " + e.getMessage(), null));
        }
    }

    /**
     * Get all posts by user ID
     * @param userId User ID
     * @return List of posts
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<Post>>> getPostsByUserId(@PathVariable Long userId) {
        try {
            log.info("Fetching posts for user: {}", userId);
            List<Post> posts = postService.getPostsByUserId(userId);
            return ResponseEntity.ok(ApiResponse.success(200, "Lấy danh sách post thành công", posts));
        } catch (Exception e) {
            log.error("Error fetching posts", e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(400, "Lỗi khi lấy danh sách post: " + e.getMessage(), null));
        }
    }

    /**
     * Get post by ID
     * @param id Post ID
     * @return Post details
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Post>> getPostById(@PathVariable String id) {
        try {
            log.info("Fetching post by ID: {}", id);
            Post post = postService.getPostById(id);
            return ResponseEntity.ok(ApiResponse.success(200, "Lấy chi tiết post thành công", post));
        } catch (Exception e) {
            log.error("Error fetching post", e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(400, "Lỗi khi lấy chi tiết post: " + e.getMessage(), null));
        }
    }

    /**
     * Delete post by ID
     * @param id Post ID
     * @param userId User ID (for authorization)
     * @return Success message
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePost(
            @PathVariable String id,
            @RequestParam Long userId) {
        try {
            log.info("Deleting post {} by user {}", id, userId);
            postService.deletePost(id, userId);
            return ResponseEntity.ok(ApiResponse.success(200, "Xóa post thành công", null));
        } catch (Exception e) {
            log.error("Error deleting post", e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(400, "Lỗi khi xóa post: " + e.getMessage(), null));
        }
    }

    /**
     * Update post by ID
     * @param id Post ID
     * @param postDataJson JSON string of CreatePostRequest
     * @param newImages New image files to upload
     * @param userId User ID (for authorization)
     * @return Updated post
     */
    @PutMapping(value = "/{id}", consumes = {"multipart/form-data"})
    public ResponseEntity<ApiResponse<Post>> updatePost(
            @PathVariable String id,
            @RequestParam("postData") String postDataJson,
            @RequestParam(value = "images", required = false) List<MultipartFile> newImages,
            @RequestParam Long userId) {
        try {
            log.info("Updating post {} by user {}", id, userId);
            
            // Parse JSON to CreatePostRequest
            CreatePostRequest request = objectMapper.readValue(postDataJson, CreatePostRequest.class);
            
            // Update post
            Post post = postService.updatePost(id, request, newImages, userId);
            
            return ResponseEntity.ok(ApiResponse.success(200, "Cập nhật post thành công", post));
        } catch (Exception e) {
            log.error("Error updating post", e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(400, "Lỗi khi cập nhật post: " + e.getMessage(), null));
        }
    }

    /**
     * Get posts where user is tagged
     * @param userId User ID
     * @return List of posts
     */
    @GetMapping("/tagged/{userId}")
    public ResponseEntity<ApiResponse<List<Post>>> getPostsByTaggedUserId(@PathVariable String userId) {
        try {
            log.info("Fetching posts where user {} is tagged", userId);
            List<Post> posts = postService.getPostsByTaggedUserId(userId);
            return ResponseEntity.ok(ApiResponse.success(200, "Lấy danh sách post được tag thành công", posts));
        } catch (Exception e) {
            log.error("Error fetching tagged posts", e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(400, "Lỗi khi lấy danh sách post được tag: " + e.getMessage(), null));
        }
    }

    /**
     * Sync stats for all posts from reactions and comments
     * @return Success message
     */
    @PostMapping("/sync-stats")
    public ResponseEntity<ApiResponse<String>> syncAllPostsStats() {
        try {
            log.info("Syncing stats for all posts");
            postService.syncAllPostsStats();
            return ResponseEntity.ok(ApiResponse.success(200, "Đồng bộ thống kê cho tất cả posts thành công", "OK"));
        } catch (Exception e) {
            log.error("Error syncing posts stats", e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(400, "Lỗi khi đồng bộ thống kê: " + e.getMessage(), null));
        }
    }
}
