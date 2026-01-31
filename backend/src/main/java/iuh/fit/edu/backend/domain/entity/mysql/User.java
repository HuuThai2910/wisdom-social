/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.domain.entity.mysql;

import com.fasterxml.jackson.annotation.JsonIgnore;
import iuh.fit.edu.backend.constant.Gender;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
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
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String phone;
    private String name;
    private String username;
    private String avatarUrl;
    private String bio;
    private Gender gender;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private boolean confirmUseAI = false;

    // ===== Statistics =====
    private Integer friendCount = 0; // Số bạn bè
    private Integer followerCount = 0; // Số người theo dõi
    private Integer followingCount = 0; // Số người đang theo dõi
    private Integer postCount = 0; // Số bài viết

    // ===== Relations =====
    @OneToMany(mappedBy = "user")
    private List<Device> devices;

    @OneToMany(mappedBy = "user")
    private List<Session> sessions;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL)
    private UserSetting userSetting;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL)
    private NotificationSetting notificationSetting;

    // Friend relations
    @OneToMany(mappedBy = "user")
    @JsonIgnore
    private List<Friend> friends;

    @OneToMany(mappedBy = "friend")
    @JsonIgnore
    private List<Friend> friendOf;

    // Follow relations
    @OneToMany(mappedBy = "follower")
    @JsonIgnore
    private List<Follow> following; // Danh sách người mình đang theo dõi

    @OneToMany(mappedBy = "following")
    @JsonIgnore
    private List<Follow> followers; // Danh sách người đang theo dõi mình
}
