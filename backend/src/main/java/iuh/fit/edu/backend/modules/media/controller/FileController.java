/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.modules.media.controller;

import iuh.fit.edu.backend.common.dto.response.BulkPresignedRequest;
import iuh.fit.edu.backend.common.dto.response.PresignedUrlResponse;

import iuh.fit.edu.backend.common.service.s3.S3Service;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    @PostMapping("/presigned-url")
    public ResponseEntity<List<PresignedUrlResponse>> getBulkPresignedUrls(
            @RequestBody BulkPresignedRequest request) {
        return ResponseEntity.ok(s3Service.generateMultiplePresignedUrls(request));
    }
}
