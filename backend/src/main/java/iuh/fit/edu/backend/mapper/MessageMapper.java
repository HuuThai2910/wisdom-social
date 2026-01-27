/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.mapper;

import iuh.fit.edu.backend.domain.entity.nosql.Message;
import iuh.fit.edu.backend.dto.response.message.MessageResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Mapper(componentModel = "spring")
public interface MessageMapper {
    @Mapping(target = "senderName", ignore = true)
    MessageResponse toMessageReponse(Message message);
}
