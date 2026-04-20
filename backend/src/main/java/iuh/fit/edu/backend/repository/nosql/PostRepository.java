/*
 * @ (#) PostRepository.java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.repository.nosql;

import iuh.fit.edu.backend.domain.entity.nosql.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PostRepository extends MongoRepository<Post, String> {
    List<Post> findByAuthorIdOrderByCreatedAtDesc(String authorId);
    @Query("{ 'authorId': ?#{[0].toString()} }")
    Page<Post> findByAuthorId(Long authorId, Pageable pageable);

    @Query(value = "{ 'authorId': ?#{[0].toString()} }", count = true)
    long countByAuthorId(Long authorId);

    List<Post> findByTaggedUserIdsContaining(String userId);
}

