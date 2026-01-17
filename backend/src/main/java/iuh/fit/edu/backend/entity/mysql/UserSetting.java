/*
 * @ (#) UserSetting.java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.entity.mysql;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/*
 * @description: User settings entity
 * @author: Huu Thai
 * @date: 17/01/2026
 * @version: 1.0
 */
@Entity
@Table(name = "user_settings")
@Getter
@Setter
public class UserSetting {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @OneToOne
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    private String privacyProfile;
    private Boolean allowMessageFromStrangers;
}
