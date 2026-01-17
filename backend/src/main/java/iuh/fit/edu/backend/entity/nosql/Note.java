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
@Document(collection = "notes")
@Data
public class Note {

    @Id
    private ObjectId id;

    private ObjectId userId;
    private String content;

    private ObjectId musicTrackId;
    private PrivacyType privacy;

    private Stats stats;

    private StatusType status;

    private Instant createdAt;
    private Instant expireAt;
}