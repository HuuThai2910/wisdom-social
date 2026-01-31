/*
 * @ (#) UserRepository.java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.repository.mysql;

import iuh.fit.edu.backend.domain.entity.mysql.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/*
 * @description: User repository
 * @author: Huu Thai
 * @date: 28/01/2026
 * @version: 1.0
 */
public interface UserRepository extends JpaRepository<User, Long> {
    
    /**
     * Find user by username
     * @param username username
     * @return Optional of user
     */
    Optional<User> findByUsername(String username);
    
    /**
     * Check if username exists
     * @param username username
     * @return true if exists
     */
    boolean existsByUsername(String username);
    
    /**
     * Search users by username or name (case-insensitive)
     * @param username username pattern
     * @param name name pattern
     * @return list of users
     */
    List<User> findByUsernameContainingIgnoreCaseOrNameContainingIgnoreCase(String username, String name);
}
