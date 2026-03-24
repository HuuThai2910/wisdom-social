import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import axios from "axios";

const API_BASE_URL = "http://localhost:8080/api";

export default function QRLogin() {
  const [sessionId, setSessionId] = useState<string>("");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [error, setError] = useState<string>("");
  const hasRun = useRef(false);
  const navigate = useNavigate();

  // Create QR code session
  const createQRSession = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/session/qr-login/create`);
      const newSessionId = response.data;
      setSessionId(newSessionId);

      // Generate QR code with session ID
      const qrData = JSON.stringify({
        type: "qr_login",
        session_id: newSessionId,
        timestamp: Date.now(),
      });

      const qrUrl = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      setQrCodeUrl(qrUrl);
      setError("");
    } catch (err) {
      setError("Không thể tạo mã QR. Vui lòng thử lại!");
      console.error("Create QR error:", err);
    }
  };

  useEffect(() => {
      if (hasRun.current) return;
      hasRun.current = true;
      createQRSession();
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/session/qr-login/status/${sessionId}`);
        const { status } = response.data.data;   
        if (status === "confirmed") {
          clearInterval(interval);
          navigate("/dashboard");
        } else if (status === "expired") {
          clearInterval(interval);
          setError("Mã QR đã hết hạn. Vui lòng tạo lại.");
          setQrCodeUrl("");
        }
      } catch (err) {
        console.error("Check QR status error:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [sessionId]);


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Đăng nhập bằng QR Code
          </h1>
          <p className="text-gray-600">
            Quét mã QR bằng ứng dụng di động để đăng nhập
          </p>
        </div>

          <div className="space-y-6">
            {qrCodeUrl && (
              <div className="flex flex-col items-center">
                <div className="bg-white p-4 rounded-lg border-4 border-gray-200 shadow-inner">
                  <img
                    src={qrCodeUrl}
                    alt="QR Code"
                    className="w-64 h-64"
                  />
                </div>

                <div className="mt-6 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <p className="text-lg font-semibold">Chờ quét mã QR...</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        

        <div className="mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={() => navigate("/login")}
            className="w-full text-gray-600 hover:text-gray-800 transition-colors"
          >
            Quay lại đăng nhập thường
          </button>
        </div>

        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-gray-700 text-center">
            <strong>Hướng dẫn:</strong>
          </p>
          <ol className="text-sm text-gray-600 mt-2 space-y-1 list-decimal list-inside">
            <li>Mở ứng dụng di động</li>
            <li>Đăng nhập vào tài khoản của bạn</li>
            <li>Nhấn vào biểu tượng quét QR</li>
            <li>Quét mã QR này và xác nhận đăng nhập</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
