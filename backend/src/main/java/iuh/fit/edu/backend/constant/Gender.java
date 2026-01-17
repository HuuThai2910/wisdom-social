/*
 * @ (#) .java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.constant;

/*
 * @description
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
public enum Gender {
    MALE {
        @Override
        public String toString() {
            return "Nam";
        }
    }, FEMALE {
        @Override
        public String toString() {
            return "Nữ";
        }
    };

}
