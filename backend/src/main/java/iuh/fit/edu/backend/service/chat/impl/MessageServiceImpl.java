/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.service.chat.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.edu.backend.constant.MessageType;
import iuh.fit.edu.backend.constant.UploadModule;
import iuh.fit.edu.backend.domain.entity.mysql.Conversation;
import iuh.fit.edu.backend.domain.entity.mysql.ConversationMember;
import iuh.fit.edu.backend.domain.entity.mysql.User;
import iuh.fit.edu.backend.domain.entity.nosql.Message;
import iuh.fit.edu.backend.dto.request.SendCallMessageRequest;
import iuh.fit.edu.backend.dto.response.message.MessageRecalledResponse;
import iuh.fit.edu.backend.event.payload.ConversationUpdatedEvent;
import iuh.fit.edu.backend.event.payload.MessageCreatedEvent;
import iuh.fit.edu.backend.dto.request.SendMessageRequest;
import iuh.fit.edu.backend.dto.response.CursorResponse;
import iuh.fit.edu.backend.dto.response.conversation.ConversationMemberResponse;
import iuh.fit.edu.backend.dto.response.message.LastMessageResponse;
import iuh.fit.edu.backend.dto.response.message.MessageResponse;
import iuh.fit.edu.backend.event.payload.MessageRecalledEvent;
import iuh.fit.edu.backend.mapper.ConversationMapper;
import iuh.fit.edu.backend.mapper.MessageMapper;
import iuh.fit.edu.backend.repository.mysql.ConversationMemberRepository;
import iuh.fit.edu.backend.repository.mysql.ConversationRepository;
import iuh.fit.edu.backend.repository.mysql.UserRepository;
import iuh.fit.edu.backend.repository.nosql.MessageRepository;
import iuh.fit.edu.backend.service.chat.ConversationMemberService;
import iuh.fit.edu.backend.service.chat.MessageCacheService;
import iuh.fit.edu.backend.service.chat.MessageService;
import iuh.fit.edu.backend.service.s3.S3Service;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
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
    private final S3Service s3Service;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public MessageResponse sendMessage(SendMessageRequest sendMessageRequest, Long userId) {
        // Kiểm tra phòng còn tồn tại hay không
        Conversation conversation = this.conversationRepository.findById(sendMessageRequest.getConversationId())
                .orElseThrow(() -> new RuntimeException("Không tim thấy cuộc trò chuyện"));

        // Lấy ra thông tin của người gửi (lần đầu tiên thì lấy từ db, những lần khác còn trong thời gian thì lấy từ redis cache)
        ConversationMemberResponse senderInfo = conversationMemberService
                .getMemberInfo(sendMessageRequest.getConversationId(), userId);
        if (senderInfo == null) {
            throw new RuntimeException("Bạn không phải thành viên của cuộc trò chuyện");
        }

        // Lưu tin nhắn vào mongo
        Message newMessage = new Message();
        newMessage.setContent(sendMessageRequest.getContent());
        newMessage.setMessageType(sendMessageRequest.getType());
        newMessage.setSenderId(senderInfo.getUserId());
        newMessage.setConversationId(sendMessageRequest.getConversationId());
        newMessage.setCreatedAt(Instant.now().truncatedTo(ChronoUnit.MILLIS));
        Message savedMessage = messageRepository.save(newMessage);

        // Cập nhật trạng thái phòng khi người dùng nhắn tin (gồm tin nhắn mới nhất, người nhắn, thời gian)
        String sidebarPreview = getSidebarPreview(savedMessage.getMessageType(), savedMessage.getContent());
        conversation.setLastMessageContent(sidebarPreview);
        conversation.setLastMessageAt(savedMessage.getCreatedAt());
        conversation.setLastSenderId(savedMessage.getSenderId());
        // Snapshot sidebar dùng type tương thích DB cũ; nội dung vẫn thể hiện cuộc gọi rõ ràng.
        MessageType sidebarMessageType = savedMessage.getMessageType() == MessageType.CALL
                ? MessageType.TEXT
                : savedMessage.getMessageType();
        conversation.setLastMessageType(sidebarMessageType);
        Conversation savedConversation = this.conversationRepository.save(conversation);

        // Tăng unreadCount cho các thành viên khác trong DB
        conversationMemberRepository.incrementUnreadCount(savedConversation.getId(), senderInfo.getUserId());

        // Reset isHidden về false cho tất cả members (để conversation hiện lại nếu đã bị ẩn)
        conversationMemberRepository.unhideConversationForAllMembers(savedConversation.getId());

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
        this.eventPublisher
                .publishEvent(new ConversationUpdatedEvent(conversation.getId(), lastMessageResponse, memberIds));

        return messageResponse;
    }

    @Override
    @Transactional
    public MessageResponse sendCallMessage(SendCallMessageRequest sendCallMessageRequest, Long userId) {
        SendMessageRequest request = new SendMessageRequest();
        request.setConversationId(sendCallMessageRequest.getConversationId());
        request.setType(MessageType.CALL);
        request.setContent(buildCallMessageContent(sendCallMessageRequest));
        return sendMessage(request, userId);
    }

    /**
     * Format nội dung hiển thị ở danh sách Chat bên ngoài
     */
    private String getSidebarPreview(MessageType type, String content) {
        if (type == null)
            return content;

        return switch (type) {
            case IMAGE -> "[Hình ảnh]";
            case VIDEO -> "[Video]";
            case FILE -> "[Tệp đính kèm]";
            case AUDIO -> "[Tin nhắn thoại]";
            case CALL -> getCallPreview(content);
            case TEXT -> content; // Text thì in ra bình thường
            default -> "Đã gửi một tin nhắn";
        };
    }

    private String getCallPreview(String content) {
        try {
            Map<String, Object> payload = objectMapper.readValue(content, new TypeReference<>() {
            });
            String callType = String.valueOf(payload.getOrDefault("callType", "audio")).toLowerCase();
            Object durationObj = payload.getOrDefault("durationSeconds", 0);
            Number durationSecondsRaw = durationObj instanceof Number ? (Number) durationObj : 0;
            long durationSeconds = Math.max(0, durationSecondsRaw.longValue());

            String text = "video".equals(callType) ? "Cuộc gọi video" : "Cuộc gọi thoại";
            return text + " - " + formatDuration(durationSeconds);
        } catch (Exception e) {
            return "Cuộc gọi";
        }
    }

    private String formatDuration(long totalSeconds) {
        long minutes = totalSeconds / 60;
        long seconds = totalSeconds % 60;
        return String.format("%02d:%02d", minutes, seconds);
    }

    private String buildCallMessageContent(SendCallMessageRequest sendCallMessageRequest) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("callType",
                Optional.ofNullable(sendCallMessageRequest.getCallType()).orElse("audio").toLowerCase());
        payload.put("status", Optional.ofNullable(sendCallMessageRequest.getStatus()).orElse("ended").toLowerCase());
        payload.put("durationSeconds",
                Math.max(0, Optional.ofNullable(sendCallMessageRequest.getDurationSeconds()).orElse(0L)));

        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Không thể tạo nội dung cuộc gọi", e);
        }
    }

    @Transactional
    @Override
    public MessageRecalledResponse recallMessage(String messageId, Long userId) {
        Message message = this.messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tin nhắn"));
        if (!userId.equals(message.getSenderId())) {
            throw new AccessDeniedException("Không có quyền truy cập");
        }
        Instant messageTime = message.getCreatedAt();

        if (Instant.now().isAfter(messageTime.plus(Duration.ofHours(24)))) {
            throw new IllegalArgumentException("Bạn chỉ có thể thu hồi tin nhắn trong vòng 24 giờ");
        }
        if (message.getMessageType() != MessageType.TEXT) {
            this.s3Service.deleteByKey(UploadModule.CONVERSATION, message.getContent()); // Truyền Key gốc trong DB vào
        }
        message.setContent("");
        message.setRecalled(true);
        this.messageRepository.save(message);

        MessageRecalledResponse messageRecalledResponse = new MessageRecalledResponse();
        messageRecalledResponse.setMessageId(message.getId());
        messageRecalledResponse.setConversationId(message.getConversationId());
        messageRecalledResponse.setCreatedAt(message.getCreatedAt());

        // Cập nhật Redis cache để tránh trả về tin nhắn cũ
        messageCacheService.updateMessage(messageRecalledResponse);

        //Publish Event
        this.eventPublisher.publishEvent(new MessageRecalledEvent(messageRecalledResponse));
        // Xử lý sidebar (danh sách cuộc hội thoại bên ngoài)
        Conversation conversation = conversationRepository.findById(message.getConversationId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy cuộc trò chuyện"));

        // CHỈ THỰC HIỆN NẾU ĐÂY LÀ TIN NHẮN MỚI NHẤT
        if (message.getCreatedAt().toEpochMilli() == conversation.getLastMessageAt().toEpochMilli()) {

            // Cập nhật Database MySQL
            // Backend lưu 1 chuỗi chung chung, không chứa chữ "Bạn"
            conversation.setLastMessageContent("Tin nhắn đã được thu hồi");
            // Quan trọng: Vẫn giữ nguyên LastSenderId là của người vừa thu hồi
            conversationRepository.save(conversation);

            // Tạo Data để bắn Socket cho Sidebar
            LastMessageResponse sidebarResponse = conversationMapper.toLastMessageResponse(conversation);

            // Lấy tên người gửi (có thể lấy từ Service hoặc Cache nếu cần thiết)
            // Nếu Frontend của bạn không hiện tên khi thu hồi thì có thể bỏ qua dòng setLastSenderName
            ConversationMemberResponse senderInfo = conversationMemberService.getMemberInfo(conversation.getId(),
                    userId);
            sidebarResponse.setLastSenderName(senderInfo.getNickname());
            sidebarResponse.setRead(true);

            // Bắn Socket Event Cập nhật Sidebar cho TẤT CẢ thành viên
            Set<Long> memberIds = this.conversationMemberService.getAllMemberId(conversation.getId());
            this.eventPublisher
                    .publishEvent(new ConversationUpdatedEvent(conversation.getId(), sidebarResponse, memberIds));
        }
        return messageRecalledResponse;
    }

    @Transactional
    @Override
    public void deleteMessageForMe(String messageId, Long userId){
        Message message = this.messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tin nhắn"));

        if (message.getDeletedFor() == null) {
            message.setDeletedFor(new HashSet<>());
        }
        message.getDeletedFor().add(userId);
        messageRepository.save(message);
        this.messageCacheService.addDeletedUserToMessage(messageId, message.getConversationId(), userId);
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
        ConversationMemberResponse member = conversationMemberService.getMemberInfo(conversationId, userId);
        // Check member
        if (member == null) {
            throw new RuntimeException("Bạn không phải thành viên của cuộc trò chuyện");
        }
        Instant clearedAt = member.getClearedAt();
        // =========================================================================
        // Nếu FE yêu cầu load trang cũ hơn mốc user đã xóa -> Chắc chắn rỗng.
        // Trả về ngay lập tức, KHÔNG chạm vào Redis, KHÔNG chạm vào Mongo!
        // =========================================================================
        log.info("Before {}", before== null ? "Null" : before);
        log.info("clearedAt {}", clearedAt== null ? "Null" : clearedAt);
        if (clearedAt != null && before != null && before.toEpochMilli() <= clearedAt.toEpochMilli()) {
            log.info("Test");
            return CursorResponse.<List<MessageResponse>>builder()
                    .data(Collections.emptyList())
                    .nextCursor(null)
                    .hasNext(false) // Dừng FE lại ngay
                    .build();
        }
        List<MessageResponse> finalResponseList;

        // Cần check để xem được lấy từ db hay redis
        // Vì cách check hasNext ở db và redis sẽ khác nhau
        boolean isFromCache = false;
        log.info("Fetch messages before Instant: {}", before);

        // Ưu tiên lấy từ redis trước (bao gồm cả việc load trang đầu hoặc khi scroll)
        List<MessageResponse> cachedMessages = this.messageCacheService.getListMessage(conversationId, before, limit);
        if (!cachedMessages.isEmpty()) {
            log.info("List message from cache {}", cachedMessages);
            finalResponseList = cachedMessages;
            isFromCache = true;
        } else {
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
        if (isFromCache) {
            // Nếu redis trả về >= 20 tin -> giả định là vẫn còn tin nhắn cũ
            // Nếu redis trả về < 20 tin (VD: 15) -> chắc chắn là hết tin nhắn
            hasNext = finalResponseList.size() >= limit;
        } else {
            // Nếu db trả về > 20 (VD: 21) -> chắc chắn vẫn còn tin nhắn cũ
            hasNext = finalResponseList.size() > limit;
            if (hasNext) {
                finalResponseList = finalResponseList.subList(0, limit);
            }
        }
        // Cursor là createdAt của tin nhắn CŨ NHẤT trong list (tin cuối cùng của list DESC)
        Instant nextCursor = null;
        if (!finalResponseList.isEmpty()) {
            nextCursor = finalResponseList.getLast().getCreatedAt();
        }
        if (clearedAt != null && nextCursor != null && nextCursor.toEpochMilli() <= clearedAt.toEpochMilli()) {
            // Mặc dù hệ thống chung vẫn còn tin nhắn cũ, nhưng đối với User này thì coi như hết!
            hasNext = false;
            nextCursor = null;
        }

        List<MessageResponse> filteredList = finalResponseList.stream()
                .filter(msg -> clearedAt == null || msg.getCreatedAt().toEpochMilli() > clearedAt.toEpochMilli())
                .filter(msg -> msg.getDeletedFor() == null || !msg.getDeletedFor().contains(userId))
                .toList();

        // Đảo ngược danh sách để Frontend hiển thị từ trên xuống (Cũ -> Mới)
        List<MessageResponse> ascResponseList = new ArrayList<>(filteredList);
        Collections.reverse(ascResponseList);

        ascResponseList.forEach(msg -> msg.setDeletedFor(null));


        log.info("Final List message returned to user {}", ascResponseList);
        log.info("Final List message returned to user {}", ascResponseList.size());

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
                    conversationId, before, pageable);
        }
    }

    /**
     * Map từ Message Entity sang MessageResponse có đầy đủ thông tin Sender
     * Logic Bulk Query tối ưu N+1
     */
    private List<MessageResponse> enrichMessageResponses(Long conversationId, List<Message> messages) {
        if (messages.isEmpty())
            return Collections.emptyList();

        // Lấy ra toàn bộ id của thành viên trong nhóm và không trùng
        Set<Long> senderIds = messages.stream()
                .map(Message::getSenderId)
                .collect(Collectors.toSet());

        // Lấy thành viên hiện tại
        Map<Long, ConversationMemberResponse> currentMembers = conversationMemberService.getMembersMap(conversationId,
                senderIds);

        // Lọc ra những thành viên không còn trong nhóm nhưng vẫn còn tin nhắn
        Map<Long, User> leftUsers = senderIds.stream()
                .filter(id -> !currentMembers.containsKey(id))
                .collect(Collectors.collectingAndThen(
                        Collectors.toSet(),
                        ids -> ids.isEmpty()
                                ? Map.of()
                                : userRepository.findAllById(ids).stream()
                                        .collect(Collectors.toMap(User::getId, u -> u))));

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
