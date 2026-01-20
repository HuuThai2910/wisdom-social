/*
 * @ (#) MongoIndexConfig.java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.IndexOperations;

import java.util.concurrent.TimeUnit;

/**
 * @description: MongoDB Index Configuration
 * QUAN TRỌNG: TTL auto-delete đã bị TẮT - Dữ liệu được giữ lại vĩnh viễn
 * expireAt field chỉ dùng để đánh dấu thời gian hết hạn, KHÔNG tự động xóa
 * Sử dụng soft delete hoặc archive process thay vì TTL
 * @author: Thế Bảo
 * @date: 2026-01-20
 * @version: 1.0
 */
@Configuration
@RequiredArgsConstructor
@Slf4j
public class MongoIndexConfig {

    private final MongoTemplate mongoTemplate;

    @PostConstruct
    public void initIndexes() {
        log.info("Initializing MongoDB indexes...");

        try {
            // TTL AUTO-DELETE đã bị TẮT theo yêu cầu
            // Tất cả dữ liệu sẽ được giữ lại trong database
            // expireAt field chỉ để đánh dấu logic, KHÔNG tự động xóa
            
            /* COMMENT OUT TTL INDEXES - Không xóa dữ liệu tự động
            // Story - 24 hours TTL
            createTTLIndex("stories", "expireAt", 24, TimeUnit.HOURS);

            // Story Views - 48 hours TTL
            createTTLIndex("story_views", "expireAt", 48, TimeUnit.HOURS);

            // Notes - 24 hours TTL
            createTTLIndex("notes", "expireAt", 24, TimeUnit.HOURS);

            // Notifications - 90 days TTL
            createTTLIndex("notifications", "expireAt", 90, TimeUnit.DAYS);

            // Hashtag Trending - 30 days TTL
            createTTLIndex("hashtag_trending", "expireAt", 30, TimeUnit.DAYS);
            */

            log.info("MongoDB indexes initialized successfully (TTL disabled - data retained permanently)");
        } catch (Exception e) {
            log.error("Error initializing MongoDB indexes", e);
        }
    }

    /**
     * Tạo TTL index cho collection
     *
     * @param collectionName Tên collection
     * @param fieldName      Field chứa expire time
     * @param duration       Thời gian TTL
     * @param timeUnit       Đơn vị thời gian
     */
    
    private void createTTLIndex(String collectionName, String fieldName, long duration, TimeUnit timeUnit) {
        try {
            IndexOperations indexOps = mongoTemplate.indexOps(collectionName);

            // Tạo TTL index
            Index index = new Index()
                    .on(fieldName, Sort.Direction.ASC)
                    .expire(duration, timeUnit)
                    .named(fieldName + "_ttl_idx");

            // ensureIndex is deprecated but still functional and safe to use
            // Alternative: Manual index creation via MongoDB shell or migration scripts
            indexOps.createIndex(index);

            log.info("Created TTL index for collection '{}' on field '{}' with TTL {} {}",
                    collectionName, fieldName, duration, timeUnit.toString().toLowerCase());
        } catch (Exception e) {
            log.warn("Failed to create TTL index for collection '{}': {}",
                    collectionName, e.getMessage());
        }
    }
}
