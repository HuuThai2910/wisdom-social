package iuh.fit.edu.backend.service.post;

import iuh.fit.edu.backend.domain.entity.nosql.PostShare;
import java.util.List;

public interface PostShareService {
    PostShare sharePost(String userId, String postId, String content);
    List<PostShare> getSharedPostsByUserId(String userId);
    void deleteShare(String shareId, String userId);
}
