package iuh.fit.edu.backend.service.s3.impl;

import iuh.fit.edu.backend.service.s3.S3Service;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CopyObjectRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@Slf4j
public class S3ServiceImpl implements S3Service {
    private final S3Presigner s3Presigner;
    private final S3Client s3Client;
    @Value("${aws.s3.bucket-name}")
    private String bucketName;
    private static final Set<String> ALLOWED_EXTENSIONS=
            Set.of("png","jpg","jpeg","mp4","webm","mov","avi","mkv");


    public S3ServiceImpl( S3Presigner s3Presigner,
                         S3Client s3Client
    ) {
        this.s3Presigner = s3Presigner;
        this.s3Client = s3Client;
    }

    @Override
    public Map<String, String> generateUpdateUploadUrl(String type, String id, String extension) {
        validateExtension(extension);
        String contentType = getContentType(extension);

        String uuid = UUID.randomUUID().toString();
        String basePath = getBasePath(type, extension);
        String key = basePath + "/" + id + "/" + uuid + "." + extension;

        PutObjectRequest putObjectRequest= PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(contentType)
                .build();

        PutObjectPresignRequest putObjectPresignRequest=
                PutObjectPresignRequest.builder()
                        .signatureDuration(Duration.ofMinutes(5))
                        .putObjectRequest(putObjectRequest)
                        .build();

        PresignedPutObjectRequest presignedPutObjectRequest=
                s3Presigner.presignPutObject(putObjectPresignRequest);

        Map<String,String> result=new HashMap<>();
        result.put("uploadUrl", presignedPutObjectRequest.url().toString());
        result.put("imageUrl",key);

        return result;
    }

    @Override
    public Map<String, String> generateUploadUrl(String type, String extension) {
        validateExtension(extension);
        String contentType=getContentType(extension);

        String uuid=UUID.randomUUID().toString();
        String basePath = getBasePath(type, extension);
        String key=basePath + "/temp/" + uuid + "." + extension;

        PutObjectRequest putObjectRequest=PutObjectRequest.builder()
                .key(key)
                .contentType(contentType)
                .bucket(bucketName)
                .build();

        PutObjectPresignRequest putObjectPresignRequest=
                PutObjectPresignRequest.builder()
                        .signatureDuration(Duration.ofMinutes(5))
                        .putObjectRequest(putObjectRequest)
                        .build();

        PresignedPutObjectRequest presignedPutObjectRequest=
                s3Presigner.presignPutObject(putObjectPresignRequest);

        Map<String,String> result=new HashMap<>();
        result.put("uploadUrl", presignedPutObjectRequest.url().toString());
        result.put("imageUrl",key);
        result.put("uuid",uuid);
        result.put("extension",extension);

        return result;
    }

    @Override
    public String moveUploadUrl(String type, String id, String url) {
        log.info("Moving upload from temp to final location. Type: {}, ID: {}, URL: {}", type, id, url);
        
        String uuid = url.substring(0, url.lastIndexOf("."));
        String extension = url.substring(url.lastIndexOf(".") + 1);
        String basePath = getBasePath(type, extension);

        CopyObjectRequest copyRequest = CopyObjectRequest.builder()
                .sourceBucket(bucketName)
                .sourceKey(basePath + "/temp/" + uuid + "." + extension)
                .destinationBucket(bucketName)
                .destinationKey(basePath + "/" + id + "/" + uuid + "." + extension)
                .build();

        s3Client.copyObject(copyRequest);
        log.info("Copied from temp to: {}", basePath + "/" + id + "/" + uuid + "." + extension);

        s3Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(bucketName)
                .key(basePath + "/temp/" + uuid + "." + extension)
                .build());
        log.info("Deleted temp file");

        return basePath + "/" + id + "/" + uuid + "." + extension;
    }

    public void validateExtension(String extension){
        if(!ALLOWED_EXTENSIONS.contains(extension)){
            throw new RuntimeException("Invalid file type");
        }
    }

    public String getContentType(String extension) {
        if (extension == null) return "application/octet-stream";
        
        switch (extension.toLowerCase()) {
            case "png":
                return "image/png";
            case "jpg":
            case "jpeg":
                return "image/jpeg";
            case "mp4":
                return "video/mp4";
            case "webm":
                return "video/webm";
            case "mov":
                return "video/quicktime";
            case "avi":
                return "video/x-msvideo";
            case "mkv":
                return "video/x-matroska";
            default:
                return "application/octet-stream";
        }
    }
    
    /**
     * Determine if extension is video type
     */
    private boolean isVideoExtension(String extension) {
        if (extension == null) return false;
        Set<String> videoExts = Set.of("mp4", "webm", "mov", "avi", "mkv");
        return videoExts.contains(extension.toLowerCase());
    }

    /**
     * Get base path for different content types
     * @param type content type (avatar, posts, cover, story, etc.)
     * @param extension file extension to determine if video or image
     * @return base path in S3
     */
    public String getBasePath(String type, String extension) {
        // Determine media folder based on file type
        String mediaFolder = isVideoExtension(extension) ? "videos" : "images";
        
        if (type != null) {
            switch (type.toLowerCase()) {
                case "avatar":
                case "cover":
                case "profile":
                    return mediaFolder + "/avatars";
                case "posts":
                case "post":
                    return mediaFolder + "/posts";
                case "story":
                case "stories":
                    return mediaFolder + "/stories";
                case "group":
                    return mediaFolder + "/group/posts";
                case "page":
                    return mediaFolder + "/page/posts";
                default:
                    return mediaFolder + "/uploads"; // Default base path
            }
        }
        return mediaFolder + "/uploads";
    }
}
