/*
 * @ (#) UserRepository.java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.repository.mysql;

import iuh.fit.edu.backend.domain.entity.mysql.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

/*
 * @description
 * @author: Ngoc Hai
 * @date:
 * @version: 1.0
 */
@Repository
public interface UserRepository extends JpaRepository<User,Long> {
    User findByPhone(String phone);
    Optional<User> findByUsername(String username);

    boolean existsUserByUsername(String username);

    List<User> findUsersByUsernameContaining(String username);

    List<User> findByDeletionScheduledForBefore(OffsetDateTime dateTime);
    Page<User> findByIdInAndUsernameContainingIgnoreCase(List<Long> ids, String username, Pageable pageable);
}