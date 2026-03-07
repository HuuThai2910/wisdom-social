package iuh.fit.edu.backend.service.s3;

import java.util.Map;

public interface S3Service {
    Map<String, String> generateUpdateUploadUrl(String type,long id,String extension);
    Map<String, String> generateUploadUrl(String type,String extension);
    String moveUploadUrl(String type,long id,String url);
}
