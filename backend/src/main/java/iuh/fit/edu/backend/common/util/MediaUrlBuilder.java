package iuh.fit.edu.backend.common.util;

import iuh.fit.edu.backend.modules.chat.constant.MessageType;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;
@Component
public class MediaUrlBuilder {

    @Value("${app.cdn-domain}")
    private String cdnDomain;

    public String build(String url, MessageType type) {
        if (url == null || url.isEmpty()) return url;

        if (isMedia(type)) {
            return cdnDomain + url;
        }
        return url;
    }

    public String buildAttachment(String url) {
        if (url == null || url.isEmpty()) return url;
        return cdnDomain + url;
    }

    private boolean isMedia(MessageType type) {
        return type == MessageType.IMAGE
                || type == MessageType.VIDEO
                || type == MessageType.FILE
                || type == MessageType.AUDIO;
    }
}