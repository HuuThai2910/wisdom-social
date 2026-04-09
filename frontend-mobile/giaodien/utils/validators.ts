export function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validatePassword(password: string): boolean {
    return password.trim().length >= 6;
}

export function validateRequired(value: string): boolean {
    return value.trim().length > 0;
}
