"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import EagleLogo from "@/components/ui/eagle-logo";

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-brown via-brand-brown-deep to-brand-brown">
      <div className="w-full max-w-md px-4">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <EagleLogo variant="cream" height={60} />
        </div>

        {/* Login Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-white/10 bg-white/5 p-8 shadow-4 backdrop-blur"
        >
          <p className="mb-6 text-center font-display text-[11px] font-semibold tracking-[.2em] text-brand-cream/50">
            SIGN IN TO YOUR ACCOUNT
          </p>

          {error && (
            <div className="mb-4 rounded-sm bg-danger/15 p-3 text-[13px] text-danger">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block font-display text-[11px] font-semibold tracking-[.12em] text-brand-cream/60 uppercase">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@eaglestone.in"
                className="w-full rounded-sm border border-white/15 bg-white/8 px-4 py-2.5 text-[13px] text-brand-cream placeholder:text-brand-cream/30 focus:border-brand-tan focus:outline-none focus:ring-2 focus:ring-brand-tan/20"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block font-display text-[11px] font-semibold tracking-[.12em] text-brand-cream/60 uppercase">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full rounded-sm border border-white/15 bg-white/8 px-4 py-2.5 text-[13px] text-brand-cream placeholder:text-brand-cream/30 focus:border-brand-tan focus:outline-none focus:ring-2 focus:ring-brand-tan/20"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-sm bg-brand-tan py-2.5 font-display text-[13px] font-bold tracking-wide text-brand-brown transition-colors hover:bg-brand-tan-dark disabled:opacity-50"
          >
            {loading ? "SIGNING IN…" : "SIGN IN"}
          </button>

          <div className="mt-4 rounded-sm bg-white/5 p-3 text-[11px] text-brand-cream/40">
            <p className="font-display text-[10px] font-semibold tracking-wide text-brand-cream/50">DEMO CREDENTIALS</p>
            <p className="mt-1">Admin: admin@eaglestone.in / admin123</p>
            <p>Operator: operator@eaglestone.in / operator123</p>
          </div>
        </form>
      </div>
    </div>
  );
}
