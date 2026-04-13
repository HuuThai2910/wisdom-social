package iuh.fit.edu.backend.service.s3;

import iuh.fit.edu.backend.constant.UploadModule;
import iuh.fit.edu.backend.dto.response.PresignedUrlResponse;

import java.util.Map;

public interface S3Service {
    Map<String, String> generateUpdateUploadUrl(String type, String id, String extension);
    Map<String, String> generateUploadUrl(String type, String extension);
    String moveUploadUrl(String type, String id, String url);
    String getContentType(String extension);
    String resolveMediaType(String extension);

    PresignedUrlResponse generatePresignedUrl(UploadModule module, String targetId, String type, String originalFilename, String contentType);

    void deleteByKey(UploadModule module, String s3ObjectKey);
}
