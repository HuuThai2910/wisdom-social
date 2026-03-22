package iuh.fit.edu.backend.service.user;

import iuh.fit.edu.backend.domain.entity.mysql.Session;
import iuh.fit.edu.backend.dto.request.user.UserRequestQRLogin;
import iuh.fit.edu.backend.dto.response.user.UserResponseLogin;
import iuh.fit.edu.backend.dto.response.user.UserResponseScanQRLogin;

public interface SessionService {
    String requestQrLogin();
    UserResponseScanQRLogin scanQRLogin(String session_id, long id, String refreshToken);
    UserResponseLogin scanQRConfirmed(UserRequestQRLogin request, String refreshToken);
    Session scanQRRejected(String session_id);
    UserResponseScanQRLogin getQRLoginStatus(String session_id);
}
