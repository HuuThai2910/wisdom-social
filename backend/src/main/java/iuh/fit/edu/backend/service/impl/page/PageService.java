package iuh.fit.edu.backend.service.impl.page;

import iuh.fit.edu.backend.constant.PageRole;
import iuh.fit.edu.backend.domain.entity.mysql.Page;
import iuh.fit.edu.backend.domain.entity.mysql.User;
import iuh.fit.edu.backend.domain.entity.nosql.Post;
import iuh.fit.edu.backend.dto.request.page.UserRequestCreatePage;
import iuh.fit.edu.backend.dto.request.page.UserRequestUpdatePage;
import org.bson.types.ObjectId;

import java.util.List;
import java.util.Map;

public interface PageService {
    boolean createPage(long userId, UserRequestCreatePage createPage);
    boolean deletePage(long id);
    boolean updatePage(long pageId, UserRequestUpdatePage updatePage);
    Page findPageById(long id);
    List<Page> findAllPages();
    List<Page> findPagesByUserId(long userId);
    boolean approvePostPage(long userId,long pageId, ObjectId postId);
    boolean addPostPage(long userId, long pageId, Post post);
    boolean removePostPage(long userId, long pageId, ObjectId postId);
    boolean followPageUser(long userId, long pageId);
    boolean likePageUser(long userId, long pageId);
    boolean cancelFollowPageUser(long userId, long pageId);
    boolean cancelLikePageUser(long userId, long pageId);
    Map<String, Object> getPageInteractionStatus(long userId, long pageId);
}
