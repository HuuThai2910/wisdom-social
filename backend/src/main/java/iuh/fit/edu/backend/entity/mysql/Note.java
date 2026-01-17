/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.entity.mysql;

import jakarta.persistence.GeneratedValue;
import lombok.Setter;

import java.time.LocalDateTime;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Entity
@Getter @Setter
public class Note {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String content;
    private String audience;

    private LocalDateTime createdAt;
    private LocalDateTime updateAt;
    private LocalDateTime expireAt;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @OneToMany(mappedBy = "note")
    private List<NoteReaction> reactions;
}
