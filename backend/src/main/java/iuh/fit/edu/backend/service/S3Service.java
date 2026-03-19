package iuh.fit.edu.backend.service;

import iuh.fit.edu.backend.constant.UploadModule;
import iuh.fit.edu.backend.dto.response.PresignedUrlResponse;

import java.util.Map;

public interface S3Service {
    Map<String, String> generateUpdateUploadUrl(String type, long id, String extension);
    Map<String, String> generateUploadUrl(String type,String extension);



    PresignedUrlResponse generatePresignedUrl(UploadModule module, Long targetId, String type, String originalFilename, String contentType);

    void deleteByKey(String s3ObjectKey);

    String moveUploadUrl(String type, long id, String url);
}