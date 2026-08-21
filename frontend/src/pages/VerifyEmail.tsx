import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    axios.post(`${API_BASE}/auth/verify-email/`, { token })
      .then(() => {
        setStatus("success");
        toast.success("Email verified successfully!");
        setTimeout(() => navigate("/login"), 3000);
      })
      .catch((err) => {
        setStatus("error");
        toast.error(err.response?.data?.message || "Verification failed");
      });
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
        <h2 className="text-2xl font-bold mb-4">Email Verification</h2>
        {status === "loading" && <p className="text-gray-600">Verifying your email...</p>}
        {status === "success" && (
          <div className="text-green-600">
            <p className="mb-4">Your email has been verified successfully.</p>
            <p className="text-sm text-gray-500">Redirecting to login...</p>
          </div>
        )}
        {status === "error" && (
          <div className="text-red-600">
            <p className="mb-4">Verification link is invalid or expired.</p>
            <button
              onClick={() => navigate("/login")}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
