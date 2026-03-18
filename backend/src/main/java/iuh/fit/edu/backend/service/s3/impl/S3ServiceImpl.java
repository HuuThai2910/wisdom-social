package iuh.fit.edu.backend.service.s3.impl;

import iuh.fit.edu.backend.service.s3.S3Service;
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
public class S3ServiceImpl implements S3Service {
    private final S3Presigner s3Presigner;
    private final S3Client s3Client;
    @Value("${aws.s3.bucket-name}")
    private String bucketName;
    private static final Set<String> ALLOWED_EXTENSIONS=
            Set.of("png","jpg","jpeg");


    public S3ServiceImpl( S3Presigner s3Presigner,
                         S3Client s3Client
    ) {
        this.s3Presigner = s3Presigner;
        this.s3Client = s3Client;
    }

    @Override
    public Map<String, String> generateUpdateUploadUrl(String type,long id,String extension) {

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
