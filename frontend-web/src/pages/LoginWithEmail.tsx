import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function LoginWithEmail() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Mock sending email
        alert("Link sent to your email!");
        navigate("/checkinbox");
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center">
            <h2 className="text-xl font-semibold mb-4">Enter your email</h2>
            <p className="text-gray-500 text-sm mb-8">
                We'll send a secure link for instant access to your account.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400"
                    required
                />

                <button
                    type="submit"
                    className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold"
                >
                    Send link
                </button>
            </form>

            <Link
                to="/login"
                className="text-sm text-blue-500 hover:text-blue-700 mt-6 inline-block"
            >
                Back to Login
            </Link>
        </div>
    );
}
