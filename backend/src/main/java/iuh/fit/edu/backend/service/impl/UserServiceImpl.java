/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.service.impl;

import iuh.fit.edu.backend.domain.entity.mysql.BlackListUser;
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
import iuh.fit.edu.backend.mapper.UserMapper;
import iuh.fit.edu.backend.repository.mysql.BlackListUserRepository;
import iuh.fit.edu.backend.repository.mysql.UserRepository;
import iuh.fit.edu.backend.service.impl.user.UserService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.*;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

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
    CognitoIdentityProviderClient cognitoClient;

    public UserServiceImpl(CognitoIdentityProviderClient cognitoClient,
                           UserMapper userMapper, UserRepository userRepository,
                           BlackListUserRepository blackListUserRepository) {
        this.cognitoClient = cognitoClient;
        this.userMapper = userMapper;
        this.userRepository = userRepository;
        this.blackListUserRepository = blackListUserRepository;
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
            System.out.println(phone);
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
                System.out.println(phoneFormat);
                return userRepository.findByPhone(phoneFormat);
            }catch(Exception e){
                System.out.println("Get User failed: "+e.getMessage());
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
            System.out.println("Forgot password failed: " + e.getMessage());
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
            System.out.println("Reset password failed: " + e.getMessage());
            throw new RuntimeException("Failed to reset password: " + e.getMessage());
        }
    }
}
