package iuh.fit.edu.backend.exception;

public class ConversationMemberKickedException extends RuntimeException {
    public ConversationMemberKickedException(String message) {
        super(message);
    }
}