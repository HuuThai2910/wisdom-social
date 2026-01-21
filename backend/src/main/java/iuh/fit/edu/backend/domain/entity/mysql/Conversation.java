/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.domain.entity.mysql;

import iuh.fit.edu.backend.constant.ConversationType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.List;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Table(name = "conversations")
@Getter
@Setter
@Entity
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private ConversationType type;
//    Tên nhóm (null nếu là direct chat)
    private String name;
//    Avatar nhom
    private String imageUrl;
    private Instant updatedAt;



    @OneToMany(mappedBy = "conversation")
    private List<ConversationUser> users;
}
