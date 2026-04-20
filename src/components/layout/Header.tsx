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

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((p: string) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "—";

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-brand-brown/10 bg-surface px-4 sm:px-5 lg:left-64">
      {/* Left: hamburger + greeting */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-sm p-1.5 text-brand-olive transition-colors hover:bg-brand-brown/8 lg:hidden"
          aria-label="Open menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <h1 className="font-display text-[18px] font-bold leading-none text-brand-brown">
          Hi, {firstName}
        </h1>
      </div>

      {/* Right: search hint + notifications + avatar */}
      <div className="flex items-center gap-2">
        {/* ⌘K search */}
        <button className="hidden items-center gap-1.5 rounded-sm border border-brand-brown/15 px-2.5 py-1.5 font-mono text-[11px] text-brand-olive transition-colors hover:bg-brand-brown/5 sm:flex">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          ⌘K
        </button>

        {/* Notifications */}
        <button className="relative rounded-sm p-1.5 text-brand-olive transition-colors hover:bg-brand-brown/8">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-tan font-display text-[9px] font-bold leading-none text-brand-brown">
            3
          </span>
        </button>

        {/* User avatar — click to logout */}
        <button
          onClick={handleLogout}
          title="Logout"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-brown font-display text-[12px] font-bold leading-none text-brand-cream transition-colors hover:bg-brand-brown-deep"
        >
          {initials}
        </button>
      </div>
    </header>
  );
}
