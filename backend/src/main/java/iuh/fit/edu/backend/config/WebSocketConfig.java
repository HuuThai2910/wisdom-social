/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // "/ws" là endpoint để React kết nối vào (Handshake)
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*") // Cho phép React (localhost:3000) kết nối
                .withSockJS(); // Hỗ trợ fallback nếu trình duyệt không có WebSocket
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Prefix cho các tin nhắn từ Client gửi lên Server
        registry.setApplicationDestinationPrefixes("/app");

        // Prefix cho các tin nhắn từ Server đẩy xuống Client
        // /topic -> broadcast cho nhiều người dùng (group chat)
        // /queue -> point-to-point (tin nhắn cá nhân)_
        registry.enableSimpleBroker("/topic", "/queue");
    }
}
