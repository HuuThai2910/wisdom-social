package iuh.fit.edu.backend.service.user;

import iuh.fit.edu.backend.domain.entity.mysql.User;

public interface UserSettingService {
    User getProfileUser(long id);
}
