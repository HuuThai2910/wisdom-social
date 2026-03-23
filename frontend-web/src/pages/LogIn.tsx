import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../utils/auth";

export default function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validation
    if (!phone || !password) {
      setError("Vui lòng nhập số điện thoại và mật khẩu.");
      setLoading(false);
      return;
    }

    try {
      const success = await login(phone, password);
      console.log("Login result:", success);
      if (success) {
        // Navigate to home/feed page
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    // Mock Google login - TODO: Implement Google OAuth
    setError(
      "Google login chưa được hỗ trợ. Vui lòng sử dụng số điện thoại và mật khẩu."
    );
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
        {error && (
          <div className="text-red-500 text-sm text-center">{error}</div>
        )}

        <input
          type="tel"
          placeholder="Số điện thoại"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400"
          required
          disabled={loading}
        />

        <input
          type="password"
          placeholder="Mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400"
          required
          disabled={loading}
        />

        <button
          type="submit"
          className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? "Đang đăng nhập..." : "Log in"}
        </button>

        <p className="text-xs text-gray-500 text-center">
          Nhập số điện thoại và mật khẩu của bạn để đăng nhập
        </p>
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
