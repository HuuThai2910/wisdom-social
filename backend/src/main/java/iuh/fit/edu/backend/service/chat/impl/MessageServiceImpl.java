/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.service.chat.impl;

import iuh.fit.edu.backend.domain.entity.mysql.Conversation;
import iuh.fit.edu.backend.domain.entity.mysql.User;
import iuh.fit.edu.backend.domain.entity.nosql.Message;
import iuh.fit.edu.backend.domain.event.ConversationUpdatedEvent;
import iuh.fit.edu.backend.domain.event.MessageCreatedEvent;
import iuh.fit.edu.backend.dto.request.SendMessageRequest;
import iuh.fit.edu.backend.dto.response.CursorResponse;
import iuh.fit.edu.backend.dto.response.conversation.ConversationMemberResponse;
import iuh.fit.edu.backend.dto.response.message.LastMessageResponse;
import iuh.fit.edu.backend.dto.response.message.MessageResponse;
import iuh.fit.edu.backend.mapper.ConversationMapper;
import iuh.fit.edu.backend.mapper.MessageMapper;
import iuh.fit.edu.backend.repository.mysql.ConversationMemberRepository;
import iuh.fit.edu.backend.repository.mysql.ConversationRepository;
import iuh.fit.edu.backend.repository.mysql.UserRepository;
import iuh.fit.edu.backend.repository.nosql.MessageRepository;
import iuh.fit.edu.backend.service.chat.ConversationMemberService;
import iuh.fit.edu.backend.service.chat.MessageCacheService;
import iuh.fit.edu.backend.service.chat.MessageService;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Slf4j
@Service
@AllArgsConstructor
public class MessageServiceImpl implements MessageService {
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final ConversationMemberService conversationMemberService;
    private final ApplicationEventPublisher eventPublisher;
    private final MessageMapper messageMapper;
    private final ConversationRepository conversationRepository;
    private final ConversationMapper conversationMapper;
    private final ConversationMemberRepository conversationMemberRepository;
    private final MessageCacheService messageCacheService;

    @Override
    @Transactional
    public MessageResponse sendMessage(SendMessageRequest sendMessageRequest, Long userId){
        // Kiểm tra phòng còn tồn tại hay không
        Conversation conversation = this.conversationRepository.findById(sendMessageRequest.getConversationId())
                .orElseThrow(() -> new RuntimeException("Không tim thấy cuộc trò chuyện"));

        // Lấy ra thông tin của người gửi (lần đầu tiên thì lấy từ db, những lần khác còn trong thời gian thì lấy từ redis cache)
        ConversationMemberResponse senderInfo = conversationMemberService.getMemberInfo(sendMessageRequest.getConversationId(), userId);
        if(senderInfo == null){
            throw new RuntimeException("Bạn không phải thành viên của cuộc trò chuyện");
        }

        // Lưu tin nhắn vào mongo
        Message newMessage = new Message();
        newMessage.setContent(sendMessageRequest.getContent());
        newMessage.setMessageType(sendMessageRequest.getType());
        newMessage.setSenderId(senderInfo.getUserId());
        newMessage.setConversationId(sendMessageRequest.getConversationId());
        newMessage.setCreatedAt(Instant.now());
        Message savedMessage = messageRepository.save(newMessage);

        // Cập nhật trạng thái phòng khi người dùng nhắn tin (gồm tin nhắn mới nhất, người nhắn, thời gian)
        conversation.setLastMessageContent(savedMessage.getContent());
        conversation.setLastMessageAt(savedMessage.getCreatedAt());
        conversation.setLastSenderId(savedMessage.getSenderId());
        conversation.setLastMessageType(savedMessage.getMessageType());
        Conversation savedConversation = this.conversationRepository.save(conversation);

        // Tăng unreadCount cho các thành viên khác trong DB
        conversationMemberRepository.incrementUnreadCount(savedConversation.getId(), senderInfo.getUserId());

        // Tạo full response cho người đang chat
        MessageResponse messageResponse = this.messageMapper.toMessageResponse(savedMessage);
        messageResponse.setSenderName(senderInfo.getNickname());
        messageResponse.setSenderAvatar(senderInfo.getAvatar());

        // Lưu vào redis cache (giúp lần sau load nhanh hơn, tiết kiệm thời gian phải truy vấn xuống db)
        messageCacheService.cacheNewMessage(messageResponse);

        // Tạo short message response cho sidebar
        LastMessageResponse lastMessageResponse = this.conversationMapper.toLastMessageResponse(conversation);
        lastMessageResponse.setLastSenderName(senderInfo.getNickname());
        lastMessageResponse.setRead(false);

        // Publish Event
        // Event 1: Cho user đang mở cuộc hội thoại
        this.eventPublisher.publishEvent(new MessageCreatedEvent(messageResponse));

        // Event 2: Cho side bar của user
        Set<Long> memberIds = this.conversationMemberService.getAllMemberId(conversation.getId());
        this.eventPublisher.publishEvent(new ConversationUpdatedEvent(conversation.getId(), lastMessageResponse, memberIds));

        return messageResponse;
    }

