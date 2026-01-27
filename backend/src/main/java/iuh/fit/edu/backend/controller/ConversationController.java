/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.controller;

import iuh.fit.edu.backend.dto.response.conversation.ConversationResponse;
import iuh.fit.edu.backend.dto.response.message.MessageResponse;
import iuh.fit.edu.backend.service.chat.ConversationService;
import iuh.fit.edu.backend.service.chat.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
public class ConversationController {
    private final ConversationService conversationService;
    private final MessageService messageService;

    @GetMapping
    public ResponseEntity<List<ConversationResponse>> getConversationsByUser(@RequestParam Long userId){
        return ResponseEntity.ok(conversationService.getConversationsByUser(userId));
    }
    @GetMapping("/{conversationId}")
    public ResponseEntity<ConversationResponse> getConversationById(@PathVariable Long conversationId, @RequestParam Long userId){
        ConversationResponse conversationResponse = conversationService.getConversationById(conversationId, userId);
        return ResponseEntity.ok(conversationResponse);
    }
    @GetMapping("/{conversationId}/messages")
    public ResponseEntity<List<MessageResponse>> getMessagesByConversation(@PathVariable Long conversationId, @RequestParam Long userId){
        List<MessageResponse> messages = messageService.getMessagesByConversation(conversationId, userId);
        return ResponseEntity.ok(messages);
    }
}
