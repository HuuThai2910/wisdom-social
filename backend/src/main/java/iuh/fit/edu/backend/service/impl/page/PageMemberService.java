package iuh.fit.edu.backend.service.impl.page;

import iuh.fit.edu.backend.constant.PageRole;
import iuh.fit.edu.backend.domain.entity.mysql.PageMember;
import iuh.fit.edu.backend.dto.request.page.UserRequestMemberPage;

import java.util.List;

public interface PageMemberService {
    boolean addMemberPage(UserRequestMemberPage userRequestMemberPage);
    boolean deleteMemberPage(long pageId, long userId);
    boolean blockMemberPage(long pageId, long userId);
    boolean cancelBlockMemberPage(long pageId, long userId);
    void authorizeMemberPage(long userId, long pageId,PageRole role);
    List<PageMember> getMembersByPageId(long pageId);
}
