package iuh.fit.edu.backend.dto.response.feed;

import iuh.fit.edu.backend.domain.entity.nosql.Post;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.List;

@Getter
@Builder
public class FeedSliceResponse {

    private List<Post> posts;
    private Instant nextCursorCreatedAt;
    private String nextCursorPostId;
    private boolean hasNext;
}
