package iuh.fit.edu.backend.controller;

import iuh.fit.edu.backend.domain.entity.mysql.Session;
import iuh.fit.edu.backend.domain.entity.mysql.User;
import iuh.fit.edu.backend.dto.request.user.UserRequestQRLogin;
import iuh.fit.edu.backend.dto.response.user.UserResponseLogin;
import iuh.fit.edu.backend.dto.response.user.UserResponseScanQRLogin;
import iuh.fit.edu.backend.service.user.SessionService;
import iuh.fit.edu.backend.service.user.UserService;
import iuh.fit.edu.backend.util.anotation.ApiMessage;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/session")
public class SessionController {
    SessionService service;
    UserService userService;

    public SessionController(SessionService service, UserService userService) {
        this.service = service;
        this.userService = userService;
    }

    @GetMapping("/qr-login/create")
    @ApiMessage("create QR image successfully")
    public ResponseEntity<String> createQRLogin(){
        return ResponseEntity.ok(service.requestQrLogin());
    }

    @GetMapping("/qr-login/scan")
    @ApiMessage("Scan QR image successfully")
    public ResponseEntity<UserResponseScanQRLogin> scanQRLogin(@RequestParam String session_id, HttpServletRequest request){
        User user=userService.getCurrentUser();
        return ResponseEntity.ok(service.scanQRLogin(session_id,user.getId(),getRefreshToken(request)));
    }

    @PostMapping("/qr-login/confirm")
    @ApiMessage("Confirm QR login successfully")
    public ResponseEntity<UserResponseLogin> cofirmQRLogin(@RequestBody UserRequestQRLogin requestQRLogin, HttpServletRequest request){
        String ip = getClientIp(request);
        requestQRLogin.setIpAddress(ip);

        return ResponseEntity.ok(service.scanQRConfirmed(requestQRLogin,getRefreshToken(request)));
    }

    @GetMapping("/qr-login/reject")
    @ApiMessage("Scan QR image successfully")
    public ResponseEntity<Session> rejectQRLogin(@RequestParam String session_id){
        return ResponseEntity.ok(service.scanQRRejected(session_id));
    }

    @GetMapping("/qr-login/status")
    @ApiMessage("Get QR login status")
    public ResponseEntity<UserResponseScanQRLogin> getQRLoginStatus(@RequestParam String session_id){
        return ResponseEntity.ok(service.getQRLoginStatus(session_id));
    }

    private String getClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String getRefreshToken(HttpServletRequest request){
        String refreshToken=null;
        if(request.getCookies()!=null){
            for (Cookie cookie:request.getCookies()){
                if("refreshToken".equals(cookie.getName())){
                    refreshToken=cookie.getValue();
                }
            }
        }
        return refreshToken;
    }
}
