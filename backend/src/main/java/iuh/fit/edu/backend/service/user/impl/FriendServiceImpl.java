package iuh.fit.edu.backend.service.user.impl;

import iuh.fit.edu.backend.constant.FriendStatus;
import iuh.fit.edu.backend.domain.entity.mysql.Friend;
import iuh.fit.edu.backend.domain.entity.mysql.User;
import iuh.fit.edu.backend.event.payload.NotificationEvent;
import iuh.fit.edu.backend.repository.mysql.FriendRepository;
import iuh.fit.edu.backend.service.user.FriendService;
import iuh.fit.edu.backend.service.user.UserService;
import iuh.fit.edu.backend.service.notification.NotificationService;
import iuh.fit.edu.backend.constant.NotificationType;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/*
 * @description
 * @author: Ngoc Hai
 * @date:
 * @version: 1.0
 */
@Service
@Slf4j
public class FriendServiceImpl implements FriendService {
    StringRedisTemplate redisTemplate;
    SimpMessagingTemplate messagingTemplate;
    FriendRepository friendRepository;
    UserService userService;
    NotificationService notificationService;

    public FriendServiceImpl(FriendRepository friendRepository,
                             SimpMessagingTemplate messagingTemplate, 
                             StringRedisTemplate redisTemplate, 
                             UserService userService,
                             NotificationService notificationService) {
        this.friendRepository = friendRepository;
        this.messagingTemplate = messagingTemplate;
        this.redisTemplate = redisTemplate;
        this.userService = userService;
        this.notificationService = notificationService;
    }

    @Override
    public boolean sendFriendRequest(long senderId, long receiverId) {
        String sentKey=buildSentRequestKey(senderId);
        String recievedKey=buildReceivedRequestKey(receiverId);
        String requestKey=buildRequestKey(senderId,receiverId);

        if(senderId>0 && receiverId>0){
            User receiver = userService.findUserById(receiverId);
            User sender = userService.findUserById(senderId);
            
            //save redis
            redisTemplate.opsForSet().add(sentKey, String.valueOf(receiverId));
            redisTemplate.opsForSet().add(recievedKey, String.valueOf(senderId));
            redisTemplate.opsForValue().set(requestKey,FriendStatus.PENDING.toString(), Duration.ofDays(7));
            
            // Trigger Standard Notification
            notificationService.createNotification(NotificationEvent.builder()
                    .recipientId(String.valueOf(receiverId))
                    .actorIds(List.of(String.valueOf(senderId)))
                    .type(NotificationType.FRIEND_REQUEST)
                    .content("đã gửi cho bạn một lời mời kết bạn")
                    .build());

            return true;
        }
        return false;
    }

    @Override
    public boolean acceptFriendRequest(long senderId, long receiverId) {
        if(senderId>0 && receiverId>0){
            User sender = userService.findUserById(senderId);
            User receiver = userService.findUserById(receiverId);

            // Check if already friends
            Friend existingFriend = friendRepository.findFriendByUserAndFriend(sender, receiver);
            if(existingFriend == null) {
                existingFriend = friendRepository.findFriendByUserAndFriend(receiver, sender);
            }
            
            if(existingFriend != null && existingFriend.getStatus().equals(FriendStatus.ACCEPTED)) {
                return true;
            }

            redisTemplate.opsForSet()
                    .remove(buildSentRequestKey(senderId), String.valueOf(receiverId));

            redisTemplate.opsForSet()
                    .remove(buildReceivedRequestKey(receiverId), String.valueOf(senderId));

            redisTemplate.delete(buildRequestKey(senderId,receiverId));

            // 2. Lưu DB (only if not exists)
            if(existingFriend == null) {
                Friend friend=Friend.builder()
                        .status(FriendStatus.ACCEPTED)
                        .user(sender)
                        .friend(receiver)
                        .friendAt(OffsetDateTime.now().toLocalDateTime())
                        .build();
                friendRepository.save(friend);
            } else {
                // Update existing to ACCEPTED
                existingFriend.setStatus(FriendStatus.ACCEPTED);
                existingFriend.setFriendAt(OffsetDateTime.now().toLocalDateTime());
                friendRepository.save(existingFriend);
            }

            // Trigger Standard Notification
            notificationService.createNotification(NotificationEvent.builder()
                    .recipientId(String.valueOf(senderId))
                    .actorIds(List.of(String.valueOf(receiverId)))
                    .type(NotificationType.FRIEND_ACCEPT)
                    .content("đã chấp nhận lời mời kết bạn của bạn")
                    .build());
            return true;
        }
        return false;
    }

