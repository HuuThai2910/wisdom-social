/*
 * @ (#) Story.java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.domain.entity.mysql;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

/*
 * @description: Story entity
 * @author: Huu Thai
 * @date: 17/01/2026
 * @version: 1.0
 */
@Entity
@Table(name = "stories")
@Getter
@Setter
public class Story {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    private String mediaUrl;
    private String privacy;
    private Boolean allowReplies;
    private Boolean allowComments;

    private LocalDateTime createdAt;
    private LocalDateTime expireAt;

    @OneToMany(mappedBy = "story")
    private List<StoryComment> comments;
}
