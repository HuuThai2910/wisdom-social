import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { resetPassword } from "../utils/auth";

export default function ResetPassword() {
    const location = useLocation();
    const navigate = useNavigate();
    const { phone, otp } = location.state || {};
    
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!phone || !otp) {
            navigate("/forgot-password");
        }
    }, [phone, otp, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!password || !confirmPassword) {
            setError("Vui lòng điền đầy đủ thông tin");
            return;
        }

        if (password.length < 6) {
            setError("Mật khẩu phải có ít nhất 6 ký tự");
            return;
        }

        if (password !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp");
            return;
        }

        setLoading(true);
        try {
            await resetPassword(phone, otp, password);
            alert("Đặt lại mật khẩu thành công! Vui lòng đăng nhập.");
            navigate("/login", { replace: true });
        } catch (err: any) {
            setError(err.message || "Đặt lại mật khẩu thất bại. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100">
            <div className="max-w-md w-full space-y-8 p-8">
                <div className="text-center">
                    <h2 className="text-3xl font-bold">Reset Password</h2>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">
                        Nhập mật khẩu mới của bạn
                    </p>
                </div>
                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}
                    <div>
                        <input
                            type="password"
                            placeholder="Mật khẩu mới"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-[#3a3a3a] bg-white dark:bg-[#0b0b0b] rounded-lg"
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            placeholder="Xác nhận mật khẩu"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={loading}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-[#3a3a3a] bg-white dark:bg-[#0b0b0b] rounded-lg"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Đang xử lý..." : "Reset Password"}
                    </button>
                </form>
                <div className="text-center">
                    <Link to="/login" className="text-blue-500 hover:underline">
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
