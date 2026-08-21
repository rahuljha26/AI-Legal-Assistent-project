import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export type RoleType = "super_admin" | "admin" | "lawyer" | "advocate" | "citizen" | "user";

export interface AuthUser {
  id: string;
  full_name: string;
  email: string;
  role: RoleType;
  role_code?: string;
  is_verified: boolean;
  profile_picture?: string;
  permissions?: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: (token: string) => Promise<AuthUser>;
  logout: () => void;
  refreshUser: () => void;
  hasPermission: (permissionCode: string) => boolean;
  hasRole: (...allowedRoles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore user from localStorage on app mount
  useEffect(() => {
    const token      = localStorage.getItem("access_token");
    const savedUser  = localStorage.getItem("user");
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.clear();
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await axios.post(
      `${API_BASE}/auth/login/`,
      { email: email.trim().toLowerCase(), password },
      { headers: { "Content-Type": "application/json", "Bypass-Tunnel-Reminder": "1" } }
    );

    const { success, data, message } = response.data;

    if (!success) {
      throw new Error(message || "Login failed");
    }

    localStorage.setItem("access_token",  data.access);
    localStorage.setItem("refresh_token", data.refresh);
    localStorage.setItem("user",          JSON.stringify(data.user));

    setUser(data.user);
  };

  const googleLogin = async (token: string): Promise<AuthUser> => {
    const response = await axios.post(
      `${API_BASE}/auth/google/`,
      { token },
      { headers: { "Content-Type": "application/json", "Bypass-Tunnel-Reminder": "1" } }
    );

    const { success, data, message } = response.data;

    if (!success || !data) {
      throw new Error(message || "Google account verification failed");
    }

    localStorage.setItem("access_token",  data.access);
    localStorage.setItem("refresh_token", data.refresh);
    localStorage.setItem("user",          JSON.stringify(data.user));

    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const refreshUser = () => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch { /* ignore */ }
    }
  };

  const hasPermission = (permissionCode: string): boolean => {
    if (!user) return false;
    if (user.role === "super_admin" || user.permissions?.includes("*")) return true;
    return user.permissions ? user.permissions.includes(permissionCode) : false;
  };

  const hasRole = (...allowedRoles: string[]): boolean => {
    if (!user) return false;
    const currentRole = (user.role_code || user.role || "").toLowerCase();
    
    // Normalize aliases bi-directionally
    const normalized = allowedRoles.map(r => r.toLowerCase());
    if (normalized.includes("lawyer") || normalized.includes("advocate")) {
      normalized.push("lawyer", "advocate");
    }
    if (normalized.includes("citizen") || normalized.includes("user")) {
      normalized.push("citizen", "user");
    }

    if (currentRole === "super_admin") return true;
    return normalized.includes(currentRole);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoggedIn: !!user,
      isLoading,
      login,
      googleLogin,
      logout,
      refreshUser,
      hasPermission,
      hasRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
