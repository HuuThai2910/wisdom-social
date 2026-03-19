/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.domain.entity.mysql;

import com.fasterxml.jackson.annotation.JsonIgnore;
import iuh.fit.edu.backend.constant.Gender;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String phone;
    private String name;
    private String username;
    private String avatarUrl;
    private String birthday;
    private String bio;
    private Gender gender;

    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    private boolean confirmUseAI = false;

    // ===== Statistics =====
    private Integer friendCount = 0; // Số bạn bè
    private Integer followerCount = 0; // Số người theo dõi
    private Integer followingCount = 0; // Số người đang theo dõi
    private Integer postCount = 0; // Số bài viết

    // ===== Relations =====
    @OneToMany(mappedBy = "user")
    @JsonIgnore
    private List<Device> devices;


    @JsonIgnore
    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL)
    private UserSetting userSetting;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL)
    @JsonIgnore
    private NotificationSetting notificationSetting;

    @JsonIgnore
    @OneToMany(mappedBy = "user")
    private List<PageMember> pageMembers;

    @OneToMany(mappedBy = "user")
    @JsonIgnore
    private List<PageFollow> pageFollows;


    @OneToMany(mappedBy = "user")
    @JsonIgnore
    private List<PageLike> pageLikes;
}
