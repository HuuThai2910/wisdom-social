package iuh.fit.edu.backend.event.post;

import iuh.fit.edu.backend.domain.entity.nosql.Post;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostRealtimeEvent implements Serializable {
    private String action; // CREATE, UPDATE, DELETE
    private Post post;
    private String postId;
    private String authorId;
}
