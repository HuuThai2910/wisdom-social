/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.entity.nosql;

import iuh.fit.edu.backend.constant.ReactionType;
import iuh.fit.edu.backend.constant.TargetType;
import jakarta.persistence.Id;
import lombok.Data;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Document(collection = "reactions")
@Data
@CompoundIndexes({
        @CompoundIndex(
                name = "unique_reaction",
                def = "{'userId':1,'targetType':1,'targetId':1}",
                unique = true
        )
})
public class Reaction {

    @Id
    private ObjectId id;

    private ObjectId userId;

    private TargetType targetType;
    private ObjectId targetId;

    private ReactionType type;

    private Instant createdAt;
    private Instant updatedAt;
}