package iuh.fit.edu.backend.service.page;

import iuh.fit.edu.backend.domain.entity.nosql.Post;
import org.bson.types.ObjectId;

public interface PagePostService {
    boolean approvePostPage(long userId,long pageId, ObjectId postId);
    boolean cancelApprovePostPage(long userId,long pageId, ObjectId postId);
    boolean addPostPage(long userId, long pageId, Post post);
    boolean removePostPage(long userId, long pageId, ObjectId postId);
}
