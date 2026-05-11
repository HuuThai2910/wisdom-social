/*
 * @ (#) HashtagTrendingRepository.java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.modules.post.repository;

import iuh.fit.edu.backend.modules.post.entity.HashtagTrending;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HashtagTrendingRepository extends MongoRepository<HashtagTrending, String> {
    Optional<HashtagTrending> findByHashtag(String hashtag);
    List<HashtagTrending> findTop10ByOrderByTrendingScoreDesc();
}

