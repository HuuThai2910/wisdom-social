package iuh.fit.edu.backend.service.impl;

import iuh.fit.edu.backend.constant.MemberStatus;
import iuh.fit.edu.backend.constant.PageRole;
import iuh.fit.edu.backend.domain.entity.mysql.BlockedUser;
import iuh.fit.edu.backend.domain.entity.mysql.Page;
import iuh.fit.edu.backend.domain.entity.mysql.PageMember;
import iuh.fit.edu.backend.domain.entity.mysql.User;
import iuh.fit.edu.backend.dto.request.page.UserRequestMemberPage;
import iuh.fit.edu.backend.repository.mysql.BlockUserRepository;
import iuh.fit.edu.backend.repository.mysql.PageMemberRepository;
import iuh.fit.edu.backend.service.impl.page.PageMemberService;
import iuh.fit.edu.backend.service.impl.page.PageService;
import iuh.fit.edu.backend.service.impl.user.BlockUserService;
import iuh.fit.edu.backend.service.impl.user.UserService;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;

@Service
public class PageMemberServiceImpl implements PageMemberService {
    PageService pageService;
    PageMemberRepository pageMemberRepository;
    UserService userService;
    BlockUserService blockUserService;
    BlockUserRepository blockUserRepository;

    public PageMemberServiceImpl(BlockUserService blockUserService, PageMemberRepository pageMemberRepository,
                                  UserService userService, PageService pageService, BlockUserRepository blockUserRepository) {
        this.blockUserService = blockUserService;
        this.pageMemberRepository = pageMemberRepository;
        this.blockUserRepository = blockUserRepository;
        this.pageService = pageService;
        this.userService = userService;
    }

    @Override
    public boolean addMemberPage(UserRequestMemberPage userRequestMemberPage) {

        Page page=pageService.findPageById(userRequestMemberPage.getPageId());
        User user=userService.findUserById(userRequestMemberPage.getUserId());

        if (page!=null && user!=null){
            PageMember pageMember=new PageMember();
            pageMember.setPage(page);
            pageMember.setUser(user);
            pageMember.setStatus(MemberStatus.ACTIVE);
            pageMember.setJoinedAt(OffsetDateTime.now());
            pageMember.setRole(userRequestMemberPage.getPageRole());
            pageMemberRepository.save(pageMember);
            return true;
        }
        return false;
    }

    @Override
    public boolean deleteMemberPage(long pageId, long userId) {
        Page page=pageService.findPageById(pageId);
        PageMember pageMember=page.getPageMembers().stream()
                .filter(x->x.getUser().getId().equals(userId)).findFirst().orElse(null);
        if (pageMember!=null){
            pageMemberRepository.deleteById(pageMember.getId());
            return true;
        }
        return false;
    }

    @Override
    public boolean blockMemberPage(long pageId, long userId) {
        User user=userService.findUserById(userId);
        Page page=pageService.findPageById(pageId);
        if(page!=null && user!=null){

            BlockedUser blockedUser=new BlockedUser();
            blockedUser.setBlockerPage(page);
            blockedUser.setBlocked(user);
            blockUserService.blockUser(blockedUser);
            return true;

        }

        return false;
    }

    @Override
    public boolean cancelBlockMemberPage(long pageId, long userId) {
        BlockedUser blockedUser=blockUserRepository.findBlockedUserByBlockerPage_IdAndBlocked_Id(pageId,userId);
        if(blockedUser!=null){
            blockUserService.cancelBlockUser(blockedUser);
            return true;
        }

        return false;
    }

    @Override
    public void authorizeMemberPage(long userId, long pageId,PageRole role) {
        PageMember pageMember=pageMemberRepository.findPageMemberByPage_IdAndUser_Id(pageId,userId);
        if (pageMember!=null){
            pageMember.setRole(role);
            pageMemberRepository.save(pageMember);
        }
    }

    @Override
    public List<PageMember> getMembersByPageId(long pageId) {
        return pageMemberRepository.findByPage_Id(pageId);
    }
}
