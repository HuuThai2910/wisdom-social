package iuh.fit.edu.backend.service.notification;

import iuh.fit.edu.backend.domain.entity.nosql.Notification;
import iuh.fit.edu.backend.event.notification.NotificationEvent;

import java.util.List;

public interface NotificationService {
    void createNotification(NotificationEvent event);
    List<Notification> getNotifications(String userId, int page, int size);
    long getUnreadCount(String userId);
    void markAsRead(String notificationId, String userId);
}
