/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.domain.entity.nosql;

import iuh.fit.edu.backend.constant.PrivacyType;
import iuh.fit.edu.backend.constant.StatusType;
import jakarta.persistence.*;
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
import java.util.List;

/*
 * @description: Post entity with optimization for social media features
 * Tối ưu: Compound index cho newsfeed query (authorId + createdAt)
 * Text index cho search content
 * @author: The Bao
 * @date: 2026-01-20
 * @version: 1.0
 */
@Document(collection = "posts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@CompoundIndexes({
        @CompoundIndex(
                name = "author_created_idx",
                def = "{'authorId': 1, 'createdAt': -1}"
        ),
        @CompoundIndex(
                name = "status_created_idx",
                def = "{'status': 1, 'createdAt': -1}"
        )
})
public class Post {

    @Id
    private ObjectId id;

    @Indexed
    private ObjectId authorId;
    
    // Text search index cho content
    @Indexed
    private String content;

    private PrivacyType privacy;

    private List<Media> media;

    // Location/Check-in
    private Location location;

    // Tags (người được tag trong post)
    private List<ObjectId> taggedUserIds;

    // Hashtags
    private List<String> hashtags;

    // Mentions trong content
    private List<ObjectId> mentions;

    // Feeling/Activity (VD: "feeling happy", "watching Avengers")
    private Activity activity;

    // Background cho text post (như Facebook colored background)
    private String backgroundStyle;

    private Stats stats;

    // Visibility settings
    private StatusType status;
    private boolean isEdited;
    private boolean allowComments;
    private boolean allowShares;

    // Timestamps
    private Instant createdAt;
    private Instant updatedAt;
    private Instant scheduledAt; // Hẹn giờ đăng
}

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class Media {
    private String url;
    private String type; // image | video | gif
    private String thumbnailUrl; // Thumbnail cho video
    private Integer width;
    private Integer height;
    private Long duration; // Duration cho video (seconds)
    private String altText; // Accessibility
}

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class Stats {
    private long reactCount;
    private long commentCount;
    private long shareCount;
    private long viewCount; // View count cho video
}

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class Location {
    private String name; // Tên địa điểm
    private String address;
    private Double latitude;
    private Double longitude;
    private String placeId; // Google Places API ID
}

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class Activity {
    private String type; // feeling | activity
    private String name; // happy | excited | watching | eating...
    private String iconUrl;
    private String description;
}
