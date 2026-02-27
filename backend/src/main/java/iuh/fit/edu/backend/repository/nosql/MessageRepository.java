/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.repository.nosql;

import iuh.fit.edu.backend.domain.entity.nosql.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Repository
public interface MessageRepository extends MongoRepository<Message, String> {
    // Lấy ra 20 tin nhắn mới nhất
    List<Message> findByConversationIdOrderByCreatedAtDesc(
            Long conversationId,
            Pageable pageable
    );

    List<Message> findByConversationIdAndCreatedAtLessThanOrderByCreatedAtDesc(
            Long conversationId,
            Instant before,
            Pageable pageable
    );


}
