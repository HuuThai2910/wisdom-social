package iuh.fit.edu.backend.service.security;

import iuh.fit.edu.backend.domain.entity.mysql.User;

public interface AccountLockService {
    void systemLock(User user, String reason, int lockMinutes);
    void adminLock(Long userId, String reason);
    void adminUnlock(Long userId);
    boolean isLocked(User user);
    long getRemainingLockSeconds(User user);
}
