package iuh.fit.edu.backend.common.service.sms;

public interface EsmsOtpService {
    void sendRegisterOtp(String phone);

    boolean verifyRegisterOtp(String phone, String otp);
}
