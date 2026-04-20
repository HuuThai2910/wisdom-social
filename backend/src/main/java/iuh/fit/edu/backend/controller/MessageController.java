/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.controller;

import iuh.fit.edu.backend.dto.request.message.SendMessageRequest;
import iuh.fit.edu.backend.dto.request.SendCallMessageRequest;
import iuh.fit.edu.backend.dto.response.message.MessageRecalledResponse;
import iuh.fit.edu.backend.dto.response.message.MessageResponse;
import iuh.fit.edu.backend.service.chat.MessageService;
import iuh.fit.edu.backend.service.user.UserService;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.Logger;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Slf4j
@RestController
@RequestMapping("/api/messages")
@CrossOrigin(origins = "*")
public class MessageController {
    private final MessageService messageService;
    private final UserService userService;

    public MessageController(MessageService messageService, UserService userService) {
        this.messageService = messageService;
        this.userService = userService;
    }

    @PostMapping("/send")
    public ResponseEntity<MessageResponse> sendMessage(
            @RequestBody SendMessageRequest sendMessageRequest) {
        Long userId = this.userService.getCurrentUser().getId();
        log.info("User: {}",  userId);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(this.messageService.sendMessage(sendMessageRequest, userId));
    }

    @PostMapping("/call")
    public ResponseEntity<MessageResponse> sendCallMessage(
            @RequestBody SendCallMessageRequest sendCallMessageRequest) {
        Long userId = this.userService.getCurrentUser().getId();
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(this.messageService.sendCallMessage(sendCallMessageRequest, userId));
    }

    @DeleteMapping("/{messageId}/recall")
    public ResponseEntity<MessageRecalledResponse> recallMessage(@PathVariable String messageId) {
        Long userId = this.userService.getCurrentUser().getId();
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(this.messageService.recallMessage(messageId, userId));

    }

    @DeleteMapping("/{messageId}/delete-for-me")
    public ResponseEntity<Void> deleteMessageForMe(@PathVariable String messageId) {
        Long userId = this.userService.getCurrentUser().getId();
        this.messageService.deleteMessageForMe(messageId, userId);
        return ResponseEntity.status(HttpStatus.OK).build();
    }

    @PostMapping("/{messageId}/pin")
    public ResponseEntity<Void> pinMessage(@PathVariable String messageId) {
        Long userId = this.userService.getCurrentUser().getId();
        this.messageService.pinMessage(messageId, userId);
        return ResponseEntity.status(HttpStatus.OK).build();
    }

    @DeleteMapping("/{messageId}/pin")
    public ResponseEntity<Void> unpinMessage(@PathVariable String messageId) {
        Long userId = this.userService.getCurrentUser().getId();
        this.messageService.unpinMessage(messageId, userId);
        return ResponseEntity.status(HttpStatus.OK).build();
    }


}
