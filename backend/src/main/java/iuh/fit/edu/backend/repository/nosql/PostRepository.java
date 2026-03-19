package iuh.fit.edu.backend.repository.nosql;

import iuh.fit.edu.backend.domain.entity.nosql.Post;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PostRepository extends MongoRepository<Post,String> {
}
