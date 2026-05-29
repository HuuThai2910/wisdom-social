package iuh.fit.edu.backend.common.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "esms")
public class EsmsProperties {
    private String baseUrl = "https://rest.esms.vn";
    private String apiKey;
    private String secretKey;
    private String brandname;
    private String message = "{OTP} la ma xac minh dang ky Wisdom Social cua ban";
    private int timeAlive = 5;
    private int numCharOfCode = 6;
    private boolean numberOnly = true;
    private Duration timeout = Duration.ofSeconds(15);
}
