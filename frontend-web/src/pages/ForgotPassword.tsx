import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { forgotPassword } from "../utils/auth";

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const validatePhone = (phone: string): boolean => {
        const phoneRegex = /^[0-9]{10,11}$/;
        return phoneRegex.test(phone);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        
        if (!phone) {
            setError("Vui lòng nhập số điện thoại");
            return;
        }

        if (!validatePhone(phone)) {
            setError("Số điện thoại không hợp lệ (10-11 chữ số)");
            return;
        }

        setLoading(true);
        try {
            const { otpId, expiresIn } = await forgotPassword(phone);
            console.log("OTP sent successfully", { otpId, expiresIn });
            
            // Navigate to OTP verification
            navigate("/verify-otp", {
                state: { phone, type: "reset-password" }
            });
        } catch (err: any) {
            setError(err.message || "Không thể gửi OTP. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
            <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#2a2a2a] rounded-lg p-10 text-center text-gray-900 dark:text-gray-100 max-w-md w-full mx-4">
                <h2 className="text-xl font-semibold mb-4">Forgot Password</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
                    Nhập số điện thoại của bạn và chúng tôi sẽ gửi mã OTP để đặt lại mật khẩu.
                </p>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <input
                        type="tel"
                        placeholder="Số điện thoại"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={loading}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-[#3a3a3a] bg-white dark:bg-[#0b0b0b] rounded-lg focus:outline-none focus:border-gray-400 dark:focus:border-gray-500"
                        required
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Đang gửi..." : "Send OTP"}
                    </button>
                </form>

                <Link
                    to="/login"
                    className="text-sm text-blue-500 hover:text-blue-700 mt-6 inline-block"
                >
                    Back to Login
                </Link>
            </div>
        </div>
    );
}
