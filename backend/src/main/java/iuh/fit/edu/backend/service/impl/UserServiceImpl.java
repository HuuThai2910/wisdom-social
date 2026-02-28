/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.service.impl;

import iuh.fit.edu.backend.domain.entity.mysql.BlackListUser;
import iuh.fit.edu.backend.domain.entity.mysql.BlockedUser;
import iuh.fit.edu.backend.domain.entity.mysql.User;
import iuh.fit.edu.backend.dto.request.friend.FriendRequest;
import iuh.fit.edu.backend.dto.request.user.*;
import iuh.fit.edu.backend.dto.response.user.UserResponseConfirmRegister;
import iuh.fit.edu.backend.dto.response.user.UserResponseLogin;
import iuh.fit.edu.backend.dto.response.user.UserResponseOTPPassword;
import iuh.fit.edu.backend.dto.response.user.UserResponseRegister;
import iuh.fit.edu.backend.mapper.UserMapper;
import iuh.fit.edu.backend.repository.mysql.BlackListUserRepository;
import iuh.fit.edu.backend.repository.mysql.UserRepository;
import iuh.fit.edu.backend.service.impl.user.BlockUserService;
import iuh.fit.edu.backend.service.impl.user.UserService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.*;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

/*
 * @description
 * @author: Ngoc Hai
 * @date:
 * @version: 1.0
 */
@Service
public class UserServiceImpl implements UserService {
    @Value("${aws.cognito.clientId}")
    private String userClientId;
    @Value("${aws.cognito.userPoolId}")
    private String userPoolId;

    UserMapper userMapper;
    UserRepository userRepository;
    BlackListUserRepository blackListUserRepository;
    BlockUserService blockUserService;
    CognitoIdentityProviderClient cognitoClient;
    SimpMessagingTemplate simpMessagingTemplate;

    public UserServiceImpl(BlackListUserRepository blackListUserRepository,
                           BlockUserService blockUserService, CognitoIdentityProviderClient cognitoClient,
                           UserMapper userMapper, UserRepository userRepository,
                           SimpMessagingTemplate simpMessagingTemplate) {
        this.blackListUserRepository = blackListUserRepository;
        this.blockUserService = blockUserService;
        this.cognitoClient = cognitoClient;
        this.userMapper = userMapper;
        this.userRepository = userRepository;
        this.simpMessagingTemplate = simpMessagingTemplate;
    }

    /*Đăng kí tài khoản bằng aws cognito
    * @params
    * phone:số điện thoại người dùng
    * password:
    * confirmPassword:
    * */
    @Override
    public UserResponseRegister registerUser(UserRequestRegister register) {
        if(register.getPassword().equals(register.getConfirmPassword())){
            String phone="+84"+register.getPhone().substring(1,10);
            User user=userMapper.UserRegistertoUser(register);
            if(user!=null){
                SignUpRequest request=SignUpRequest.builder()
                        .clientId(userClientId)
                        .username(phone)
                        .password(register.getPassword())
                        .userAttributes(
                                AttributeType.builder()
                                        .name("phone_number")
                                        .value(phone)
                                        .build()
                        )
                        .build();
                cognitoClient.signUp(request);
                userRepository.save(user);
                return userMapper.UsertoUserRegisterResponse(user);
            }
        }
        return null;
    }

    @Override
    public UserResponseConfirmRegister confirmRegisterUser(UserRequestConfirmRegister confirm) {
        String phone="+84"+confirm.getPhone().substring(1,10);
        ConfirmSignUpRequest request= ConfirmSignUpRequest.builder()
                .clientId(userClientId)
                .username(phone)
                .confirmationCode(confirm.getOTP())
                .build();

        ConfirmSignUpResponse response= cognitoClient.confirmSignUp(request);
        if(response!=null){
            return UserResponseConfirmRegister.builder()
                    .status(true)
                    .build();
        }
        return null;
    }

