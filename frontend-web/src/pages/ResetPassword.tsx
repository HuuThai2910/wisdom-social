import { Link } from "react-router-dom";
import { useState } from "react";

export default function ResetPassword() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8 p-8">
                <div className="text-center">
                    <h2 className="text-3xl font-bold">Reset Password</h2>
                    <p className="mt-2 text-gray-600">
                        Enter your new password
                    </p>
                </div>
                <form className="mt-8 space-y-6">
                    <div>
                        <input
                            type="password"
                            placeholder="New Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 border rounded-lg"
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-3 border rounded-lg"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600"
                    >
                        Reset Password
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
