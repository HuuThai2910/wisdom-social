package iuh.fit.edu.backend.service.impl;

import iuh.fit.edu.backend.constant.UploadModule;
import iuh.fit.edu.backend.dto.response.PresignedUrlResponse;
import iuh.fit.edu.backend.service.S3Service;
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

import java.net.URL;
import java.time.Duration;
import java.util.*;

@Service
@Slf4j
public class S3ServiceImpl implements S3Service {
    private final S3Presigner s3Presigner;
    private final S3Client s3Client;
//    private final UserService userService;
//    private final PageService pageService;
    @Value("${aws.s3.bucket-name}")
    private String bucketName;
    private static final Set<String> ALLOWED_EXTENSIONS=
            Set.of("png","jpg","jpeg" );


    public S3ServiceImpl( S3Presigner s3Presigner,
                         S3Client s3Client
    ) {
//        this.pageService = pageService;
        this.s3Presigner = s3Presigner;
//        this.userService = userService;
        this.s3Client = s3Client;
    }

    @Override
    public Map<String, String> generateUpdateUploadUrl(String type, long id, String extension) {

        validateExtension(extension);
        String contentType=getContentType(extension);

        String uuid= UUID.randomUUID().toString();
        String key="images/avatars/" + type + "/" + id + "/" + uuid + "." + extension;

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
        String key="images/avatars/" + type + "/" + "temp" + "/" + uuid + "." + extension;

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
    /**
     * Hàm sinh URL dùng chung cho TOÀN BỘ DỰ ÁN
     * @param module: CONVERSATION, USER, hoặc POST
     * @param targetId: ID của Conversation, ID của User, hoặc ID của Post
     * @param type: IMAGE, VIDEO, FILE
     */
    @Override
    public PresignedUrlResponse generatePresignedUrl(UploadModule module, Long targetId, String type, String originalFilename, String contentType) {

        // Xử lý đuôi file (extension)
        List<String> blockedExtensions = Arrays.asList(".exe", ".sh", ".bat", ".cmd", ".msi", ".js", ".html");
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();
            if (blockedExtensions.contains(extension)) {
                throw new IllegalArgumentException("File bạn chọn có định dạng không hợp lệ");
            }
        }
        // Xác định thư mục con (images, videos, files)
        String subFolder = switch (type.toUpperCase()) {
            case "IMAGE" -> "images";
            case "VIDEO" -> "videos";
            case "FILE" -> "files";
            case "AUDIO" -> "audios";
            default -> "others";
        };

        // ĐIỀU HƯỚNG THƯ MỤC GỐC DỰA VÀO MODULE
        String rootFolder = switch (module) {
            case CONVERSATION -> "conversations";
            case USER -> "users";
            case POST -> "posts";
        };

        // TẠO S3 OBJECT KEY
        // Quy hoạch file gọn gàng: {rootFolder}/{targetId}/{subFolder}/{uuid}.ext
        // Ví dụ: users/15/images/abc-xyz.jpg
        // Ví dụ: posts/99/videos/def-123.mp4
        String uuid = UUID.randomUUID().toString();
        String s3ObjectKey = String.format("%s/%d/%s/%s%s", rootFolder, targetId, subFolder, uuid, extension);

        try {
            // ạo PutObjectRequest (Cấu hình file tải lên)
            PutObjectRequest objectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3ObjectKey)
                    .contentType(contentType)
                    .build();

            // Cấp quyền upload trong 15 phút
            PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofMinutes(15)) // URL sống trong 15 phút
                    .putObjectRequest(objectRequest)
                    .build();

            // 6. Sinh Presigned URL
            PresignedPutObjectRequest presignedRequest = s3Presigner.presignPutObject(presignRequest);
            URL presignedUrl = presignedRequest.url();

            return PresignedUrlResponse.builder()
                    .presignedUrl(presignedUrl.toString())
                    .objectKey(s3ObjectKey)
                    .fileName(originalFilename)
                    .build();

        } catch (Exception e) {
            log.error("Lỗi khi tạo Presigned URL bằng SDK v2: {}", e.getMessage(), e);
            throw new RuntimeException("Không thể khởi tạo phiên tải lên");
        }
    }
    @Override
    public void deleteByKey(String s3ObjectKey) {
        if (s3ObjectKey == null || s3ObjectKey.trim().isEmpty() || !s3ObjectKey.startsWith("conversations/")) return;
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucketName).key(s3ObjectKey).build());
            log.info("Đã xóa file S3: {}", s3ObjectKey);
        } catch (Exception e) {
            log.error("Lỗi xóa file S3: {}", e.getMessage()); // Nuốt lỗi để không block luồng thu hồi
        }
    }

    @Override
    public String moveUploadUrl(String type,long id, String url) {
        String uuid = url.substring(0, url.lastIndexOf("."));
        String extension = url.substring(url.lastIndexOf(".") + 1);

        CopyObjectRequest copyRequest = CopyObjectRequest.builder()
                .sourceBucket(bucketName)
                .sourceKey("images/avatars/"+type+"/temp/" + uuid + "."+extension)
                .destinationBucket(bucketName)
                .destinationKey("images/avatars/"+type+"/" + id + "/" + uuid + "."+extension)
                .build();

        s3Client.copyObject(copyRequest);

        s3Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(bucketName)
                .key("images/avatars/"+type+"/temp/" + uuid + "."+extension)
                .build());

        return "images/avatars/"+type+"/" + id + "/" + uuid + "."+extension;
    }

    public void validateExtension(String extension){
        if(!ALLOWED_EXTENSIONS.contains(extension)){
            throw new RuntimeException("Invalid file type");
        }
    }

    public String getContentType(String extension) {
        if (extension.equalsIgnoreCase("png")) {
            return "image/png";
        }
        return "image/jpeg";
    }
}