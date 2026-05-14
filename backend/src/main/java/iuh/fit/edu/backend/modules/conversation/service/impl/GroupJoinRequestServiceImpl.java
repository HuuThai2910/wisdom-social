package iuh.fit.edu.backend.modules.conversation.service.impl;

import iuh.fit.edu.backend.common.exception.ConversationAccessDeniedException;
import iuh.fit.edu.backend.common.util.heplper.ChatSnapshotHelper;
import iuh.fit.edu.backend.modules.conversation.constant.ConversationMemberStatus;
import iuh.fit.edu.backend.modules.conversation.constant.JoinRequestStatus;
import iuh.fit.edu.backend.modules.conversation.constant.MemberRole;
import iuh.fit.edu.backend.modules.conversation.dto.response.JoinRequestResponse;
import iuh.fit.edu.backend.modules.conversation.entity.ConversationMember;
import iuh.fit.edu.backend.modules.conversation.entity.GroupJoinRequest;
import iuh.fit.edu.backend.modules.conversation.event.payload.NewJoinRequestEvent;
import iuh.fit.edu.backend.modules.conversation.repository.ConversationMemberRepository;
import iuh.fit.edu.backend.modules.conversation.repository.ConversationRepository;
import iuh.fit.edu.backend.modules.conversation.repository.GroupJoinRequestRepository;
import iuh.fit.edu.backend.modules.conversation.service.GroupJoinRequestService;
import iuh.fit.edu.backend.modules.user.service.impl.InternalUserServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GroupJoinRequestServiceImpl implements GroupJoinRequestService {

    private final GroupJoinRequestRepository requestRepository;
    private final ConversationRepository conversationRepository;
    private final ConversationMemberRepository memberRepository;
    private final InternalUserServiceImpl internalUserService;
    private final ChatSnapshotHelper chatSnapshotHelper;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    @Override
    public void createRequest(Long conversationId, Long userId, Long inviterId) {
        // Kiểm tra xem đã là thành viên chưa hoặc đã có yêu cầu PENDING chưa
        if (memberRepository.findByConversation_IdAndUser_IdAndStatus(conversationId, userId, ConversationMemberStatus.ACTIVE).isPresent()) return;
        if (requestRepository.existsByConversationIdAndUserIdAndStatus(conversationId, userId, JoinRequestStatus.PENDING)) {
            throw new RuntimeException("Yêu cầu tham gia của bạn đang chờ được xử lý.");
        }

        // Lưu yêu cầu
        GroupJoinRequest request = new GroupJoinRequest();
        request.setConversation(conversationRepository.getReferenceById(conversationId));
        request.setUser(internalUserService.getReferenceById(userId));
        if (inviterId != null) request.setInviter(internalUserService.getReferenceById(inviterId));
        request.setCreatedAt(Instant.now());
        request.setStatus(JoinRequestStatus.PENDING);
        GroupJoinRequest savedRequest = requestRepository.save(request);

        Set<Long> adminIds = memberRepository.findAdminIdsByConversationId(conversationId);
        if(!adminIds.isEmpty()){
            JoinRequestResponse response = mapJoinRequestResponse(savedRequest);
            eventPublisher.publishEvent(new NewJoinRequestEvent(conversationId, response, adminIds));
        }

    }

    @Transactional
    @Override
    public void processRequest(Long requestId, Long adminId, boolean isApproved) {
        GroupJoinRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Yêu cầu không tồn tại"));

        ConversationMember admin = memberRepository.findByConversation_IdAndUser_IdAndStatus(request.getConversation().getId(), adminId, ConversationMemberStatus.ACTIVE)
                .orElseThrow(() -> new ConversationAccessDeniedException("Bạn không ở trong nhóm này"));
        if (admin.getRole() != MemberRole.OWNER && admin.getRole() != MemberRole.DEPUTY) {
            throw new ConversationAccessDeniedException("Chỉ Quản trị viên mới được duyệt");
        }

        request.setProcessedAt(Instant.now());
        request.setProcessorId(adminId);
        request.setStatus(isApproved ? JoinRequestStatus.APPROVED : JoinRequestStatus.REJECTED);
        requestRepository.save(request);
    }

    @Override
    public List<JoinRequestResponse> getPendingRequests(Long conversationId, Long adminId) {
        ConversationMember admin = memberRepository.findByConversation_IdAndUser_IdAndStatus(conversationId, adminId, ConversationMemberStatus.ACTIVE)
                .orElseThrow(() -> new ConversationAccessDeniedException("Bạn không ở trong nhóm này"));
        if (admin.getRole() != MemberRole.OWNER && admin.getRole() != MemberRole.DEPUTY) {
            throw new ConversationAccessDeniedException("Chỉ Quản trị viên mới xem được danh sách duyệt");
        }

        return requestRepository.findByConversationIdAndStatusOrderByCreatedAtDesc(conversationId, JoinRequestStatus.PENDING)
                .stream().map(this::mapJoinRequestResponse).collect(Collectors.toList());
    }

    @Override
    public GroupJoinRequest getRequestById(Long requestId) {
        return requestRepository.findById(requestId).orElseThrow(() -> new RuntimeException("Yêu cầu không tồn tại"));
    }

    @Override
    public boolean hasPendingRequest(Long conversationId, Long userId) {
        return requestRepository.existsByConversationIdAndUserIdAndStatus(
                conversationId, userId, JoinRequestStatus.PENDING);
    }

    private JoinRequestResponse mapJoinRequestResponse(GroupJoinRequest req){
        return JoinRequestResponse.builder()
                .id(req.getId())
                .conversationId(req.getConversation().getId())
                .userId(req.getUser().getId())
                .userName(chatSnapshotHelper.resolveUserDisplayName(req.getUser().getId()))
                .userAvatar(req.getUser().getAvatarUrl())
                .inviterId(req.getInviter() != null ? req.getInviter().getId() : null)
                .inviterName(req.getInviter() != null ? chatSnapshotHelper.resolveUserDisplayName(req.getInviter().getId()) : null)
                .status(req.getStatus())
                .createdAt(req.getCreatedAt())
                .build();
    }
}