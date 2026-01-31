/*
 * @ (#) PageRepository.java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.repository.nosql;

import iuh.fit.edu.backend.constant.StatusType;
import iuh.fit.edu.backend.domain.entity.nosql.Page;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/*
 * @description: Page repository for MongoDB operations
 * @author: The Bao
 * @date: 2026-01-31
 * @version: 1.0
 */
@Repository
public interface PageRepository extends MongoRepository<Page, String> {
    
    Optional<Page> findByUsername(String username);
    
    Optional<Page> findBySlug(String slug);
    
    List<Page> findByStatus(StatusType status);
    
    List<Page> findByCategory(String category);
    
    List<Page> findByIsVerified(boolean isVerified);
    
    List<Page> findByOwnerId(String ownerId);
}
