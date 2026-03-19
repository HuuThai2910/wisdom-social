/*
 * @ (#) UserService.java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.service;

import iuh.fit.edu.backend.domain.entity.mysql.User;

import java.util.List;

/*
 * @description: User service interface
 * @author: Thế Bảo
 * @date: 28/01/2026
 * @version: 1.0
 */
public interface UserService {
    User getUserById(Long userId);
    User findByUsername(String username);
    List<User> getFriends(Long userId);
    List<User> searchUsersInFriends(Long userId, String query);
}
