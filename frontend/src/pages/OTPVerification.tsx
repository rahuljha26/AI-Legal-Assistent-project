import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export default function OTPVerification() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;
  const { refreshUser } = useAuth();

  if (!email) {
    navigate("/login");
    return null;
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/auth/verify-otp/`, { email, code });
      if (res.data.success) {
        localStorage.setItem("access_token", res.data.data.access);
        localStorage.setItem("refresh_token", res.data.data.refresh);
        localStorage.setItem("user", JSON.stringify(res.data.data.user));
        refreshUser();
        toast.success("Login successful!");
        navigate("/");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await axios.post(`${API_BASE}/auth/send-otp/`, { email });
      toast.success("New OTP sent to your email.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to resend OTP");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Two-Factor Authentication</h2>
        <p className="text-gray-600 mb-6 text-center">
          Enter the 6-digit verification code from your <strong>Google Authenticator</strong> app or email.
        </p>
        <form onSubmit={handleVerify}>
          <div className="mb-4">
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full p-3 border rounded text-center text-2xl tracking-widest"
              placeholder="000000"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
        </form>
        <div className="mt-4 text-center">
          <button onClick={handleResend} className="text-blue-600 hover:underline text-sm">
            Resend Code
          </button>
        </div>
      </div>
    </div>
  );
}
