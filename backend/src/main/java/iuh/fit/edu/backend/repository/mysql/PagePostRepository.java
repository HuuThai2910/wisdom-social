package iuh.fit.edu.backend.repository.mysql;

import iuh.fit.edu.backend.domain.entity.mysql.PagePost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


@Repository
public interface PagePostRepository extends JpaRepository<PagePost,Long> {
    PagePost findByPostIdAndPage_Id(String postId, Long pageId);
}
