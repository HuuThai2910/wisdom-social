/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.repository.mysql;

import iuh.fit.edu.backend.domain.entity.mysql.User;
import org.springframework.data.jpa.repository.JpaRepository;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
public interface UserRepository extends JpaRepository<User, Long> {
}
