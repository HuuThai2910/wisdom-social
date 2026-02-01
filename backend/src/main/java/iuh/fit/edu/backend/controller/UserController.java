package iuh.fit.edu.backend.controller;

import iuh.fit.edu.backend.domain.entity.mysql.User;
import iuh.fit.edu.backend.dto.request.user.UserRequestConfirmRegister;
import iuh.fit.edu.backend.dto.request.user.UserRequestForgotPassword;
import iuh.fit.edu.backend.dto.request.user.UserRequestLogin;
import iuh.fit.edu.backend.dto.request.user.UserRequestRegister;
import iuh.fit.edu.backend.dto.request.user.UserRequestResetPassword;
import iuh.fit.edu.backend.dto.response.user.UserResponseConfirmRegister;
import iuh.fit.edu.backend.dto.response.user.UserResponseLogin;
import iuh.fit.edu.backend.dto.response.user.UserResponseOTPPassword;
import iuh.fit.edu.backend.dto.response.user.UserResponseRegister;
import iuh.fit.edu.backend.service.impl.user.UserService;
import iuh.fit.edu.backend.util.anotation.ApiMessage;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class UserController {
    UserService userService;


    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/register")
    @ApiMessage("Register User success")
    public ResponseEntity<UserResponseRegister> registerUser(@RequestBody UserRequestRegister register){
        UserResponseRegister responseRegister=userService.registerUser(register);
        return ResponseEntity.ok(responseRegister);
    }

    @PostMapping("/confirm")
    public ResponseEntity<UserResponseConfirmRegister> registerUser(@RequestBody UserRequestConfirmRegister confirm){
        UserResponseConfirmRegister responseConfirmRegister=userService.confirmRegisterUser(confirm);
        return ResponseEntity.ok(responseConfirmRegister);
    }

    @PostMapping("/login")
    @ApiMessage("Login User success")
    public ResponseEntity<UserResponseLogin> loginUser(@RequestBody UserRequestLogin login){
        UserResponseLogin responseLogin=userService.loginUser(login);
        return ResponseEntity.ok(responseLogin);
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

}
