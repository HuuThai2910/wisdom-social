import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { confirmRegister, register } from "../utils/auth";

export default function VerifyOTP() {
    const location = useLocation();
    const navigate = useNavigate();
    const { phone, type } = location.state || {};
    
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [countdown, setCountdown] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (!phone) {
            navigate("/signup");
            return;
        }
        inputRefs.current[0]?.focus();
    }, [phone, navigate]);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setCanResend(true);
        }
    }, [countdown]);

    const handleChange = (index: number, value: string) => {
        if (value.length > 1) value = value[0];
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text").slice(0, 6);
        if (!/^\d+$/.test(pastedData)) return;

        const newOtp = [...otp];
        for (let i = 0; i < pastedData.length && i < 6; i++) {
            newOtp[i] = pastedData[i];
        }
        setOtp(newOtp);
        
        const nextIndex = Math.min(pastedData.length, 5);
        inputRefs.current[nextIndex]?.focus();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const otpCode = otp.join("");
        
        if (otpCode.length !== 6) {
            setError("Vui lòng nhập đủ 6 số OTP");
            return;
        }

        setLoading(true);
        setError("");

        try {
            if (type === "register") {
                await confirmRegister(phone, otpCode);
                navigate("/", { replace: true });
            } else if (type === "reset-password") {
                navigate("/reset-password", {
                    state: { phone, otp: otpCode }
                });
            }
        } catch (err: any) {
            setError(err.message || "Mã OTP không đúng. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!canResend) return;
        
        setLoading(true);
        setError("");
        try {
            // Resend OTP logic - call register again for register flow
            if (type === "register") {
                // Need to get username and password from previous state
                setError("Vui lòng quay lại trang đăng ký để gửi lại OTP");
            }
            setCountdown(60);
            setCanResend(false);
        } catch (err: any) {
            setError(err.message || "Không thể gửi lại OTP");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100">
            <div className="max-w-md w-full space-y-8 p-8">
                <div className="text-center">
                    <h2 className="text-3xl font-bold">Verify OTP</h2>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">
                        Nhập mã OTP đã được gửi đến {phone}
                    </p>
                </div>
                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm text-center">
                            {error}
                        </div>
                    )}
                    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                ref={(el) => (inputRefs.current[index] = el)}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                disabled={loading}
                                className="w-12 h-14 text-center text-2xl border border-gray-300 dark:border-[#3a3a3a] bg-white dark:bg-[#0b0b0b] rounded-lg focus:border-blue-500 focus:outline-none"
                            />
                        ))}
                    </div>
                    
                    <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                        {countdown > 0 ? (
                            <span>Gửi lại OTP sau {countdown}s</span>
                        ) : (
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={loading}
                                className="text-blue-500 hover:underline disabled:opacity-50"
                            >
                                Gửi lại OTP
                            </button>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || otp.join("").length !== 6}
                        className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Đang xác nhận..." : "Verify"}
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
