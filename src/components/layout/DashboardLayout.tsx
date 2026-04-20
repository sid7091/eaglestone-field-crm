"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ConnectivityBanner from "../ui/ConnectivityBanner";
import FloatingActionButton from "../ui/FloatingActionButton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <div className="lg:ml-64">
        <ConnectivityBanner />
      </div>
      <main className="mt-16 p-4 pb-28 sm:p-6 sm:pb-28 lg:ml-64 lg:p-8 lg:pb-8">
        {children}
      </main>
      <FloatingActionButton />
    </div>
  );
}
