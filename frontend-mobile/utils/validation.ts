export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

// Phone validation - Vietnamese phone numbers
export const validatePhone = (phone: string): ValidationResult => {
    // Accept numbers starting with 0-9, length 10-11
    const phoneRegex = /^[0-9]{10}$/;

    if (!phone) {
        return { isValid: false, error: 'Số điện thoại không được để trống' };
    }

    if (!phoneRegex.test(phone)) {
        return { isValid: false, error: 'Số điện thoại phải là 10 chữ số' };
    }

    return { isValid: true };
};

// Password validation
// Requirements:
// - Minimum 6 characters
// - Can contain letters, numbers, and special characters
export const validatePassword = (password: string): ValidationResult => {
    if (!password) {
        return { isValid: false, error: 'Mật khẩu không được để trống' };
    }

    if (password.length < 8) {
        return { isValid: false, error: 'Mật khẩu phải có ít nhất 8 ký tự' };
    }

    if (password.length > 50) {
        return { isValid: false, error: 'Mật khẩu không được vượt quá 50 ký tự' };
    }

    // Có chữ thường
    if (!/[a-z]/.test(password)) {
        return { isValid: false, error: 'Mật khẩu phải có ít nhất 1 chữ thường' };
    }

    // Có chữ hoa
    if (!/[A-Z]/.test(password)) {
        return { isValid: false, error: 'Mật khẩu phải có ít nhất 1 chữ hoa' };
    }

    // Có số
    if (!/[0-9]/.test(password)) {
        return { isValid: false, error: 'Mật khẩu phải có ít nhất 1 số' };
    }

    // Có ký tự đặc biệt
    if (!/[^A-Za-z0-9]/.test(password)) {
        return { isValid: false, error: 'Mật khẩu phải có ít nhất 1 ký tự đặc biệt' };
    }

    return { isValid: true };
};

// Confirm password validation
export const validateConfirmPassword = (password: string, confirmPassword: string): ValidationResult => {
    if (!confirmPassword) {
        return { isValid: false, error: 'Vui lòng xác nhận mật khẩu' };
    }

    if (password !== confirmPassword) {
        return { isValid: false, error: 'Mật khẩu xác nhận không khớp' };
    }

    return { isValid: true };
};

// Validate signup form
export const validateSignupForm = (phone: string, password: string, confirmPassword: string) => {
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.isValid) {
        return phoneValidation;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
        return passwordValidation;
    }

    const confirmValidation = validateConfirmPassword(password, confirmPassword);
    if (!confirmValidation.isValid) {
        return confirmValidation;
    }

    return { isValid: true };
};

// Validate reset password form
export const validateResetPasswordForm = (password: string, confirmPassword: string) => {
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
        return passwordValidation;
    }

    const confirmValidation = validateConfirmPassword(password, confirmPassword);
    if (!confirmValidation.isValid) {
        return confirmValidation;
    }

    return { isValid: true };
};
