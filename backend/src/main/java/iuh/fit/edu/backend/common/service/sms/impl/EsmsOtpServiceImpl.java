package iuh.fit.edu.backend.common.service.sms.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.edu.backend.common.config.EsmsProperties;
import iuh.fit.edu.backend.common.exception.ExternalSmsServiceException;
import iuh.fit.edu.backend.common.service.sms.EsmsOtpService;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

@Service
public class EsmsOtpServiceImpl implements EsmsOtpService {
    private static final String SUCCESS_CODE = "100";

    private final WebClient esmsWebClient;
    private final EsmsProperties esmsProperties;
    private final ObjectMapper objectMapper;

    public EsmsOtpServiceImpl(WebClient.Builder webClientBuilder,
                              EsmsProperties esmsProperties,
                              ObjectMapper objectMapper) {
        this.esmsProperties = esmsProperties;
        this.objectMapper = objectMapper;
        this.esmsWebClient = webClientBuilder
                .baseUrl(esmsProperties.getBaseUrl())
                .build();
    }

    @Override
    public void sendRegisterOtp(String phone) {
        validateConfig();

        JsonNode response = callEsms("/MainService.svc/json/SendMessageAutoGenCode_V4_get", uriBuilder ->
                uriBuilder
                        .queryParam("Phone", normalizePhoneForEsms(phone))
                        .queryParam("ApiKey", esmsProperties.getApiKey())
                        .queryParam("SecretKey", esmsProperties.getSecretKey())
                        .queryParam("TimeAlive", esmsProperties.getTimeAlive())
                        .queryParam("NumCharOfCode", esmsProperties.getNumCharOfCode())
                        .queryParam("Brandname", esmsProperties.getBrandname())
                        .queryParam("Type", 2)
                        .queryParam("message", esmsProperties.getMessage())
                        .queryParam("IsNumber", esmsProperties.isNumberOnly() ? 1 : 0)
                        .build());

        if (!SUCCESS_CODE.equals(response.path("CodeResult").asText())) {
            throw new ExternalSmsServiceException("ESMS gui OTP that bai: " + extractErrorMessage(response));
        }
    }

    @Override
    public boolean verifyRegisterOtp(String phone, String otp) {
        validateConfig();
        if (!StringUtils.hasText(otp)) {
            return false;
        }

        JsonNode response = callEsms("/MainService.svc/json/CheckCodeGen_V4_get", uriBuilder ->
                uriBuilder
                        .queryParam("ApiKey", esmsProperties.getApiKey())
                        .queryParam("SecretKey", esmsProperties.getSecretKey())
                        .queryParam("Phone", normalizePhoneForEsms(phone))
                        .queryParam("Code", otp.trim())
                        .build());

        String codeResult = response.path("CodeResult").asText();
        if ("101".equals(codeResult)) {
            throw new ExternalSmsServiceException("ESMS xac thuc that bai: " + extractErrorMessage(response));
        }
        return SUCCESS_CODE.equals(codeResult);
    }

    private JsonNode callEsms(String path,
                              java.util.function.Function<org.springframework.web.util.UriBuilder, java.net.URI> uriFunction) {
        try {
            String responseBody = esmsWebClient.get()
                    .uri(uriBuilder -> uriFunction.apply(uriBuilder.path(path)))
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, response -> response.bodyToMono(String.class)
                            .defaultIfEmpty("")
                            .map(body -> new ExternalSmsServiceException(
                                    "ESMS tra loi HTTP " + response.statusCode().value() + ": " + compact(body))))
                    .bodyToMono(String.class)
                    .timeout(esmsProperties.getTimeout())
                    .onErrorMap(WebClientResponseException.class,
                            ex -> new ExternalSmsServiceException(
                                    "ESMS tra loi HTTP " + ex.getStatusCode().value() + ": "
                                            + compact(ex.getResponseBodyAsString()),
                                    ex))
                    .onErrorMap(ex -> ex instanceof ExternalSmsServiceException
                            ? ex
                            : new ExternalSmsServiceException("Khong the ket noi ESMS", ex))
                    .block();

            if (!StringUtils.hasText(responseBody)) {
                throw new ExternalSmsServiceException("ESMS khong tra ve du lieu");
            }
            return objectMapper.readTree(responseBody);
        } catch (ExternalSmsServiceException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ExternalSmsServiceException("Khong the phan tich phan hoi ESMS", ex);
        }
    }

    private void validateConfig() {
        if (!StringUtils.hasText(esmsProperties.getApiKey())
                || !StringUtils.hasText(esmsProperties.getSecretKey())
                || !StringUtils.hasText(esmsProperties.getBrandname())) {
            throw new ExternalSmsServiceException("ESMS chua duoc cau hinh ApiKey, SecretKey hoac Brandname");
        }
    }

    private String normalizePhoneForEsms(String phone) {
        if (!StringUtils.hasText(phone)) {
            throw new ExternalSmsServiceException("So dien thoai khong hop le");
        }
        String normalized = phone.trim().replaceAll("\\s+", "");
        if (normalized.startsWith("+84")) {
            return "0" + normalized.substring(3);
        }
        if (normalized.startsWith("84")) {
            return "0" + normalized.substring(2);
        }
        return normalized;
    }

    private String extractErrorMessage(JsonNode response) {
        String errorMessage = response.path("ErrorMessage").asText();
        if (StringUtils.hasText(errorMessage)) {
            return errorMessage;
        }
        return response.toString();
    }

    private String compact(String raw) {
        if (!StringUtils.hasText(raw)) {
            return "";
        }
        String compact = raw.replaceAll("\\s+", " ").trim();
        return compact.length() > 200 ? compact.substring(0, 200) : compact;
    }
}
