import { Link } from "react-router-dom";
import { useState } from "react";

export default function SignUp() {
    const [email, setEmail] = useState("");
    const [fullName, setFullName] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100">
            <div className="max-w-md w-full space-y-8 p-8">
                <div className="text-center">
                    <h2 className="text-3xl font-bold">Instagram</h2>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">
                        Sign up to see photos and videos from your friends
                    </p>
                </div>
                <form className="mt-8 space-y-4">
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-[#3a3a3a] bg-white dark:bg-[#0b0b0b] rounded-lg"
                    />
                    <input
                        type="text"
                        placeholder="Full Name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-[#3a3a3a] bg-white dark:bg-[#0b0b0b] rounded-lg"
                    />
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-[#3a3a3a] bg-white dark:bg-[#0b0b0b] rounded-lg"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-[#3a3a3a] bg-white dark:bg-[#0b0b0b] rounded-lg"
                    />
                    <button
                        type="submit"
                        className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600"
                    >
                        Sign Up
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
