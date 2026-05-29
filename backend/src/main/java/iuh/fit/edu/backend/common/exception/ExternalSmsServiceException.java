package iuh.fit.edu.backend.common.exception;

public class ExternalSmsServiceException extends RuntimeException {
    public ExternalSmsServiceException(String message) {
        super(message);
    }

    public ExternalSmsServiceException(String message, Throwable cause) {
        super(message, cause);
    }
}
