package iuh.fit.edu.backend.modules.user.repository;

import iuh.fit.edu.backend.modules.user.entity.Friend;
import iuh.fit.edu.backend.modules.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FriendRepository extends JpaRepository<Friend,Long> {
    Friend findFriendByFriendAndUser(User friend, User user);
    Friend findFriendByUserAndFriend(User user, User friend);
    List<Friend> findFriendsByUser(User user);

    List<Friend> findFriendsByFriend(User friend);

    @Query(value = """
        SELECT f.friend_id
        FROM friends f
        WHERE f.user_id = :userId AND f.status = :acceptedStatus
        UNION
        SELECT f.user_id
        FROM friends f
        WHERE f.friend_id = :userId AND f.status = :acceptedStatus
        """, nativeQuery = true)
    List<Long> findAcceptedFriendIds(@Param("userId") Long userId, @Param("acceptedStatus") int acceptedStatus);

    @Query(value = """
        SELECT COUNT(*)
        FROM friends f
        WHERE f.status = :acceptedStatus
          AND ((f.user_id = :userId1 AND f.friend_id = :userId2)
           OR (f.user_id = :userId2 AND f.friend_id = :userId1))
        """, nativeQuery = true)
    long countAcceptedFriendship(
        @Param("userId1") Long userId1,
        @Param("userId2") Long userId2,
        @Param("acceptedStatus") int acceptedStatus
    );
}
