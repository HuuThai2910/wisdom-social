/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.entity.nosql;

import iuh.fit.edu.backend.constant.PrivacyType;
import iuh.fit.edu.backend.constant.StatusType;
import jakarta.persistence.Id;
import lombok.Data;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Document(collection = "stories")
@Data
public class Story {

    @Id
    private ObjectId id;

    private ObjectId userId;

    private Media media;

    private PrivacyType privacy;

    private boolean allowReplies;
    private boolean allowReactions;

    private long viewCount;
    private long reactCount;

    private StatusType status;

    private Instant createdAt;
    private Instant expireAt;
}