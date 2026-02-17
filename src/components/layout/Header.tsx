"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface UserInfo {
  name: string;
  email: string;
  role: string;
}

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 lg:left-64">
      <div className="flex items-center gap-3">
        {/* Hamburger menu - mobile only */}
        <button
          onClick={onMenuClick}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <div>
          <h2 className="text-sm text-gray-500">Welcome back,</h2>
          <p className="font-semibold text-gray-900">
            {user?.name || "Loading..."}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <span className="hidden rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 sm:inline-block">
          {user?.role || ""}
        </span>
        <button
          onClick={handleLogout}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
