package iuh.fit.edu.backend.service.impl.user;

import iuh.fit.edu.backend.domain.entity.mysql.User;
import iuh.fit.edu.backend.dto.request.user.UserRequestConfirmRegister;
import iuh.fit.edu.backend.dto.request.user.UserRequestForgotPassword;
import iuh.fit.edu.backend.dto.request.user.UserRequestLogin;
import iuh.fit.edu.backend.dto.request.user.UserRequestRegister;
import iuh.fit.edu.backend.dto.request.user.UserRequestResetPassword;
import iuh.fit.edu.backend.dto.response.user.UserResponseConfirmRegister;
import iuh.fit.edu.backend.dto.response.user.UserResponseLogin;
import iuh.fit.edu.backend.dto.response.user.UserResponseOTPPassword;
import iuh.fit.edu.backend.dto.response.user.UserResponseRegister;


public interface UserService {
    UserResponseRegister registerUser(UserRequestRegister register);
    UserResponseConfirmRegister confirmRegisterUser(UserRequestConfirmRegister confirm);
    UserResponseLogin loginUser(UserRequestLogin login);
    void logoutUser(String idToken, String refreshToken);
    User getCurrentUser();
    String getNewAccessToken(String refreshToken);
    UserResponseOTPPassword forgotPasswordUser(UserRequestForgotPassword requestForgotPassword);
    boolean resetPassword(UserRequestResetPassword requestResetPassword);

}
