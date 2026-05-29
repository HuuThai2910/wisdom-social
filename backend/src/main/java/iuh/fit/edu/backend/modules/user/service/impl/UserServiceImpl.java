/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.modules.user.service.impl;

import iuh.fit.edu.backend.modules.user.constant.FriendStatus;
import iuh.fit.edu.backend.modules.user.dto.request.FriendRequest;
import iuh.fit.edu.backend.modules.user.dto.request.*;
import iuh.fit.edu.backend.modules.user.dto.response.BlockEventPayload;
import iuh.fit.edu.backend.modules.user.dto.response.*;
import iuh.fit.edu.backend.common.config.JwtAuthFilter;
import iuh.fit.edu.backend.modules.user.mapper.UserMapper;
import iuh.fit.edu.backend.modules.user.entity.*;
import iuh.fit.edu.backend.modules.user.repository.ActiveTokenRepository;
import iuh.fit.edu.backend.modules.user.repository.BlackListUserRepository;
import iuh.fit.edu.backend.modules.user.repository.DeviceRepository;
import iuh.fit.edu.backend.modules.user.repository.FriendRepository;
import iuh.fit.edu.backend.modules.user.repository.UserRepository;
import iuh.fit.edu.backend.common.exception.AccountLockedException;
import iuh.fit.edu.backend.common.exception.RateLimitExceededException;
import iuh.fit.edu.backend.common.service.security.AccountLockService;
import iuh.fit.edu.backend.common.service.security.RateLimitService;
import iuh.fit.edu.backend.common.service.sms.EsmsOtpService;
import iuh.fit.edu.backend.modules.user.service.BlockUserService;
import iuh.fit.edu.backend.modules.user.service.UserService;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.*;

