package iuh.fit.edu.backend.dto.response.friend;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FriendSuggestionResponse {
    private Long id;
    private String name;
    private String username;
    private String phone;
    private String avatarUrl;
    private String bio;
    private int mutualFriendsCount;
}