    /**
     * Lấy ra tin nhắn trong cuộc hội thoại
     * Mặc định limit = 20
     */
    @Override
    public CursorResponse<List<MessageResponse>> getMessagesByConversation(
            Long conversationId,
            Long userId,
            Instant before,
            int limit
    ) {
        // Check member
        if (conversationMemberService.getMemberInfo(conversationId, userId) == null) {
            throw new RuntimeException("Bạn không phải thành viên của cuộc trò chuyện");
        }
        List<MessageResponse> finalResponseList;

        // Cần check để xem được lấy từ db hay redis
        // Vì cách check hasNext ở db và redis sẽ khác nhau
        boolean isFromCache = false;

        // Ưu tiên lấy từ redis trước (bao gồm cả việc load trang đầu hoặc khi scroll)
        List<MessageResponse> cachedMessages = this.messageCacheService.getListMessage(conversationId, before, limit);
        if(!cachedMessages.isEmpty()){
            log.info("List message from cache {}", cachedMessages);
            finalResponseList = cachedMessages;
            isFromCache = true;
        }else {
            // Lấy dư 1 để check hasNext
            List<Message> mongoMessages = fetchMessagesFromDb(conversationId, before, limit + 1);
            log.info("List message from mongo {}", mongoMessages.size());

            // Map sang Response (Điền tên/avatar)
            finalResponseList = enrichMessageResponses(conversationId, mongoMessages);

            // Chỉ cache phần dữ liệu chính (bỏ phần tử dư dùng check hasNext)
            List<MessageResponse> toCache = finalResponseList.size() > limit
                    ? finalResponseList.subList(0, limit)
                    : finalResponseList;

            // Tự động quyết định ghi đè hay nối chuỗi
            this.messageCacheService.cacheListMessage(conversationId, toCache, before);
        }
        boolean hasNext;
        if(isFromCache){
            // Nếu redis trả về >= 20 tin -> giả định là vẫn còn tin nhắn cũ
            // Nếu redis trả về < 20 tin (VD: 15) -> chắc chắn là hết tin nhắn
            hasNext = finalResponseList.size() >= limit;
        }else {
            // Nếu db trả về > 20 (VD: 21) -> chắc chắn vẫn còn tin nhắn cũ
            hasNext = finalResponseList.size() > limit;
            if(hasNext){
                finalResponseList = finalResponseList.subList(0, limit);
            }
        }

        // Đảo ngược danh sách để Frontend hiển thị từ trên xuống (Cũ -> Mới)
        List<MessageResponse> ascResponseList = new ArrayList<>(finalResponseList);
        Collections.reverse(ascResponseList);

        // Cursor là createdAt của tin nhắn CŨ NHẤT trong list (tin cuối cùng của list DESC)
        Instant nextCursor = null;
        if (!finalResponseList.isEmpty()) {
            nextCursor = finalResponseList.getLast().getCreatedAt();
        }
        log.info("List message {}", ascResponseList);

        return CursorResponse.<List<MessageResponse>>builder()
                .data(ascResponseList)
                .nextCursor(nextCursor)
                .hasNext(hasNext)
                .build();
    }

    /**
     * Dùng để lấy dữ liệu từ db
     * Không có before thì sẽ lấy 20 tin nhắn đầu
     * Có before thì sẽ lấy tin nhắn cũ hơn
     */
    private List<Message> fetchMessagesFromDb(Long conversationId, Instant before, int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        if (before == null) {
            return messageRepository.findByConversationIdOrderByCreatedAtDesc(conversationId, pageable);
        } else {
            return messageRepository.findByConversationIdAndCreatedAtLessThanOrderByCreatedAtDesc(
                    conversationId, before, pageable
            );
        }
    }
    /**
     * Map từ Message Entity sang MessageResponse có đầy đủ thông tin Sender
     * Logic Bulk Query tối ưu N+1
     */
    private List<MessageResponse> enrichMessageResponses(Long conversationId, List<Message> messages) {
        if (messages.isEmpty()) return Collections.emptyList();

        // Lấy ra toàn bộ id của thành viên trong nhóm và không trùng
        Set<Long> senderIds = messages.stream()
                .map(Message::getSenderId)
                .collect(Collectors.toSet());

        // Lấy thành viên hiện tại
        Map<Long, ConversationMemberResponse> currentMembers =
                conversationMemberService.getMembersMap(conversationId, senderIds);

        // Lọc ra những thành viên không còn trong nhóm nhưng vẫn còn tin nhắn
        Map<Long, User> leftUsers = senderIds.stream()
                .filter(id -> !currentMembers.containsKey(id))
                .collect(Collectors.collectingAndThen(
                        Collectors.toSet(),
                        ids -> ids.isEmpty()
                                ? Map.of()
                                : userRepository.findAllById(ids).stream()
                                .collect(Collectors.toMap(User::getId, u -> u))
                ));

        return messages.stream()
                .map(message -> {
                    MessageResponse res = messageMapper.toMessageResponse(message);
                    Long senderId = message.getSenderId();

                    ConversationMemberResponse member = currentMembers.get(senderId);
                    if (member != null) {
                        res.setSenderName(member.getNickname());
                        res.setSenderAvatar(member.getAvatar());
                    } else if (leftUsers.containsKey(senderId)) {
                        User user = leftUsers.get(senderId);
                        res.setSenderName(user.getName());
                        res.setSenderAvatar(user.getAvatarUrl());
                    } else {
                        res.setSenderName("Người dùng ẩn");
                    }
                    return res;
                })
                .collect(Collectors.toList()); // Trả về list DESC
    }
}