    @Override
    public boolean cancelFriendRequest(long senderId, long receiverId) {
        if(senderId>0 && receiverId>0){

            Friend friend=friendRepository.findFriendByUserAndFriend(
                    userService.findUserById(senderId),
                    userService.findUserById(receiverId)
            );
            
            if(friend == null) {
                friend = friendRepository.findFriendByUserAndFriend(
                        userService.findUserById(receiverId),
                        userService.findUserById(senderId)
                );
            }

            if(friend==null){
                // Only in Redis, remove from cache
                redisTemplate.opsForSet().remove(buildSentRequestKey(senderId),String.valueOf(receiverId));
                redisTemplate.opsForSet().remove(buildReceivedRequestKey(receiverId),String.valueOf(senderId));
                redisTemplate.delete(buildRequestKey(senderId,receiverId));
            }else {
                // In DB, delete both PENDING and ACCEPTED
                if(friend.getStatus().equals(FriendStatus.PENDING) || 
                   friend.getStatus().equals(FriendStatus.ACCEPTED)){
                    friendRepository.deleteById(friend.getId());
                }
            }

            // Push notification to receiver about cancellation
            User receiver = userService.findUserById(receiverId);
            if(receiver != null && receiver.getPhone() != null) {
                String receiverPhone = convertToInternationalFormat(receiver.getPhone());
                String message = "Lời mời kết bạn đã bị hủy";
                
                messagingTemplate.convertAndSend(
                        "/topic/user/" + receiverPhone + "/friend-cancel",
                        message
                );
            }
            return true;
        }
        return false;
    }

    @Override
    public boolean rejectFriendRequest(long senderId, long receiverId) {
        if(senderId>0 && receiverId >0){
            User senderUser = userService.findUserById(senderId);
            User receiverUser = userService.findUserById(receiverId);
            
            // Check both directions in DB
            Friend friend = friendRepository.findFriendByUserAndFriend(senderUser, receiverUser);
            
            if(friend == null) {
                friend = friendRepository.findFriendByUserAndFriend(receiverUser, senderUser);
            }

            redisTemplate.opsForSet().remove(buildSentRequestKey(senderId), String.valueOf(receiverId));
            redisTemplate.opsForSet().remove(buildReceivedRequestKey(receiverId), String.valueOf(senderId));
            redisTemplate.delete(buildRequestKey(senderId, receiverId));

            redisTemplate.opsForSet().remove(buildSentRequestKey(receiverId), String.valueOf(senderId));
            redisTemplate.opsForSet().remove(buildReceivedRequestKey(senderId), String.valueOf(receiverId));
            redisTemplate.delete(buildRequestKey(receiverId, senderId));

            if(friend != null) {
                if(friend.getStatus().equals(FriendStatus.PENDING)){
                    friendRepository.deleteById(friend.getId());
                }
            }

            if(senderUser != null && senderUser.getPhone() != null) {
                String senderPhone = convertToInternationalFormat(senderUser.getPhone());
                String message = (receiverUser != null && receiverUser.getName() != null ? receiverUser.getName() : "Người dùng") + " đã từ chối lời mời kết bạn";
                
                messagingTemplate.convertAndSend(
                        "/topic/user/" + senderPhone + "/friend-reject",
                        message
                );
            }
            return true;
        }
        return false;
    }

    @Override
    @Scheduled(fixedRate = 900000000)
    public void syncFriendRequestsToDb() {
        Set<String> keys=redisTemplate.keys("friend:request:*");

        if(keys.isEmpty()) return;

        for(String key: keys){
            String[] parts=key.split(":");
            long senderId=Long.parseLong(parts[2]);
            long receiverId=Long.parseLong(parts[3]);

            Friend friend=Friend.builder()
                    .status(FriendStatus.PENDING)
                    .user(userService.findUserById(senderId))
                    .friend(userService.findUserById(receiverId))
                    .friendAt(OffsetDateTime.now().toLocalDateTime())
                    .build();

            friendRepository.save(friend);

            redisTemplate.opsForSet()
                    .remove(buildReceivedRequestKey(receiverId), String.valueOf(senderId));

            redisTemplate.opsForSet()
                    .remove(buildSentRequestKey(senderId), String.valueOf(receiverId));

            redisTemplate.delete(key);
        }
    }

