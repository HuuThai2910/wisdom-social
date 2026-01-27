/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Data
@Builder
public class CursorResponse<T> {
    private T data;                 // List<MessageResponse>
    private Instant nextCursor;     // createdAt của message cũ nhất
    private boolean hasNext;        // còn tin cũ không
}
