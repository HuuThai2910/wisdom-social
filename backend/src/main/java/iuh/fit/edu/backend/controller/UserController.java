/*
 * @ (#) UserController.java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.controller;

import iuh.fit.edu.backend.domain.entity.mysql.User;
import iuh.fit.edu.backend.dto.request.UpdateUserRequest;
import iuh.fit.edu.backend.dto.response.ApiResponse;
import iuh.fit.edu.backend.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/*
 * @description: User management controller
 * @author: Huu Thai
 * @date: 27/01/2026
 * @version: 1.0
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * Get user by id
     * @param userId user id
     * @return user info
     */
    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<User>> getUserById(@PathVariable Long userId) {
        User user = userService.getUserById(userId);
        return ResponseEntity.ok(ApiResponse.success(200, "Lấy thông tin user thành công", user));
    }

    /**
     * Update user profile
     * @param userId user id from path
     * @param updateRequest update user request
     * @return updated user
     */
    @PutMapping("/{userId}")
    public ResponseEntity<ApiResponse<User>> updateUser(
            @PathVariable Long userId,
            @Valid @RequestBody UpdateUserRequest updateRequest) {
        User updatedUser = userService.updateUser(userId, updateRequest);
        return ResponseEntity.ok(ApiResponse.success(200, "Cập nhật profile thành công", updatedUser));
    }
    
    /**
     * Get friends list of a user
     * @param userId user id
     * @return list of friends
     */
    @GetMapping("/{userId}/friends")
    public ResponseEntity<ApiResponse<List<User>>> getFriends(@PathVariable Long userId) {
        List<User> friends = userService.getFriends(userId);
        return ResponseEntity.ok(ApiResponse.success(200, "Lấy danh sách bạn bè thành công", friends));
    }
}
