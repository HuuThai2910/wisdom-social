/*
 * @ (#) UserServiceImpl.java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.service.impl;

import iuh.fit.edu.backend.constant.FriendStatus;
import iuh.fit.edu.backend.domain.entity.mysql.Friend;
import iuh.fit.edu.backend.domain.entity.mysql.User;
import iuh.fit.edu.backend.dto.request.LoginRequest;
import iuh.fit.edu.backend.dto.request.UpdateUserRequest;
import iuh.fit.edu.backend.dto.response.LoginResponse;
import iuh.fit.edu.backend.repository.mysql.FriendRepository;
import iuh.fit.edu.backend.repository.mysql.UserRepository;
import iuh.fit.edu.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/*
 * @description: User service implementation
 * @author: Thế Bảo
 * @date: 28/01/2026
 * @version: 1.0
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    private final FriendRepository friendRepository;
    @Override
    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest loginRequest) {
        log.info("Login attempt for username: {}", loginRequest.getUsername());
        
        User user = userRepository.findByUsername(loginRequest.getUsername())
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));
        
        return LoginResponse.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .name(user.getName())
                .avatarUrl(user.getAvatarUrl())
                .bio(user.getBio())
                .phone(user.getPhone())
                .createdAt(user.getCreatedAt())
                .message("Đăng nhập thành công")
                .build();
    }
    
    @Override
    @Transactional
    public User createUser(User user) {
        log.info("Creating new user: {}", user.getUsername());
        
        // Check if username already exists
        if (userRepository.existsByUsername(user.getUsername())) {
            throw new RuntimeException("Username đã tồn tại");
        }
        
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        
        return userRepository.save(user);
    }
    
    @Override
    @Transactional(readOnly = true)
    public User getUserById(Long userId) {
        log.info("Getting user by id: {}", userId);
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));
    }
    
    @Override
    @Transactional
    public User updateUser(Long userId, UpdateUserRequest updateRequest) {
        log.info("Updating user: {}", userId);
        
        User user = getUserById(userId);
        
        if (updateRequest.getFullName() != null) {
            user.setName(updateRequest.getFullName());
        }
        if (updateRequest.getBio() != null) {
            user.setBio(updateRequest.getBio());
        }
        if (updateRequest.getAvatarUrl() != null) {
            user.setAvatarUrl(updateRequest.getAvatarUrl());
        }
        if (updateRequest.getGender() != null) {
            user.setGender(updateRequest.getGender());
        }
        
        user.setUpdatedAt(LocalDateTime.now());
        
        return userRepository.save(user);
    }
    
    @Override
    @Transactional(readOnly = true)
    public User findByUsername(String username) {
        log.info("Finding user by username: {}", username);
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<User> getFriends(Long userId) {
        log.info("Getting friends for user: {}", userId);
        
        // Get all accepted friend relationships
        List<Friend> friendRelations = friendRepository.findAllByUserIdAndStatus(userId, FriendStatus.ACCEPTED);
        
        // Extract friend users
        List<User> friends = new ArrayList<>();
        for (Friend relation : friendRelations) {
            // If current user is the one who sent request, get the friend
            if (relation.getUser().getId().equals(userId)) {
                friends.add(relation.getFriend());
            } 
            // If current user is the one who received request, get the user
            else {
                friends.add(relation.getUser());
            }
        }
        
        return friends;
    }

    @Override
    @Transactional(readOnly = true)
    public List<User> searchUsersInFriends(Long userId, String query) {
        log.info("Searching friends for user {} with query: {}", userId, query);
        
        if (query == null || query.trim().isEmpty()) {
            return new ArrayList<>();
        }
        
        // Get all friends first
        List<User> friends = getFriends(userId);
        
        // Filter friends by username or name containing the query (case-insensitive)
        String lowerQuery = query.toLowerCase();
        return friends.stream()
                .filter(user -> 
                    user.getUsername().toLowerCase().contains(lowerQuery) ||
                    user.getName().toLowerCase().contains(lowerQuery)
                )
                .limit(10) // Limit to 10 results for mention autocomplete
                .toList();
    }
}
