package iuh.fit.edu.backend.repository.mysql;

import iuh.fit.edu.backend.domain.entity.mysql.PageMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PageMemberRepository extends JpaRepository<PageMember,Long> {
    PageMember findPageMemberByPage_IdAndUser_Id(Long pageId, Long userId);
}
