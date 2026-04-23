package iuh.fit.edu.backend.exception;

public class ConversationMemberLeftException extends RuntimeException {
    public ConversationMemberLeftException(String message) {
        super(message);
    }
}