    @Override
    public UserResponseLogin loginUser(UserRequestLogin login) {
        String phone="+84"+login.getPhone().substring(1,10);
        Map<String,String> authParams=new HashMap<>();
        authParams.put("USERNAME",phone);
        authParams.put("PASSWORD",login.getPassword());

        InitiateAuthRequest request=InitiateAuthRequest.builder()
                .clientId(userClientId)
                .authFlow(AuthFlowType.USER_PASSWORD_AUTH)
                .authParameters(authParams)
                .build();

        InitiateAuthResponse response= cognitoClient.initiateAuth(request);
        AuthenticationResultType resultType=response.authenticationResult();

        if(resultType!=null){
            String accessToken  = resultType.accessToken();
            String refreshToken = resultType.refreshToken();
            String idToken=resultType.idToken();
            User user= userRepository.findByPhone(login.getPhone());
            return UserResponseLogin.builder()
                    .phone(user.getPhone())
                    .username(user.getUsername())
                    .gender(user.getGender())
                    .birthday(user.getBirthday())
                    .createdAt(user.getCreatedAt() != null ? user.getCreatedAt().toInstant() : null)
                    .token(accessToken)
                    .refreskToken(refreshToken)
                    .idToken(idToken)
                    .build();
        }
        return null;
    }

    @Override
    public void logoutUser(String idToken, String refreshToken) {
        BlackListUser blackListUser=BlackListUser.builder()
                .idToken(idToken)
                .refreshToken(refreshToken)
                .build();
        blackListUserRepository.save(blackListUser);
    }

    @Override
    public User getCurrentUser() {
        Authentication auth = SecurityContextHolder
                .getContext()
                .getAuthentication();

            try{
                assert auth != null;
                String phone= Objects.requireNonNull(auth.getPrincipal()).toString();
                String phoneFormat="0"+phone.substring(3,12);
                return userRepository.findByPhone(phoneFormat);
            }catch(Exception e){
                return null;
            }

    }

    @Override
    public String getNewAccessToken(String refreshToken) {

        if (blackListUserRepository.existsByAnyToken(refreshToken)) {
            return "Refresh token revoked";
        }

        Map<String, String> authParams = new HashMap<>();
        authParams.put("REFRESH_TOKEN", refreshToken);
        InitiateAuthRequest request=InitiateAuthRequest.builder()
                .authFlow(AuthFlowType.REFRESH_TOKEN_AUTH)
                .clientId(userClientId)
                .authParameters(authParams)
                .build();

        InitiateAuthResponse response=cognitoClient.initiateAuth(request);
        AuthenticationResultType resultType=response.authenticationResult();


        if (resultType == null || resultType.accessToken() == null) {
            throw new RuntimeException("Refresh token invalid or expired");
        }
        return resultType.idToken();
    }

