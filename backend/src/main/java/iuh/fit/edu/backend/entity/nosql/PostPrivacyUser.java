/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.entity.nosql;

import iuh.fit.edu.backend.constant.TargetType;
import jakarta.persistence.Id;
import lombok.Data;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.mapping.Document;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Document(collection = "post_privacy_users")
@Data
public class PostPrivacyUser {

    @Id
    private ObjectId id;

    private ObjectId targetId;
    private TargetType targetType;

    private ObjectId userId;

    private String type; // allow | deny
}