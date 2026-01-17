/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.entity.mysql;

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

    // ===== Relations =====

    @OneToMany(mappedBy = "user")
    private List<Device> devices;

    @OneToMany(mappedBy = "user")
    private List<Session> sessions;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL)
    private UserSetting userSetting;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL)
    private NotificationSetting notificationSetting;
}
