/*
 * @ (#) FriendRepository.java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.repository.mysql;

import iuh.fit.edu.backend.constant.FriendStatus;
import iuh.fit.edu.backend.domain.entity.mysql.Friend;
import iuh.fit.edu.backend.domain.entity.mysql.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/*
 * @description: Friend repository
 * @author: The Bao
 * @date: 31/01/2026
 * @version: 1.0
 */
public interface FriendRepository extends JpaRepository<Friend, Long> {
    
    /**
     * Get all accepted friends of a user
     * @param userId user id
     * @param status friend status
     * @return list of friends
     */
    @Query("SELECT f FROM Friend f WHERE (f.user.id = :userId OR f.friend.id = :userId) AND f.status = :status")
    List<Friend> findAllByUserIdAndStatus(@Param("userId") Long userId, @Param("status") FriendStatus status);
}
