/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.service.chat.impl;

import iuh.fit.edu.backend.domain.entity.nosql.Message;
import iuh.fit.edu.backend.dto.response.CursorResponse;
import iuh.fit.edu.backend.dto.response.conversation.ConversationMemberResponse;
import iuh.fit.edu.backend.dto.response.message.MessageResponse;
import iuh.fit.edu.backend.mapper.MessageMapper;
import iuh.fit.edu.backend.repository.nosql.MessageRepository;
import iuh.fit.edu.backend.service.chat.ConversationMemberService;
import iuh.fit.edu.backend.service.chat.MessageCacheService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

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
@RequiredArgsConstructor
public class MessageQueryService {
    private final MessageRepository messageRepository;
    private final ConversationMemberService conversationMemberService;
    private final MessageCacheService messageCacheService;
    private final MessageMapper messageMapper;

    /**
     * Lấy ra tin nhắn trong cuộc hội thoại
     * Mặc định limit = 20
     */
    public CursorResponse<List<MessageResponse>> getMessagesByConversation(
            Long conversationId,
            Long userId,
            Instant before,
            int limit
    ) {
        ConversationMemberResponse member = conversationMemberService.getMemberInfo(conversationId, userId);
        Instant clearedAt = member.getClearedAt();

        // Nếu FE yêu cầu load trang cũ hơn mốc user đã xóa -> Chắc chắn rỗng.
        // Trả về ngay lập tức, KHÔNG chạm vào Redis, KHÔNG chạm vào Mongo!
        if (clearedAt != null && before != null && before.toEpochMilli() <= clearedAt.toEpochMilli()) {
            return CursorResponse.<List<MessageResponse>>builder()
                    .data(Collections.emptyList())
                    .nextCursor(null)
                    .hasMoreOlder(false) // Không còn tin cũ
                    .hasMoreNewer(false)
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

            finalResponseList = mongoMessages.stream()
                    .map(messageMapper::toMessageResponse)
                    .collect(Collectors.toList());

            // Chỉ cache phần dữ liệu chính (bỏ phần tử dư dùng check hasNext)
            List<MessageResponse> toCache = finalResponseList.size() > limit
                    ? finalResponseList.subList(0, limit)
                    : finalResponseList;

            // Tự động quyết định ghi đè hay nối chuỗi
            this.messageCacheService.cacheListMessage(conversationId, toCache, before);
        }

        // Nếu redis trả về >= 20 tin -> giả định là vẫn còn tin nhắn cũ
        // Nếu redis trả về < 20 tin (VD: 15) -> chắc chắn là hết tin nhắn
        // Nếu db trả về > 20 (VD: 21) -> chắc chắn vẫn còn tin nhắn cũ
        boolean hasMoreOlder = isFromCache ? finalResponseList.size() >= limit : finalResponseList.size() > limit;
        if (!isFromCache && hasMoreOlder) {
            finalResponseList = finalResponseList.subList(0, limit);
        }

        // Cursor là createdAt của tin nhắn CŨ NHẤT trong list (tin cuối cùng của list DESC)
        Instant nextCursor = finalResponseList.isEmpty() ? null : finalResponseList.getLast().getCreatedAt();
        if (clearedAt != null && nextCursor != null && nextCursor.toEpochMilli() <= clearedAt.toEpochMilli()) {
            // Mặc dù hệ thống chung vẫn còn tin nhắn cũ, nhưng đối với User này thì coi như hết!
            hasMoreOlder = false;
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


        log.info(
                "Final List message returned to user. Size: {}, Data: {}",
                ascResponseList.size(),
                ascResponseList
        );

        return CursorResponse.<List<MessageResponse>>builder()
                .data(ascResponseList)
                .nextCursor(nextCursor)
                .hasMoreOlder(hasMoreOlder)
                .hasMoreNewer(false)
                .referenceUsers(new HashMap<>())
                .build();
    }

    public CursorResponse<List<MessageResponse>> getNewerMessages(
            Long conversationId, Long userId, Instant after, int limit) {

        // Kiểm tra quyền
        conversationMemberService.getMemberInfo(conversationId, userId);

        // Truy vấn MongoDB lấy dữ liệu mới hơn (Lấy dư 1 để check hasNext)
        List<Message> mongoMessages = messageRepository
                .findTop21ByConversationIdAndCreatedAtAfterOrderByCreatedAtAsc(conversationId, after);

        // Phân trang (Check còn dữ liệu mới hơn nữa không)
        boolean hasMoreNewer = mongoMessages.size() > limit;
        if (hasMoreNewer) {
            mongoMessages = mongoMessages.subList(0, limit);
        }

        // Map sang DTO
        List<MessageResponse> responseList = mongoMessages.stream()
                .map(messageMapper::toMessageResponse)
                .collect(Collectors.toList());

        // Xác định nextCursor cho lần cuộn xuống tiếp theo (Là phần tử cuối mảng)
        Instant nextCursor = responseList.isEmpty() ? null : responseList.getLast().getCreatedAt();

        responseList.forEach(msg -> msg.setDeletedFor(null));


        return CursorResponse.<List<MessageResponse>>builder()
                .data(responseList)
                .nextCursor(nextCursor)
                .hasMoreOlder(true)        // Đang lơ lửng ở quá khứ tiến lên, nên chắc chắn phía trên còn tin cũ
                .hasMoreNewer(hasMoreNewer) // Còn tin mới hơn không?
                .referenceUsers(new HashMap<>())
                .build();
    }
    /**
     * Hàm xử lý việc nhảy tin nhắn (khi người dùng click vào tin nhắn phản hồi và tin nhắn ghim)
     */
    public CursorResponse<List<MessageResponse>> jumpToMessage(Long conversationId, String targetMessageId, Long userId) {
        log.info("Jump to message");
        ConversationMemberResponse member = conversationMemberService.getMemberInfo(conversationId, userId);
        Message targetMsg = messageRepository.findById(targetMessageId)
                .orElseThrow(() -> new RuntimeException("Tin nhắn không tồn tại"));
        if (targetMsg.getDeletedFor() != null &&
                targetMsg.getDeletedFor().contains(userId)) {
            throw new RuntimeException("Không thể tìm thấy tin nhắn");
        }
        List<MessageResponse> resultList;
        boolean hasMoreOlder = false;
        boolean hasMoreNewer = false;
        // Kiểm tra xem có nằm trong redis không (nếu có thì sẽ lấy ra luôn)
        List<MessageResponse> cacheMessages = messageCacheService.getJumpMessagesFromCache(conversationId, targetMessageId);

        if (!cacheMessages.isEmpty()) {
            log.info("Jump mode: List message from redis {}", targetMessageId);
            resultList = new ArrayList<>(cacheMessages);
            Collections.reverse(resultList);
            hasMoreOlder = true;  // Vẫn còn lịch sử trong DB để cuộn lên
            hasMoreNewer = false;
        } else {
            // Chuyển qua lấy từ db
            // Tin cũ sẽ lấy ra 11 dữ liệu để kiểm tra xem còn dữ liệu cũ hơn nữa không
            List<Message> older = messageRepository.findTop11ByConversationIdAndCreatedAtBeforeOrderByCreatedAtDesc(
                    conversationId, targetMsg.getCreatedAt());
            List<Message> newer = messageRepository.findTop11ByConversationIdAndCreatedAtAfterOrderByCreatedAtAsc(
                    conversationId, targetMsg.getCreatedAt());

            // Kiểm tra xem còn dư dữ liệu không
            hasMoreOlder = older.size() > 10;
            if (hasMoreOlder) {
                older = older.subList(0, 10);
            }

            hasMoreNewer = newer.size() > 10;
            if (hasMoreNewer) {
                newer = newer.subList(0, 10);
            }

            resultList = new ArrayList<>();

            // Nạp tin cũ (đảo ngược để đúng chiều thời gian)
            List<MessageResponse> olderDtos = older.stream().map(messageMapper::toMessageResponse).toList();
            for (int i = olderDtos.size() - 1; i >= 0; i--)
                resultList.add(olderDtos.get(i));

            // Nạp tin mới
            resultList.add(messageMapper.toMessageResponse(targetMsg));

            // Nạp tin gốc
            resultList.addAll(newer.stream().map(messageMapper::toMessageResponse).toList());
        }


        // Xóa cờ deletedFor trước khi trả về
        resultList.forEach(msg -> msg.setDeletedFor(null));

        return CursorResponse.<List<MessageResponse>>builder()
                .data(resultList)
                .hasMoreOlder(hasMoreOlder)
                .hasMoreNewer(hasMoreNewer)
                .referenceUsers(new HashMap<>()) // Đắp từ điển vào Response
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
}
