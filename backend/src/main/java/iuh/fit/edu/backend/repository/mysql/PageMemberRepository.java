package iuh.fit.edu.backend.repository.mysql;

import iuh.fit.edu.backend.domain.entity.mysql.PageMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PageMemberRepository extends JpaRepository<PageMember,Long> {
    PageMember findPageMemberByPage_IdAndUser_Id(Long pageId, Long userId);
    List<PageMember> findByPage_Id(Long pageId);

    void deletePageMemberById(Long id);
}
