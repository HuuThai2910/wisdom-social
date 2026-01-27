/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.controller;

import iuh.fit.edu.backend.dto.response.CursorResponse;
import iuh.fit.edu.backend.dto.response.conversation.ConversationResponse;
import iuh.fit.edu.backend.dto.response.message.MessageResponse;
import iuh.fit.edu.backend.service.chat.ConversationService;
import iuh.fit.edu.backend.service.chat.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
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
    public ResponseEntity<CursorResponse<List<MessageResponse>>> getMessages(
            @PathVariable Long conversationId,
            @RequestParam Long userId,
            @RequestParam(required = false) Instant before,
            @RequestParam(defaultValue = "20") int limit
    ) {
        return ResponseEntity.ok(
                messageService.getMessagesByConversation(
                        conversationId,
                        userId,
                        before,
                        limit
                )
        );
    }
    @PostMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id, @RequestParam Long userId){
        conversationService.markAsRead(id, userId);
        return ResponseEntity.ok().build();
    }
}
