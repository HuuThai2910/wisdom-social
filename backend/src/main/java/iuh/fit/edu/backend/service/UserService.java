/*
 * @ (#) UserService.java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.service;

import iuh.fit.edu.backend.domain.entity.mysql.User;
import iuh.fit.edu.backend.dto.request.LoginRequest;
import iuh.fit.edu.backend.dto.request.UpdateUserRequest;
import iuh.fit.edu.backend.dto.response.LoginResponse;

import java.util.List;

/*
 * @description: User service interface
 * @author: Thế Bảo
 * @date: 28/01/2026
 * @version: 1.0
 */
public interface UserService {
    LoginResponse login(LoginRequest loginRequest);
    User createUser(User user);
    User getUserById(Long userId);
    User updateUser(Long userId, UpdateUserRequest updateRequest);
    User findByUsername(String username);
    List<User> getFriends(Long userId);
    List<User> searchUsersInFriends(Long userId, String query);
}
