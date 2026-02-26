package iuh.fit.edu.backend.controller;

import iuh.fit.edu.backend.dto.request.page.UserRequestAuthorizePage;
import iuh.fit.edu.backend.dto.request.page.UserRequestMemberPage;
import iuh.fit.edu.backend.dto.request.page.UserRequestPage;
import iuh.fit.edu.backend.service.impl.page.PageMemberService;
import iuh.fit.edu.backend.util.anotation.ApiMessage;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/page-member")
public class PageMemberController {
    PageMemberService pageMemberService;

    public PageMemberController(PageMemberService pageMemberService) {
        this.pageMemberService = pageMemberService;
    }

    @PostMapping("/add")
    @ApiMessage("Add member into page successfully")
    public ResponseEntity<String> addMemberPage(@RequestBody UserRequestMemberPage userRequestMemberPage){
        boolean success=pageMemberService.addMemberPage(userRequestMemberPage);
        if (success)
            return ResponseEntity.ok("Add member into page successfully");
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body("Add member into page failed");
    }

    @PostMapping("/delete")
    @ApiMessage("Delete member into page successfully")
    public ResponseEntity<String> deleteMemberPage(@RequestBody UserRequestPage requestPage){
        boolean success=pageMemberService.deleteMemberPage(requestPage.getPageId(),requestPage.getUserId());
        if (success)
            return ResponseEntity.ok("Delete member into page successfully");
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body("Delete member in page failed");
    }

    @PostMapping("/block")
    @ApiMessage("Block member into page successfully")
    public ResponseEntity<String> blockMemberPage(@RequestBody UserRequestPage requestPage){
        boolean success=pageMemberService.blockMemberPage(requestPage.getPageId(),requestPage.getUserId());
        if (success)
            return ResponseEntity.ok("Block member into page successfully");
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body("Block member in page failed");
    }

    @PostMapping("/cancel-block")
    @ApiMessage("Cancel block member into page successfully")
    public ResponseEntity<String> cancelBlockMemberPage(@RequestBody UserRequestPage requestPage){
        boolean success=pageMemberService.cancelBlockMemberPage(requestPage.getPageId(),requestPage.getUserId());
        if (success)
            return ResponseEntity.ok("Cancel block member into page successfully");
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body("Cancel block member in page failed");
    }

    @PostMapping("/authorize")
    @ApiMessage("Authorize member into page successfully")
    public ResponseEntity<String> authorizeMemberPage(@RequestBody UserRequestAuthorizePage requestPage){
        pageMemberService.authorizeMemberPage(requestPage.getUserId(), requestPage.getPageId(), requestPage.getPageRole());
            return ResponseEntity.ok("Authorize member into page successfully");
    }
}
