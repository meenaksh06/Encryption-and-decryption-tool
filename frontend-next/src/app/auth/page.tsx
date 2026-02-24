"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LockIcon } from "@/components/Icons";

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLoading(true);
    setError("");

    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const res = await fetch(`http://localhost:8080${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Authentication failed");
        return;
      }

      if (isLogin) {
        localStorage.setItem("vl_token", data.token);
        localStorage.setItem("vl_username", username.trim());
        router.push("/workspace");
      } else {
        // Registration succeeded, now log in automatically
        setIsLogin(true);
        setError("");
        // Auto-login after registration
        const loginRes = await fetch("http://localhost:8080/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username.trim(), password }),
        });
        const loginData = await loginRes.json();
        if (loginRes.ok) {
          localStorage.setItem("vl_token", loginData.token);
          localStorage.setItem("vl_username", username.trim());
          router.push("/workspace");
        }
      }
    } catch {
      setError("Cannot reach the server. Start the backend first: cd backend && npm start");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 dot-grid relative bg-gradient-to-br from-[#F9F7FA] via-white to-[#E6F8F5]">
      {/* Background effects */}
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-[#4B154D]/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] bg-[#00BFA6]/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center shadow-[var(--shadow-glow)]">
            <LockIcon className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-800">VaultLock</span>
        </Link>

        {/* Card */}
        <div className="glass-card p-8">
          {/* Toggle */}
          <div className="flex rounded-xl bg-gray-100 p-1 mb-8">
            <button
              onClick={() => { setIsLogin(true); setError(""); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                isLogin
                  ? "bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-lg"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(""); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                !isLogin
                  ? "bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-lg"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Create Account
            </button>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isLogin ? "Welcome back" : "Create your vault"}
          </h2>
          <p className="text-sm text-gray-500 mb-8">
            {isLogin
              ? "Sign in to access your encrypted workspace"
              : "Set up your account to start encrypting files"}
          </p>

          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[#4B154D]/10 transition-all"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[#4B154D]/10 transition-all pr-12"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !username.trim() || !password.trim()}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-semibold text-sm shadow-lg shadow-[#4B154D]/20 hover:shadow-[#4B154D]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:-translate-y-0.5 disabled:hover:translate-y-0"
            >
              {loading
                ? "Please wait..."
                : isLogin
                ? "Sign In"
                : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          Your credentials are hashed with bcrypt. We never store plaintext passwords.
        </p>
      </div>
    </div>
  );
}
