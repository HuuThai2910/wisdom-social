package iuh.fit.edu.backend.dto.request.user;

import lombok.Data;

@Data
public class UserRequestLogin {
    private String phone;
    private String password;
}
