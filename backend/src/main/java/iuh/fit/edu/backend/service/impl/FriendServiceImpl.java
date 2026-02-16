package iuh.fit.edu.backend.service.impl;

import iuh.fit.edu.backend.constant.FriendStatus;
import iuh.fit.edu.backend.domain.entity.mysql.Friend;
import iuh.fit.edu.backend.domain.entity.mysql.User;
import iuh.fit.edu.backend.repository.mysql.FriendRepository;
import iuh.fit.edu.backend.service.impl.user.FriendService;
import iuh.fit.edu.backend.service.impl.user.UserService;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/*
 * @description
 * @author: Ngoc Hai
 * @date:
 * @version: 1.0
 */
@Service
public class FriendServiceImpl implements FriendService {
    StringRedisTemplate redisTemplate;
    SimpMessagingTemplate messagingTemplate;
    FriendRepository friendRepository;
    UserService userService;

    public FriendServiceImpl(FriendRepository friendRepository,
                             SimpMessagingTemplate messagingTemplate, StringRedisTemplate redisTemplate, UserService userService) {
        this.friendRepository = friendRepository;
        this.messagingTemplate = messagingTemplate;
        this.redisTemplate = redisTemplate;
        this.userService = userService;
    }

    @Override
    public boolean sendFriendRequest(long senderId, long receiverId) {
        String sentKey=buildSentRequestKey(senderId);
        String recievedKey=buildReceivedRequestKey(receiverId);
        String requestKey=buildRequestKey(senderId,receiverId);

        if(senderId>0 && receiverId>0){
            //save redis
            redisTemplate.opsForSet().add(sentKey, String.valueOf(receiverId));
            redisTemplate.opsForSet().add(recievedKey, String.valueOf(senderId));
            redisTemplate.opsForValue().set(requestKey,FriendStatus.PENDING.toString(), Duration.ofDays(7));
            //push websocket
            messagingTemplate.convertAndSendToUser(
                    "+84398723346",
                    "/queue/friend-request",
                    "Bạn có lời mời kết bạn"
            );

            return true;
        }
        return false;
    }

    @Override
    public boolean acceptFriendRequest(long senderId, long receiverId) {
        if(senderId>0 && receiverId>0){
            // 1. Xóa Redis
            redisTemplate.opsForSet()
                    .remove(buildReceivedRequestKey(senderId), String.valueOf(receiverId));

            redisTemplate.opsForSet()
                    .remove(buildSentRequestKey(receiverId), String.valueOf(senderId));

            redisTemplate.delete(buildRequestKey(receiverId,senderId));

            // 2. Lưu DB
            Friend friend=Friend.builder()
                    .status(FriendStatus.ACCEPTED)
                    .user(userService.findUserById(senderId))
                    .friend(userService.findUserById(receiverId))
                    .friendAt(OffsetDateTime.now().toLocalDateTime())
                    .build();
            friendRepository.save(friend);

            // 3. Push realtime cho sender
            messagingTemplate.convertAndSendToUser(
                    "+84398723346",
                    "/queue/friend-accept",
                    "Lời mời của bạn đã được chấp nhận"
            );
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

            if(friend==null){
                redisTemplate.opsForSet().remove(buildSentRequestKey(senderId),String.valueOf(receiverId));
                redisTemplate.opsForSet().remove(buildReceivedRequestKey(receiverId),String.valueOf(senderId));
                redisTemplate.delete(buildRequestKey(senderId,receiverId));
            }else {
                if(friend.getStatus().equals(FriendStatus.PENDING)){
                    friendRepository.deleteById(friend.getId());
                }
            }

            messagingTemplate.convertAndSendToUser(
                    "+84398723346",
                    "/queue/friend-cancel",
                    "Hủy lời mời kết bạn thành công"
            );
            return true;
        }
        return false;
    }

    @Override
    public boolean rejectFriendRequest(long senderId, long receiverId) {
        if(senderId>0 && receiverId >0){
            Friend friend=friendRepository.findFriendByFriendAndUser(
                    userService.findUserById(senderId),
                    userService.findUserById(receiverId)
            );

            if(friend==null){
                redisTemplate.opsForSet().remove(buildSentRequestKey(receiverId),String.valueOf(senderId));
                redisTemplate.opsForSet().remove(buildReceivedRequestKey(senderId),String.valueOf(receiverId));
                redisTemplate.delete(buildRequestKey(receiverId,senderId));
            }else {
                if(friend.getStatus().equals(FriendStatus.PENDING)){
                    friendRepository.deleteById(friend.getId());
                }
            }

            messagingTemplate.convertAndSendToUser(
                    "+84398723346",
                    "/queue/friend-reject",
                    "Từ chối kết bạn thành công"
            );
            return true;
        }
        return false;
    }

    @Override
    @Scheduled(fixedRate = 900000000)
    public void syncFriendRequestsToDb() {
        Set<String> keys=redisTemplate.keys("friend:request:*");

        if(keys==null) return;

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
        User user=userService.findUserById(userId);
        if(user!=null){
            List<Friend> friends= friendRepository.findFriendsByUser(user);
            List<User> listUser=new ArrayList<>();
            for (Friend friend:friends){
                if(FriendStatus.PENDING.equals(friend.getStatus())){
                    User temp=userService.findUserById(friend.getFriend().getId());
                    listUser.add(temp);
                }
            }
            return listUser;
        }
        return null;
    }

    @Override
    public List<User> getFriendsOfUser(long userId) {
        User user=userService.findUserById(userId);
        if(user!=null){
            List<Friend> friends= friendRepository.findFriendsByUser(user);
            List<User> listUser=new ArrayList<>();
            for (Friend friend:friends){
                if(FriendStatus.ACCEPTED.equals(friend.getStatus())){
                    User temp=userService.findUserById(friend.getFriend().getId());
                    listUser.add(temp);
                }
            }
            return listUser;
        }
        return null;
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
}
