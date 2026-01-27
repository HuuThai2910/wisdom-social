/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.domain.entity.mysql;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Entity
@Getter
@Setter
@Table(name = "conversation_users", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"conversation_id", "user_id"})
})
public class ConversationUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "conversation_id")
    private Conversation conversation;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    // Đánh dấu là nhóm trưởng (chỉ có khi là group chat)
    private boolean isAdmin;
    private boolean isMuted;
    private Long lastReadId;
    private String nickname;

    @ManyToOne
    @JoinColumn(name = "color_id")
    private Color color;
}
