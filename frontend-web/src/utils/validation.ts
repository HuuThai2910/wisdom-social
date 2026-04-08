export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validatePhone = (phone: string): ValidationResult => {
  const phoneRegex = /^[0-9]{10}$/;

  if (!phone) {
    return { isValid: false, error: "Số điện thoại không được để trống" };
  }

  if (!phoneRegex.test(phone)) {
    return { isValid: false, error: "Số điện thoại phải là 10 chữ số" };
  }

  return { isValid: true };
};

export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, error: "Mật khẩu không được để trống" };
  }

  if (password.length < 8) {
    return { isValid: false, error: "Mật khẩu phải có ít nhất 8 ký tự" };
  }

  if (password.length > 50) {
    return { isValid: false, error: "Mật khẩu không được vượt quá 50 ký tự" };
  }

  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: "Mật khẩu phải có ít nhất 1 chữ thường" };
  }

  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: "Mật khẩu phải có ít nhất 1 chữ hoa" };
  }

  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: "Mật khẩu phải có ít nhất 1 số" };
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return { isValid: false, error: "Mật khẩu phải có ít nhất 1 ký tự đặc biệt" };
  }

  return { isValid: true };
};

export const validateConfirmPassword = (
  password: string,
  confirmPassword: string
): ValidationResult => {
  if (!confirmPassword) {
    return { isValid: false, error: "Vui lòng xác nhận mật khẩu" };
  }

  if (password !== confirmPassword) {
    return { isValid: false, error: "Mật khẩu xác nhận không khớp" };
  }

  return { isValid: true };
};

export const validateSignupForm = (
  phone: string,
  password: string,
  confirmPassword: string
): ValidationResult => {
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

export const validateResetPasswordForm = (
  password: string,
  confirmPassword: string
): ValidationResult => {
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
