"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      router.push("/");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-dark via-brand-medium to-brand-dark">
      <div className="w-full max-w-md px-4">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Image
            src="/logo.svg"
            alt="Eagle Stone"
            width={220}
            height={100}
            className="h-20 w-auto"
            style={{ filter: "brightness(0) invert(93%) sepia(8%) saturate(300%) hue-rotate(15deg)" }}
            priority
          />
        </div>

        {/* Login Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-stone-600/30 bg-brand-medium/50 p-8 shadow-xl backdrop-blur"
        >
          <p className="mb-6 text-center text-sm text-stone-300">Sign in to your ERP account</p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-300">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@eaglestone.in"
                className="w-full rounded-lg border border-stone-600 bg-stone-700/50 px-4 py-2.5 text-white placeholder-stone-400 focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-300">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full rounded-lg border border-stone-600 bg-stone-700/50 px-4 py-2.5 text-white placeholder-stone-400 focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-brand-accent py-2.5 font-semibold text-brand-dark transition-colors hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div className="mt-4 rounded-lg bg-stone-700/30 p-3 text-xs text-stone-400">
            <p className="font-medium text-stone-300">Demo Credentials:</p>
            <p>Admin: admin@eaglestone.in / admin123</p>
            <p>Operator: operator@eaglestone.in / operator123</p>
          </div>
        </form>
      </div>
    </div>
  );
}
