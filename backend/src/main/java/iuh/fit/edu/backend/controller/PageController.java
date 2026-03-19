package iuh.fit.edu.backend.controller;

import iuh.fit.edu.backend.domain.entity.mysql.Page;
import iuh.fit.edu.backend.domain.entity.mysql.User;
import iuh.fit.edu.backend.dto.request.page.UserRequestCreatePage;
import iuh.fit.edu.backend.dto.request.page.UserRequestPage;
import iuh.fit.edu.backend.dto.request.page.UserRequestUpdatePage;
import iuh.fit.edu.backend.service.page.PageService;
import iuh.fit.edu.backend.service.user.UserService;
import iuh.fit.edu.backend.service.s3.S3Service;
import iuh.fit.edu.backend.util.anotation.ApiMessage;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/page")
public class PageController {
    PageService pageService;
    UserService userService;
    S3Service s3Service;

    public PageController(PageService pageService, UserService userService, S3Service s3Service) {
        this.pageService = pageService;
        this.userService = userService;
        this.s3Service = s3Service;
    }

    @PostMapping("/create")
    @ApiMessage("Create page successfully")
    public ResponseEntity<String> createPage(@RequestBody UserRequestCreatePage createPage){
        User currentUser = userService.getCurrentUser();
        if (currentUser == null)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated");
        Page page= pageService.createPage(currentUser.getId(),createPage);
        if (page!=null){
            UserRequestUpdatePage userRequestUpdatePage=new UserRequestUpdatePage();
            if (createPage.getAvatarUrl()!=null){
                String key=s3Service.moveUploadUrl("pages", page.getId(), createPage.getAvatarUrl());
                userRequestUpdatePage.setAvatarUrl(key);
            }
            if (createPage.getCoverUrl()!=null){
                String key=s3Service.moveUploadUrl("pages", page.getId(), createPage.getCoverUrl());
                userRequestUpdatePage.setCoverUrl(key);
            }
            if (userRequestUpdatePage.getAvatarUrl()!=null || userRequestUpdatePage.getCoverUrl()!=null){
                pageService.updatePage(page.getId(), userRequestUpdatePage);
            }
            return ResponseEntity.ok("Create page successfully");
        }

        return ResponseEntity.badRequest().body("Create page failed");
    }

    @PostMapping("/update/{pageId}")
    @ApiMessage("Update page successfully")
    public ResponseEntity<String> updatePage(@RequestBody UserRequestUpdatePage updatePage,@PathVariable long pageId){
        boolean success= pageService.updatePage(pageId,updatePage);
        if (success)
            return ResponseEntity.ok("Update page successfully");
        return ResponseEntity.badRequest().body("Update page failed");
    }

    @DeleteMapping("/delete/{id}")
    @ApiMessage("Delete page successfully")
    public ResponseEntity<String> deletePage(@PathVariable long id){
        boolean success= pageService.deletePage(id);
        if (success)
            return ResponseEntity.ok("Delete page successfully");
        return ResponseEntity.badRequest().body("Delete page failed");
    }

    @GetMapping("/{id}")
    @ApiMessage("Find page successfully")
    public ResponseEntity<Page> findPageById(@PathVariable long id){
        Page page=pageService.findPageById(id);
        if (page!=null)
            return ResponseEntity.ok(page);
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(null);
    }

    @GetMapping("/all")
    @ApiMessage("Get all pages successfully")
    public ResponseEntity<List<Page>> getAllPages(){
        List<Page> pages = pageService.findAllPages();
        return ResponseEntity.ok(pages);
    }

    @GetMapping("/my-pages")
    @ApiMessage("Get my pages successfully")
    public ResponseEntity<List<Page>> getMyPages(){
        User currentUser = userService.getCurrentUser();
        if (currentUser == null)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(null);
        List<Page> pages = pageService.findPagesByUserId(currentUser.getId());
        return ResponseEntity.ok(pages);
    }

    @PostMapping("/like")
    @ApiMessage("Like page successfully")
    public ResponseEntity<String> likePage(@RequestBody UserRequestPage requestPage) {
        boolean success= pageService.likePageUser(requestPage.getUserId(),requestPage.getPageId());
        if (success)
            return ResponseEntity.ok("Like page successfully");
        return ResponseEntity.badRequest().body("Like page failed");
    }

    @PostMapping("/follow")
    @ApiMessage("Follow page successfully")
    public ResponseEntity<String> followPage(@RequestBody UserRequestPage requestPage) {
        boolean success= pageService.followPageUser(requestPage.getUserId(),requestPage.getPageId());
        if (success)
            return ResponseEntity.ok("Follow page successfully");
        return ResponseEntity.badRequest().body("Follow page failed");
    }

    @PostMapping("/cancel-like")
    @ApiMessage("Cancel like page successfully")
    public ResponseEntity<String> cancelLikePage(@RequestBody UserRequestPage requestPage) {
        boolean success= pageService.cancelLikePageUser(requestPage.getUserId(),requestPage.getPageId());
        if (success)
            return ResponseEntity.ok("Cancel like page successfully");
        return ResponseEntity.badRequest().body("Cancel like page failed");
    }

    @PostMapping("/cancel-follow")
    @ApiMessage("Cancel follow page successfully")
    public ResponseEntity<String> cancelFollowPage(@RequestBody UserRequestPage requestPage) {
        boolean success= pageService.cancelFollowPageUser(requestPage.getUserId(),requestPage.getPageId());
        if (success)
            return ResponseEntity.ok("Cancel follow page successfully");
        return ResponseEntity.badRequest().body("Cancel follow page failed");
    }

    @GetMapping("/{pageId}/interaction-status")
    @ApiMessage("Get page interaction status")
    public ResponseEntity<Map<String, Object>> getPageInteractionStatus(@PathVariable long pageId) {
        User currentUser = userService.getCurrentUser();
        if (currentUser == null)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(null);
        Map<String, Object> status = pageService.getPageInteractionStatus(currentUser.getId(), pageId);
        return ResponseEntity.ok(status);
    }

    @GetMapping("/update/upload-avatar")
    @ApiMessage("Upload image successfully")
    public ResponseEntity<String> updateUploadImage(@RequestParam String type,
                                                          @RequestParam long id,
                                                          @RequestParam String extension){
        Page page=pageService.findPageById(id);
        Map<String,String> image= s3Service.generateUpdateUploadUrl(type,id,extension);
        if (page!=null){
            UserRequestUpdatePage update=new UserRequestUpdatePage();
            update.setAvatarUrl(image.get("imageUrl"));
            pageService.updatePage(id,update);
        }
        return ResponseEntity.ok(image.get("uploadUrl"));
    }

    @GetMapping("/update/upload-cover")
    @ApiMessage("Upload cover image successfully")
    public ResponseEntity<String> updateUploadCoverImage(@RequestParam String type,
                                                         @RequestParam long id,
                                                         @RequestParam String extension){
        Page page=pageService.findPageById(id);
        Map<String,String> image= s3Service.generateUpdateUploadUrl(type,id,extension);
        if (page!=null){
            UserRequestUpdatePage update=new UserRequestUpdatePage();
            update.setCoverUrl(image.get("imageUrl"));
            pageService.updatePage(id,update);
        }
        return ResponseEntity.ok(image.get("uploadUrl"));
    }

    @GetMapping("/upload-avatar")
    @ApiMessage("Upload image successfully")
    public ResponseEntity<Map<String,String>> uploadImage(@RequestParam String type,
                                                          @RequestParam String extension){
        return ResponseEntity.ok(s3Service.generateUploadUrl(type,extension));
    }
}
