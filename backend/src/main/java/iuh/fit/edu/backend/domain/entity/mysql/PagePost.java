package iuh.fit.edu.backend.domain.entity.mysql;

import iuh.fit.edu.backend.constant.PostStatus;
import iuh.fit.edu.backend.domain.entity.nosql.Post;
import jakarta.persistence.*;
import lombok.Data;
import java.time.OffsetDateTime;

@Entity
@Table(name = "page_posts")
@Data
public class PagePost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String postId;

    @ManyToOne
    @JoinColumn(name = "page_id", nullable = false)
    private Page page;

    @Column(columnDefinition = "TEXT")
    private String content;

    private PostStatus status;


    @ManyToOne
    @JoinColumn(name = "approved_by")
    private User approvedBy;
    private OffsetDateTime approvedAt;

    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}