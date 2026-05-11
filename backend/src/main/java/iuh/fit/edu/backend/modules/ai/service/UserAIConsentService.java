package iuh.fit.edu.backend.modules.ai.service;

import iuh.fit.edu.backend.modules.user.entity.User;
import iuh.fit.edu.backend.modules.ai.dto.response.ConfirmAIRequest;
import iuh.fit.edu.backend.dto.user.ConfirmAIResponse;

public interface UserAIConsentService {
    ConfirmAIResponse getConsentStatus();

    ConfirmAIResponse updateConsentStatus(ConfirmAIRequest request);

    User assertUserCanUseAI();
}
