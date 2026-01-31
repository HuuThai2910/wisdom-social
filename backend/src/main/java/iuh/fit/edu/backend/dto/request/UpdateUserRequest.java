/*
 * @ (#) UpdateUserRequest.java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.dto.request;

import iuh.fit.edu.backend.constant.Gender;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/*
 * @description DTO for updating user profile
 * @author: Huu Thai
 * @date: 27/01/2026
 * @version: 1.0
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRequest {
    private String fullName;
    private String bio;
    private String avatarUrl;
    private Gender gender;
}
