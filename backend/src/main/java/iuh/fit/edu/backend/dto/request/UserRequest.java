/*
 * @ (#) UserRequest.java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.dto.request;

import iuh.fit.edu.backend.constant.Gender;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/*
 * @description: DTO for user registration request
 * @author: Thế Bảo
 * @date: 28/01/2026
 * @version: 1.0
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserRequest {
    @NotBlank(message = "Username không được để trống")
    @Size(min = 3, max = 30, message = "Username phải từ 3-30 ký tự")
    @Pattern(regexp = "^[a-zA-Z0-9._]+$", message = "Username chỉ chứa chữ, số, dấu chấm và gạch dưới")
    private String username;
    
    @NotBlank(message = "Tên không được để trống")
    @Size(min = 2, max = 100, message = "Tên phải từ 2-100 ký tự")
    private String name;
    
    @Pattern(regexp = "^(\\+84|0)[0-9]{9,10}$", message = "Số điện thoại không hợp lệ")
    private String phone;
    
    @Size(max = 500, message = "Bio không được quá 500 ký tự")
    private String bio;
    
    private String avatarUrl;
    
    private Gender gender;
}
