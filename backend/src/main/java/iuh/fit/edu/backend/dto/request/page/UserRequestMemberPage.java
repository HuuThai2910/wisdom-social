package iuh.fit.edu.backend.dto.request.page;

import iuh.fit.edu.backend.constant.PageRole;
import lombok.Data;

@Data
public class UserRequestMemberPage {
    private long userId;
    private long pageId;
    private PageRole pageRole;
}