import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
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
    private static final Duration PENDING_REGISTER_TTL = Duration.ofMinutes(15);

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
    DeviceRepository deviceRepository;
    ActiveTokenRepository activeTokenRepository;
    RateLimitService rateLimitService;
    AccountLockService accountLockService;
    FriendRepository friendRepository;
    EsmsOtpService esmsOtpService;
    RedisTemplate<String, Object> redisTemplate;


    public UserServiceImpl(BlackListUserRepository blackListUserRepository,
                           BlockUserService blockUserService, CognitoIdentityProviderClient cognitoClient,
                           UserMapper userMapper, UserRepository userRepository,
                           SimpMessagingTemplate simpMessagingTemplate,
                           DeviceRepository deviceRepository,
                           ActiveTokenRepository activeTokenRepository,
                           RateLimitService rateLimitService,
                           AccountLockService accountLockService,
                           FriendRepository friendRepository,
                           EsmsOtpService esmsOtpService,
                           RedisTemplate<String, Object> redisTemplate
                           ) {
        this.blackListUserRepository = blackListUserRepository;
        this.blockUserService = blockUserService;
        this.cognitoClient = cognitoClient;
        this.userMapper = userMapper;
        this.userRepository = userRepository;
        this.simpMessagingTemplate = simpMessagingTemplate;
        this.deviceRepository = deviceRepository;
        this.activeTokenRepository = activeTokenRepository;
        this.rateLimitService = rateLimitService;
        this.accountLockService = accountLockService;
        this.friendRepository = friendRepository;
        this.esmsOtpService = esmsOtpService;
        this.redisTemplate = redisTemplate;
    }

    /*Gửi OTP đăng kí qua ESMS, chỉ lưu tạm thông tin đăng kí chờ xác thực
    * @params
    * phone:số điện thoại người dùng
    * password:
    * confirmPassword:
    * */
    @Override
    @Transactional
    public UserResponseRegister registerUser(UserRequestRegister register) {
        if(register.getPassword().equals(register.getConfirmPassword())){
            User user=userMapper.UserRegistertoUser(register);
            User temp=userRepository.findByPhone(user.getPhone());

            if(user!=null){
                if (temp != null) {
                    throw new RuntimeException("Phone number already exists");
                }
                String username=randomUsernameGenerator();
                if (userRepository.existsUserByUsername(username)){
                    username=randomUsernameGenerator();
                }
                user.setUsername(username);
                user.setName("Không rõ");
                register.setPhone(user.getPhone());
                try {
                    storePendingRegister(register, username);
                    esmsOtpService.sendRegisterOtp(register.getPhone());
                    return userMapper.UsertoUserRegisterResponse(user);
                } catch (RuntimeException e) {
                    deletePendingRegister(register.getPhone());
                    throw e;
                }

            }
        }
        return null;
    }

    @Override
    @Transactional
    public UserResponseConfirmRegister confirmRegisterUser(UserRequestConfirmRegister confirm) {
        long otpLock = rateLimitService.checkOtpLock(confirm.getPhone());
        if (otpLock > 0) {
            throw new RateLimitExceededException(otpLock);
        }

        PendingRegister pendingRegister = getPendingRegister(confirm.getPhone());
        if (pendingRegister == null) {
            throw new RuntimeException("Registration session expired or not found");
        }

        boolean validOtp = esmsOtpService.verifyRegisterOtp(confirm.getPhone(), confirm.getOtp());
        if (validOtp) {
            UserRequestRegister register = pendingRegister.getRegister();
            String cognitoPhone = toCognitoPhone(register.getPhone());
            User user = userMapper.UserRegistertoUser(register);
            user.setUsername(pendingRegister.getUsername());
            user.setName("Không rõ");

            if (userRepository.findByPhone(user.getPhone()) != null) {
                deletePendingRegister(confirm.getPhone());
                throw new RuntimeException("Phone number already exists");
            }

            if (checkUserStatus(cognitoPhone)) {
                deleteCognitoUserQuietly(cognitoPhone);
            }

            boolean createdCognitoUser = false;
            try {
                createVerifiedCognitoUser(cognitoPhone, register.getPassword());
                createdCognitoUser = true;
                userRepository.save(user);
                saveDevice(user, register.getDeviceType(), register.getDeviceName(), register.getIpAddress());
                deletePendingRegister(confirm.getPhone());
            } catch (RuntimeException e) {
                if (createdCognitoUser) {
                    deleteCognitoUserQuietly(cognitoPhone);
                }
                throw e;
            }

            rateLimitService.clearOtpAttempts(confirm.getPhone());
            return UserResponseConfirmRegister.builder()
                    .status(true)
                    .build();
        }

        long lockSec = rateLimitService.recordFailedOtp(confirm.getPhone());
        if (lockSec > 0) {
            throw new RateLimitExceededException(lockSec);
        }
        throw new RuntimeException("Invalid or expired confirmation code");
    }

    @Override
    @Transactional
    public UserResponseLogin loginUser(UserRequestLogin login) {
        String ip = login.getIpAddress() != null ? login.getIpAddress() : "unknown";

        // Check rate limit lock
        long lockRemaining = rateLimitService.checkLoginLock(login.getPhone(), ip);
        if (lockRemaining > 0) {
            throw new RateLimitExceededException(lockRemaining);
        }

        // Check account lock
        User user = userRepository.findByPhone(login.getPhone());
        if (user != null && accountLockService.isLocked(user)) {
            long remainSec = accountLockService.getRemainingLockSeconds(user);
            throw new AccountLockedException(remainSec, user.getLockReason());
        }

        String phone = "+84" + login.getPhone().substring(1, 10);
        Map<String, String> authParams = new HashMap<>();
        authParams.put("USERNAME", phone);
        authParams.put("PASSWORD", login.getPassword());

        InitiateAuthRequest request = InitiateAuthRequest.builder()
                .clientId(userClientId)
                .authFlow(AuthFlowType.USER_PASSWORD_AUTH)
                .authParameters(authParams)
                .build();

        try {
            InitiateAuthResponse response = cognitoClient.initiateAuth(request);
            AuthenticationResultType resultType = response.authenticationResult();

            if (resultType != null) {
                rateLimitService.clearLoginAttempts(login.getPhone(), ip);

                String accessToken = resultType.accessToken();
                String refreshToken = resultType.refreshToken();
                String idToken = resultType.idToken();
                if (user == null) {
                    user = userRepository.findByPhone(login.getPhone());
                }
                saveDevice(user, login.getDeviceType(), login.getDeviceName(), login.getIpAddress());
                replaceActiveTokensForLogin(user, accessToken, refreshToken, idToken, login.getDeviceType());

                UserResponseLogin.UserResponseLoginBuilder builder = UserResponseLogin.builder()
                        .id(user.getId())
                        .phone(user.getPhone())
                        .username(user.getUsername())
                        .name(user.getName())
                        .avatarUrl(user.getAvatarUrl())
                        .bio(user.getBio())
                        .gender(user.getGender())
                        .birthday(user.getBirthday())
                        .createdAt(user.getCreatedAt() != null ? user.getCreatedAt().toInstant() : null)
                        .token(accessToken)
                        .refreskToken(refreshToken)
                        .idToken(idToken)
                        .hasPinCode(user.hasPinCode());

                if (user.getDeletionRequestedAt() != null) {
                    long remainingDays = ChronoUnit.DAYS.between(OffsetDateTime.now(), user.getDeletionScheduledFor());
                    builder.deletionPending(true)
                            .deletionRemainingDays(Math.max(remainingDays, 0))
                            .deletionScheduledFor(user.getDeletionScheduledFor() != null ? user.getDeletionScheduledFor().toInstant() : null);
                }

                return builder.build();
            }
            return null;
        } catch (NotAuthorizedException e) {
            long lockSec = rateLimitService.recordFailedLogin(login.getPhone(), ip);
            if (lockSec > 0 && user != null) {
                accountLockService.systemLock(user, "Nhập sai mật khẩu quá nhiều lần", 15);
            }
            if (lockSec > 0) {
                throw new RateLimitExceededException(lockSec);
            }
            throw new RuntimeException("Incorrect username or password");
        }
    }

    @Override
    @Transactional
    public void logoutUser(String idToken, String refreshToken) {
        BlackListUser blackListUser=BlackListUser.builder()
                .idToken(idToken)
                .refreshToken(refreshToken)
                .build();
        blackListUserRepository.save(blackListUser);
        if (idToken != null && !idToken.isBlank()) {
            activeTokenRepository.deleteByAccessToken(idToken);
        }
        if (refreshToken != null && !refreshToken.isBlank()) {
            activeTokenRepository.deleteByRefreshToken(refreshToken);
        }
    }

    @Override
    @Transactional
    public void replaceActiveTokensForLogin(User user, String accessToken, String refreshToken, String idToken, String deviceType) {
        if (user == null) {
            return;
        }
        String deviceCategory = normalizeDeviceCategory(deviceType);
        invalidateActiveTokens(user, deviceCategory, true);
        activeTokenRepository.save(ActiveToken.builder()
                .userId(user.getId())
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .idToken(idToken)
                .deviceType(deviceCategory)
                .createdAt(OffsetDateTime.now())
                .expiresAt(OffsetDateTime.now().plusHours(1))
                .build());
    }
    @Override
    public void saveDevice(User user, String deviceType, String deviceName, String ipAddress) {
        if (user == null) return;
        Device device = new Device();
        device.setUser(user);
        device.setDeviceType(deviceType != null ? deviceType : "UNKNOWN");
        device.setNameDevice(deviceName != null ? deviceName : "UNKNOWN");
        device.setIpAddress(ipAddress != null ? ipAddress : "UNKNOWN");
        device.setCreateAt(OffsetDateTime.now());
        deviceRepository.save(device);
    }

    @Override
    public User getCurrentUser() {
        Authentication auth = SecurityContextHolder
                .getContext()
                .getAuthentication();

        if (auth == null || auth.getPrincipal() == null) {
            return null;
        }

        try {
            String phone = auth.getPrincipal().toString();

            // Normalize phone (+84 -> 0)
            if (phone.startsWith("+84")) {
                phone = "0" + phone.substring(3);
            }

            return userRepository.findByPhone(phone);
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    @Transactional
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
        String newAccessToken = resultType.accessToken();
        activeTokenRepository.findByRefreshToken(refreshToken).ifPresent(activeToken -> {
            activeToken.setAccessToken(newAccessToken);
            activeToken.setExpiresAt(OffsetDateTime.now().plusHours(1));
            activeTokenRepository.save(activeToken);
        });
        return newAccessToken;
    }

    @Override
    @Transactional
    public String getNewQrAccessToken(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new RuntimeException("QR refresh token is missing");
        }

        if (blackListUserRepository.existsByAnyToken(refreshToken)) {
            throw new RuntimeException("Refresh token revoked");
        }

        var decoded = JwtAuthFilter.verifyLocalToken(refreshToken);
        String phone = decoded.getClaim("phone_number").asString();

        if (phone == null || phone.isBlank()) {
            throw new RuntimeException("Invalid QR refresh token");
        }

        String newAccessToken = JwtAuthFilter.generateToken(phone);
        activeTokenRepository.findByRefreshToken(refreshToken).ifPresent(activeToken -> {
            activeToken.setAccessToken(newAccessToken);
            activeToken.setExpiresAt(OffsetDateTime.now().plusHours(1));
            activeTokenRepository.save(activeToken);
        });
        return newAccessToken;
    }

    @Override
    public void resendConfirmationOtp(String phone) {
        if (getPendingRegister(phone) == null) {
            throw new RuntimeException("Registration session expired or not found");
        }
        esmsOtpService.sendRegisterOtp(phone);
    }

    @Override
    public UserResponseOTPPassword forgotPasswordUser(UserRequestForgotPassword requestForgotPassword) {
        String phone = normalizeLocalPhone(requestForgotPassword.getPhone());
        User user = userRepository.findByPhone(phone);
        if (user == null) {
            throw new RuntimeException("User not found");
        }

        esmsOtpService.sendRegisterOtp(phone);

        UserResponseOTPPassword responseOTP = new UserResponseOTPPassword();
        responseOTP.setOTP("OTP sent to " + phone);
        return responseOTP;
    }

    @Override
    public boolean resetPassword(UserRequestResetPassword requestResetPassword, User currentUser) {
        if (requestResetPassword.getCurrentPassword() != null
                && !requestResetPassword.getCurrentPassword().isBlank()) {
            return changePasswordWithCurrentPassword(requestResetPassword, currentUser);
        }

        long otpLock = rateLimitService.checkOtpLock(requestResetPassword.getPhone());
        if (otpLock > 0) {
            throw new RateLimitExceededException(otpLock);
        }

        if (!requestResetPassword.getPassword().equals(requestResetPassword.getConfirmPassword())) {
            throw new RuntimeException("Password and confirm password do not match");
        }

        String phone = normalizeLocalPhone(requestResetPassword.getPhone());
        User user = userRepository.findByPhone(phone);
        if (user == null) {
            throw new RuntimeException("User not found");
        }

        boolean validOtp = esmsOtpService.verifyRegisterOtp(phone, requestResetPassword.getConfirmationCode());
        if (!validOtp) {
            long lockSec = rateLimitService.recordFailedOtp(requestResetPassword.getPhone());
            if (lockSec > 0) {
                throw new RateLimitExceededException(lockSec);
            }
            throw new RuntimeException("Failed to reset password: Invalid or expired code");
        }

        cognitoClient.adminSetUserPassword(AdminSetUserPasswordRequest.builder()
                .userPoolId(userPoolId)
                .username(toCognitoPhone(phone))
                .password(requestResetPassword.getPassword())
                .permanent(true)
                .build());

        rateLimitService.clearOtpAttempts(requestResetPassword.getPhone());
        return true;
    }

    private boolean changePasswordWithCurrentPassword(UserRequestResetPassword requestResetPassword, User currentUser) {
        if (currentUser == null) {
            throw new RuntimeException("User not authenticated");
        }
        if (requestResetPassword.getPassword() == null || requestResetPassword.getPassword().isBlank()) {
            throw new RuntimeException("New password is required");
        }
        if (!requestResetPassword.getPassword().equals(requestResetPassword.getConfirmPassword())) {
            throw new RuntimeException("Password and confirm password do not match");
        }
        if (requestResetPassword.getCurrentPassword().equals(requestResetPassword.getPassword())) {
            throw new RuntimeException("New password must be different from current password");
        }

        String cognitoPhone = toCognitoPhone(currentUser.getPhone());
        Map<String, String> authParams = new HashMap<>();
        authParams.put("USERNAME", cognitoPhone);
        authParams.put("PASSWORD", requestResetPassword.getCurrentPassword());

        try {
            cognitoClient.initiateAuth(InitiateAuthRequest.builder()
                    .clientId(userClientId)
                    .authFlow(AuthFlowType.USER_PASSWORD_AUTH)
                    .authParameters(authParams)
                    .build());
        } catch (NotAuthorizedException e) {
            throw new RuntimeException("Current password is incorrect");
        }

        cognitoClient.adminSetUserPassword(AdminSetUserPasswordRequest.builder()
                .userPoolId(userPoolId)
                .username(cognitoPhone)
                .password(requestResetPassword.getPassword())
                .permanent(true)
                .build());

        return true;
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
               if (requestUpdate.getName() != null) user.setName(requestUpdate.getName());
               if (requestUpdate.getBio() != null) user.setBio(requestUpdate.getBio());
               if (requestUpdate.getGender() != null) user.setGender(requestUpdate.getGender());
               if (requestUpdate.getAvatarUrl() != null) user.setAvatarUrl(requestUpdate.getAvatarUrl());
               if (requestUpdate.getBirthday() != null) user.setBirthday(requestUpdate.getBirthday());
               if (requestUpdate.getUsername() != null) user.setUsername(requestUpdate.getUsername());
               user.setUpdatedAt(OffsetDateTime.now());
               userRepository.save(user);

               Map<String, Object> profileUpdatePayload = new HashMap<>();
               profileUpdatePayload.put("id", user.getId());
               profileUpdatePayload.put("username", user.getUsername());
               profileUpdatePayload.put("name", user.getName());
               profileUpdatePayload.put("bio", user.getBio());
               profileUpdatePayload.put("avatarUrl", user.getAvatarUrl());
               profileUpdatePayload.put("birthday", user.getBirthday());
               profileUpdatePayload.put("gender", user.getGender());
               profileUpdatePayload.put("phone", user.getPhone());
               
               // Send WebSocket notification to all users about profile update
               if (user.getPhone() != null) {
                   String userPhone = convertToInternationalFormat(user.getPhone());
                   System.out.println("🟢🟢🟢 PUBLISHING PROFILE UPDATE 🟢🟢🟢");
                   System.out.println("📱 User ID: " + id);
                   System.out.println("📱 Phone: " + user.getPhone());
                   System.out.println("📱 International Phone: " + userPhone);
                   System.out.println("📱 Topic: /topic/user/" + userPhone + "/profile-update");
                   System.out.println("📱 Payload: " + profileUpdatePayload);

                   // Send to friends/followers about user's profile update
                   simpMessagingTemplate.convertAndSend(
                       "/topic/user/" + userPhone + "/profile-update",
                        profileUpdatePayload
                   );

                   System.out.println("✅ Published to WebSocket topic");
               }
               
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

        // Get users that this user has blocked
        List<BlockedUser> blockedUsers = blockUserService.getBlockUser(user);
        Set<Long> blockedIds = blockedUsers.stream()
                .map(b -> b.getBlocked().getId())
                .collect(Collectors.toSet());

        // Get users that have blocked this user
        List<BlockedUser> blockedByUsers = blockUserService.getBlockedByUser(user);
        Set<Long> blockedByIds = blockedByUsers.stream()
                .map(b -> b.getBlocker().getId())
                .collect(Collectors.toSet());

        // Combine both sets and remove them from results
        blockedIds.addAll(blockedByIds);
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
            BlockEventPayload blockPayload = BlockEventPayload.builder()
                    .eventType("save-block")
                    .blockerId(friendRequest.getSenderId())
                    .blockedId(friendRequest.getReceivedId())
                    .timestamp(OffsetDateTime.now().toString())
                    .build();
            simpMessagingTemplate.convertAndSend("/topic/user/" + blockerPhone + "/save-block", blockPayload);
            simpMessagingTemplate.convertAndSend("/topic/user/" + blockedPhone + "/save-block", blockPayload);
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
            BlockEventPayload cancelPayload = BlockEventPayload.builder()
                    .eventType("cancel-block")
                    .blockerId(friendRequest.getSenderId())
                    .blockedId(friendRequest.getReceivedId())
                    .timestamp(OffsetDateTime.now().toString())
                    .build();
            simpMessagingTemplate.convertAndSend("/topic/user/" + blockerPhone + "/cancel-block", cancelPayload);
            simpMessagingTemplate.convertAndSend("/topic/user/" + blockedPhone + "/cancel-block", cancelPayload);
            return true;
        }
        return false;
    }

    @Override
    public List<User> searchUserByUsername(String keyword) {
        return userRepository.findUsersByUsernameContaining(keyword);
    }


    private String convertToInternationalFormat(String phone) {
        if (phone == null || phone.isBlank()) {
            return phone;
        }
        if (phone.startsWith("+84")) {
            return phone;
        }
        if (phone.startsWith("0")) {
            return "+84" + phone.substring(1);
        }
        if (phone.startsWith("84")) {
            return "+" + phone;
        }
        return "+84" + phone;
    }

    private String randomUsernameGenerator(){
        String[] words1 = {"cool", "real", "baby", "mr", "miss", "its", "the", "not", "just"};
        String[] words2 = {"cat", "boy", "girl", "king", "queen", "vibe", "zone", "life", "mood"};
        Random random = new Random();

        String part1 = words1[random.nextInt(words1.length)];
        String part2 = words2[random.nextInt(words2.length)];

        int number = random.nextInt(999);

        String[] separators = {"", "_", "."};
        String sep = separators[random.nextInt(separators.length)];

        return part1 + sep + part2 + number;
    }

    // Hàm cập nhật lần hoạt động cuối cùng user
    @Transactional
    @Override
    public Instant updateLastActiveAt(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy User"));

        Instant now = Instant.now().truncatedTo(ChronoUnit.MILLIS);
        user.setLastActiveAt(now);
        userRepository.save(user);

        return now;
    }

    @Override
    public PaginatedUserResponse searchMentionUsers(long viewerId, String keyword, int page, int size) {
        List<Long> friendIds = friendRepository.findAcceptedFriendIds(viewerId, FriendStatus.ACCEPTED.ordinal());

        if (friendIds == null || friendIds.isEmpty()) {
            return PaginatedUserResponse.builder()
                    .data(Collections.emptyList())
                    .page(page)
                    .hasMore(false)
                    .build();
        }

        Page<User> userPage = userRepository.findByIdInAndUsernameContainingIgnoreCase(
                friendIds,
                keyword,
                PageRequest.of(page, size)
        );

        return PaginatedUserResponse.builder()
                .data(userPage.getContent())
                .page(page)
                .hasMore(userPage.hasNext())
                .build();    }

    public boolean checkUserStatus(String phone) {
        try {
            AdminGetUserRequest request = AdminGetUserRequest.builder()
                    .userPoolId(userPoolId)
                    .username(phone)
                    .build();

            AdminGetUserResponse response = cognitoClient.adminGetUser(request);

            return "UNCONFIRMED".equals(response.userStatusAsString());

        } catch (UserNotFoundException e) {
            return false;
        }
    }

    private void createVerifiedCognitoUser(String phone, String password) {
        cognitoClient.adminCreateUser(AdminCreateUserRequest.builder()
                .userPoolId(userPoolId)
                .username(phone)
                .messageAction(MessageActionType.SUPPRESS)
                .userAttributes(
                        AttributeType.builder()
                                .name("phone_number")
                                .value(phone)
                                .build(),
                        AttributeType.builder()
                                .name("phone_number_verified")
                                .value("true")
                                .build()
                )
                .build());

        cognitoClient.adminSetUserPassword(AdminSetUserPasswordRequest.builder()
                .userPoolId(userPoolId)
                .username(phone)
                .password(password)
                .permanent(true)
                .build());
    }

    private void deleteCognitoUserQuietly(String phone) {
        try {
            cognitoClient.adminDeleteUser(AdminDeleteUserRequest.builder()
                    .userPoolId(userPoolId)
                    .username(phone)
                    .build());
        } catch (Exception ignored) {
            // best effort cleanup for failed registration side effects
        }
    }

    private void storePendingRegister(UserRequestRegister register, String username) {
        redisTemplate.opsForValue().set(
                pendingRegisterKey(register.getPhone()),
                new PendingRegister(register, username),
                PENDING_REGISTER_TTL
        );
    }

    private PendingRegister getPendingRegister(String phone) {
        Object value = redisTemplate.opsForValue().get(pendingRegisterKey(phone));
        if (value instanceof PendingRegister pendingRegister) {
            return pendingRegister;
        }
        return null;
    }

    private void deletePendingRegister(String phone) {
        redisTemplate.delete(pendingRegisterKey(phone));
    }

    private String pendingRegisterKey(String phone) {
        return "auth:register:pending:" + normalizeLocalPhone(phone);
    }

    private String normalizeLocalPhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return phone;
        }
        String normalized = phone.trim().replaceAll("\\s+", "");
        if (normalized.startsWith("+84")) {
            return "0" + normalized.substring(3);
        }
        if (normalized.startsWith("84")) {
            return "0" + normalized.substring(2);
        }
        return normalized;
    }

    private String toCognitoPhone(String phone) {
        String normalized = normalizeLocalPhone(phone);
        if (normalized == null || normalized.isBlank()) {
            throw new RuntimeException("Invalid phone number");
        }
        if (normalized.startsWith("0")) {
            return "+84" + normalized.substring(1);
        }
        return "+84" + normalized;
    }

    public static class PendingRegister {
        private UserRequestRegister register;
        private String username;

        public PendingRegister() {
        }

        public PendingRegister(UserRequestRegister register, String username) {
            this.register = register;
            this.username = username;
        }

        public UserRequestRegister getRegister() {
            return register;
        }

        public void setRegister(UserRequestRegister register) {
            this.register = register;
        }

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }
    }

    @Override
    @Transactional
    public void logoutAllDevices(User user) {
        invalidateActiveTokens(user, null, true);
        deviceRepository.deleteDeviceByUser_Id(user.getId());
    }

    private void invalidateActiveTokens(User user, String deviceCategory, boolean notifyClients) {
        List<ActiveToken> tokens = activeTokenRepository.findByUserId(user.getId());
        if (deviceCategory != null) {
            tokens = tokens.stream()
                    .filter(token -> deviceCategory.equals(normalizeDeviceCategory(token.getDeviceType())))
                    .toList();
        }
        if (tokens.isEmpty()) {
            return;
        }

        if (notifyClients) {
            sendForceLogoutEvent(user, deviceCategory);
        }

        for (ActiveToken token : tokens) {
            blackListUserRepository.save(BlackListUser.builder()
                    .idToken(token.getAccessToken())
                    .refreshToken(token.getRefreshToken())
                    .userId(user.getId())
                    .build());

            if (token.getIdToken() != null && !token.getIdToken().isBlank()) {
                blackListUserRepository.save(BlackListUser.builder()
                        .idToken(token.getIdToken())
                        .userId(user.getId())
                        .build());
            }
        }
        for (ActiveToken token : tokens) {
            activeTokenRepository.delete(token);
        }
    }

    private void sendForceLogoutEvent(User user, String deviceCategory) {
        if (user.getPhone() == null) {
            return;
        }

        String userPhone = convertToInternationalFormat(user.getPhone());
        Map<String, Object> forceLogoutPayload = new HashMap<>();
        forceLogoutPayload.put("event", "FORCE_LOGOUT");
        forceLogoutPayload.put("userId", user.getId());
        if (deviceCategory != null) {
            forceLogoutPayload.put("deviceType", deviceCategory);
        }
        forceLogoutPayload.put("timestamp", OffsetDateTime.now().toString());
        simpMessagingTemplate.convertAndSend(
                "/topic/user/" + userPhone + "/force-logout",
                forceLogoutPayload
        );
        System.out.println("Force logout WebSocket event sent to /topic/user/" + userPhone + "/force-logout");
    }

    private String normalizeDeviceCategory(String deviceType) {
        if (deviceType == null || deviceType.isBlank()) {
            return "WEB";
        }

        String normalized = deviceType.trim().toUpperCase(Locale.ROOT);
        if (normalized.contains("ANDROID")
                || normalized.contains("IOS")
                || normalized.contains("MOBILE")
                || normalized.contains("REACT_NATIVE")) {
            return "MOBILE";
        }
        return "WEB";
    }

    @Override
    @Transactional
    public void requestAccountDeletion(User user) {
        user.setDeletionRequestedAt(OffsetDateTime.now());
        user.setDeletionScheduledFor(OffsetDateTime.now().plusDays(30));
        userRepository.save(user);
    }

    @Override
    @Transactional
    public void cancelAccountDeletion(User user) {
        user.setDeletionRequestedAt(null);
        user.setDeletionScheduledFor(null);
        userRepository.save(user);
    }

    @Override
    @Transactional
    public void setupPinCode(User user, String pinCode) {
        user.setPinCode(pinCode);
        userRepository.save(user);
    }

    @Override
    public boolean verifyPinCode(User user, String pinCode) {
        if (user.getPinCode() == null) {
            return false; // Chưa cài đặt mã PIN
        }
        return user.getPinCode().equals(pinCode);
    }

    @Override
    @Transactional
    public void removePinCode(User user) {
        user.setPinCode(null);
        userRepository.save(user);
    }
}
