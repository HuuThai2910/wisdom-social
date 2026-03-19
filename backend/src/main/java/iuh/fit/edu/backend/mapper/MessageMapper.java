/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.mapper;

import iuh.fit.edu.backend.constant.MessageType;
import iuh.fit.edu.backend.domain.entity.nosql.Message;
import iuh.fit.edu.backend.dto.response.message.MessageResponse;
import org.mapstruct.AfterMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.springframework.beans.factory.annotation.Value;

import java.util.List;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Mapper(componentModel = "spring")
public abstract class MessageMapper {

    // 1. Tiêm biến đường link S3 hoặc CDN từ application.yml vào đây
    // Dấu ':' cung cấp giá trị mặc định nếu trong file yml bạn quên cấu hình
    @Value("${app.cdn-domain}")
    protected String cdnDomain;

    // 2. MapStruct vẫn tự động map tự động các trường như cũ
    @Mapping(target = "senderName", ignore = true)
    @Mapping(target = "senderAvatar", ignore = true)
    @Mapping(source = "messageType", target = "type")
    public abstract MessageResponse toMessageResponse(Message message);

    // 3. Logic tùy biến chạy NGAY SAU KHI MapStruct map xong
    @AfterMapping
    protected void customizeContent(Message message, @MappingTarget MessageResponse response) {
        // Nếu không phải TEXT và content không rỗng (chưa bị thu hồi)
        if (message.getMessageType() != MessageType.TEXT &&
                message.getContent() != null &&
                !message.getContent().isEmpty()) {

            // Nối chuỗi Domain với S3 Key
            response.setContent(cdnDomain + message.getContent());
        }
    }
}
