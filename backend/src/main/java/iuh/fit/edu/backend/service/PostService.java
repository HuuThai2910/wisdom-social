/*
 * @ (#) PostService.java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.service;

import iuh.fit.edu.backend.domain.entity.nosql.Post;
import iuh.fit.edu.backend.dto.request.CreatePostRequest;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/*
 * @description: Post service interface
 * @author: The Bao
 * @date: 31/01/2026
 * @version: 1.0
 */
public interface PostService {
    Post createPost(CreatePostRequest request, List<MultipartFile> images, Long authorId);
    List<Post> getPostsByUserId(Long userId);
    Post getPostById(String postId);
    void deletePost(String postId, Long userId);
    Post updatePost(String postId, CreatePostRequest request, List<MultipartFile> newImages, Long userId);
    List<Post> getPostsByTaggedUserId(String userId);
    void syncAllPostsStats();
}
