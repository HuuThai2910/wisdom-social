/*
 * @ (#) LoginRequest.java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/*
 * @description: Login request DTO - temporary without password
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Data
public class LoginRequest {
    @NotBlank(message = "Username không được để trống")
    private String username;
}
