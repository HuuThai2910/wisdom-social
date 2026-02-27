/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.domain.entity.nosql;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */

import iuh.fit.edu.backend.constant.MessageType;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;
import java.util.ArrayList;

@Document(collection = "messages")
@Getter
@Setter
// Taọ index giúp tăng tốc độ truy vấn message
@CompoundIndex(
        name = "conversation_createdAt_idx",
        def = "{ 'conversation_id': 1, 'created_at': -1 }"
)
@ToString
public class Message {

    @Id
    private String id; // Mongo ID (ObjectId)
    @Field(name = "message_type")
    @Enumerated(EnumType.STRING)
    private MessageType messageType;
    private String content;
    @Field(name = "created_at")
    private Instant createdAt;
    @Field(name = "modified_at")
    private Instant modifiedAt;
    @Field(name = "conversation_id")
    private Long conversationId;

    // Tham chiếu tới conversation_user để lấy ra được biệt danh của user
    @Field(name = "sender_id")
    private Long senderId;

    private String replyTo;
    private IconName iconName;
}

class IconName{
    private  String name;
    private ArrayList<IconUser> user;
}
class  IconUser{
    private Long userId;
    private int quantity;
}
