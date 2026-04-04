"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ConnectivityBanner from "../ui/ConnectivityBanner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-stone-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <div className="lg:ml-64">
        <ConnectivityBanner />
      </div>
      <main className="mt-16 p-4 sm:p-6 lg:ml-64">{children}</main>
    </div>
  );
}
