/*
 * @ (#) StoryView.java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.domain.entity.nosql;

import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/*
 * @description: Track story views (giống Instagram/Facebook)
 * Tối ưu: TTL index tự động xóa sau 48h (story hết hạn)
 * Unique compound index tránh duplicate view
 * @author: The Bao
 * @date: 2026-01-20
 * @version: 1.0
 */
@Document(collection = "story_views")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@CompoundIndexes({
        @CompoundIndex(
                name = "unique_story_viewer",
                def = "{'storyId': 1, 'viewerId': 1}",
                unique = true
        ),
        @CompoundIndex(
                name = "story_created_idx",
                def = "{'storyId': 1, 'createdAt': -1}"
        )
})
public class StoryView {

    @Id
    private ObjectId id;

    private ObjectId storyId;
    private ObjectId viewerId;

    // Thời điểm xem
    private Instant createdAt;

    // TTL - Tự động xóa sau 48 giờ (config via MongoConfig)
    @Indexed
    private Instant expireAt;
}
