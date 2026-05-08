import apiClient from "@/api/apiClient";
import { getDeviceInfo } from "@/utils/deviceInfo";
import {
    clearStorage,
    saveIdToken,
    saveRefreshToken,
    saveToken,
    saveUser,
} from "@/utils/storage";

type LoginPayload = {
    email: string;
    password: string;
};

type SignupPayload = {
    fullName: string;
    username: string;
    email: string;
    password: string;
};

export type PhoneLoginPayload = {
    phone: string;
    password: string;
};

export type PhoneRegisterPayload = {
    phone: string;
    password: string;
    confirmPassword: string;
};

export type ResetPasswordPayload = {
    phone: string;
    password: string;
    confirmPassword: string;
    confirmationCode: string;
};

export type ApiAuthUser = {
    id: number;
    phone: string;
    name?: string | null;
    username?: string | null;
    avatarUrl?: string | null;
    birthday?: string | null;
    bio?: string | null;
    gender?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    confirmUseAI?: boolean;
};

const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

const mapResetPasswordError = (rawMessage?: string): string => {
    const message = rawMessage || "";
    const lower = message.toLowerCase();

    if (lower.includes("invalid code provided")) {
        return "Mã OTP không đúng. Vui lòng kiểm tra lại OTP mới nhất.";
    }

    if (lower.includes("expired") || lower.includes("codeexpired")) {
        return "Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại OTP.";
    }

    return "Đặt lại mật khẩu thất bại. Vui lòng thử lại.";
};

const mapLoginError = (rawMessage?: string): string => {
    const message = rawMessage || "";
    const lower = message.toLowerCase();

    if (
        lower.includes("notauthorizedexception") ||
        lower.includes("incorrect username or password")
    ) {
        return "Tên đăng nhập hoặc mật khẩu không đúng.";
    }

    return "Đăng nhập thất bại. Vui lòng thử lại.";
};

const mapRegisterError = (rawMessage?: string): string => {
    const message = rawMessage || "";
    const lower = message.toLowerCase();

    if (
        lower.includes("user already exists") ||
        lower.includes("usernameexistsexception") ||
        lower.includes("already exists")
    ) {
        return "Số điện thoại đã được đăng ký. Vui lòng dùng số khác hoặc đăng nhập.";
    }

    return "Đăng ký thất bại. Vui lòng thử lại.";
};

export async function fakeLogin(
    payload: LoginPayload,
): Promise<{ success: boolean; message?: string }> {
    await sleep(600);
    if (!payload.email || !payload.password) {
        return { success: false, message: "Please fill in all fields." };
    }

    return { success: true };
}

export async function fakeSignup(
    payload: SignupPayload,
): Promise<{ success: boolean; message?: string }> {
    await sleep(700);

    if (
        !payload.email ||
        !payload.password ||
        !payload.fullName ||
        !payload.username
    ) {
        return { success: false, message: "Please fill in all fields." };
    }

    return { success: true };
}

export async function registerWithPhone(
    data: PhoneRegisterPayload,
): Promise<{ success: boolean; message?: string }> {
    try {
        const device = await getDeviceInfo();
        await apiClient.post("/auth/register", {
            ...data,
            deviceType: device.deviceType,
            deviceName: device.deviceName,
            ipAddress: device.ipAddress,
        });
        return { success: true };
    } catch (error: unknown) {
        const backendMessage =
            error && typeof error === "object"
                ? (error as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message ||
                (error as { message?: string }).message
                : undefined;
        return { success: false, message: mapRegisterError(backendMessage) };
    }
}

export async function confirmRegisterOtp(
    phone: string,
    otp: string,
): Promise<{ success: boolean; message?: string }> {
    try {
        await apiClient.post("/auth/confirm", { phone, otp });
        return { success: true };
    } catch (error: any) {
        const msg: string = (error?.response?.data?.message || error?.message || '').toLowerCase();
        if (msg.includes('expired') || msg.includes('codeexpired')) {
            return { success: false, message: "Mã xác thực đã hết hạn. Vui lòng yêu cầu gửi lại." };
        }
        return { success: false, message: "Mã xác thực không đúng, vui lòng thử lại." };
    }
}

export async function loginWithPhone(
    data: PhoneLoginPayload,
): Promise<{ success: boolean; message?: string; user?: ApiAuthUser }> {
    try {
        const device = await getDeviceInfo();
        console.log("Data:", data)
        const response = await apiClient.post("/auth/login", {
            ...data,
            deviceType: device.deviceType,
            deviceName: device.deviceName,
            ipAddress: device.ipAddress,
        });

        const loginData = response.data?.data ?? response.data;
        const accessToken: string | undefined = loginData?.token;
        const refreshToken: string | undefined =
            loginData?.refreskToken ?? loginData?.refreshToken;
        const idToken: string | undefined = loginData?.idToken;

        if (accessToken) {
            await saveToken(accessToken);
        }
        if (refreshToken) {
            await saveRefreshToken(refreshToken);
        }
        // Save idToken if returned; otherwise use the accessToken
        // so the request interceptor (which reads getIdToken()) always has a value
        if (idToken) {
            await saveIdToken(idToken);
        } else if (accessToken) {
            await saveIdToken(accessToken);
        }

        const userProfile = await getCurrentUser();
        if (userProfile) {
            await saveUser(userProfile);
        }

        return { success: true, user: userProfile ?? undefined };
    } catch (error: unknown) {
        console.log(error)
        const backendMessage =
            error && typeof error === "object"
                ? (error as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message ||
                (error as { message?: string }).message
                : undefined;
        return { success: false, message: mapLoginError(backendMessage) };
    }
}

const mapResendOtpError = (rawMessage?: string): string => {
    const lower = (rawMessage || '').toLowerCase();
    if (lower.includes('attempt limit exceeded')) {
        return 'Bạn đã gửi lại quá nhiều lần. Vui lòng thử lại sau ít phút.';
    }
    return 'Không thể gửi lại mã OTP. Vui lòng thử lại.';
};

export async function resendRegisterOtp(
    phone: string,
): Promise<{ success: boolean; message?: string }> {
    try {
        await apiClient.post("/auth/resend-otp", { phone });
        return { success: true };
    } catch (error: any) {
        const msg = error?.response?.data?.message || error?.message || '';
        return { success: false, message: mapResendOtpError(msg) };
    }
}

export async function forgotPassword(
    phone: string,
): Promise<{ success: boolean; message?: string }> {
    try {
        await apiClient.post("/auth/forgot-password", {
            phone,
            instant: new Date().toISOString(),
        });
        return { success: true };
    } catch (error: any) {
        const msg = error?.response?.data?.message || error?.message || '';
        return { success: false, message: mapResendOtpError(msg) };
    }
}

export async function resetPassword(
    data: ResetPasswordPayload,
): Promise<{ success: boolean; message?: string }> {
    try {
        await apiClient.post("/auth/reset-password", {
            ...data,
            instant: new Date().toISOString(),
        });
        return { success: true };
    } catch (error: unknown) {
        const backendMessage =
            error && typeof error === "object"
                ? (error as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message ||
                (error as { message?: string }).message
                : undefined;
        return {
            success: false,
            message: mapResetPasswordError(backendMessage),
        };
    }
}

export async function getCurrentUser(): Promise<ApiAuthUser | null> {
    try {
        const response = await apiClient.get("/auth/me");
        return response.data?.data ?? null;
    } catch {
        return null;
    }
}

export async function logoutApi(): Promise<void> {
    try {
        await apiClient.post("/auth/logout");
    } finally {
        await clearStorage();
    }
}
