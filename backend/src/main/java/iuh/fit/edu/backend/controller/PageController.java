package iuh.fit.edu.backend.controller;

import iuh.fit.edu.backend.domain.entity.mysql.Page;
import iuh.fit.edu.backend.dto.request.page.UserRequestCreatePage;
import iuh.fit.edu.backend.dto.request.page.UserRequestPage;
import iuh.fit.edu.backend.dto.request.page.UserRequestUpdatePage;
import iuh.fit.edu.backend.service.impl.page.PageService;
import iuh.fit.edu.backend.util.anotation.ApiMessage;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/page")
public class PageController {
    PageService pageService;
    public PageController(PageService pageService) {
        this.pageService = pageService;
    }

    @PostMapping("/create")
    @ApiMessage("Create page successfully")
    public ResponseEntity<String> createPage(@RequestBody UserRequestCreatePage createPage){
        boolean success= pageService.createPage(20L,createPage);
        if (success)
            return ResponseEntity.ok("Create page successfully");
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

}
