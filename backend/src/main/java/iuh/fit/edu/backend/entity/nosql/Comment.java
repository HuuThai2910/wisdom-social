/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.entity.nosql;

import iuh.fit.edu.backend.constant.StatusType;
import iuh.fit.edu.backend.constant.TargetType;
import jakarta.persistence.Id;
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
@Document(collection = "comments")
@Data
public class Comment {

    @Id
    private ObjectId id;

    private ObjectId userId;

    private TargetType targetType;
    private ObjectId targetId;

    private ObjectId parentId; // reply

    private String content;
    private List<ObjectId> mentions;

    private long reactCount;

    private StatusType status;
    private boolean isEdited;

    private Instant createdAt;
    private Instant updatedAt;
}