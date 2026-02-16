package iuh.fit.edu.backend.service.impl.user;

import iuh.fit.edu.backend.domain.entity.mysql.Friend;
import iuh.fit.edu.backend.domain.entity.mysql.User;
import org.springframework.scheduling.annotation.Scheduled;

import java.util.List;

public interface FriendService {
    boolean sendFriendRequest(long senderId, long receiverId);
    boolean acceptFriendRequest(long senderId, long receiverId);
    boolean cancelFriendRequest(long senderId, long receiverId);
    boolean rejectFriendRequest(long senderId, long receiverId);
//    @Scheduled
    void syncFriendRequestsToDb();
    List<User> getFriendRequestOfUser(long userId);
    List<User> getFriendsOfUser(long userId);
}
