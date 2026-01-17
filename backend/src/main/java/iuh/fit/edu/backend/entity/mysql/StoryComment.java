/*
 * @ (#) StoryComment.java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.entity.mysql;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/*
 * @description: Story comment entity
 * @author: Huu Thai
 * @date: 17/01/2026
 * @version: 1.0
 */
@Entity
@Table(name = "story_comments")
@Getter
@Setter
public class StoryComment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "story_id")
    private Story story;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    private String content;
    private LocalDateTime createdAt;
}
