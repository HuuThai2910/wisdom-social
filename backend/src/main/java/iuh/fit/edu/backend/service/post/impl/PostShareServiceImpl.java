package iuh.fit.edu.backend.service.post.impl;

import iuh.fit.edu.backend.constant.PrivacyType;
import iuh.fit.edu.backend.constant.StatusType;
import iuh.fit.edu.backend.domain.entity.nosql.PostShare;
import iuh.fit.edu.backend.repository.nosql.PostShareRepository;
import iuh.fit.edu.backend.service.post.PostShareService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PostShareServiceImpl implements PostShareService {

    private final PostShareRepository postShareRepository;

    @Override
    public PostShare sharePost(String userId, String postId, String content) {
        log.info("User {} sharing post {}", userId, postId);
        
        PostShare share = PostShare.builder()
                .originalPostId(postId)
                .sharedByUserId(userId)
                .content(content)
                .privacy(PrivacyType.PUBLIC)
                .status(StatusType.ACTIVE)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
                
        return postShareRepository.save(share);
    }

    @Override
    public List<PostShare> getSharedPostsByUserId(String userId) {
        return postShareRepository.findBySharedByUserIdOrderByCreatedAtDesc(userId);
    }

    @Override
    public void deleteShare(String shareId, String userId) {
        postShareRepository.findById(shareId).ifPresent(share -> {
            if (share.getSharedByUserId().equals(userId)) {
                postShareRepository.delete(share);
            }
        });
    }
}
