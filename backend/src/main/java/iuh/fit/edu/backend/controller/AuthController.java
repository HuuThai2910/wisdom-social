/*
 * @ (#) AuthController.java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.controller;

import iuh.fit.edu.backend.dto.request.LoginRequest;
import iuh.fit.edu.backend.dto.request.UserRequest;
import iuh.fit.edu.backend.dto.response.ApiResponse;
import iuh.fit.edu.backend.dto.response.LoginResponse;
import iuh.fit.edu.backend.domain.entity.mysql.User;
import iuh.fit.edu.backend.service.UserService;
import iuh.fit.edu.backend.util.FormatApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/*
 * @description: Authentication controller - temporary without password
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;

    /**
     * Temporary login endpoint without password
     * @param loginRequest login request with username
     * @return login response with user info
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest loginRequest) {
        LoginResponse response = userService.login(loginRequest);
        return ResponseEntity.ok(ApiResponse.success(200, "Đăng nhập thành công", response));
    }

    /**
     * Create user for testing
     * @param userRequest user request
     * @return created user
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<User>> register(@Valid @RequestBody UserRequest userRequest) {
        User user = new User();
        user.setUsername(userRequest.getUsername());
        user.setName(userRequest.getName());
        user.setPhone(userRequest.getPhone());
        user.setBio(userRequest.getBio());
        user.setAvatarUrl(userRequest.getAvatarUrl());
        user.setGender(userRequest.getGender());
        
        User createdUser = userService.createUser(user);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(201, "Đăng ký thành công", createdUser));
    }

    /**
     * Get current user info
     * @param userId user id from path
     * @return user info
     */
    @GetMapping("/me/{userId}")
    public ResponseEntity<ApiResponse<User>> getCurrentUser(@PathVariable Long userId) {
        User user = userService.getUserById(userId);
        return ResponseEntity.ok(ApiResponse.success(200, "Lấy thông tin user thành công", user));
    }

    /**
     * Get user info by username
     * @param username username
     * @return user info
     */
    @GetMapping("/user/{username}")
    public ResponseEntity<ApiResponse<User>> getUserByUsername(@PathVariable String username) {
        User user = userService.findByUsername(username);
        return ResponseEntity.ok(ApiResponse.success(200, "Lấy thông tin user thành công", user));
    }

    /**
     * Get user info by user ID
     * @param userId user id
     * @return user info
     */
    @GetMapping("/user/id/{userId}")
    public ResponseEntity<ApiResponse<User>> getUserById(@PathVariable Long userId) {
        User user = userService.getUserById(userId);
        return ResponseEntity.ok(ApiResponse.success(200, "Lấy thông tin user thành công", user));
    }

    /**
     * Search users by username (for mention/tag functionality)
     * @param userId current user ID
     * @param query search query
     * @return list of users (only friends)
     */
    @GetMapping("/users/search")
    public ResponseEntity<ApiResponse<java.util.List<User>>> searchUsers(
            @RequestParam Long userId,
            @RequestParam String query) {
        java.util.List<User> users = userService.searchUsersInFriends(userId, query);
        return ResponseEntity.ok(ApiResponse.success(200, "Tìm kiếm user thành công", users));
    }
}
