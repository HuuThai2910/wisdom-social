package iuh.fit.edu.backend.dto.request.post;

import lombok.Data;

@Data
public class MediaUploadMetadataRequest {
    private Long duration;
    private Integer width;
    private Integer height;
    private Long fileSize;
    private String mimeType;
    private String originalFileName;
}
