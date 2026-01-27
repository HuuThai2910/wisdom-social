/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.repository.mysql;

import iuh.fit.edu.backend.domain.entity.mysql.Conversation;
import iuh.fit.edu.backend.domain.entity.mysql.ConversationMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Repository
public interface ConversationUserRepository extends JpaRepository<ConversationMember, Long> {
    Optional<ConversationMember> findByConversation_IdAndUser_Id(Long conversationId, Long userId);

    // Lay danh sach cuoc hoi thoai ma user tham gia
    @Query("select cv.conversation from ConversationMember cv where cv.user.id = :userId")
    List<Conversation> findConversationsByUserId(@Param("userId") Long userId);
}
