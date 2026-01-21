import { Link } from "react-router-dom";
import { useState } from "react";

export default function VerifyOTP() {
    const [otp1, setOtp1] = useState("");
    const [otp2, setOtp2] = useState("");
    const [otp3, setOtp3] = useState("");
    const [otp4, setOtp4] = useState("");

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8 p-8">
                <div className="text-center">
                    <h2 className="text-3xl font-bold">Verify OTP</h2>
                    <p className="mt-2 text-gray-600">
                        Enter the code we sent to your email
                    </p>
                </div>
                <form className="mt-8 space-y-6">
                    <div className="flex gap-4 justify-center">
                        <input
                            type="text"
                            maxLength={1}
                            value={otp1}
                            onChange={(e) => setOtp1(e.target.value)}
                            className="w-14 h-14 text-center text-2xl border rounded-lg"
                        />
                        <input
                            type="text"
                            maxLength={1}
                            value={otp2}
                            onChange={(e) => setOtp2(e.target.value)}
                            className="w-14 h-14 text-center text-2xl border rounded-lg"
                        />
                        <input
                            type="text"
                            maxLength={1}
                            value={otp3}
                            onChange={(e) => setOtp3(e.target.value)}
                            className="w-14 h-14 text-center text-2xl border rounded-lg"
                        />
                        <input
                            type="text"
                            maxLength={1}
                            value={otp4}
                            onChange={(e) => setOtp4(e.target.value)}
                            className="w-14 h-14 text-center text-2xl border rounded-lg"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600"
                    >
                        Verify
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