    @Override
    public List<User> getFriendRequestOfUser(long userId) {
        User user = userService.findUserById(userId);
        if (user != null) {
            List<User> listUser = new ArrayList<>();
            Set<Long> addedUserIds = new HashSet<>();
            
            String receivedKey = buildReceivedRequestKey(userId);
            Set<String> senderIds = redisTemplate.opsForSet().members(receivedKey);
            
            if (senderIds != null) {
                for (String senderIdStr : senderIds) {

                        long senderId = Long.parseLong(senderIdStr);
                        User sender = userService.findUserById(senderId);
                        if (sender != null) {
                            listUser.add(sender);
                            addedUserIds.add(senderId);
                        }
                }
            }

            List<Friend> friends = friendRepository.findFriendsByFriend(user);
            for (Friend friend : friends) {
                if (FriendStatus.PENDING.equals(friend.getStatus())) {
                    long senderId = friend.getUser().getId();
                    if (!addedUserIds.contains(senderId)) {
                        User sender = userService.findUserById(senderId);
                        if (sender != null) {
                            listUser.add(sender);
                            addedUserIds.add(senderId);
                        }
                    }
                }
            }
            
            return listUser;
        }
        return new ArrayList<>();
    }

    @Override
    public List<User> getSentRequestsOfUser(long userId) {
        User user = userService.findUserById(userId);
        if (user != null) {
            List<User> listUser = new ArrayList<>();
            Set<Long> addedUserIds = new HashSet<>();
            
            // Get from Redis first (faster)
            String sentKey = buildSentRequestKey(userId);
            Set<String> receiverIds = redisTemplate.opsForSet().members(sentKey);
            
            if (receiverIds != null) {
                for (String receiverIdStr : receiverIds) {
                    long receiverId = Long.parseLong(receiverIdStr);
                    User receiver = userService.findUserById(receiverId);
                    if (receiver != null) {
                        listUser.add(receiver);
                        addedUserIds.add(receiverId);
                    }
                }
            }

            // Also check database for any pending requests where user is the sender
            List<Friend> friends = friendRepository.findFriendsByUser(user);
            for (Friend friend : friends) {
                if (FriendStatus.PENDING.equals(friend.getStatus())) {
                    long receiverId = friend.getFriend().getId();
                    if (!addedUserIds.contains(receiverId)) {
                        User receiver = userService.findUserById(receiverId);
                        if (receiver != null) {
                            listUser.add(receiver);
                            addedUserIds.add(receiverId);
                        }
                    }
                }
            }
            
            return listUser;
        }
        return new ArrayList<>();
    }

    @Override
    public List<User> getFriendsOfUser(long userId) {
        User user=userService.findUserById(userId);
        List<User> listUser=new ArrayList<>();
        if(user!=null){
            List<Friend> friends= friendRepository.findFriendsByUser(user);
            if (!friends.isEmpty()){
                for (Friend friend:friends){
                    if(FriendStatus.ACCEPTED.equals(friend.getStatus())){
                        User temp=userService.findUserById(friend.getFriend().getId());
                        listUser.add(temp);
                    }
                }

            }

            List<Friend> friendsMy= friendRepository.findFriendsByFriend(user);
            if (!friendsMy.isEmpty()){
                for (Friend friend:friendsMy){
                    if(FriendStatus.ACCEPTED.equals(friend.getStatus())){
                        User temp=userService.findUserById(friend.getUser().getId());
                        listUser.add(temp);
                    }
                }
            }

            return listUser;
        }
        return null;
    }

    @Override
    public List<Long> getAcceptedFriendIds(long userId) {
        if (userId <= 0) {
            return Collections.emptyList();
        }
        return friendRepository.findAcceptedFriendIds(userId, FriendStatus.ACCEPTED.ordinal());
    }

    private String buildSentRequestKey(long userId){
        return "user:"+userId+":sent_request";
    }

    private String buildReceivedRequestKey(long userId){
        return "user:"+userId+":received_request";
    }

    private String buildRequestKey(long senderId, long receivedId){
        return "friend:request:"+senderId+":"+receivedId;
    }


    private String convertToInternationalFormat(String phone) {
        if (phone == null || phone.isEmpty()) {
            return null;
        }
        
        if (phone.startsWith("+84")) {
            return phone;
        }
        
        if (phone.startsWith("0")) {
            return "+84" + phone.substring(1);
        }

        return "+84" + phone;
    }
}
