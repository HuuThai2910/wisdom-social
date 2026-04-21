/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.controller;

import iuh.fit.edu.backend.dto.response.CursorResponse;
import iuh.fit.edu.backend.dto.response.conversation.ConversationMemberResponse;
import iuh.fit.edu.backend.dto.response.conversation.ConversationResponse;
import iuh.fit.edu.backend.dto.response.message.MessageResponse;
import iuh.fit.edu.backend.service.chat.ConversationMemberService;
import iuh.fit.edu.backend.service.chat.ConversationService;
import iuh.fit.edu.backend.service.chat.MessageService;
import iuh.fit.edu.backend.service.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

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
    private final ConversationMemberService memberService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<ConversationResponse>> getConversationsByUser(){
        Long userId = this.userService.getCurrentUser().getId();
        return ResponseEntity.ok(conversationService.getConversationsByUser(userId));
    }

    @GetMapping("/{conversationId}")
    public ResponseEntity<ConversationResponse> getConversationById(@PathVariable Long conversationId){
        Long userId = this.userService.getCurrentUser().getId();
        ConversationResponse conversationResponse = conversationService.getConversationById(conversationId, userId);
        return ResponseEntity.ok(conversationResponse);
    }

    @GetMapping("/{conversationId}/messages")
    public ResponseEntity<CursorResponse<List<MessageResponse>>> getMessages(
            @PathVariable Long conversationId,
            @RequestParam(required = false) Instant before,
            @RequestParam(defaultValue = "20") int limit
    ) {
        Long userId = this.userService.getCurrentUser().getId();
        return ResponseEntity.ok(
                messageService.getMessagesByConversation(
                        conversationId,
                        userId,
                        before,
                        limit
                )
        );
    }
    @GetMapping("/{conversationId}/messages/newer")
    public ResponseEntity<CursorResponse<List<MessageResponse>>> getNewerMessages(
            @PathVariable Long conversationId,
            @RequestParam Instant after, // Không để required = false vì thao tác này luôn cần mốc thời gian
            @RequestParam(defaultValue = "20") int limit
    ) {
        Long userId = this.userService.getCurrentUser().getId();
        return ResponseEntity.ok(
                messageService.getNewerMessages(
                        conversationId,
                        userId,
                        after,
                        limit
                )
        );
    }
    @GetMapping("/{id}/messages/{targetMessageId}/jump")
    public ResponseEntity<CursorResponse<List<MessageResponse>>> jumpToMessage(
            @PathVariable Long id,
            @PathVariable String targetMessageId) {
        Long userId = this.userService.getCurrentUser().getId();
        return ResponseEntity.ok(messageService.jumpToMessage(id, targetMessageId, userId));
    }


    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id, @RequestParam(required = false) String lastMessageId){
        Long userId = this.userService.getCurrentUser().getId();
        conversationService.markAsRead(id,userId, lastMessageId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{conversationId}/delete-for-me")
    public ResponseEntity<Void> deleteConversationForMe(@PathVariable Long conversationId){
        Long userId = this.userService.getCurrentUser().getId();
        this.conversationService.deleteConversationForMe(conversationId, userId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{conversationId}/members")
    public ResponseEntity<Map<Long, ConversationMemberResponse>> getConversationMembers(
            @PathVariable Long conversationId) {
        Map<Long, ConversationMemberResponse> membersMap = memberService.getMembersMap(conversationId);
        return ResponseEntity.ok(membersMap);
    }

    @PatchMapping("/{conversationId}/members/{targetUserId}/nickname")
    public ResponseEntity<String> updateNickname(
            @PathVariable Long conversationId,
            @PathVariable Long targetUserId,
            @RequestBody String nickname) {
        memberService.updateNickname(conversationId, targetUserId, nickname);
        return ResponseEntity.ok("Cập nhật biệt danh thành công");
    }
}
