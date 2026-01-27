/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.service.chat;

import iuh.fit.edu.backend.domain.entity.mysql.User;
import iuh.fit.edu.backend.domain.entity.nosql.Message;
import iuh.fit.edu.backend.dto.request.SendMessageRequest;
import iuh.fit.edu.backend.dto.response.message.MessageResponse;
import iuh.fit.edu.backend.repository.mysql.UserRepository;
import iuh.fit.edu.backend.repository.nosql.MessageRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Service
@AllArgsConstructor
public class MessageServiceImpl implements iuh.fit.edu.backend.service.MessageService {
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    @Override
    public MessageResponse sendMessage(SendMessageRequest sendMessageRequest, Long userId){
        // Kiểm tra người gửi có tồn tại trong hệ thống hay không
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));

        // Lưu tin nhắn vào mongo
        Message newMessage = new Message();
        newMessage.setContent(sendMessageRequest.getContent());
        newMessage.setMessageType(sendMessageRequest.getType());
        newMessage.setSenderId(user.getId());
        newMessage.setConversationId(sendMessageRequest.getConversationId());
        newMessage.setCreatedAt(Instant.now());

        Message savedMessage = messageRepository.save(newMessage);
        return null;



    }
}
