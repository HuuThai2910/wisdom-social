/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.config;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.annotation.PropertyAccessor;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.databind.jsontype.impl.LaissezFaireSubTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import iuh.fit.edu.backend.dto.response.message.MessageResponse;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cache.CacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.*;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.Duration;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
//  Dùng redis đề quản lý toàn bộ cache trong hệ thống
@Configuration
public class RedisConfig {

    /**
     * RedisTemplate dùng cho cho message response
     * (MessageCacheService, opsForList, opsForValue, ...)
     */
    @Bean
    public RedisTemplate<String, MessageResponse> messageRedisTemplate(
            RedisConnectionFactory factory
    ) {
        RedisTemplate<String, MessageResponse> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);

        ObjectMapper mapper = JsonMapper.builder()
                .addModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .build();

        Jackson2JsonRedisSerializer<MessageResponse> valueSerializer =
                new Jackson2JsonRedisSerializer<>(mapper, MessageResponse.class);

        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(valueSerializer);

        template.afterPropertiesSet();
        return template;
    }

    /**
     * RedisCacheManager áp dụng cho:
     * @Cacheable, @CachePut, @CacheEvict
     */
    @Bean
    public RedisCacheManager redisCacheManager(
            RedisConnectionFactory connectionFactory) {

        RedisCacheConfiguration cacheConfig =
                RedisCacheConfiguration.defaultCacheConfig()
                        .serializeKeysWith(
                                RedisSerializationContext.SerializationPair
                                        .fromSerializer(new StringRedisSerializer()))
                        .serializeValuesWith(
                                RedisSerializationContext.SerializationPair
                                        .fromSerializer(
                                                new GenericJackson2JsonRedisSerializer()))
                        .entryTtl(Duration.ofMinutes(30));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(cacheConfig)
                .build();
    }


}

