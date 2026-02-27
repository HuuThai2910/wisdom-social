/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.util;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.StringRedisTemplate;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Configuration
public class RedisTestConfig {

    @Bean
    CommandLineRunner testRedis(StringRedisTemplate redisTemplate) {
        return args -> {
            redisTemplate.opsForValue().set("hello", "redis");
            String value = redisTemplate.opsForValue().get("hello");
            System.out.println("Redis value = " + value);
        };
    }
}
