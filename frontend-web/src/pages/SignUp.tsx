import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { register } from "../utils/auth";

export default function SignUp() {
    const navigate = useNavigate();
    const [phone, setPhone] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const validatePhone = (phone: string): boolean => {
        const phoneRegex = /^[0-9]{10,11}$/;
        return phoneRegex.test(phone);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        // Validation
        if (!phone || !username || !password) {
            setError("Vui lòng điền đầy đủ thông tin");
            setLoading(false);
            return;
        }

        if (!validatePhone(phone)) {
            setError("Số điện thoại không hợp lệ (10-11 chữ số)");
            setLoading(false);
            return;
        }

        if (username.length < 3) {
            setError("Username phải có ít nhất 3 ký tự");
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError("Mật khẩu phải có ít nhất 6 ký tự");
            setLoading(false);
            return;
        }

        try {
            await register(phone, username, password);
            // Navigate to OTP verification with phone number
            navigate("/verify-otp", {
                state: { phone, type: "register" }
            });
        } catch (err: any) {
            setError(err.message || "Đăng ký thất bại. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100">
            <div className="max-w-md w-full space-y-8 p-8">
                <div className="text-center">
                    <h2 className="text-3xl font-bold">Instagram</h2>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">
                        Sign up to see photos and videos from your friends
                    </p>
                </div>
                <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}
                    <input
                        type="tel"
                        placeholder="Số điện thoại"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-[#3a3a3a] bg-white dark:bg-[#0b0b0b] rounded-lg"
                        disabled={loading}
                    />
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-[#3a3a3a] bg-white dark:bg-[#0b0b0b] rounded-lg"
                        disabled={loading}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-[#3a3a3a] bg-white dark:bg-[#0b0b0b] rounded-lg"
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Đang xử lý..." : "Sign Up"}
                    </button>
                </form>
                <div className="text-center">
                    <span className="text-gray-600 dark:text-gray-300">
                        Have an account?{" "}
                    </span>
                    <Link to="/login" className="text-blue-500 hover:underline">
                        Log in
                    </Link>
                </div>
            </div>
        </div>
    );
}
