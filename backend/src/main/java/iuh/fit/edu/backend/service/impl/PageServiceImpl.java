package iuh.fit.edu.backend.service.impl;

import iuh.fit.edu.backend.domain.entity.mysql.Page;
import iuh.fit.edu.backend.domain.entity.mysql.PageFollow;
import iuh.fit.edu.backend.domain.entity.mysql.PageLike;
import iuh.fit.edu.backend.domain.entity.mysql.User;
import iuh.fit.edu.backend.domain.entity.nosql.Post;
import iuh.fit.edu.backend.dto.request.page.UserRequestCreatePage;
import iuh.fit.edu.backend.dto.request.page.UserRequestUpdatePage;
import iuh.fit.edu.backend.mapper.PageMapper;
import iuh.fit.edu.backend.repository.mysql.PageFollowRepository;
import iuh.fit.edu.backend.repository.mysql.PageLikeRepository;
import iuh.fit.edu.backend.repository.mysql.PageRepository;
import iuh.fit.edu.backend.service.impl.page.PageService;
import iuh.fit.edu.backend.service.impl.user.UserService;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;

@Service
public class PageServiceImpl implements PageService {
    PageRepository pageRepository;
    PageFollowRepository pageFollowRepository;
    PageLikeRepository pageLikeRepository;
    PageMapper pageMapper;
    UserService userService;

    public PageServiceImpl(PageFollowRepository pageFollowRepositoryl,
                           PageLikeRepository pageLikeRepository, PageMapper pageMapper,
                           PageRepository pageRepository,
                           UserService userService) {
        this.pageFollowRepository = pageFollowRepositoryl;
        this.pageLikeRepository = pageLikeRepository;
        this.pageMapper = pageMapper;
        this.pageRepository = pageRepository;
        this.userService = userService;
    }

    @Override
    public boolean createPage(long userId, UserRequestCreatePage createPage) {
        Page page=pageMapper.CreateRequestPagetoPage(createPage);
        User user=userService.findUserById(userId);
        if(page!=null){
            page.setCreatedBy(user);
            page.setCreatedAt(OffsetDateTime.now());
            pageRepository.save(page);
            return true;
        }
        return false;
    }

    @Override
    public boolean deletePage(long id) {
        if(id>0){
            pageRepository.deleteById(id);
            return true;
        }
        return false;
    }

    @Override
    public boolean updatePage(long id,UserRequestUpdatePage updatePage) {
        Page page=findPageById(id);
        if(page!=null){
            page=Page.builder()
                    .id(page.getId())
                    .username(updatePage.getUsername())
                    .name(updatePage.getName())
                    .phone(updatePage.getPhone())
                    .isVerified(updatePage.getIsVerified())
                    .description(updatePage.getDescription())
                    .updatedAt(OffsetDateTime.now())
                    .address(updatePage.getAddress())
                    .email(updatePage.getEmail())
                    .category(updatePage.getCategory())
                    .avatarUrl(updatePage.getAvatarUrl())
                    .build();
            pageRepository.save(page);
            return true;
        }

        return false;
    }

    @Override
    public Page findPageById(long id) {
        return pageRepository.findById(id).orElse(null);
    }

    @Override
    public boolean approvePostPage(long userId,long pageId, ObjectId postId) {
        Page page=findPageById(pageId);
        User user=userService.findUserById(userId);
        if (user!=null && page!=null ){

            return true;
        }
        return false;
    }

    @Override
    public boolean addPostPage(long userId, long pageId, Post post) {
        return false;
    }

    @Override
    public boolean removePostPage(long userId,long pageId, ObjectId postId) {
        return false;
    }

    @Override
    public boolean followPageUser(long userId, long pageId) {
        Page page=findPageById(pageId);
        User user=userService.findUserById(userId);
        if (user!=null && page!=null){
            PageFollow pageFollow=new PageFollow();
            pageFollow.setUser(user);
            pageFollow.setPage(page);
            pageFollow.setFollowedAt(OffsetDateTime.now());
            pageFollowRepository.save(pageFollow);
            return true;
        }
        return false;
    }

    @Override
    public boolean likePageUser(long userId, long pageId) {
        Page page=findPageById(pageId);
        User user=userService.findUserById(userId);
        if (user!=null && page!=null){
            PageLike pageLike=new PageLike();
            pageLike.setUser(user);
            pageLike.setPage(page);
            pageLike.setLikedAt(OffsetDateTime.now());
            pageLikeRepository.save(pageLike);
            return true;
        }
        return false;
    }

    @Override
    public boolean cancelFollowPageUser(long userId, long pageId) {
        PageFollow pageFollow=pageFollowRepository.findPageFollowByUser_IdAndPage_Id(userId,pageId);
        if (pageFollow!=null){
            pageFollowRepository.deleteById(pageFollow.getId());
            return true;
        }
        return false;

    }

    @Override
    public boolean cancelLikePageUser(long userId, long pageId) {
        PageLike pageLike=pageLikeRepository.findPageLikeByUser_IdAndPage_Id(userId,pageId);
        if (pageLike!=null){
            pageLikeRepository.deleteById(pageLike.getId());
            return true;
        }
        return false;
    }
}