    @Override
    public UserResponseOTPPassword forgotPasswordUser(UserRequestForgotPassword requestForgotPassword) {
        String phone = "+84" + requestForgotPassword.getPhone().substring(1, 10);
        
        try {
            ForgotPasswordRequest request = ForgotPasswordRequest.builder()
                    .clientId(userClientId)
                    .username(phone)
                    .build();
            
            ForgotPasswordResponse response = cognitoClient.forgotPassword(request);
            
            if (response != null) {
                UserResponseOTPPassword responseOTP = new UserResponseOTPPassword();
                responseOTP.setOTP("OTP sent to " + requestForgotPassword.getPhone());
                return responseOTP;
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to send OTP: " + e.getMessage());
        }
        
        return null;
    }

    @Override
    public boolean resetPassword(UserRequestResetPassword requestResetPassword) {
        if (!requestResetPassword.getPassword().equals(requestResetPassword.getConfirmPassword())) {
            throw new RuntimeException("Password and confirm password do not match");
        }
        
        String phone = "+84" + requestResetPassword.getPhone().substring(1, 10);
        
        try {
            ConfirmForgotPasswordRequest request = ConfirmForgotPasswordRequest.builder()
                    .clientId(userClientId)
                    .username(phone)
                    .confirmationCode(requestResetPassword.getConfirmationCode())
                    .password(requestResetPassword.getPassword())
                    .build();
            
            ConfirmForgotPasswordResponse response = cognitoClient.confirmForgotPassword(request);
            
            return response != null;
        } catch (Exception e) {
            throw new RuntimeException("Failed to reset password: " + e.getMessage());
        }
    }

    @Override
    public boolean deleteUser(long id) {
        if(id>0){
            userRepository.deleteById(id);
            return true;
        }
        return false;
    }

    @Override
    public boolean updateUser(long id, UserRequestUpdate requestUpdate) {
        if(id>0){
           User user=userRepository.findById(id).orElse(null);
           if(user!=null){
               user=User.builder()
                       .id(id)
                       .bio(requestUpdate.getBio())
                       .gender(requestUpdate.getGender())
                       .avatarUrl(requestUpdate.getAvatarUrl())
                       .birthday(requestUpdate.getBirthday())
                       .username(requestUpdate.getUsername())
                       .updatedAt(OffsetDateTime.now())
                       .build();
               userRepository.save(user);
               return true;
           }
        }
        return false;
    }

    @Override
    public List<User> getAllUser() {
        return userRepository.findAll();
    }

    @Override
    public User findUserById(long id) {
        return userRepository.findById(id).orElse(null);
    }

    @Override
    public List<User> getAllForUser(long id) {
        List<User> allUser = getAllUser();
        User user = findUserById(id);
        List<BlockedUser> blockedUsers = blockUserService.getBlockUser(user);

        Set<Long> blockedIds = blockedUsers.stream()
                .map(b -> b.getBlocked().getId())
                .collect(Collectors.toSet());

        allUser.removeIf(u -> blockedIds.contains(u.getId()));

        return allUser;
    }


    @Override
    public List<User> getAllBlockUser(long id) {
        List<User> allUser=getAllUser();
        User user=findUserById(id);
        List<BlockedUser> blockedUsers=blockUserService.getBlockUser(user);
        List<User> users=new ArrayList<>();

        for (User u:allUser){
            for (BlockedUser blockedUser:blockedUsers){
                if(u.getId().equals(blockedUser.getBlocked().getId())){
                    users.add(u);
                }
            }
        }
        return users;
    }

    @Override
    public boolean saveBlockUser(FriendRequest friendRequest) {
        if(friendRequest!=null){
            User blocker = findUserById(friendRequest.getSenderId());
            User blocked = findUserById(friendRequest.getReceivedId());
            BlockedUser blockedUser= BlockedUser.builder()
                    .blocker(blocker)
                    .blocked(blocked)
                    .build();
            blockUserService.blockUser(blockedUser);
            String blockerPhone = convertToInternationalFormat(blocker.getPhone());
            String blockedPhone = convertToInternationalFormat(blocked.getPhone());
            simpMessagingTemplate.convertAndSend(
                    "/topic/user/" + blockerPhone + "/save-block",
                    "Người dùng này đã bị chặn"
            );
            simpMessagingTemplate.convertAndSend(
                    "/topic/user/" + blockedPhone + "/save-block",
                    "Bạn đã bị chặn"
            );
            return true;
        }
        return false;
    }

    @Override
    public boolean cancelBlockUser(FriendRequest friendRequest) {
        if(friendRequest!=null){
            User blocker = findUserById(friendRequest.getSenderId());
            User blocked = findUserById(friendRequest.getReceivedId());
            BlockedUser blockedUser=blockUserService.getBlockUserByBlockerAndBlocked(friendRequest);
            blockUserService.cancelBlockUser(blockedUser);
            String blockerPhone = convertToInternationalFormat(blocker.getPhone());
            String blockedPhone = convertToInternationalFormat(blocked.getPhone());
            simpMessagingTemplate.convertAndSend(
                    "/topic/user/" + blockerPhone + "/cancel-block",
                    "Người dùng này đã được gỡ chặn"
            );
            simpMessagingTemplate.convertAndSend(
                    "/topic/user/" + blockedPhone + "/cancel-block",
                    "Bạn đã được gỡ chặn"
            );
            return true;
        }
        return false;
    }

    private String convertToInternationalFormat(String phone) {
        if (phone != null && phone.startsWith("0")) {
            return "+84" + phone.substring(1);
        }
        return phone;
    }

}
