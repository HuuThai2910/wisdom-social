package iuh.fit.edu.backend.service.impl;

import iuh.fit.edu.backend.constant.Gender;
import iuh.fit.edu.backend.constant.PrivacyType;
import iuh.fit.edu.backend.domain.entity.mysql.User;
import iuh.fit.edu.backend.domain.entity.mysql.UserSetting;
import iuh.fit.edu.backend.repository.mysql.UserSettingRepository;
import iuh.fit.edu.backend.service.impl.user.FriendService;
import iuh.fit.edu.backend.service.impl.user.UserService;
import iuh.fit.edu.backend.service.impl.user.UserSettingService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserSettingServiceImpl implements UserSettingService {
    UserService userService;
    FriendService friendService;
    UserSettingRepository userSettingRepository;

    public UserSettingServiceImpl(FriendService friendService,
                                  UserService userService, UserSettingRepository userSettingRepository) {
        this.friendService = friendService;
        this.userService = userService;
        this.userSettingRepository = userSettingRepository;
    }

    @Override
    public User getProfileUser(long id) {
        User user=userService.findUserById(id);
        User userCurrent=userService.getCurrentUser();
        UserSetting userSetting=userSettingRepository.findById(user.getId()).orElse(null);

        assert userSetting != null;
        if(PrivacyType.PUBLIC.equals(userSetting.getPrivacyProfile())){
            return user;
        } else if (PrivacyType.FRIENDS.equals(userSetting.getPrivacyProfile())) {
            List<User> friends= friendService.getFriendsOfUser(id);
            boolean check=false;

            for (User u:friends){
                System.out.println(u.getId());
                if (u.getId().equals(userCurrent.getId())) {
                    check = true;
                    break;
                }
            }

            if(check){
                return user;
            }else {
               return hiddenProfile(id);
            }
        } else if (PrivacyType.ONLY_ME.equals(userSetting.getPrivacyProfile())) {
            return hiddenProfile(id);
        }
        return null;
    }


    public User hiddenProfile(long id){
        return User.builder()
                .id(id)
                .bio("******")
                .birthday("******")
                .gender(Gender.HIDDEN)
                .username("******")
                .phone("******")
                .build();
    }
}
