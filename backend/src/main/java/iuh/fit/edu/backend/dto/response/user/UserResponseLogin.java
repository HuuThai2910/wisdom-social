package iuh.fit.edu.backend.dto.response.user;

import iuh.fit.edu.backend.constant.Gender;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
@Data
@Builder
public class UserResponseLogin {
    private String phone;
    private String username;
    private Gender gender;
    private String birthday;
    private Instant createdAt;
    private String token;
    private String refreskToken;
    private String idToken;
}
