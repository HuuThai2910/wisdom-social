/*
 * @ (#) S3Service.java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.service;

import org.springframework.web.multipart.MultipartFile;

/*
 * @description: S3 Service interface for file upload
 * @author: The Bao
 * @date: 31/01/2026
 * @version: 1.0
 */
public interface S3Service {
    String uploadFile(MultipartFile file, String folder);
    void deleteFile(String fileUrl);
}
