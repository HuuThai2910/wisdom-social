/*
 * @ (#) LoginResponse.java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/*
 * @description: Login response DTO
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {
    private Long userId;
    private String username;
    private String name;
    private String avatarUrl;
    private String bio;
    private String phone;
    private LocalDateTime createdAt;
    private String message;
}
