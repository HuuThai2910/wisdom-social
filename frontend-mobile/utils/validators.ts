export function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

export function validatePassword(password: string): boolean {
    return password.trim().length >= 6;
}

export function validateRequired(value: string): boolean {
    return value.trim().length > 0;
}

export function validatePhone(phone: string): boolean {
    return /^\d{10}$/.test(phone.trim());
}

export function validateOtp(otp: string): boolean {
    return /^\d{6}$/.test(otp.trim());
}

export function validateStrongPassword(password: string): {
    valid: boolean;
    message?: string;
} {
    const value = password.trim();

    if (value.length < 8) {
        return { valid: false, message: "Mật khẩu phải có ít nhất 8 ký tự." };
    }

    if (!/[a-z]/.test(value)) {
        return {
            valid: false,
            message: "Mật khẩu phải có ít nhất 1 chữ thường.",
        };
    }

    if (!/[A-Z]/.test(value)) {
        return {
            valid: false,
            message: "Mật khẩu phải có ít nhất 1 chữ hoa.",
        };
    }

    if (!/\d/.test(value)) {
        return { valid: false, message: "Mật khẩu phải có ít nhất 1 chữ số." };
    }

    if (!/[^A-Za-z0-9]/.test(value)) {
        return {
            valid: false,
            message: "Mật khẩu phải có ít nhất 1 ký tự đặc biệt.",
        };
    }

    return { valid: true };
}

export function validateUsername(username: string): ValidationResult {
    if (!username || username.trim() === "") {
        return { isValid: false, error: "Tên người dùng không được để trống" };
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return {
            isValid: false,
            error: "Tên người dùng phải từ 3-20 ký tự (chữ, số, gạch dưới)",
        };
    }

    return { isValid: true };
}

export function validateFullName(name: string): ValidationResult {
    if (!name || name.trim() === "") {
        return { isValid: false, error: "Họ và tên không được để trống" };
    }

    if (name.trim().length < 2) {
        return { isValid: false, error: "Họ và tên phải ít nhất 2 ký tự" };
    }

    if (name.trim().length > 50) {
        return { isValid: false, error: "Họ và tên không được vượt quá 50 ký tự" };
    }

    return { isValid: true };
}

export function validateBirthday(birthday: string): ValidationResult {
    if (!birthday || birthday.trim() === "") {
        return { isValid: false, error: "Ngày sinh không được để trống" };
    }

    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = birthday.match(dateRegex);

    if (!match) {
        return { isValid: false, error: "Ngày sinh phải có định dạng DD/MM/YYYY" };
    }

    const [, day, month, year] = match;
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (monthNum < 1 || monthNum > 12) {
        return { isValid: false, error: "Tháng phải từ 01 đến 12" };
    }

    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (yearNum % 4 === 0 && (yearNum % 100 !== 0 || yearNum % 400 === 0)) {
        daysInMonth[1] = 29;
    }

    if (dayNum < 1 || dayNum > daysInMonth[monthNum - 1]) {
        return {
            isValid: false,
            error: `Ngày phải từ 01 đến ${daysInMonth[monthNum - 1]}`,
        };
    }

    const birthDate = new Date(yearNum, monthNum - 1, dayNum);
    const today = new Date();

    if (birthDate > today) {
        return {
            isValid: false,
            error: "Ngày sinh không được lớn hơn ngày hiện tại",
        };
    }

    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 13) {
        return { isValid: false, error: "Phải ít nhất 13 tuổi để sử dụng" };
    }

    return { isValid: true };
}

export function validateGender(gender: string): ValidationResult {
    if (!gender || gender.trim() === "") {
        return { isValid: false, error: "Giới tính không được để trống" };
    }

    const validGenders = ["MALE", "FEMALE", "HIDDEN"];
    if (!validGenders.includes(gender)) {
        return { isValid: false, error: "Giới tính không hợp lệ" };
    }

    return { isValid: true };
}
