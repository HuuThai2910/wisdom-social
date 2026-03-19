/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.controller;

import iuh.fit.edu.backend.constant.UploadModule;
import iuh.fit.edu.backend.dto.response.PresignedUrlResponse;
import iuh.fit.edu.backend.service.S3Service;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final S3Service s3Service;

    @GetMapping("/presigned-url")
    public ResponseEntity<PresignedUrlResponse> getPresignedUrl(
            @RequestParam("module") UploadModule module, // Truyền CONVERSATION, USER, hoặc POST
            @RequestParam("targetId") Long targetId,
            @RequestParam("type") String type, // "IMAGE", "VIDEO", "FILE"
            @RequestParam("fileName") String fileName,
            @RequestParam("contentType") String contentType
    ) {
        PresignedUrlResponse presignedData = s3Service.generatePresignedUrl(module, targetId, type, fileName, contentType);
        return ResponseEntity.ok(presignedData);
    }
}
