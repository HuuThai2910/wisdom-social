package iuh.fit.edu.backend.controller;

import iuh.fit.edu.backend.service.security.AccountLockService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AccountLockService accountLockService;

    public AdminController(AccountLockService accountLockService) {
        this.accountLockService = accountLockService;
    }

    @PostMapping("/lock/{userId}")
    public ResponseEntity<String> lockUser(@PathVariable Long userId,
                                           @RequestBody Map<String, String> body) {
        String reason = body.getOrDefault("reason", "Admin action");
        accountLockService.adminLock(userId, reason);
        return ResponseEntity.ok("User locked successfully");
    }

    @PostMapping("/unlock/{userId}")
    public ResponseEntity<String> unlockUser(@PathVariable Long userId) {
        accountLockService.adminUnlock(userId);
        return ResponseEntity.ok("User unlocked successfully");
    }
}
