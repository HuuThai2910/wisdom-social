/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.entity.nosql;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */

import iuh.fit.edu.backend.entity.mysql.Conversation;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;

@Document(collection = "messages")
@Getter
@Setter
public class Message {

    @Id
    private String id; // Mongo ID (ObjectId)

//    Text, File, Video, Image, Link, Sticker
    private String messageType;

    private String content;



    private Instant createdAt;
    private Instant modifiedAt;

//    Tham chieu tu conversation
    private Long conversation_id;

//    Tham chieu tu conversation_user de lay ra duoc biet danh cua user
    private Long sender_id;

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
