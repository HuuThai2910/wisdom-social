/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.dto.response.conversation;

import lombok.*;

import java.io.Serializable;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class MemberInfoResponse {
    private Long userId;
    private String username; // Tên user
    private String nickname; // Tên trong nhóm
    private String avatarUrl;
}
