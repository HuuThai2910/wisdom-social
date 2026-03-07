package iuh.fit.edu.backend.controller;

import iuh.fit.edu.backend.domain.entity.mysql.User;
import iuh.fit.edu.backend.dto.request.friend.FriendRequest;
import iuh.fit.edu.backend.dto.request.user.*;
import iuh.fit.edu.backend.dto.response.user.UserResponseConfirmRegister;
import iuh.fit.edu.backend.dto.response.user.UserResponseLogin;
import iuh.fit.edu.backend.dto.response.user.UserResponseOTPPassword;
import iuh.fit.edu.backend.dto.response.user.UserResponseRegister;
import iuh.fit.edu.backend.service.impl.user.BlockUserService;
import iuh.fit.edu.backend.service.impl.user.UserService;
import iuh.fit.edu.backend.service.impl.user.UserSettingService;
import iuh.fit.edu.backend.service.s3.S3Service;
import iuh.fit.edu.backend.util.anotation.ApiMessage;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class UserController {
    UserService userService;
    UserSettingService userSettingService;
    BlockUserService blockUserService;
    S3Service s3Service;


    public UserController(BlockUserService blockUserService, UserService userService,
                          UserSettingService userSettingService, S3Service s3Service) {
        this.blockUserService = blockUserService;
        this.userService = userService;
        this.userSettingService = userSettingService;
        this.s3Service = s3Service;
    }

    @PostMapping("/register")
    @ApiMessage("Register User success")
    public ResponseEntity<UserResponseRegister> registerUser(@RequestBody UserRequestRegister register,
                                                             HttpServletRequest httpRequest) {
        if (register.getIpAddress() == null || register.getIpAddress().isBlank()) {
            String ip = getClientIp(httpRequest);
            register.setIpAddress(ip);
        }
        UserResponseRegister responseRegister = userService.registerUser(register);
        return ResponseEntity.ok(responseRegister);
    }

    @PostMapping("/confirm")
    public ResponseEntity<UserResponseConfirmRegister> registerUser(@RequestBody UserRequestConfirmRegister confirm){
        UserResponseConfirmRegister responseConfirmRegister=userService.confirmRegisterUser(confirm);
        return ResponseEntity.ok(responseConfirmRegister);
    }

    @PostMapping("/login")
    @ApiMessage("Login User success")
    public ResponseEntity<UserResponseLogin> loginUser(@RequestBody UserRequestLogin login,
                                                       HttpServletRequest httpRequest) {
        if (login.getIpAddress() == null || login.getIpAddress().isBlank()) {
            String ip = getClientIp(httpRequest);
            login.setIpAddress(ip);
        }
        UserResponseLogin responseLogin = userService.loginUser(login);
        return ResponseEntity.ok(responseLogin);
    }

    private String getClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
    @PostMapping("/logout")
    public ResponseEntity<String> logoutUser(HttpServletRequest request){
        String idToken = null;
        String refreshToken=null;
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("idToken".equals(cookie.getName())) {
                    idToken = cookie.getValue();
                }
                if ("refreshToken".equals(cookie.getName())) {
                    refreshToken = cookie.getValue();
                }
            }
        }
        userService.logoutUser(idToken,refreshToken);
        return ResponseEntity.ok("Logout success");
    }

    @GetMapping("/refresh")
    public ResponseEntity<String> getNewAccessToken(HttpServletRequest request){
        String refreshToken=null;
        if(request.getCookies()!=null){
            for (Cookie cookie:request.getCookies()){
                if("refreshToken".equals(cookie.getName())){
                    refreshToken=cookie.getValue();
                }
            }
        }

        String accessToken=userService.getNewAccessToken(refreshToken);
        return ResponseEntity.ok(accessToken);
    }

    @GetMapping("/me")
    public ResponseEntity<User> me() {
        return ResponseEntity.ok(userService.getCurrentUser());
    }

    @PostMapping("/forgot-password")
    @ApiMessage("OTP sent successfully")
    public ResponseEntity<UserResponseOTPPassword> forgotPassword(@RequestBody UserRequestForgotPassword requestForgotPassword) {
        UserResponseOTPPassword response = userService.forgotPasswordUser(requestForgotPassword);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/reset-password")
    @ApiMessage("Password reset successfully")
    public ResponseEntity<String> resetPassword(@RequestBody UserRequestResetPassword requestResetPassword) {
        boolean success = userService.resetPassword(requestResetPassword);
        if (success) {
            return ResponseEntity.ok("Password has been reset successfully");
        }
        return ResponseEntity.badRequest().body("Failed to reset password");
    }

    @GetMapping("/users")
    @ApiMessage("Get all User")
    public ResponseEntity<List<User>> getAllUser(){
        return ResponseEntity.ok(userService.getAllUser());
    }

    @DeleteMapping("/users/{id}")
    @ApiMessage("Delete User successfully")
    public ResponseEntity<String> deleteUser(@PathVariable long id){
        boolean success=userService.deleteUser(id);
        if (success) {
            return ResponseEntity.ok("Delete User successfully");
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body("User not found");
    }

    @PutMapping("/users/{id}")
    @ApiMessage("Update User successfully")
    public ResponseEntity<String> updateUser(@PathVariable long id, @RequestBody UserRequestUpdate update){
        boolean success=userService.updateUser(id,update);
        if (success) {
            return ResponseEntity.ok("Update User successfully");
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body("User not found");
    }

    @GetMapping("/user/{id}")
    @ApiMessage("Get profile User")
    public ResponseEntity<User> getProfileUser(@PathVariable long id){
        return ResponseEntity.ok(userSettingService.getProfileUser(id));
    }

    @GetMapping("/users/{id}")
    @ApiMessage("Get all User")
    public ResponseEntity<List<User>> getAllForUser(@PathVariable long id){
        return ResponseEntity.ok(userService.getAllForUser(id));
    }

    @GetMapping("/users/blocked/{id}")
    @ApiMessage("Get all User")
    public ResponseEntity<List<User>> getBlockUser(@PathVariable long id){
        return ResponseEntity.ok(userService.getAllBlockUser(id));
    }

    @PostMapping("/users/block")
    @ApiMessage("Block User successfully")
    public ResponseEntity<String> blockUser(@RequestBody FriendRequest friendRequest){
        boolean success=userService.saveBlockUser(friendRequest);
        if(success){
            return ResponseEntity.ok("Block User successfully");
        }
        return ResponseEntity.badRequest().body("Block User failed");
    }

    @PostMapping("/users/cancel-block")
    @ApiMessage("Cancel block User successfully")
    public ResponseEntity<String> cancelBlockUser(@RequestBody FriendRequest friendRequest){
        boolean success=userService.cancelBlockUser(friendRequest);
        if(success){
            return ResponseEntity.ok("Cancel block User successfully");
        }
        return ResponseEntity.badRequest().body("Cancel block User failed");
    }

    @GetMapping("/users/update/upload-avatar")
    @ApiMessage("Upload image successfully")
    public ResponseEntity<String> updateUploadImage(@RequestParam String type,
                                           @RequestParam String extension){
        User user=userService.getCurrentUser();
        Map<String,String> image= s3Service.generateUpdateUploadUrl(type,user.getId(),extension);

        UserRequestUpdate update=new UserRequestUpdate();
        update.setAvatarUrl(image.get("imageUrl"));
        userService.updateUser(user.getId(), update);

        return ResponseEntity.ok(image.get("uploadUrl"));
    }

    @GetMapping("/upload-avatar")
    @ApiMessage("Upload image successfully")
    public ResponseEntity<Map<String,String>> uploadImage(@RequestParam String type,
                                                          @RequestParam String extension){
        return ResponseEntity.ok(s3Service.generateUploadUrl(type,extension));
    }
}
