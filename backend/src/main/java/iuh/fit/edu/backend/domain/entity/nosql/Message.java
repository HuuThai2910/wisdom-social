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
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;

@Document(collection = "messages")
@Getter
@Setter
public class Message {

    @Id
    private String id; // Mongo ID (ObjectId)

    private MessageType messageType;
    private String content;
    private Instant createdAt;
    private Instant modifiedAt;

//    Tham chieu tu conversation
    private Long conversationId;

//    Tham chieu tu conversation_user de lay ra duoc biet danh cua user
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
