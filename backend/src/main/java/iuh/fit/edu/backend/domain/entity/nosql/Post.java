/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.domain.entity.nosql;

import iuh.fit.edu.backend.constant.PrivacyType;
import iuh.fit.edu.backend.constant.StatusType;
import jakarta.persistence.*;
import lombok.Data;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Document(collection = "posts")
@Data
public class Post {

    @Id
    private ObjectId id;

    private ObjectId authorId;
    private String content;

    private PrivacyType privacy;

    private List<Media> media;

    private Stats stats;

    private StatusType status;
    private boolean isEdited;

    private Instant createdAt;
    private Instant updatedAt;
}

 class Media {
    private String url;
    private String type; // image | video
}

 class Stats {
    private long reactCount;
    private long commentCount;
    private long shareCount;
}
