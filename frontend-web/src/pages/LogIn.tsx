import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../utils/auth";

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (login(email, password)) {
            navigate("/");
        }
    };

    const handleGoogleLogin = () => {
        // Mock Google login
        if (login("google_user", "password")) {
            navigate("/");
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-10">
            {/* Social Login Buttons */}
            <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 mb-3"
            >
                <span className="text-sm font-semibold text-gray-700">
                    Log in with Google
                </span>
            </button>

            <Link
                to="/login/email"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 mb-6"
            >
                <span className="text-sm font-semibold text-gray-700">
                    Log in with Email
                </span>
            </Link>

            {/* Divider */}
            <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-gray-300"></div>
                <span className="text-sm text-gray-500">OR</span>
                <div className="flex-1 h-px bg-gray-300"></div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400"
                    required
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400"
                    required
                />

                <div className="text-right">
                    <Link
                        to="/forgot-password"
                        className="text-xs text-blue-500 hover:text-blue-700"
                    >
                        Forgot Password?
                    </Link>
                </div>

                <button
                    type="submit"
                    className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold"
                >
                    Log in
                </button>
            </form>

            {/* Sign Up Link */}
            <p className="text-center text-sm text-gray-600 mt-6">
                Don't have an account?{" "}
                <Link
                    to="/signup"
                    className="text-blue-500 hover:text-blue-700 font-semibold"
                >
                    Sign up
                </Link>
            </p>
        </div>
    );
}
